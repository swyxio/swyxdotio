import assert from 'node:assert/strict';
import test from 'node:test';
import { chatRateKey } from '../src/lib/chat-server.js';
import { admitPresenceConnection, presenceRateKey } from '../src/lib/presence-rate.js';

test('presence admission uses a separate, rotating keyed digest instead of a raw address', async () => {
	const secret = 'test secret';
	const address = '192.0.2.1';
	const first = await presenceRateKey(secret, address, '2026-10-20');
	assert.match(first, /^[a-f0-9]{64}$/);
	assert.equal(first, await presenceRateKey(secret, address, '2026-10-20'));
	assert.notEqual(first, await presenceRateKey(secret, address, '2026-10-21'));
	assert.notEqual(first, await presenceRateKey('different secret', address, '2026-10-20'));
	assert.notEqual(first, await chatRateKey(secret, address, '2026-10-20'));
	assert.ok(!first.includes(address));
});

test('ingress rate limiting uses only the digest and fails closed on errors', async () => {
	const seen = [];
	const limiter = {
		async limit(input) {
			seen.push(input);
			return { success: false };
		}
	};
	const options = { secret: 'secret', limiter };
	const result = await admitPresenceConnection(
		options,
		'192.0.2.1',
		new Date('2026-10-20T12:00:00Z')
	);
	assert.equal(result.allowed, false);
	assert.deepEqual(seen, [{ key: result.rateKey }]);
	assert.equal(result.previousRateKey, await presenceRateKey('secret', '192.0.2.1', '2026-10-19'));
	assert.ok(!JSON.stringify(seen).includes('192.0.2.1'));
	await assert.rejects(admitPresenceConnection(options, ''));
	await assert.rejects(
		admitPresenceConnection(
			{
				...options,
				limiter: {
					limit: async () => {
						throw new Error('unavailable');
					}
				}
			},
			'192.0.2.1'
		)
	);
});
