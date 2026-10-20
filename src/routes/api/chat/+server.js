import { error } from '@sveltejs/kit';
import { chatRateKey } from '$lib/chat-server.js';
import { isAllowedPresenceRequest } from '$lib/presence-server.js';

export const prerender = false;

/** @type {import('./$types').RequestHandler} */
export async function GET({ platform, request, getClientAddress }) {
	if (!isAllowedPresenceRequest(request)) throw error(403, 'Chat connection rejected');
	if (platform?.env?.CHAT_ENABLED === 'false') throw error(503, 'Chat is disabled');

	const room = platform?.env?.CHAT_ROOM;
	const limiter = platform?.env?.CHAT_IP_RATE_LIMITER;
	const secret = platform?.env?.TOOLS_SESSION_SECRET;
	if (!room || !limiter || !secret) throw error(503, 'Chat is unavailable');

	// A daily, keyed digest lets the room limit messages across reconnections
	// without receiving, logging, or storing a visitor's IP address.
	let address;
	try {
		address = getClientAddress();
	} catch {
		throw error(503, 'Chat is unavailable');
	}
	const rateKey = await chatRateKey(secret, address);
	let allowed;
	try {
		allowed = (await limiter.limit({ key: rateKey })).success;
	} catch {
		throw error(503, 'Chat is unavailable');
	}
	if (!allowed) throw error(429, 'Try again later');

	return room.get(room.idFromName('global')).fetch(
		new Request('https://presence.internal/chat', {
			headers: { Upgrade: 'websocket', 'x-chat-rate-key': rateKey }
		})
	);
}
