import test from 'node:test';
import assert from 'node:assert/strict';

import {
	isAllowedPresenceRequest,
	normalizeCountryCode,
	resolvePresenceRoom
} from '../src/lib/presence-server.js';

const manifest = {
	generatedAt: new Date(),
	blogposts: [
		{ slug: 'public-post', title: 'Public', isPrivate: false },
		{ slug: 'private-post', title: 'Private', isPrivate: true }
	]
};

test('presence rooms are restricted to registered pages and public manifest articles', () => {
	assert.equal(resolvePresenceRoom(manifest, 'home'), 'page:home');
	assert.equal(resolvePresenceRoom(manifest, 'public-post'), 'article:public-post');
	assert.equal(resolvePresenceRoom(manifest, 'private-post'), null);
	assert.equal(resolvePresenceRoom(manifest, '../api'), null);
	assert.equal(resolvePresenceRoom(manifest, 'made-up-post'), null);
});

test('country normalization reveals only an ISO-shaped country code', () => {
	assert.equal(normalizeCountryCode('us'), 'US');
	assert.equal(normalizeCountryCode('GB'), 'GB');
	assert.equal(normalizeCountryCode('USA'), 'XX');
	assert.equal(normalizeCountryCode(undefined), 'XX');
});

test('presence ingress requires a same-origin browser WebSocket upgrade', () => {
	const headers = {
		origin: 'https://www.swyx.io',
		upgrade: 'websocket',
		'user-agent': 'Mozilla/5.0',
		'sec-fetch-site': 'same-origin'
	};
	assert.equal(
		isAllowedPresenceRequest(new Request('https://www.swyx.io/api/presence/home', { headers })),
		true
	);
	assert.equal(
		isAllowedPresenceRequest(
			new Request('https://www.swyx.io/api/presence/home', {
				headers: { ...headers, origin: 'https://evil.example' }
			})
		),
		false
	);
	assert.equal(
		isAllowedPresenceRequest(
			new Request('https://www.swyx.io/api/presence/home', {
				headers: { ...headers, 'user-agent': 'Googlebot' }
			})
		),
		false
	);
});
