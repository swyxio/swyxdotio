import { PRESENCE_MODES, PRESENCE_REACTIONS } from './presence-contracts.js';

export { PRESENCE_REACTIONS } from './presence-contracts.js';

export const PRESENCE_VISIBILITY_KEY = 'swyx:live-readers:hidden:v1';
export const PRESENCE_ADMISSION_PREFIX = 'swyx:live-readers:admitted:v1:';
export const PRESENCE_SHARE_REQUEST_EVENT = 'swyx:open-share-menu';
export const PRESENCE_SHARE_CELEBRATION_EVENT = 'swyx:share-celebration';
const COUNTRY_CODE = /^[A-Z]{2}$/;
const COLOR = /^#[0-9a-f]{6}$/i;
const MODES = new Set(PRESENCE_MODES);

/** @typedef {'d' | 'r' | 't'} PresenceMode */
/**
 * @typedef PresencePeer
 * @property {string} id
 * @property {string} country
 * @property {string} color
 * @property {number} x
 * @property {number} y
 * @property {PresenceMode} mode
 * @property {number} updatedAt
 * @property {string | null} reaction
 * @property {number} reactionAt
 * @property {number} celebrationAt
 */
/**
 * @typedef {{ type: 'welcome', selfId: string, peers: PresencePeer[] }
 * | { type: 'snapshot', peers: PresencePeer[] }
 * | { type: 'join', peer: PresencePeer }
 * | { type: 'move', id: string, x: number, y: number, mode: PresenceMode, now: number }
 * | { type: 'reaction', id: string, reaction: string, now: number }
 * | { type: 'leave', id: string }
 * | { type: 'celebration', id: string, now: number }} PresenceFrame
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

/** @param {number} x @param {number} y @param {PresenceMode} mode */
export function positionFrame(x, y, mode) {
	return JSON.stringify([1, 'p', clampUnit(x), clampUnit(y), mode]);
}

/** @param {string} reaction */
export function reactionFrame(reaction) {
	if (!PRESENCE_REACTIONS.includes(/** @type {any} */ (reaction))) return null;
	return JSON.stringify([1, 'r', reaction]);
}

export function celebrationFrame() {
	return JSON.stringify([1, 'c']);
}
