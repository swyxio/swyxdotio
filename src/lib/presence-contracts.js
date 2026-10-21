export const PRESENCE_PROTOCOL_VERSION = 1;
export const PRESENCE_FRAME_LIMIT = 128;
export const PRESENCE_ROOM_LIMIT = 32;
export const PRESENCE_REACTIONS = Object.freeze(['👋', '❤️', '💡', '😂', '✨']);
export const PRESENCE_MODES = Object.freeze(['d', 'r', 't']);
export const PRESENCE_NICK_LIMIT = 24;
export const PRESENCE_NICK_INTERVAL_MS = 2_000;
// The protocol deliberately rejects control and bidirectional override characters.
// eslint-disable-next-line no-control-regex
const NICK_CONTROL = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;

/** @param {unknown} value */
export function normalizePresenceNick(value) {
	if (typeof value !== 'string') return null;
	const nick = value.trim();
	return nick && nick.length <= PRESENCE_NICK_LIMIT && !NICK_CONTROL.test(nick) ? nick : null;
}

export const PRESENCE_COLORS = Object.freeze([
	'#2563EB',
	'#C0392B',
	'#059669',
	'#7C3AED',
	'#D97706',
	'#0891B2',
	'#DB2777',
	'#4F46E5',
	'#65A30D',
	'#EA580C',
	'#0D9488',
	'#9333EA',
	'#CA8A04',
	'#0284C7',
	'#E11D48',
	'#16A34A',
	'#6D28D9',
	'#B45309',
	'#0E7490',
	'#BE185D',
	'#4338CA',
	'#4D7C0F',
	'#C2410C',
	'#0F766E',
	'#7E22CE',
	'#A16207',
	'#0369A1',
	'#BE123C',
	'#15803D',
	'#5B21B6',
	'#92400E',
	'#155E75'
]);

/** @param {number} value */
export function clampPresenceCoordinate(value) {
	return Math.min(1, Math.max(0, value));
}

/** @param {unknown} value */
export function normalizePresenceCountry(value) {
	if (typeof value !== 'string') return 'XX';
	const country = value.trim().toUpperCase();
	return /^[A-Z]{2}$/.test(country) ? country : 'XX';
}

/** @param {unknown} value */
export function presenceFrame(value) {
	const encoded = JSON.stringify(value);
	if (new TextEncoder().encode(encoded).byteLength > PRESENCE_FRAME_LIMIT) {
		throw new RangeError(`Presence frame exceeds ${PRESENCE_FRAME_LIMIT} bytes`);
	}
	return encoded;
}

/**
 * Parse the deliberately tiny client protocol. Returning null means the socket
 * sent a malformed or unsupported frame and should be closed with 1008.
 */
/** @param {unknown} raw */
export function parsePresenceClientFrame(raw) {
	if (typeof raw !== 'string') return null;
	if (new TextEncoder().encode(raw).byteLength > PRESENCE_FRAME_LIMIT) return null;

	let frame;
	try {
		frame = JSON.parse(raw);
	} catch {
		return null;
	}

	if (!Array.isArray(frame) || frame[0] !== PRESENCE_PROTOCOL_VERSION) return null;

	if (frame[1] === 'p') {
		if (
			(frame.length !== 5 && frame.length !== 9) ||
			typeof frame[2] !== 'number' ||
			!Number.isFinite(frame[2]) ||
			typeof frame[3] !== 'number' ||
			!Number.isFinite(frame[3]) ||
			!PRESENCE_MODES.includes(frame[4])
		) {
			return null;
		}
		if (
			frame.length === 9 &&
			(!Number.isInteger(frame[5]) ||
				frame[5] < 0 ||
				frame[5] > 65_535 ||
				!Number.isInteger(frame[6]) ||
				frame[6] < 0 ||
				frame[6] > 10_000 ||
				!Number.isInteger(frame[7]) ||
				frame[7] < 0 ||
				frame[7] > 10_000 ||
				!Number.isInteger(frame[8]) ||
				frame[8] < 0 ||
				frame[8] > 4_294_967_295)
		)
			return null;

		return {
			type: 'position',
			x: Math.round(clampPresenceCoordinate(frame[2]) * 10_000) / 10_000,
			y: Math.round(clampPresenceCoordinate(frame[3]) * 10_000) / 10_000,
			mode: frame[4],
			...(frame.length === 9 ? { anchor: frame.slice(5) } : {})
		};
	}

	if (frame[1] === 'r') {
		if (frame.length !== 3 || !PRESENCE_REACTIONS.includes(frame[2])) return null;
		return { type: 'reaction', reaction: frame[2] };
	}

	if (frame[1] === 'n' && frame.length === 3) {
		const nick = normalizePresenceNick(frame[2]);
		return nick ? { type: 'nick', nick } : null;
	}

	if (frame[1] === 'c' && frame.length === 2) return { type: 'share' };

	return null;
}

/**
 * @typedef {{ tokens: number, replenishedAt: number, reactionAt: number, nickAt: number, shared: boolean, violations: number }} PresenceRateState
 */

/** @param {number} [now] @returns {PresenceRateState} */
export function createPresenceRateState(now = Date.now()) {
	return { tokens: 10, replenishedAt: now, reactionAt: 0, nickAt: 0, shared: false, violations: 0 };
}

/** Consume one incoming frame from a 5 frames/second, burst-10 token bucket. */
/** @param {PresenceRateState} state @param {number} [now] */
export function consumePresenceToken(state, now = Date.now()) {
	const elapsed = Math.max(0, now - state.replenishedAt);
	state.tokens = Math.min(10, state.tokens + (elapsed * 5) / 1000);
	state.replenishedAt = now;
	if (state.tokens < 1) {
		state.violations += 1;
		return false;
	}
	state.tokens -= 1;
	state.violations = Math.max(0, state.violations - 1);
	return true;
}

/**
 * Returns the aggregate delta to persist at power-of-two checkpoints. This
 * bounds write amplification while keeping the stored count exact at each
 * checkpoint and a lower bound between checkpoints.
 * @param {number} count
 */
export function presenceAggregateDelta(count) {
	if (!Number.isSafeInteger(count) || count < 1 || !Number.isInteger(Math.log2(count))) return 0;
	return count === 1 ? 1 : count / 2;
}

/** @param {number} nowMs */
export function presenceBucketStart(nowMs) {
	return Math.floor(nowMs / 3_600_000) * 3_600;
}
