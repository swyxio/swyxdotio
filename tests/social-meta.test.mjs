import assert from 'node:assert/strict';
import test from 'node:test';

import {
	OG_DESIGN_VERSION,
	PAGE_SOCIAL_CARDS,
	getArticleSocialMeta,
	getPageSocialMeta
} from '../src/lib/social-meta.js';

test('defines metadata for every public non-article page', () => {
	assert.deepEqual(Object.keys(PAGE_SOCIAL_CARDS), [
		'home',
		'about',
		'ideas',
		'podcasts',
		'portfolio',
		'subscribe'
	]);

	for (const key of Object.keys(PAGE_SOCIAL_CARDS)) {
		const metadata = getPageSocialMeta(key);
		assert.equal(metadata.type, 'website');
		assert.match(metadata.canonical, /^https:\/\/www\.swyx\.io\//);
		assert.equal(metadata.image, `https://www.swyx.io/og/page/${key}.png?v=${OG_DESIGN_VERSION}`);
		assert.ok(metadata.title);
		assert.ok(metadata.description);
		assert.ok(metadata.imageAlt);
	}
});

test('article metadata owns its image URL and versions it from GitHub updates', () => {
	const metadata = getArticleSocialMeta(
		{
			title: 'Pick Up What They Put Down',
			description: 'Translations welcome!',
			slug: 'pick-up-what-they-put-down',
			category: 'note',
			date: new Date('2026-07-16T00:00:00.000Z'),
			image: 'https://example.com/explicit-image.png',
			ghMetadata: {
				updated_at: new Date('2026-07-17T12:34:56.000Z')
			}
		},
		'https://www.swyx.io/pick-up-what-they-put-down'
	);

	assert.equal(metadata.type, 'article');
	assert.equal(metadata.canonical, 'https://www.swyx.io/pick-up-what-they-put-down');
	assert.equal(
		metadata.image,
		'https://www.swyx.io/og/article/pick-up-what-they-put-down.png?v=2026-07-17T12%3A34%3A56.000Z-1'
	);
	assert.doesNotMatch(metadata.image, /example\.com/);
});
