import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveArticleCard } from '../src/lib/og/article.js';
import { formatCardDate, getPageCard, titleSize, truncateTitle } from '../src/lib/og/cards.js';
import { fetchCardImage } from '../src/lib/og/images.js';
import { renderNotebookTemplate } from '../src/lib/og/template.js';

test('page registry covers every public non-article card variant', () => {
	assert.deepEqual(
		['home', 'about', 'ideas', 'podcasts', 'portfolio', 'subscribe'].map(
			(key) => getPageCard(key)?.kind
		),
		['identity', 'identity', 'collection', 'audio', 'portfolio', 'newsletter']
	);
	assert.equal(getPageCard('tools'), null);
});

test('title sizing and truncation are deterministic', () => {
	assert.equal(titleSize('a'.repeat(35)), 76);
	assert.equal(titleSize('a'.repeat(36)), 64);
	assert.equal(titleSize('a'.repeat(66)), 54);
	assert.equal(titleSize('a'.repeat(96)), 48);
	assert.equal(truncateTitle('a'.repeat(111)).length, 110);
	assert.ok(truncateTitle('a'.repeat(111)).endsWith('…'));
});

test('article card resolution rejects invalid, unknown, and private slugs', () => {
	const manifest = {
		generatedAt: new Date(),
		blogposts: [
			{
				title: 'A public notebook entry',
				description: 'A useful description.',
				category: 'essay',
				slug: 'public-entry',
				date: new Date('2026-07-17T00:00:00Z')
			},
			{
				title: 'Private',
				category: 'note',
				slug: 'private-entry',
				date: new Date(),
				isPrivate: true
			}
		]
	};

	assert.equal(resolveArticleCard(manifest, 'unknown'), null);
	assert.equal(resolveArticleCard(manifest, 'private-entry'), null);
	assert.equal(resolveArticleCard(manifest, '../escape'), null);
	assert.deepEqual(resolveArticleCard(manifest, 'public-entry'), {
		kind: 'article',
		title: 'A public notebook entry',
		description: 'A useful description.',
		label: 'essay',
		date: 'Jul 17, 2026',
		image: undefined,
		imageAlt: undefined,
		titleSize: 76,
		annotation: 'swyx’s public notebook'
	});
});

test('invalid dates are omitted', () => {
	assert.equal(formatCardDate('not-a-date'), undefined);
});

test('frontmatter images require bounded successful HTTPS image responses', async () => {
	const image = await fetchCardImage(
		'https://images.example/card.png',
		async () =>
			new Response(new Uint8Array([137, 80, 78, 71]), {
				headers: { 'content-type': 'image/png', 'content-length': '4' }
			})
	);
	assert.equal(image, 'data:image/png;base64,iVBORw==');
	assert.equal(await fetchCardImage('http://images.example/card.png', fetch), undefined);
	assert.equal(
		await fetchCardImage(
			'https://images.example/card.svg',
			async () => new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } })
		),
		undefined
	);
});

test('frontmatter image timeout returns even when fetch ignores abort signals', async () => {
	const neverSettles = () => new Promise(() => {});
	const started = Date.now();
	assert.equal(await fetchCardImage('https://example.com/slow.png', neverSettles, 10), undefined);
	assert.ok(Date.now() - started < 250);
});

test('raw notebook templates escape article text and preserve unicode', () => {
	const html = renderNotebookTemplate(
		{
			kind: 'article',
			title: '<script>alert("nope")</script> — Português',
			description: 'Use <strong>plain text</strong> safely.',
			label: 'essay',
			date: 'Jul 17, 2026',
			titleSize: 64,
			annotation: 'swyx’s public notebook'
		},
		'data:image/png;base64,iVBORw0KGgo='
	);

	assert.doesNotMatch(html, /<script>/);
	assert.match(html, /‹script›alert\("nope"\)‹\/script› — Português/);
	assert.match(html, /Use ‹strong›plain text‹\/strong› safely\./);
});
