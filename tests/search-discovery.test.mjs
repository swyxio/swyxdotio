import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { PUBLIC_PAGE_PATHS } from '../src/lib/sitemap.js';

const root = new URL('../', import.meta.url);

test('legacy discovery redirects are permanent and use valid archive category filters', async () => {
	const source = await readFile(new URL('_redirects', root), 'utf8');
	const redirects = source
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith('#'));

	assert.ok(redirects.length > 20);
	for (const redirect of redirects) {
		assert.match(redirect, /\s301$/, `${redirect} must permanently redirect`);
		assert.doesNotMatch(redirect, /\/ideas\/[?#]|show=(?:Talks|Essays|Podcasts)(?:\b|&)/);
	}
});

test('homepage archive links use valid categories and canonical article paths', async () => {
	const writing = await readFile(new URL('src/components/FeaturedWriting.svelte', root), 'utf8');
	const speaking = await readFile(new URL('src/components/FeaturedSpeaking.svelte', root), 'utf8');

	assert.match(writing, /href="\/ideas\?show=Essay"/);
	assert.match(speaking, /href="\/ideas\?show=Talk"/);
	assert.doesNotMatch(`${writing}\n${speaking}`, /href="\/ideas\/|show=(?:Talks|Essays|Podcasts)/);
	assert.doesNotMatch(writing, /href="\/(?:learn-in-public|create-luck|js-third-age|about)\/"/);
});

test('personal writing and drawing tools prohibit indexing and stay out of discovery', async () => {
	assert.equal(PUBLIC_PAGE_PATHS.includes('/box'), false);
	assert.equal(PUBLIC_PAGE_PATHS.includes('/draw'), false);
	for (const tool of ['box', 'draw']) {
		const source = await readFile(new URL(`src/routes/${tool}/+page.svelte`, root), 'utf8');
		assert.match(source, /<meta name="robots" content="noindex, nofollow, noarchive"\s*\/>/);
		assert.doesNotMatch(source, /rel="canonical"/);
	}

	const hooks = await readFile(new URL('src/hooks.server.js', root), 'utf8');
	assert.match(hooks, /'X-Robots-Tag', 'noindex, nofollow, noarchive'/);
});

test('identity and portfolio pages each expose a visible primary heading', async () => {
	const about = await readFile(new URL('src/routes/about/+page.svelte', root), 'utf8');
	const portfolio = await readFile(new URL('src/routes/portfolio/content.md', root), 'utf8');

	assert.match(about, /<h1>Shawn Wang \(swyx\)<\/h1>/);
	assert.match(portfolio, /^# Advising and Investing Portfolio$/m);
});
