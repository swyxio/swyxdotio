import { error, json } from '@sveltejs/kit';
import { readContentManifest } from '$lib/content-manifest.js';
import {
	canonicalReadPath,
	getReadCount,
	incrementReadCount,
	isAutomatedRead,
	isReadRateAllowed,
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
import { displayedReadCount } from '$lib/server/historical-read-estimates.js';

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
		const sampledReads = await getReadCount(database, pageKey);
		return json({ reads: displayedReadCount(params.key, sampledReads) }, { headers: GET_HEADERS });
	} catch (cause) {
		console.error('Read counter lookup failed', {
			pageKey,
			errorName: cause instanceof Error ? cause.name : typeof cause
		});
		throw error(503, 'Read counter is unavailable');
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ params, platform, request, getClientAddress }) {
	if (!isSameOriginRead(request)) throw error(403, 'Cross-origin reads are not accepted');
	if (isAutomatedRead(request)) throw error(403, 'Automated reads are not accepted');
	if (request.headers.get('x-swyx-read') !== 'engaged') throw error(400, 'Invalid read signal');
	if (request.headers.get('x-swyx-sample-weight') !== `${READ_SAMPLE_WEIGHT}`)
		throw error(400, 'Invalid sampling policy');
	const contentLength = Number(request.headers.get('content-length') || 0);
	const rawBody = contentLength <= 512 ? await request.text().catch(() => '') : '';
	let parsed = null;
	try {
		parsed = rawBody.length <= 512 ? JSON.parse(rawBody || 'null') : null;
	} catch {
		// Analytics context is optional and malformed input must not reach GA.
	}
	const analytics = normalizeReadAnalyticsContext(parsed);
	let clientAddress = request.headers.get('cf-connecting-ip') || 'unknown';
	try {
		clientAddress = getClientAddress();
	} catch {
		// Cloudflare always supplies the address in production; local tests may not.
	}
	const rateAllowed = await isReadRateAllowed(
		{
			READ_IP_RATE_LIMITER: platform?.env?.READ_IP_RATE_LIMITER,
			READ_SESSION_RATE_LIMITER: platform?.env?.READ_SESSION_RATE_LIMITER
		},
		clientAddress,
		analytics?.sessionId
	);
	if (!rateAllowed) throw error(429, 'Read signal rate limit exceeded');

	const { database, pageKey, canonicalPath, pageTitle } = await resolveRequest(
		platform,
		params.key
	);
	try {
		const sampledReads = await incrementReadCount(database, pageKey);
		if (!hasAnalyticsOptOut(request) && analytics) {
			const mirror = sendGa4Read({
				measurementId: platform?.env?.GA4_MEASUREMENT_ID,
				apiSecret: platform?.env?.GA4_API_SECRET,
				context: analytics,
				canonicalPath,
				pageTitle
			});
			platform?.context?.waitUntil(mirror);
		}
		return json({ reads: displayedReadCount(params.key, sampledReads) }, { headers: POST_HEADERS });
	} catch (cause) {
		console.error('Read counter increment failed', {
			pageKey,
			errorName: cause instanceof Error ? cause.name : typeof cause
		});
		throw error(503, 'Read counter is unavailable');
	}
}
