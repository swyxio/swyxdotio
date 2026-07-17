import { error, json } from '@sveltejs/kit';
import { readContentManifest } from '$lib/content-manifest.js';
import {
	getReadCount,
	incrementReadCount,
	isObviousBot,
	isSameOriginRead,
	resolveReadCounterKey
} from '$lib/read-counter.js';

export const prerender = false;

const RESPONSE_HEADERS = { 'Cache-Control': 'private, max-age=0, no-store' };

/** @param {App.Platform | undefined} platform @param {string} requestedKey */
async function resolveRequest(platform, requestedKey) {
	const database = platform?.env?.READ_COUNTERS;
	if (!database) throw error(503, 'Read counter is unavailable');
	const manifest = await readContentManifest(platform?.env?.CONTENT_MANIFEST);
	const pageKey = resolveReadCounterKey(manifest, requestedKey);
	if (!pageKey) throw error(404, 'Unknown public page');
	return { database, pageKey };
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, platform }) {
	const { database, pageKey } = await resolveRequest(platform, params.key);
	try {
		return json({ reads: await getReadCount(database, pageKey) }, { headers: RESPONSE_HEADERS });
	} catch (cause) {
		console.error('Read counter lookup failed', {
			pageKey,
			errorName: cause instanceof Error ? cause.name : typeof cause
		});
		throw error(503, 'Read counter is unavailable');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ params, platform, request }) {
	if (!isSameOriginRead(request)) throw error(403, 'Cross-origin reads are not accepted');
	if (isObviousBot(request.headers.get('user-agent')))
		throw error(403, 'Automated reads are not accepted');
	if (request.headers.get('x-swyx-read') !== 'engaged') throw error(400, 'Invalid read signal');

	const { database, pageKey } = await resolveRequest(platform, params.key);
	try {
		return json(
			{ reads: await incrementReadCount(database, pageKey) },
			{ headers: RESPONSE_HEADERS }
		);
	} catch (cause) {
		console.error('Read counter increment failed', {
			pageKey,
			errorName: cause instanceof Error ? cause.name : typeof cause
		});
		throw error(503, 'Read counter is unavailable');
	}
}
