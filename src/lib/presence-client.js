import { PRESENCE_MODES, PRESENCE_REACTIONS, normalizePresenceNick } from './presence-contracts.js';

export { PRESENCE_REACTIONS } from './presence-contracts.js';

export const PRESENCE_VISIBILITY_KEY = 'swyx:live-readers:hidden:v1';
export const PRESENCE_ADMISSION_PREFIX = 'swyx:live-readers:admitted:v1:';
export const PRESENCE_SHARE_REQUEST_EVENT = 'swyx:open-share-menu';
export const PRESENCE_SHARE_CELEBRATION_EVENT = 'swyx:share-celebration';
const COUNTRY_CODE = /^[A-Z]{2}$/;
const COLOR = /^#[0-9a-f]{6}$/i;
const MODES = new Set(PRESENCE_MODES);

// A follow request stays in this tab's client-side module while SvelteKit
// changes routes. It is neither sent to the server nor written into the URL.
/** @type {{ id: string, pageKey: string, expiresAt: number } | null} */
let pendingReader = null;

/** @param {string} id @param {string} pageKey */
export function queueReaderFollow(id, pageKey) {
	pendingReader = { id, pageKey, expiresAt: Date.now() + 15_000 };
}

export function pendingReaderFollow() {
	if (pendingReader && pendingReader.expiresAt <= Date.now()) pendingReader = null;
	return pendingReader;
}

export function clearReaderFollow() {
	pendingReader = null;
}

/** @typedef {'d' | 'r' | 't'} PresenceMode */
/** @typedef {[number, number, number, number]} PresenceAnchor */
/**
 * @typedef PresencePeer
 * @property {string} id
 * @property {string} country
 * @property {string} color
 * @property {number} x
 * @property {number} y
 * @property {PresenceMode} mode
 * @property {PresenceAnchor | null} anchor
 * @property {number} updatedAt
 * @property {string | null} reaction
 * @property {number} reactionAt
 * @property {number} celebrationAt
 */
/**
 * @typedef {{ pageKey: string | null, hidden: boolean, admitted: boolean, connected: boolean,
 * stopped: boolean, pages: { key: string, path: string | null, title: string, count: number,
 * readers: { id: string, nick: string }[] }[],
 * otherCount: number }} PresenceSummary
 */
/**
 * @typedef {{ type: 'welcome', selfId: string, peers: PresencePeer[] }
 * | { type: 'snapshot', peers: PresencePeer[] }
 * | { type: 'join', peer: PresencePeer }
 * | { type: 'move', id: string, x: number, y: number, mode: PresenceMode, anchor: PresenceAnchor | null, now: number }
 * | { type: 'reaction', id: string, reaction: string, now: number }
 * | { type: 'leave', id: string }
 * | { type: 'celebration', id: string, now: number }
 * | { type: 'sitePage', key: string, count: number, title: string }
 * | { type: 'siteReader', id: string, key: string, nick: string }
 * | { type: 'siteReaderLeave', id: string }
 * | { type: 'chatNotice', id: string }
 * | { type: 'siteSnapshotComplete' }} PresenceFrame
 */

/** @param {unknown} value */
export function clampUnit(value) {
	const number = Number(value);
	if (!Number.isFinite(number)) return 0;
	return Math.min(1, Math.max(0, number));
}

/** @param {unknown} value */
export function normalizeCountry(value) {
	const country = typeof value === 'string' ? value.toUpperCase() : '';
	return COUNTRY_CODE.test(country) ? country : 'XX';
}

/** @param {string} country */
export function countryFlag(country) {
	const normalized = normalizeCountry(country);
	if (normalized === 'XX') return '🌐';
	return String.fromCodePoint(...[...normalized].map((letter) => 127397 + letter.charCodeAt(0)));
}

/** @param {string} country @param {Intl.DisplayNames | null} displayNames */
export function countryLabel(country, displayNames = null) {
	const normalized = normalizeCountry(country);
	if (normalized === 'XX') return 'Unknown country';
	try {
		return displayNames?.of(normalized) || normalized;
	} catch {
		return normalized;
	}
}

/**
 * Keep admission sticky for a page load/session so remounts do not roll the dice again.
 * @param {number} rate
 * @param {string | null} stored
 * @param {number} random
 */
export function decideAdmission(rate, stored, random = Math.random()) {
	if (stored === 'yes') return true;
	if (stored === 'no') return false;
	const boundedRate = clampUnit(rate);
	return boundedRate > 0 && random < boundedRate;
}

/**
 * @param {{ x: number, y: number, sentAt: number } | null} previous
 * @param {{ x: number, y: number }} next
 * @param {number} now
 * @param {number} minimumInterval
 * @param {number} minimumMovement
 */
export function shouldSendPosition(previous, next, now, minimumInterval, minimumMovement) {
	if (!previous) return true;
	if (now - previous.sentAt < minimumInterval) return false;
	const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
	return distance >= minimumMovement;
}

/** @param {unknown[]} values @param {number} start @returns {PresenceAnchor | null} */
function parseAnchor(values, start) {
	const anchor = values.slice(start, start + 4);
	const limits = [65_535, 10_000, 10_000, 4_294_967_295];
	return anchor.length === 4 &&
		anchor.every(
			(value, index) =>
				Number.isInteger(value) &&
				/** @type {number} */ (value) >= 0 &&
				/** @type {number} */ (value) <= limits[index]
		)
		? /** @type {PresenceAnchor} */ (anchor)
		: null;
}

/** @param {unknown[]} values @param {number} now */
function parsePeer(values, now) {
	const [id, country, color, x, y, mode] = values;
	if (
		typeof id !== 'string' ||
		id.length < 1 ||
		id.length > 24 ||
		typeof color !== 'string' ||
		!COLOR.test(color) ||
		typeof mode !== 'string' ||
		!MODES.has(mode) ||
		!Number.isFinite(Number(x)) ||
		!Number.isFinite(Number(y))
	)
		return null;
	return /** @type {PresencePeer} */ ({
		id,
		country: normalizeCountry(country),
		color,
		x: clampUnit(x),
		y: clampUnit(y),
		mode,
		anchor: parseAnchor(values, 6),
		updatedAt: now,
		reaction: null,
		reactionAt: 0,
		celebrationAt: 0
	});
}

/**
 * Parse server frames without allowing arbitrary server data into the UI.
 * Protocol: welcome, snapshot, join, move, reaction, leave, celebration.
 * @param {unknown} input
 * @param {number} [now]
 * @returns {PresenceFrame | null}
 */
export function parsePresenceFrame(input, now = Date.now()) {
	if (!Array.isArray(input) || input[0] !== 1 || typeof input[1] !== 'string') return null;
	const type = input[1];
	if (
		type === 'z' &&
		input.length === 3 &&
		typeof input[2] === 'string' &&
		/^[a-f0-9-]{36}$/.test(input[2])
	)
		return { type: 'chatNotice', id: input[2] };
	if (type === 'u' && input.length === 5) {
		const [, , id, key, value] = input;
		const nick = normalizePresenceNick(value);
		if (
			typeof id !== 'string' ||
			!/^[a-zA-Z0-9_-]{1,24}$/.test(id) ||
			typeof key !== 'string' ||
			!/^(?:page|article):[a-z0-9][a-z0-9_-]*$/.test(key) ||
			!nick
		)
			return null;
		return { type: 'siteReader', id, key, nick };
	}
	if (
		type === 'q' &&
		input.length === 3 &&
		typeof input[2] === 'string' &&
		/^[a-zA-Z0-9_-]{1,24}$/.test(input[2])
	)
		return { type: 'siteReaderLeave', id: input[2] };
	if (type === 'g' && input.length === 2) return { type: 'siteSnapshotComplete' };
	if (type === 'g') {
		const [, , key, count, title] = input;
		if (
			(input.length !== 4 && input.length !== 5) ||
			typeof key !== 'string' ||
			!/^(?:page|article):[a-z0-9][a-z0-9_-]*$/.test(key) ||
			typeof count !== 'number' ||
			!Number.isSafeInteger(count) ||
			count < 0 ||
			count > 32 ||
			(title !== undefined && typeof title !== 'string')
		)
			return null;
		return { type: 'sitePage', key, count, title: title || '' };
	}
	if (type === 'w' && typeof input[2] === 'string' && Array.isArray(input[3])) {
		/** @type {PresencePeer[]} */
		const peers = [];
		for (const value of input[3]) {
			const peer = Array.isArray(value) ? parsePeer(value, now) : null;
			if (peer) peers.push(peer);
		}
		return { type: 'welcome', selfId: input[2], peers };
	}
	if (type === 's' && Array.isArray(input[2])) {
		/** @type {PresencePeer[]} */
		const peers = [];
		for (const value of input[2]) {
			const peer = Array.isArray(value) ? parsePeer(value, now) : null;
			if (peer) peers.push(peer);
		}
		return { type: 'snapshot', peers };
	}
	if (type === 'j') {
		const peer = parsePeer(input.slice(2), now);
		return peer ? { type: 'join', peer } : null;
	}
	if (
		type === 'm' &&
		typeof input[2] === 'string' &&
		Number.isFinite(Number(input[3])) &&
		Number.isFinite(Number(input[4])) &&
		typeof input[5] === 'string' &&
		MODES.has(input[5])
	) {
		return {
			type: 'move',
			id: input[2],
			x: clampUnit(input[3]),
			y: clampUnit(input[4]),
			mode: /** @type {PresenceMode} */ (input[5]),
			anchor: parseAnchor(input, 6),
			now
		};
	}
	if (
		type === 'r' &&
		typeof input[2] === 'string' &&
		typeof input[3] === 'string' &&
		PRESENCE_REACTIONS.includes(/** @type {any} */ (input[3]))
	)
		return { type: 'reaction', id: input[2], reaction: input[3], now };
	if (type === 'l' && typeof input[2] === 'string') return { type: 'leave', id: input[2] };
	if (type === 'c' && typeof input[2] === 'string')
		return { type: 'celebration', id: input[2], now };
	return null;
}

/** @param {number} attempt @param {number} random */
export function reconnectDelay(attempt, random = Math.random()) {
	const base = Math.min(30_000, 1_000 * 2 ** Math.max(0, attempt));
	return Math.round(base * (0.75 + clampUnit(random) * 0.5));
}

/** @param {number} x @param {number} y @param {PresenceMode} mode @param {PresenceAnchor | null} [anchor] */
export function positionFrame(x, y, mode, anchor = null) {
	const position = [1, 'p', clampUnit(x), clampUnit(y), mode];
	const validated = anchor && parseAnchor(anchor, 0);
	return JSON.stringify(validated ? [...position, ...validated] : position);
}

/** @param {string} reaction */
export function reactionFrame(reaction) {
	if (!PRESENCE_REACTIONS.includes(/** @type {any} */ (reaction))) return null;
	return JSON.stringify([1, 'r', reaction]);
}

export function celebrationFrame() {
	return JSON.stringify([1, 'c']);
}

/** @param {string} value */
export function nicknameFrame(value) {
	const nick = normalizePresenceNick(value);
	return nick ? JSON.stringify([1, 'n', nick]) : null;
}
