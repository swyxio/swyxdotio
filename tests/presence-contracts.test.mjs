import assert from 'node:assert/strict';
import test from 'node:test';

import {
	PRESENCE_FRAME_LIMIT,
	PRESENCE_REACTIONS,
	clampPresenceCoordinate,
	consumePresenceToken,
	createPresenceRateState,
	normalizePresenceCountry,
	parsePresenceClientFrame,
	presenceAggregateDelta,
	presenceBucketStart,
	presenceFrame
} from '../src/lib/presence-contracts.js';

test('normalizes country codes without retaining arbitrary location data', () => {
	assert.equal(normalizePresenceCountry(' us '), 'US');
	assert.equal(normalizePresenceCountry('T1'), 'XX');
	assert.equal(normalizePresenceCountry('United States'), 'XX');
	assert.equal(normalizePresenceCountry(null), 'XX');
});

test('parses, enumerates, and clamps compact client frames', () => {
	assert.deepEqual(parsePresenceClientFrame('[1,"p",-2,1.4,"t"]'), {
		type: 'position',
		x: 0,
		y: 1,
		mode: 't'
	});
	assert.deepEqual(parsePresenceClientFrame('[1,"r","👋"]'), {
		type: 'reaction',
		reaction: '👋'
	});
	assert.deepEqual(parsePresenceClientFrame('[1,"c"]'), { type: 'share' });
	assert.equal(parsePresenceClientFrame('[1,"r","🔥"]'), null);
	assert.equal(parsePresenceClientFrame('[1,"p",null,0,"d"]'), null);
	assert.equal(parsePresenceClientFrame('[2,"c"]'), null);
	assert.equal(parsePresenceClientFrame('not json'), null);
	assert.deepEqual(PRESENCE_REACTIONS, ['👋', '❤️', '💡', '😂', '✨']);
	assert.equal(clampPresenceCoordinate(0.4), 0.4);
});

test('rejects oversized input and output frames', () => {
	assert.equal(parsePresenceClientFrame(`"${'x'.repeat(PRESENCE_FRAME_LIMIT)}"`), null);
	assert.throws(() => presenceFrame([1, 'x', 'x'.repeat(PRESENCE_FRAME_LIMIT)]), RangeError);
	assert.equal(
		presenceFrame([1, 'p', 'deadbeef', 0.5, 0.5, 'd']),
		'[1,"p","deadbeef",0.5,0.5,"d"]'
	);
});

test('token bucket allows burst ten and replenishes at five frames per second', () => {
	const state = createPresenceRateState(1_000);
	for (let index = 0; index < 10; index += 1)
		assert.equal(consumePresenceToken(state, 1_000), true);
	assert.equal(consumePresenceToken(state, 1_000), false);
	assert.equal(state.violations, 1);
	assert.equal(consumePresenceToken(state, 1_200), true);
	assert.equal(consumePresenceToken(state, 1_200), false);
});

test('presence aggregate persistence uses logarithmic checkpoints', () => {
	assert.deepEqual(
		Array.from({ length: 9 }, (_, index) => presenceAggregateDelta(index + 1)),
		[1, 1, 0, 2, 0, 0, 0, 4, 0]
	);
	assert.equal(presenceAggregateDelta(0), 0);
	assert.equal(presenceAggregateDelta(Number.MAX_SAFE_INTEGER + 1), 0);
	assert.equal(
		presenceBucketStart(Date.parse('2026-07-21T20:59:59.999Z')),
		Date.parse('2026-07-21T20:00:00Z') / 1000
	);
});
