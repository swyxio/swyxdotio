import { isObviousBot, isSameOriginRead, resolveReadCounterKey } from './read-counter.js';

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
	return resolveReadCounterKey(manifest, requestedKey);
}
