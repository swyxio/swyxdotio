import { error, json } from '@sveltejs/kit';
import { readContentManifest } from '$lib/content-manifest.js';
import {
	canonicalReadPath,
	getReadCount,
	incrementReadCount,
	isObviousBot,
	isSameOriginRead,
	readAnalyticsTitle,
	READ_SAMPLE_WEIGHT,
	resolveReadCounterKey
} from '$lib/read-counter.js';
import {
	hasAnalyticsOptOut,
	normalizeReadAnalyticsContext,
	sendGa4Read
} from '$lib/read-analytics.js';

export const prerender = false;

const GET_HEADERS = {
	'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
};
const POST_HEADERS = { 'Cache-Control': 'private, max-age=0, no-store' };

/** @param {App.Platform | undefined} platform @param {string} requestedKey */
async function resolveRequest(platform, requestedKey) {
	const database = platform?.env?.READ_COUNTERS;
	if (!database) throw error(503, 'Read counter is unavailable');
	const manifest = await readContentManifest(platform?.env?.CONTENT_MANIFEST);
	const pageKey = resolveReadCounterKey(manifest, requestedKey);
	if (!pageKey) throw error(404, 'Unknown public page');
	const canonicalPath = canonicalReadPath(requestedKey);
	const pageTitle = readAnalyticsTitle(manifest, requestedKey);
	if (!canonicalPath || !pageTitle) throw error(404, 'Unknown public page');
	return { database, pageKey, canonicalPath, pageTitle };
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, platform }) {
	const { database, pageKey } = await resolveRequest(platform, params.key);
	try {
		return json({ reads: await getReadCount(database, pageKey) }, { headers: GET_HEADERS });
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
	if (request.headers.get('x-swyx-sample-weight') !== `${READ_SAMPLE_WEIGHT}`)
		throw error(400, 'Invalid sampling policy');

	const { database, pageKey, canonicalPath, pageTitle } = await resolveRequest(
		platform,
		params.key
	);
	try {
		const reads = await incrementReadCount(database, pageKey);
		if (!hasAnalyticsOptOut(request)) {
			const contentLength = Number(request.headers.get('content-length') || 0);
			if (contentLength <= 512) {
				const rawBody = await request.text().catch(() => '');
				let parsed = null;
				try {
					parsed = rawBody.length <= 512 ? JSON.parse(rawBody || 'null') : null;
				} catch {
					// Invalid analytics context must not affect the D1 read increment.
				}
				const analytics = normalizeReadAnalyticsContext(parsed);
				if (analytics) {
					const mirror = sendGa4Read({
						measurementId: platform?.env?.GA4_MEASUREMENT_ID,
						apiSecret: platform?.env?.GA4_API_SECRET,
						context: analytics,
						canonicalPath,
						pageTitle
					});
					platform?.context?.waitUntil(mirror);
				}
			}
		}
		return json({ reads }, { headers: POST_HEADERS });
	} catch (cause) {
		console.error('Read counter increment failed', {
			pageKey,
			errorName: cause instanceof Error ? cause.name : typeof cause
		});
		throw error(503, 'Read counter is unavailable');
	}
}
