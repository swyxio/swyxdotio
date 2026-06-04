import assert from 'node:assert/strict';
import test from 'node:test';

import {
	RESERVED_BLOG_SLUGS,
	assertBlogSlug,
	isBlogSlug,
	normalizeBlogSlug
} from '../src/lib/slug.js';

test('blog slugs accept normal top-level article paths', () => {
	for (const slug of [
		'learn-in-public',
		'cloudflare-go',
		'2026-review',
		'master_to_main',
		'podcast'
	]) {
		assert.equal(isBlogSlug(slug), true);
		assert.equal(assertBlogSlug(slug), slug);
	}
});

test('blog slug normalization lowercases values before validation', () => {
	assert.equal(normalizeBlogSlug('Learn-In-Public'), 'learn-in-public');
	assert.equal(assertBlogSlug('Learn-In-Public'), 'learn-in-public');
});

test('blog slugs reject site routes and reserved route prefixes', () => {
	for (const slug of RESERVED_BLOG_SLUGS) {
		assert.equal(isBlogSlug(slug), false);
		assert.throws(() => assertBlogSlug(slug), /Invalid or reserved blog slug/);
		assert.throws(() => assertBlogSlug(slug.toUpperCase()), /Invalid or reserved blog slug/);
	}
});

test('blog slugs reject malformed paths', () => {
	for (const slug of ['', 'api/revalidate', 'two words', '../about', 'ranking-#1-on-hn']) {
		assert.equal(isBlogSlug(slug), false);
		assert.throws(() => assertBlogSlug(slug), /Invalid or reserved blog slug/);
	}
});
