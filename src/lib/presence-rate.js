/**
 * A separately scoped, rotating keyed address digest for admission controls.
 * The raw address must not be sent to a Durable Object, logged, or persisted.
 * @param {string} secret
 * @param {string} address
 * @param {string} [day]
 */
export async function presenceRateKey(
	secret,
	address,
	day = new Date().toISOString().slice(0, 10)
) {
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
		new TextEncoder().encode(`swyx-presence-rate:${day}:${address}`)
	);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {{ secret: string, limiter: RateLimit }} options
 * @param {string} address
 * @param {Date} [now]
 */
export async function admitPresenceConnection({ secret, limiter }, address, now = new Date()) {
	if (!address) throw new Error('Missing client address');
	const day = now.toISOString().slice(0, 10);
	const previousDay = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
	const [rateKey, previousRateKey] = await Promise.all([
		presenceRateKey(secret, address, day),
		presenceRateKey(secret, address, previousDay)
	]);
	const allowed = (await limiter.limit({ key: rateKey })).success;
	return { allowed, rateKey, previousRateKey };
}
