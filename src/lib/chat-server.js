/**
 * An unlinkable-per-day rate-limit key. Raw client addresses must never be
 * forwarded to the chat object or included in its storage or telemetry.
 * @param {string} secret
 * @param {string} address
 * @param {string} day
 */
export async function chatRateKey(secret, address, day = new Date().toISOString().slice(0, 10)) {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const digest = await crypto.subtle.sign(
		'HMAC',
		key,
		new TextEncoder().encode(`swyx-chat-rate:${day}:${address}`)
	);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
