import { error, json } from '@sveltejs/kit';
import { hasAnalyticsOptOut } from '$lib/read-analytics.js';
import { isAutomatedRead, isSameOriginRead } from '$lib/read-counter.js';
import {
	incrementReadFunnelStage,
	isReadFunnelRateAllowed,
	normalizeReadFunnelPayload
} from '$lib/read-funnel.js';

export const prerender = false;

const RESPONSE_HEADERS = { 'Cache-Control': 'private, max-age=0, no-store' };

/** @type {import('./$types').RequestHandler} */
export async function POST({ platform, request, getClientAddress }) {
	if (!isSameOriginRead(request)) throw error(403, 'Cross-origin telemetry is not accepted');
	if (isAutomatedRead(request)) throw error(403, 'Automated telemetry is not accepted');
	if (hasAnalyticsOptOut(request)) return json({ accepted: false }, { headers: RESPONSE_HEADERS });

	const contentLength = Number(request.headers.get('content-length') || 0);
	if (contentLength > 128) throw error(400, 'Invalid funnel signal');
	const rawBody = await request.text().catch(() => '');
	if (rawBody.length > 128) throw error(400, 'Invalid funnel signal');
	let parsed = null;
	try {
		parsed = JSON.parse(rawBody);
	} catch {
		throw error(400, 'Invalid funnel signal');
	}
	const payload = normalizeReadFunnelPayload(parsed);
	if (!payload) throw error(400, 'Invalid funnel signal');

	let clientAddress = request.headers.get('cf-connecting-ip') || 'unknown';
	try {
		clientAddress = getClientAddress();
	} catch {
		// Cloudflare supplies the address in production; local tests may not.
	}
	const rateAllowed = await isReadFunnelRateAllowed(
		{ READ_FUNNEL_RATE_LIMITER: platform?.env?.READ_FUNNEL_RATE_LIMITER },
		clientAddress
	);
	if (!rateAllowed) throw error(429, 'Funnel signal rate limit exceeded');

	const database = platform?.env?.READ_COUNTERS;
	if (!database) throw error(503, 'Read funnel is unavailable');
	try {
		await incrementReadFunnelStage(database, payload.stage);
		return json({ accepted: true }, { headers: RESPONSE_HEADERS });
	} catch (cause) {
		console.error('Read funnel increment failed', {
			stage: payload.stage,
			errorName: cause instanceof Error ? cause.name : typeof cause
		});
		throw error(503, 'Read funnel is unavailable');
	}
}
