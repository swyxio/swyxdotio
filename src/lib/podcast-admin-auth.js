const encoder = new TextEncoder();
const COOKIE_NAME = 'swyx_podcast_studio';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * @param {ArrayBuffer} bytes
 * @returns {string}
 */
function toHex(bytes) {
	return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {unknown} left
 * @param {unknown} right
 * @returns {boolean}
 */
export function secretsMatch(left, right) {
	if (typeof left !== 'string' || typeof right !== 'string' || !left || !right) return false;
	const leftBytes = encoder.encode(left);
	const rightBytes = encoder.encode(right);
	let difference = leftBytes.length ^ rightBytes.length;
	const length = Math.max(leftBytes.length, rightBytes.length);

	for (let index = 0; index < length; index += 1) {
		difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
	}

	return difference === 0;
}

/**
 * @param {string} secret
 * @param {number} expiresAt
 * @returns {Promise<string>}
 */
async function signSession(secret, expiresAt) {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return toHex(
		await crypto.subtle.sign('HMAC', key, encoder.encode(`podcast-studio:${expiresAt}`))
	);
}

/**
 * @param {string} sessionSecret
 * @param {number} [now]
 * @returns {Promise<string>}
 */
export async function createPodcastStudioSession(sessionSecret, now = Date.now()) {
	const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
	return `${expiresAt}.${await signSession(sessionSecret, expiresAt)}`;
}

/**
 * @param {unknown} value
 * @param {string} sessionSecret
 * @param {number} [now]
 * @returns {Promise<boolean>}
 */
export async function isPodcastStudioSessionValid(value, sessionSecret, now = Date.now()) {
	if (typeof value !== 'string') return false;
	const [expiresAtText, signature, extra] = value.split('.');
	const expiresAt = Number(expiresAtText);
	if (extra || !Number.isInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return false;
	return secretsMatch(signature, await signSession(sessionSecret, expiresAt));
}

export function podcastStudioCookieName() {
	return COOKIE_NAME;
}

/**
 * @param {boolean} secure
 * @returns {Parameters<import('@sveltejs/kit').Cookies['set']>[2]}
 */
export function podcastStudioCookieOptions(secure) {
	return {
		httpOnly: true,
		path: '/tools',
		sameSite: 'strict',
		secure,
		maxAge: SESSION_TTL_SECONDS
	};
}
