import { READ_SAMPLE_RATE, READ_SAMPLE_WEIGHT } from './read-counter.js';
import { SITE_URL } from './siteConfig.js';

const CLIENT_ID = /^\d{1,20}\.\d{1,20}$/;
const SESSION_ID = /^\d{10,16}$/;
const MEASUREMENT_ID = /^G-[A-Z0-9]+$/;

/**
 * @typedef {{
 *   clientId: string;
 *   sessionId: number;
 *   engagementTimeMs: number;
 * }} ReadAnalyticsContext
 */

/** @param {unknown} value @returns {ReadAnalyticsContext | null} */
export function normalizeReadAnalyticsContext(value) {
	if (!value || typeof value !== 'object') return null;
	const input = /** @type {Record<string, unknown>} */ (value);
	const clientId = typeof input.clientId === 'string' ? input.clientId : '';
	const rawSessionId =
		typeof input.sessionId === 'string' ? input.sessionId : `${input.sessionId ?? ''}`;
	if (!CLIENT_ID.test(clientId) || !SESSION_ID.test(rawSessionId)) return null;

	const sessionId = Number(rawSessionId);
	if (!Number.isSafeInteger(sessionId) || sessionId <= 0) return null;
	const engagementTimeMs = Math.min(
		60_000,
		Math.max(1_000, Math.round(Number(input.engagementTimeMs) || 8_000))
	);

	return {
		clientId,
		sessionId,
		engagementTimeMs
	};
}

/** @param {Request} request */
export function hasAnalyticsOptOut(request) {
	const dnt = request.headers.get('dnt')?.toLowerCase();
	return request.headers.get('sec-gpc') === '1' || dnt === '1' || dnt === 'yes';
}

/**
 * @param {ReadAnalyticsContext} context
 * @param {string} canonicalPath
 * @param {string} pageTitle
 */
export function buildGa4ReadPayload(context, canonicalPath, pageTitle) {
	const params = {
		page_location: new URL(canonicalPath, SITE_URL).href,
		page_title: pageTitle.replace(/\s+/g, ' ').trim().slice(0, 100),
		engagement_time_msec: context.engagementTimeMs,
		session_id: context.sessionId,
		session_engaged: 1,
		read_weight: READ_SAMPLE_WEIGHT,
		read_sample_rate: READ_SAMPLE_RATE
	};

	return {
		client_id: context.clientId,
		consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
		events: [{ name: 'engaged_read', params }]
	};
}

/**
 * Fire-and-forget GA4 mirror. It deliberately resolves on every failure so
 * analytics can never fail or delay the public D1 read counter.
 * @param {{
 *   measurementId?: string;
 *   apiSecret?: string;
 *   context: ReadAnalyticsContext;
 *   canonicalPath: string;
 *   pageTitle: string;
 *   fetcher?: typeof fetch;
 * }} options
 */
export async function sendGa4Read(options) {
	const { measurementId, apiSecret, context, canonicalPath, pageTitle, fetcher = fetch } = options;
	if (!measurementId || !MEASUREMENT_ID.test(measurementId) || !apiSecret) return false;

	try {
		const endpoint = new URL('https://www.google-analytics.com/mp/collect');
		endpoint.searchParams.set('measurement_id', measurementId);
		endpoint.searchParams.set('api_secret', apiSecret);
		const response = await fetcher(endpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(buildGa4ReadPayload(context, canonicalPath, pageTitle)),
			signal: AbortSignal.timeout(2_000)
		});
		if (!response.ok) {
			console.warn('GA4 read mirror was not accepted', { status: response.status });
			return false;
		}
		return true;
	} catch (cause) {
		console.warn('GA4 read mirror failed', {
			errorName: cause instanceof Error ? cause.name : typeof cause
		});
		return false;
	}
}
