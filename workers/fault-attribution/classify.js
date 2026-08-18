export const PRODUCER_SCRIPT_NAME = 'swyxdotio';
export const FAULT_OUTCOMES = Object.freeze([
	'exception',
	'exceededCpu',
	'exceededMemory',
	'scriptNotFound'
]);

const KNOWN_FAULT_OUTCOMES = new Set(FAULT_OUTCOMES);
const LIFECYCLE_OUTCOMES = new Set(['ok', 'canceled', 'responseStreamDisconnected']);

/** @param {unknown} outcome */
export function isRuntimeFaultOutcome(outcome) {
	return typeof outcome === 'string' && !LIFECYCLE_OUTCOMES.has(outcome);
}

/** @param {unknown} outcome */
export function normalizeFaultOutcome(outcome) {
	return typeof outcome === 'string' && KNOWN_FAULT_OUTCOMES.has(outcome) ? outcome : 'other';
}

/** @param {unknown} wallTime */
export function durationBucket(wallTime) {
	if (typeof wallTime !== 'number' || !Number.isFinite(wallTime) || wallTime < 0) return 'unknown';
	if (wallTime < 100) return 'lt100ms';
	if (wallTime < 1_000) return '100ms_1s';
	if (wallTime < 10_000) return '1s_10s';
	if (wallTime < 30_000) return '10s_30s';
	return 'gte30s';
}

/** @param {unknown} event */
export function classifyRoute(event) {
	const input =
		event && typeof event === 'object' ? /** @type {Record<string, unknown>} */ (event) : {};
	const trigger = input.event;
	const triggerRecord =
		trigger && typeof trigger === 'object'
			? /** @type {Record<string, unknown>} */ (trigger)
			: null;
	if (!triggerRecord?.request) {
		if (triggerRecord && 'queue' in triggerRecord) return 'queue';
		if (triggerRecord && 'cron' in triggerRecord) return 'scheduled';
		if (triggerRecord && 'scheduledTime' in triggerRecord) return 'alarm';
		return 'other_trigger';
	}
	const request =
		triggerRecord.request && typeof triggerRecord.request === 'object'
			? /** @type {Record<string, unknown>} */ (triggerRecord.request)
			: null;

	let pathname = '';
	try {
		pathname = new URL(String(request?.url ?? '')).pathname;
	} catch {
		return 'content_page';
	}

	if (matchesPrefix(pathname, '/api/presence')) return 'presence_api';
	if (matchesPrefix(pathname, '/api/reads')) return 'read_api';
	if (matchesPrefix(pathname, '/tools/api') || matchesPrefix(pathname, '/tools/podcast/api')) {
		return 'tool_api';
	}
	if (matchesPrefix(pathname, '/api')) return 'site_api';
	if (matchesPrefix(pathname, '/og')) return 'og_image';
	if (
		pathname === '/rss.xml' ||
		pathname === '/sitemap.xml' ||
		/^\/podcast\/[^/]+\/rss\.xml$/.test(pathname)
	) {
		return 'syndication';
	}
	if (matchesPrefix(pathname, '/tools')) return 'tools_page';
	if (pathname === '/') return 'home_page';
	return 'content_page';
}

/**
 * Collapse a trace into enums before it crosses a storage boundary.
 * @param {unknown} event
 * @param {number} [fallbackNowMs]
 */
export function faultBucket(event, fallbackNowMs = Date.now()) {
	const input =
		event && typeof event === 'object' ? /** @type {Record<string, unknown>} */ (event) : {};
	if (!isRuntimeFaultOutcome(input.outcome)) return null;
	const timestamp =
		typeof input.eventTimestamp === 'number' && Number.isFinite(input.eventTimestamp)
			? input.eventTimestamp
			: fallbackNowMs;
	return {
		bucketStart: Math.floor(timestamp / 3_600_000) * 3_600,
		routeClass: classifyRoute(input),
		outcome: normalizeFaultOutcome(input.outcome),
		durationBucket: durationBucket(input.wallTime),
		count: 1
	};
}

function matchesPrefix(pathname, prefix) {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
