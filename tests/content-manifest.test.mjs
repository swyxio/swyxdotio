import assert from 'node:assert/strict';
import test from 'node:test';

import {
	CONTENT_MANIFEST_KEY,
	decodeContentManifest,
	encodeContentManifest,
	isContentManifestStale,
	readContentManifest,
	writeContentManifest
} from '../src/lib/content-manifest.js';

const blogposts = [
	{
		type: 'blog',
		title: 'Durable content',
		slug: 'durable-content',
		date: new Date('2026-06-03T12:00:00.000Z')
	}
];

test('content manifest round-trips Date values', () => {
	const restored = decodeContentManifest(encodeContentManifest(blogposts));
	assert.deepEqual(restored.blogposts, blogposts);
	assert.ok(restored.generatedAt instanceof Date);
	assert.ok(restored.blogposts[0].date instanceof Date);
});

test('content manifest reads and writes a KV-compatible store', async () => {
	const values = new Map();
	const store = {
		async get(key) {
			return values.get(key) ?? null;
		},
		async put(key, value) {
			values.set(key, value);
		}
	};

	assert.equal(await readContentManifest(store), null);
	assert.equal(await writeContentManifest(store, blogposts), true);
	assert.ok(values.has(CONTENT_MANIFEST_KEY));
	assert.deepEqual((await readContentManifest(store))?.blogposts, blogposts);
});

test('content manifest ignores corrupt KV data so callers can refresh', async () => {
	const store = {
		async get() {
			return '{"version":1,"blogposts":"not-an-array"}';
		},
		async put() {}
	};

	assert.equal(await readContentManifest(store), null);
});

test('content manifest becomes stale after one day', () => {
	const manifest = decodeContentManifest(encodeContentManifest(blogposts));
	const twentyFiveHoursLater = new Date(manifest.generatedAt.valueOf() + 25 * 60 * 60 * 1000);
	assert.equal(isContentManifestStale(manifest, twentyFiveHoursLater), true);
});
