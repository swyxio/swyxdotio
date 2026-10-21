import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalPresencePath } from '../src/lib/read-counter.js';
import {
	celebrationFrame,
	countryFlag,
	decideAdmission,
	normalizeCountry,
	nicknameFrame,
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

test('article anchors extend frames while old or malformed anchors fall back safely', () => {
	const anchor = [42, 5000, 7500, 12345678];
	const position = JSON.parse(positionFrame(0.1, 0.2, 'd', anchor));
	assert.deepEqual(position, [1, 'p', 0.1, 0.2, 'd', ...anchor]);
	const move = parsePresenceFrame([1, 'm', 'peer', 0.1, 0.2, 'd', ...anchor]);
	assert.deepEqual(move?.anchor, anchor);
	const snapshot = parsePresenceFrame([
		1,
		's',
		[['peer', 'us', '#2563eb', 0.1, 0.2, 'd', ...anchor]]
	]);
	assert.deepEqual(snapshot?.peers[0].anchor, anchor);
	const oldSnapshot = parsePresenceFrame([1, 's', [['peer', 'us', '#2563eb', 0.1, 0.2, 'd']]]);
	assert.equal(oldSnapshot?.peers[0].anchor, null);
	assert.equal(parsePresenceFrame([1, 'm', 'peer', 0.1, 0.2, 'd', 42, 5001, -1, 3])?.anchor, null);
	assert.deepEqual(JSON.parse(positionFrame(0.1, 0.2, 'd', [42, -1, 4, 5])), [
		1,
		'p',
		0.1,
		0.2,
		'd'
	]);
});

test('sitewide presence frames reject invalid pages and counts', () => {
	assert.deepEqual(parsePresenceFrame([1, 'g', 'article:america250', 2, 'What America means']), {
		type: 'sitePage',
		key: 'article:america250',
		count: 2,
		title: 'What America means'
	});
	assert.deepEqual(parsePresenceFrame([1, 'g', 'page:home', 0]), {
		type: 'sitePage',
		key: 'page:home',
		count: 0,
		title: ''
	});
	assert.deepEqual(parsePresenceFrame([1, 'g']), { type: 'siteSnapshotComplete' });
	for (const frame of [
		[1, 'g', 'article:../private', 1],
		[1, 'g', 'page:home?secret=1', 1],
		[1, 'g', 'page:home', -1],
		[1, 'g', 'page:home', 33],
		[1, 'g', 'page:home', 1.5],
		[1, 'g', 'page:home', 1, {}]
	])
		assert.equal(parsePresenceFrame(frame), null);
});

test('named readers are validated and leave by their ephemeral socket ID', () => {
	assert.deepEqual(parsePresenceFrame([1, 'u', 'abc123', 'page:home', 'Ada']), {
		type: 'siteReader',
		id: 'abc123',
		key: 'page:home',
		nick: 'Ada'
	});
	assert.deepEqual(parsePresenceFrame([1, 'q', 'abc123']), {
		type: 'siteReaderLeave',
		id: 'abc123'
	});
	assert.equal(parsePresenceFrame([1, 'u', 'abc123', 'article:../private', 'Ada']), null);
	assert.equal(parsePresenceFrame([1, 'u', 'abc123', 'page:home', 'bad\u202ename']), null);
	assert.equal(parsePresenceFrame([1, 'u', 'abc123', 'page:home', 'x'.repeat(25)]), null);
	assert.equal(nicknameFrame('  Ada  '), '[1,"n","Ada"]');
	assert.equal(nicknameFrame(''), null);
	assert.deepEqual(parsePresenceFrame([1, 'z', '00000000-0000-4000-8000-000000000001']), {
		type: 'chatNotice',
		id: '00000000-0000-4000-8000-000000000001'
	});
	assert.equal(parsePresenceFrame([1, 'z', 'message text']), null);
});

test('registered pages and identically named articles have distinct links', () => {
	assert.equal(canonicalPresencePath('page:home'), '/');
	assert.equal(canonicalPresencePath('article:home'), '/home');
	assert.equal(canonicalPresencePath('page:unknown'), null);
	assert.equal(canonicalPresencePath('article:../private'), null);
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
