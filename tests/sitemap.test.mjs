import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSitemap, PUBLIC_PAGE_PATHS } from '../src/lib/sitemap.js';

test('sitemap emits every public page using the apex canonical host', () => {
	const xml = buildSitemap([]);
	for (const path of PUBLIC_PAGE_PATHS) {
		assert.match(xml, new RegExp(`<loc>https://swyx\\.io${path}</loc>`));
	}
	assert.doesNotMatch(xml, /www\.swyx\.io|changefreq|priority/);
});

test('sitemap adds article lastmod and excludes private and externally canonical posts', () => {
	const xml = buildSitemap([
		{
			title: 'Public',
			slug: 'public',
			category: 'essay',
			date: new Date('2020-01-01T00:00:00.000Z'),
			ghMetadata: { updated_at: new Date('2026-07-17T12:34:56.000Z') }
		},
		{
			title: 'Private',
			slug: 'private',
			category: 'note',
			date: new Date(),
			isPrivate: true
		},
		{
			title: 'External canonical',
			slug: 'external',
			category: 'note',
			date: new Date(),
			canonical: 'https://example.com/original'
		}
	]);

	assert.match(xml, /<loc>https:\/\/swyx\.io\/public<\/loc>/);
	assert.match(xml, /<lastmod>2026-07-17T12:34:56\.000Z<\/lastmod>/);
	assert.doesNotMatch(xml, /\/private|\/external|example\.com/);
});

test('sitemap normalizes internal legacy www canonicals to the apex host', () => {
	const xml = buildSitemap([
		{
			title: 'Legacy canonical',
			slug: 'legacy',
			category: 'note',
			date: new Date('2020-01-01T00:00:00.000Z'),
			canonical: 'https://www.swyx.io/preferred-path?old=1#section'
		}
	]);

	assert.match(xml, /<loc>https:\/\/swyx\.io\/preferred-path<\/loc>/);
	assert.doesNotMatch(xml, /<loc>https:\/\/www\.|old=1|#section/);
});
