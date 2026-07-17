import { PAGE_SOCIAL_CARDS } from './social-meta.js';
import { isBlogSlug } from './slug.js';

export const READ_DEDUPE_MS = 24 * 60 * 60 * 1000;
export const READ_VISIBLE_MS = 8 * 1000;
export const READ_SCROLL_FRACTION = 0.25;

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

/** @param {string | null} userAgent */
export function isObviousBot(userAgent) {
	return !userAgent || BOT_USER_AGENT.test(userAgent);
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

/** @param {D1Database} database @param {string} pageKey */
export async function getReadCount(database, pageKey) {
	const row = await database
		.prepare('SELECT read_count FROM page_reads WHERE page_key = ?1')
		.bind(pageKey)
		.first();
	return normalizeReadCount(row?.read_count);
}

/** @param {D1Database} database @param {string} pageKey */
export async function incrementReadCount(database, pageKey) {
	const row = await database
		.prepare(
			`INSERT INTO page_reads (page_key, read_count, updated_at)
			 VALUES (?1, 1, unixepoch())
			 ON CONFLICT(page_key) DO UPDATE SET
			   read_count = read_count + 1,
			   updated_at = unixepoch()
			 RETURNING read_count`
		)
		.bind(pageKey)
		.first();
	return normalizeReadCount(row?.read_count);
}
