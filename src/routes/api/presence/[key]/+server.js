import { error } from '@sveltejs/kit';
import { readContentManifest } from '$lib/content-manifest.js';
import {
	isAllowedPresenceRequest,
	normalizeCountryCode,
	PRESENCE_COUNTRY_HEADER,
	resolvePresenceRoom
} from '$lib/presence-server.js';

export const prerender = false;

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, platform, request }) {
	if (!isAllowedPresenceRequest(request)) throw error(403, 'Presence connection rejected');
	if (platform?.env?.PRESENCE_ENABLED === 'false') throw error(503, 'Presence is disabled');

	const rooms = platform?.env?.PRESENCE_ROOMS;
	if (!rooms) throw error(503, 'Presence is unavailable');

	const manifest = await readContentManifest(platform.env.CONTENT_MANIFEST);
	const roomName = resolvePresenceRoom(manifest, params.key);
	if (!roomName) throw error(404, 'Unknown public page');

	const country = normalizeCountryCode(
		/** @type {Request & { cf?: { country?: string } }} */ (request).cf?.country
	);
	const upstreamUrl = new URL('https://presence.internal/connect');
	upstreamUrl.searchParams.set('room', roomName);
	const headers = new Headers();
	headers.set('Upgrade', 'websocket');
	headers.set(PRESENCE_COUNTRY_HEADER, country);

	return rooms.get(rooms.idFromName(roomName)).fetch(
		new Request(upstreamUrl, {
			headers
		})
	);
}
