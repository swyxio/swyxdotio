import test from 'node:test';
import assert from 'node:assert/strict';
import { readingThreadFor } from '../src/lib/reading-threads.js';

test('curated threads appear only for their chosen essays and never link to the current essay', () => {
	for (const slug of [
		'learn-in-public',
		'create-luck',
		'part-time-creator-manifesto',
		'notice-me',
		'cognition',
		'ai-eng-agents',
		'ai-landscape'
	]) {
		const thread = readingThreadFor(slug);
		assert.ok(thread);
		assert.equal(thread.articles.length, 3);
		assert.ok(thread.articles.every(({ href }) => href !== `/${slug}`));
		assert.equal(new Set(thread.articles.map(({ href }) => href)).size, thread.articles.length);
	}
	assert.equal(readingThreadFor('america250'), undefined);
});
