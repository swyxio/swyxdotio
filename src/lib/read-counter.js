import { PAGE_SOCIAL_CARDS } from './social-meta.js';
import { isBlogSlug } from './slug.js';

export const READ_DEDUPE_MS = 24 * 60 * 60 * 1000;
export const READ_VISIBLE_MS = 8 * 1000;
export const READ_SCROLL_FRACTION = 0.25;
export const READ_SAMPLE_RATE = 0.005;
export const READ_SAMPLE_WEIGHT = 200;
export const READ_SAMPLING_POLICY = 'v1-p005';
export const READ_COUNT_VISIBILITY_KEY = 'swyx:read-count-visibility:v1';
export const READ_COUNT_VISIBILITY_EVENT = 'swyx:read-count-visibility';
export const READ_COUNT_BATCH_LIMIT = 80;

const BOT_USER_AGENT =
	/(?:bot|crawler|spider|slurp|preview|facebookexternalhit|twitterbot|linkedinbot|discordbot|whatsapp|telegrambot|headless|lighthouse|pagespeed)/i;

const PAGE_KEY_BY_PATH = new Map(
	Object.entries(PAGE_SOCIAL_CARDS).map(([key, card]) => [card.path, key])
);

/** @param {string} pathname */
export function publicPageKeyForPath(pathname) {
	return PAGE_KEY_BY_PATH.get(pathname.replace(/\/$/, '') || '/') ?? null;
}

/**
 * Resolve a finite storage key. Article slugs must exist in the persisted
 * public manifest so callers cannot create attacker-controlled D1 rows.
 * @param {import('./content-manifest').ContentManifest | null} manifest
 * @param {string} requestedKey
 */
export function resolveReadCounterKey(manifest, requestedKey) {
	if (Object.hasOwn(PAGE_SOCIAL_CARDS, requestedKey)) return `page:${requestedKey}`;
	if (!isBlogSlug(requestedKey) || !manifest) return null;
	const article = manifest.blogposts.find((item) => item.slug === requestedKey && !item.isPrivate);
	return article ? `article:${requestedKey}` : null;
}

/** @param {string} requestedKey */
export function canonicalReadPath(requestedKey) {
	const page = Object.entries(PAGE_SOCIAL_CARDS).find(([key]) => key === requestedKey)?.[1];
	if (page) return page.path;
	return isBlogSlug(requestedKey) ? `/${requestedKey}` : null;
}

/**
 * @param {import('./content-manifest').ContentManifest | null} manifest
 * @param {string} requestedKey
 */
export function readAnalyticsTitle(manifest, requestedKey) {
	const page = Object.entries(PAGE_SOCIAL_CARDS).find(([key]) => key === requestedKey)?.[1];
	if (page) return page.title;
	return (
		manifest?.blogposts.find((item) => item.slug === requestedKey && !item.isPrivate)?.title ?? ''
	);
}

/** @param {string | null} userAgent */
export function isObviousBot(userAgent) {
	return !userAgent || BOT_USER_AGENT.test(userAgent);
}

/** @param {Request & { cf?: { botManagement?: { verifiedBot?: boolean } } }} request */
export function isAutomatedRead(request) {
	if (isObviousBot(request.headers.get('user-agent'))) return true;
	if (request.cf?.botManagement?.verifiedBot === true) return true;
	return ['purpose', 'sec-purpose', 'x-moz'].some((header) =>
		/prefetch|prerender/i.test(request.headers.get(header) || '')
	);
}

/** @param {Request} request */
export function isSameOriginRead(request) {
	const origin = request.headers.get('origin');
	const fetchSite = request.headers.get('sec-fetch-site');
	return origin === new URL(request.url).origin && (!fetchSite || fetchSite === 'same-origin');
}

/** @param {unknown} value */
export function normalizeReadCount(value) {
	const count = Number(value);
	return Number.isSafeInteger(count) && count >= 0 ? count : 0;
}

/** @param {number} draw */
export function shouldSampleRead(draw) {
	return Number.isFinite(draw) && draw >= 0 && draw < READ_SAMPLE_RATE;
}

/**
 * Cloudflare's rate-limit bindings are deliberately approximate and local to a
 * colo. That is sufficient here: their job is to bound abusive bursts before a
 * sampled read can cause a D1 write, not to provide billing-grade accounting.
 *
 * @param {{
 *   READ_IP_RATE_LIMITER?: RateLimit;
 *   READ_SESSION_RATE_LIMITER?: RateLimit;
 * }} env
 * @param {string} clientAddress
 * @param {number | undefined} sessionId
 */
export async function isReadRateAllowed(env, clientAddress, sessionId) {
	try {
		if (env.READ_IP_RATE_LIMITER) {
			const result = await env.READ_IP_RATE_LIMITER.limit({ key: `ip:${clientAddress}` });
			if (!result.success) return false;
		}
		if (env.READ_SESSION_RATE_LIMITER && sessionId) {
			const result = await env.READ_SESSION_RATE_LIMITER.limit({ key: `session:${sessionId}` });
			if (!result.success) return false;
		}
		return true;
	} catch {
		// Counting is optional. If an explicitly configured protection binding is
		// unavailable, fail closed rather than expose D1 to an unbounded write path.
		return !env.READ_IP_RATE_LIMITER && !env.READ_SESSION_RATE_LIMITER;
	}
}

/** @param {unknown} storedPreference */
export function readCountsAreHidden(storedPreference) {
	return storedPreference === 'hidden';
}

/** @param {D1Database} database @param {string} pageKey */
export async function getReadCount(database, pageKey) {
	const row = await database
		.prepare('SELECT read_count FROM page_reads WHERE page_key = ?1')
		.bind(pageKey)
		.first();
	return normalizeReadCount(row?.read_count);
}

/**
 * Fetch display-only counts in one D1 query. This must never increment reads.
 * @param {D1Database} database
 * @param {string[]} pageKeys
 */
export async function getReadCounts(database, pageKeys) {
	const uniqueKeys = [...new Set(pageKeys)].slice(0, READ_COUNT_BATCH_LIMIT);
	if (!uniqueKeys.length) return new Map();
	const placeholders = uniqueKeys.map((_, index) => `?${index + 1}`).join(', ');
	const result = await database
		.prepare(`SELECT page_key, read_count FROM page_reads WHERE page_key IN (${placeholders})`)
		.bind(...uniqueKeys)
		.all();
	return new Map(
		(result.results ?? []).map((row) => [`${row.page_key}`, normalizeReadCount(row.read_count)])
	);
}

/** @param {D1Database} database @param {string} pageKey */
export async function incrementReadCount(database, pageKey) {
	const row = await database
		.prepare(
			`INSERT INTO page_reads (
			   page_key, read_count, sample_count, sampling_policy_version, updated_at
			 ) VALUES (?1, ?2, 1, ?3, unixepoch())
			 ON CONFLICT(page_key) DO UPDATE SET
			   read_count = read_count + excluded.read_count,
			   sample_count = sample_count + 1,
			   sampling_policy_version = excluded.sampling_policy_version,
			   updated_at = unixepoch()
			 RETURNING read_count`
		)
		.bind(pageKey, READ_SAMPLE_WEIGHT, READ_SAMPLING_POLICY)
		.first();
	return normalizeReadCount(row?.read_count);
}
