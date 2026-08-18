import assert from 'node:assert/strict';
import test from 'node:test';

import {
	hasReadFunnelPrivacyOptOut,
	incrementReadFunnelStage,
	isArticleReadFunnelKey,
	isReadFunnelClientStage,
	isReadFunnelRateAllowed,
	normalizeReadFunnelPayload,
	READ_FUNNEL_ACCEPTED_STAGE
} from '../src/lib/read-funnel.js';

test('accepts only the finite pathless client-stage contract', () => {
	for (const stage of ['eligible', 'visible_8s', 'depth_25', 'sample_selected']) {
		assert.equal(isReadFunnelClientStage(stage), true);
		assert.deepEqual(normalizeReadFunnelPayload({ stage }), { stage });
	}
	assert.equal(isReadFunnelClientStage(READ_FUNNEL_ACCEPTED_STAGE), false);
	assert.equal(normalizeReadFunnelPayload({ stage: READ_FUNNEL_ACCEPTED_STAGE }), null);
	assert.equal(normalizeReadFunnelPayload({ stage: 'eligible', path: '/private' }), null);
	assert.equal(normalizeReadFunnelPayload({ stage: 'eligible', clientId: 'reader' }), null);
});

test('honors browser privacy opt-outs', () => {
	assert.equal(hasReadFunnelPrivacyOptOut({}), false);
	assert.equal(hasReadFunnelPrivacyOptOut({ doNotTrack: '1' }), true);
	assert.equal(hasReadFunnelPrivacyOptOut({ doNotTrack: 'yes' }), true);
	assert.equal(hasReadFunnelPrivacyOptOut({ globalPrivacyControl: true }), true);
});

test('records accepted funnel writes only for canonical article keys', () => {
	assert.equal(isArticleReadFunnelKey('article:learn-in-public'), true);
	assert.equal(isArticleReadFunnelKey('page:home'), false);
	assert.equal(isArticleReadFunnelKey('learn-in-public'), false);
	assert.equal(isArticleReadFunnelKey(null), false);
});

test('increments one server-owned hourly stage without path or identity bindings', async () => {
	let query = '';
	let bindings = [];
	const database = {
		prepare(sql) {
			query = sql;
			return {
				bind(...values) {
					bindings = values;
					return this;
				},
				async first() {
					return { count: 4 };
				}
			};
		}
	};
	assert.equal(await incrementReadFunnelStage(database, 'visible_8s', 7_201), 4);
	assert.match(query, /INSERT INTO read_funnel_hourly/);
	assert.match(query, /ON CONFLICT\(bucket_start, stage\)/);
	assert.deepEqual(bindings, [7_200, 'visible_8s']);
	await assert.rejects(() => incrementReadFunnelStage(database, '/article', 7_201), TypeError);
});

test('uses a dedicated ephemeral limiter and fails closed only when configured', async () => {
	assert.equal(await isReadFunnelRateAllowed({}, 'unknown'), true);
	const keys = [];
	assert.equal(
		await isReadFunnelRateAllowed(
			{
				READ_FUNNEL_RATE_LIMITER: {
					async limit({ key }) {
						keys.push(key);
						return { success: true };
					}
				}
			},
			'203.0.113.5'
		),
		true
	);
	assert.deepEqual(keys, ['ip:203.0.113.5']);
	assert.equal(
		await isReadFunnelRateAllowed(
			{
				READ_FUNNEL_RATE_LIMITER: {
					async limit() {
						throw new Error('offline');
					}
				}
			},
			'203.0.113.5'
		),
		false
	);
});
