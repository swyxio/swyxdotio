import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { AI_CONTENT_SIGNAL, buildArticleMarkdown, buildLlmsIndex } from '../src/lib/llms.js';

const publicPost = {
	type: 'blog',
	title: 'Learn in Public',
	slug: 'learn-in-public',
	category: 'Essay',
	description: 'The fastest way to learn.',
	date: new Date('2020-01-01T00:00:00.000Z'),
	content: '## Start learning\n\nShare what you know.'
};

test('AI discovery index contains canonical pages, public writing, and direct Markdown links', () => {
	const result = buildLlmsIndex([publicPost]);

	assert.match(result, /^# Shawn Wang \(swyx\)/);
	assert.match(result, /\[About\]\(https:\/\/swyx\.io\/about\)/);
	assert.match(result, /\[XML sitemap\]\(https:\/\/swyx\.io\/sitemap\.xml\)/);
	assert.match(result, /\[Learn in Public\]\(https:\/\/swyx\.io\/learn-in-public\)/);
	assert.match(result, /\[Markdown\]\(https:\/\/swyx\.io\/learn-in-public\.md\)/);
	assert.match(result, /The fastest way to learn\./);
});

test('AI discovery excludes private, duplicate, and externally canonical content', () => {
	const result = buildLlmsIndex([
		publicPost,
		{ ...publicPost, title: 'Duplicate' },
		{ ...publicPost, title: 'Private', slug: 'private', isPrivate: true },
		{
			...publicPost,
			title: 'External',
			slug: 'external',
			canonical: 'https://example.com/original'
		},
		{ ...publicPost, title: 'Speaking event', slug: 'speaking-event', type: 'speaking' },
		{ ...publicPost, title: 'Untyped podcast', slug: 'untyped-podcast', type: undefined }
	]);

	assert.equal((result.match(/\[Learn in Public\]/g) ?? []).length, 1);
	assert.doesNotMatch(
		result,
		/Duplicate|Private|External|Speaking event|Untyped podcast|example\.com/
	);
});

test('AI discovery excludes personal writing and drawing tools', () => {
	const result = buildLlmsIndex([publicPost]);

	assert.doesNotMatch(result, /\[(?:Box|Draw)\]|https:\/\/swyx\.io\/(?:box|draw)(?:\)|\/|\s)/);
});

test('article Markdown exposes original source, canonical attribution, and publication date', () => {
	const result = buildArticleMarkdown(publicPost);

	assert.match(result, /^# Learn in Public\n\nOriginal: https:\/\/swyx\.io\/learn-in-public/);
	assert.match(result, /Published: 2020-01-01/);
	assert.match(result, /> The fastest way to learn\./);
	assert.match(result, /## Start learning\n\nShare what you know\./);
});

test('article Markdown cannot expose private or externally canonical content', () => {
	assert.throws(() => buildArticleMarkdown({ ...publicPost, isPrivate: true }), /Cannot expose/);
	assert.throws(
		() => buildArticleMarkdown({ ...publicPost, canonical: 'https://example.com/original' }),
		/Cannot expose/
	);
});

test('crawler policy explicitly permits search and answer-engine retrieval without setting training policy', async () => {
	const robots = await readFile(new URL('../static/robots.txt', import.meta.url), 'utf8');

	assert.equal(AI_CONTENT_SIGNAL, 'search=yes, ai-input=yes');
	assert.match(robots, /^User-agent: \*$/m);
	assert.match(robots, /^Content-signal: search=yes, ai-input=yes$/m);
	assert.match(robots, /^Allow: \/$/m);
	assert.doesNotMatch(robots, /ai-train=|Disallow:\s*\//i);
});
