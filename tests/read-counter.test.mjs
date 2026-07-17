import assert from 'node:assert/strict';
import test from 'node:test';

import {
	isObviousBot,
	isSameOriginRead,
	normalizeReadCount,
	publicPageKeyForPath,
	resolveReadCounterKey
} from '../src/lib/read-counter.js';

const manifest = {
	generatedAt: new Date(),
	blogposts: [
		{ slug: 'learn-in-public', title: 'Learn in Public', date: new Date('2018-06-19') },
		{ slug: 'secret-note', title: 'Secret', date: new Date(), isPrivate: true }
	]
};

test('maps only registered public page paths', () => {
	assert.equal(publicPageKeyForPath('/'), 'home');
	assert.equal(publicPageKeyForPath('/about/'), 'about');
	assert.equal(publicPageKeyForPath('/tools'), null);
	assert.equal(publicPageKeyForPath('/api/reads'), null);
});

test('resolves finite page keys and persisted public articles', () => {
	assert.equal(resolveReadCounterKey(manifest, 'home'), 'page:home');
	assert.equal(resolveReadCounterKey(manifest, 'learn-in-public'), 'article:learn-in-public');
	assert.equal(resolveReadCounterKey(manifest, 'secret-note'), null);
	assert.equal(resolveReadCounterKey(manifest, 'unknown-note'), null);
	assert.equal(resolveReadCounterKey(manifest, '../escape'), null);
});

test('rejects bot-like and missing user agents', () => {
	assert.equal(isObviousBot('Mozilla/5.0 Chrome/126 Safari/537.36'), false);
	assert.equal(isObviousBot('Twitterbot/1.0'), true);
	assert.equal(isObviousBot(null), true);
});

test('accepts only matching browser origins', () => {
	assert.equal(
		isSameOriginRead(
			new Request('https://www.swyx.io/api/reads/home', {
				headers: { origin: 'https://www.swyx.io', 'sec-fetch-site': 'same-origin' }
			})
		),
		true
	);
	assert.equal(
		isSameOriginRead(
			new Request('https://www.swyx.io/api/reads/home', {
				headers: { origin: 'https://example.com', 'sec-fetch-site': 'cross-site' }
			})
		),
		false
	);
});

test('normalizes invalid database counts safely', () => {
	assert.equal(normalizeReadCount(12), 12);
	assert.equal(normalizeReadCount('12'), 12);
	assert.equal(normalizeReadCount(-1), 0);
	assert.equal(normalizeReadCount('nope'), 0);
});
