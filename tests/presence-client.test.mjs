import assert from 'node:assert/strict';
import test from 'node:test';
import {
	celebrationFrame,
	countryFlag,
	decideAdmission,
	normalizeCountry,
	parsePresenceFrame,
	positionFrame,
	reactionFrame,
	reconnectDelay,
	shouldSendPosition
} from '../src/lib/presence-client.js';

test('country codes are normalized without exposing more location data', () => {
	assert.equal(normalizeCountry('us'), 'US');
	assert.equal(normalizeCountry('USA'), 'XX');
	assert.equal(countryFlag('US'), '🇺🇸');
	assert.equal(countryFlag('XX'), '🌐');
});

test('admission remains sticky and clamps its configured rate', () => {
	assert.equal(decideAdmission(0.1, 'yes', 0.99), true);
	assert.equal(decideAdmission(1, 'no', 0), false);
	assert.equal(decideAdmission(0.1, null, 0.09), true);
	assert.equal(decideAdmission(0.1, null, 0.11), false);
	assert.equal(decideAdmission(4, null, 0.99), true);
});

test('desktop position sampling requires both elapsed time and movement', () => {
	const previous = { x: 0.1, y: 0.1, sentAt: 1_000 };
	assert.equal(shouldSendPosition(previous, { x: 0.5, y: 0.5 }, 1_100, 250, 0.01), false);
	assert.equal(shouldSendPosition(previous, { x: 0.105, y: 0.105 }, 1_300, 250, 0.01), false);
	assert.equal(shouldSendPosition(previous, { x: 0.12, y: 0.1 }, 1_300, 250, 0.01), true);
});

test('protocol parser accepts enumerated compact frames and rejects arbitrary data', () => {
	const welcome = parsePresenceFrame([1, 'w', 'me', [['peer', 'ca', '#2563eb', 0.2, 0.4, 'd']]]);
	assert.equal(welcome?.type, 'welcome');
	assert.equal(welcome?.peers[0].country, 'CA');
	assert.equal(parsePresenceFrame([1, 'r', 'peer', '🔥']), null);
	assert.equal(parsePresenceFrame([1, 'm', 'peer', Infinity, 0, 'd']), null);
	assert.equal(parsePresenceFrame({ event: 'move' }), null);
});

test('outgoing frames stay compact and reaction values are fixed', () => {
	assert.equal(positionFrame(4, -2, 'd'), '[1,"p",1,0,"d"]');
	assert.equal(reactionFrame('👋'), '[1,"r","👋"]');
	assert.equal(reactionFrame('🔥'), null);
	assert.equal(celebrationFrame(), '[1,"c"]');
	assert.ok(positionFrame(0.123, 0.456, 't').length < 128);
});

test('reconnect backoff is jittered and capped around thirty seconds', () => {
	assert.equal(reconnectDelay(0, 0), 750);
	assert.equal(reconnectDelay(0, 1), 1_250);
	assert.equal(reconnectDelay(20, 0), 22_500);
	assert.equal(reconnectDelay(20, 1), 37_500);
});
