import { error } from '@sveltejs/kit';
import { readContentManifest } from '$lib/content-manifest.js';
import { admitPresenceConnection } from '$lib/presence-rate.js';
import {
	isAllowedPresenceRequest,
	normalizeCountryCode,
	presenceRoomTitle,
	PRESENCE_COUNTRY_HEADER,
	resolvePresenceRoom
} from '$lib/presence-server.js';

export const prerender = false;

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, platform, request, getClientAddress }) {
	if (!isAllowedPresenceRequest(request)) throw error(403, 'Presence connection rejected');
	if (platform?.env?.PRESENCE_ENABLED === 'false') throw error(503, 'Presence is disabled');

	const rooms = platform?.env?.PRESENCE_ROOMS;
	const limiter = platform?.env?.PRESENCE_CONNECTION_RATE_LIMITER;
	const secret = platform?.env?.TOOLS_SESSION_SECRET;
	if (!rooms || !limiter || !secret) throw error(503, 'Presence is unavailable');

	let address;
	try {
		address = getClientAddress();
	} catch {
		throw error(503, 'Presence is unavailable');
	}
	let admission;
	try {
		admission = await admitPresenceConnection({ secret, limiter }, address);
	} catch {
		throw error(503, 'Presence is unavailable');
	}
	if (!admission.allowed) throw error(429, 'Try again later');

	const manifest = await readContentManifest(platform.env.CONTENT_MANIFEST);
	const roomName = resolvePresenceRoom(manifest, params.key);
	if (!roomName) throw error(404, 'Unknown public page');

	const country = normalizeCountryCode(
		/** @type {Request & { cf?: { country?: string } }} */ (request).cf?.country
	);
	const upstreamUrl = new URL('https://presence.internal/connect');
	upstreamUrl.searchParams.set('room', roomName);
	// The title comes from the same public registry/manifest as the key, not
	// from arbitrary browser-supplied URL or page data.
	const title = Array.from(presenceRoomTitle(manifest, roomName))
		.slice(0, 120)
		.map((character) => {
			const code = character.codePointAt(0) ?? 0;
			return code < 32 || code === 127 ? ' ' : character;
		})
		.join('');
	upstreamUrl.searchParams.set('title', title);
	const headers = new Headers();
	headers.set('Upgrade', 'websocket');
	headers.set(PRESENCE_COUNTRY_HEADER, country);
	headers.set('x-swyx-presence-rate-key', admission.rateKey);
	headers.set('x-swyx-presence-previous-key', admission.previousRateKey);

	// One sitewide coordinator can publish counts for all admitted public pages,
	// while its tagged sockets keep cursor traffic scoped to each page.
	return rooms.get(rooms.idFromName('sitewide')).fetch(
		new Request(upstreamUrl, {
			headers
		})
	);
}
