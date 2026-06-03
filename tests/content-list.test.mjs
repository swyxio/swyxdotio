import assert from 'node:assert/strict';
import test from 'node:test';

import { toContentListItem, toSearchContentItem } from '../src/lib/content-list.js';

const post = {
	type: 'blog',
	content: 'full article body',
	frontmatter: { title: 'from frontmatter' },
	title: 'Compact lists',
	description: '[metadata] only',
	slug: 'compact-lists',
	category: 'note',
	isPrivate: true,
	date: new Date('2026-06-03T12:00:00.000Z')
};

test('default content list excludes article bodies and frontmatter', () => {
	const item = toContentListItem(post);
	assert.equal(item.content, undefined);
	assert.equal(item.frontmatter, undefined);
	assert.equal(item.description, ' metadata  only');
	assert.equal(item.isPrivate, true);
	assert.equal(post.content, 'full article body');
});

test('lazy search corpus preserves article bodies but excludes frontmatter', () => {
	const item = toSearchContentItem(post);
	assert.equal(item.content, 'full article body');
	assert.equal(item.frontmatter, undefined);
	assert.equal(item.description, ' metadata  only');
});
