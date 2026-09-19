import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { reserveAiBudget, MONTHLY_BUDGET_MICROS } from '../src/lib/server/ai-budget.js';
import { reserveEmbeddingBudget } from '../src/lib/server/search-embeddings.js';

test('answers and embeddings share existing spend and one atomic monthly gate', async () => {
	const raw = new DatabaseSync(':memory:');
	raw.exec(
		readFileSync(
			new URL('../migrations/read-counters/0006_create_search_embeddings.sql', import.meta.url),
			'utf8'
		)
	);
	raw
		.prepare('INSERT INTO search_embedding_budget VALUES (?,?)')
		.run('2026-09', MONTHLY_BUDGET_MICROS - 820);
	const db = {
		prepare(sql) {
			let args = [];
			const s = {
				bind(...v) {
					args = v;
					return s;
				},
				async first() {
					return raw.prepare(sql).get(...args) || null;
				}
			};
			return s;
		}
	};
	const now = new Date('2026-09-18T00:00:00Z');
	assert.equal(await reserveAiBudget(db, 800, 'answer', now), true);
	assert.equal(await reserveEmbeddingBudget(db, 1, now), true);
	assert.equal(await reserveAiBudget(db, 800, 'answer', now), false);
	assert.equal(await reserveEmbeddingBudget(db, 1, now), false);
	assert.equal(await reserveAiBudget(db, -1, 'answer', now), false);
	assert.equal(await reserveAiBudget(db, 800, 'answer', new Date('2026-10-01T00:00:00Z')), true);
	raw.close();
});
