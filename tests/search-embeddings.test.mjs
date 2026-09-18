import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
	reserveEmbeddingBudget,
	MONTHLY_BUDGET_MICROS,
	INPUT_RESERVATION_MICROS,
	quantize,
	cosine,
	validVector,
	semanticMatches
} from '../src/lib/server/search-embeddings.js';
import { createSearchIndex, projectSearchCatalog } from '../src/lib/server/site-search.js';
function database() {
	const db = new DatabaseSync(':memory:');
	db.exec(
		readFileSync(
			new URL('../migrations/read-counters/0006_create_search_embeddings.sql', import.meta.url),
			'utf8'
		)
	);
	return {
		raw: db,
		prepare(sql) {
			let values = [];
			const stmt = {
				bind(...args) {
					values = args;
					return stmt;
				},
				async first() {
					return db.prepare(sql).get(...values) || null;
				},
				async all() {
					return { results: db.prepare(sql).all(...values), success: true };
				}
			};
			return stmt;
		}
	};
}
test('atomic monthly reservations cannot overrun the cap and reset at UTC month boundaries', async () => {
	const db = database(),
		now = new Date('2026-09-30T23:59:59Z');
	db.raw
		.prepare('INSERT INTO search_embedding_budget VALUES(?,?)')
		.run('2026-09', MONTHLY_BUDGET_MICROS - INPUT_RESERVATION_MICROS * 3);
	const accepted = await Promise.all(
		Array.from({ length: 20 }, () => reserveEmbeddingBudget(db, 1, now))
	);
	assert.equal(accepted.filter(Boolean).length, 3);
	assert.equal(
		db.raw
			.prepare('SELECT reserved_micros FROM search_embedding_budget WHERE month=?')
			.get('2026-09').reserved_micros,
		MONTHLY_BUDGET_MICROS
	);
	assert.equal(await reserveEmbeddingBudget(db, 1, new Date('2026-10-01T00:00:00Z')), true);
	assert.equal(await reserveEmbeddingBudget(db, 0, now), false);
	db.raw.close();
});
test('quantized embeddings preserve similarity and reject malformed or zero vectors', () => {
	const v = Array.from({ length: 384 }, (_, i) => Math.sin(i));
	assert(cosine(v, quantize(v)) > 0.99);
	assert(validVector(v));
	assert(!validVector(v.slice(1)));
	assert(!validVector(Array(384).fill(0)));
	assert(!validVector([...v.slice(1), NaN]));
});
test('unavailable provider or vector store retains BM25 without an AI call', async () => {
	const catalog = createSearchIndex(projectSearchCatalog([{ title: 'Example', slug: 'example' }]));
	let calls = 0;
	const AI = {
		async run() {
			calls++;
			throw new Error('offline');
		}
	};
	assert.equal(await semanticMatches(catalog, undefined, 'query'), null);
	assert.equal(
		await semanticMatches(
			catalog,
			{
				env: {
					AI,
					READ_COUNTERS: {
						prepare() {
							throw new Error('offline');
						}
					}
				}
			},
			'query'
		),
		null
	);
	assert.equal(calls, 0);
});

test('capped or failing inference cannot disable BM25 or bypass reservations', async () => {
	const { warmEmbeddings } = await import('../src/lib/server/search-embeddings.js');
	const db = database();
	let calls = 0;
	const vector = Array.from({ length: 384 }, (_, i) => (i === 0 ? 1 : 0));
	const env = {
		READ_COUNTERS: db,
		AI: {
			async run() {
				calls++;
				return { data: [vector] };
			}
		}
	};
	const catalog = createSearchIndex(projectSearchCatalog([{ title: 'Test', slug: 'test' }]));
	// A one-record catalog still includes common destinations. Populate only one
	// vector directly to isolate inference behavior from the backfill.
	const { embeddingKey, embeddingText, EMBEDDING_VERSION } =
		await import('../src/lib/server/search-embeddings.js');
	const passage = catalog.passages.find((p) => p.record.slug === 'test');
	db.raw
		.prepare('INSERT INTO search_embeddings VALUES(?,?,?)')
		.run(embeddingKey(embeddingText(passage)), EMBEDDING_VERSION, JSON.stringify(quantize(vector)));
	const month = new Date().toISOString().slice(0, 7);
	db.raw
		.prepare('INSERT INTO search_embedding_budget VALUES(?,?)')
		.run(month, MONTHLY_BUDGET_MICROS);
	assert.equal(await semanticMatches(catalog, { env }, 'new unseen query'), null);
	assert.equal(calls, 0);
	db.raw.prepare('UPDATE search_embedding_budget SET reserved_micros=0').run();
	env.AI.run = async () => {
		calls++;
		throw new Error('Provider offline');
	};
	assert.equal(await semanticMatches(catalog, { env }, 'another unseen query'), null);
	assert.equal(calls, 1);
	assert.equal(
		db.raw.prepare('SELECT reserved_micros FROM search_embedding_budget').get().reserved_micros,
		INPUT_RESERVATION_MICROS
	);
	db.raw.close();
});

test('compressed vector snapshots preserve vectors, reject invalid models, and avoid cold D1 scans', async () => {
	const {
		encodeVectorSnapshot,
		decodeVectorSnapshot,
		VECTOR_SNAPSHOT_KEY,
		embeddingKey,
		embeddingText
	} = await import('../src/lib/server/search-embeddings.js');
	const items = [
		{
			title: 'Conference Advice',
			slug: 'advice',
			content: '## Pick a Topic\n\nConference topic selection.'
		}
	];
	const catalog = createSearchIndex(projectSearchCatalog(items), items);
	const passage = catalog.passages.find((p) => p.anchor === 'pick-a-topic');
	const vector = Array.from({ length: 384 }, (_, i) => (i === 0 ? 127 : 0));
	const entries = new Map([[embeddingKey(embeddingText(passage)), vector]]);
	const encoded = encodeVectorSnapshot(entries);
	assert.deepEqual(decodeVectorSnapshot(encoded), entries);
	assert(encoded.length < JSON.stringify([...entries]).length);
	assert.throws(() => decodeVectorSnapshot('broken'));
	let scans = 0,
		calls = 0;
	const env = {
		READ_COUNTERS: {
			prepare() {
				scans++;
				throw new Error('D1 should not be scanned for a cached query');
			}
		},
		CONTENT_MANIFEST: {
			async get(key) {
				return key === VECTOR_SNAPSHOT_KEY ? encoded : JSON.stringify(vector);
			}
		},
		AI: {
			async run() {
				calls++;
				throw new Error('Cached query should not use inference');
			}
		}
	};
	const matched = await semanticMatches(catalog, { env }, 'presentation topics');
	assert.equal(matched[0].id, passage.id);
	assert.equal(scans, 0);
	assert.equal(calls, 0);
	const edited = createSearchIndex(
		projectSearchCatalog([{ ...items[0], content: '## Changed\n\nNew unrelated body.' }]),
		[{ ...items[0], content: '## Changed\n\nNew unrelated body.' }]
	);
	assert.equal(await semanticMatches(edited, { env }, 'presentation topics'), null);
});
