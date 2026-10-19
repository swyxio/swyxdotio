import test from 'node:test';
import assert from 'node:assert/strict';
import { articleNeighbors } from '../src/lib/article-neighbors.js';

const post = (slug, date, extra = {}) => ({ slug, title: slug, date, category: 'essay', ...extra });

test('finds closest public articles in both chronological directions', () => {
	const posts = [
		post('old', '2020-01-01'),
		post('new', '2024-01-01'),
		post('middle', '2022-01-01'),
		post('hidden', '2023-01-01', { isPrivate: true }),
		post('older', '2019-01-01'),
		post('newer', '2025-01-01')
	];
	assert.deepEqual(articleNeighbors(posts, 'middle'), {
		newer: [
			{ slug: 'new', title: 'new' },
			{ slug: 'newer', title: 'newer' }
		],
		older: [
			{ slug: 'old', title: 'old' },
			{ slug: 'older', title: 'older' }
		]
	});
	assert.deepEqual(articleNeighbors(posts, 'missing'), { newer: [], older: [] });
});
