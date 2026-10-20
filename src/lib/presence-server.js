import { isObviousBot, isSameOriginRead, resolveReadCounterKey } from './read-counter.js';
import { PAGE_SOCIAL_CARDS } from './social-meta.js';
import { isBlogSlug } from './slug.js';

export const PRESENCE_COUNTRY_HEADER = 'x-swyx-presence-country';

/** @param {unknown} value */
export function normalizeCountryCode(value) {
	return typeof value === 'string' && /^[A-Z]{2}$/.test(value.toUpperCase())
		? value.toUpperCase()
		: 'XX';
}

/** @param {Request} request */
export function isPresenceUpgrade(request) {
	return request.headers.get('upgrade')?.toLowerCase() === 'websocket';
}

/** @param {Request} request */
export function isAllowedPresenceRequest(request) {
	return (
		isPresenceUpgrade(request) &&
		isSameOriginRead(request) &&
		!isObviousBot(request.headers.get('user-agent'))
	);
}

/**
 * A room name can only be derived from the finite public-page registry or a
 * persisted, non-private article. The storage-style prefix also prevents page
 * and article keys from colliding.
 * @param {import('./content-manifest').ContentManifest | null} manifest
 * @param {string} requestedKey
 */
export function resolvePresenceRoom(manifest, requestedKey) {
	if (requestedKey.startsWith('page:')) {
		const key = requestedKey.slice('page:'.length);
		return Object.hasOwn(PAGE_SOCIAL_CARDS, key) ? `page:${key}` : null;
	}
	if (requestedKey.startsWith('article:')) {
		const key = requestedKey.slice('article:'.length);
		if (!isBlogSlug(key) || !manifest) return null;
		return manifest.blogposts.some((item) => item.slug === key && !item.isPrivate)
			? `article:${key}`
			: null;
	}
	// Existing clients use bare keys and retain their original page-first mapping.
	return resolveReadCounterKey(manifest, requestedKey);
}

/**
 * Resolve the title from the validated room kind rather than a bare key: a
 * public article may have the same slug as a registered page.
 * @param {import('./content-manifest').ContentManifest | null} manifest
 * @param {string} roomName
 */
export function presenceRoomTitle(manifest, roomName) {
	if (resolvePresenceRoom(manifest, roomName) !== roomName) return '';
	const [kind, key] = roomName.split(':');
	if (kind === 'page') {
		return (
			Object.entries(PAGE_SOCIAL_CARDS).find(([candidate]) => candidate === key)?.[1].title ?? ''
		);
	}
	return manifest?.blogposts.find((item) => item.slug === key && !item.isPrivate)?.title ?? '';
}
