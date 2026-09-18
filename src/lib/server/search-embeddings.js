import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync, strToU8, strFromU8 } from 'fflate';

export const EMBEDDING_MODEL = '@cf/baai/bge-small-en-v1.5';
export const EMBEDDING_VERSION = 'bge-small-cls-v1';
export const MONTHLY_BUDGET_MICROS = 10_000_000;
// 512 tokens × $0.0202 / million = $0.0000103424. Reserve $0.000020
// per input, including failures/timeouts. Never refund ambiguous provider work.
export const INPUT_RESERVATION_MICROS = 20;
/** @typedef {ReturnType<import('./site-search.js').createSearchIndex>} Catalog */
/** @typedef {NonNullable<App.Platform['env']>} Environment */
/** @param {string} text */
export const embeddingKey = (text) =>
	createHash('sha256').update(`${EMBEDDING_VERSION}\n${text}`).digest('hex');
/** @param {Catalog['passages'][number]} passage */
export const embeddingText = (passage) =>
	`${passage.record.title}\n${passage.heading}\n${passage.text}`.slice(0, 2000);
/** @param {unknown} vector @returns {vector is number[]} */
export function validVector(vector) {
	return (
		Array.isArray(vector) &&
		vector.length === 384 &&
		vector.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
		vector.some((n) => n !== 0)
	);
}
/** @param {number[]} vector */
export function quantize(vector) {
	const norm = Math.hypot(...vector);
	return vector.map((n) => Math.round((n / norm) * 127));
}
/** @param {number[]} a @param {number[]} b */
export function cosine(a, b) {
	let dot = 0,
		aa = 0,
		bb = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		aa += a[i] * a[i];
		bb += b[i] * b[i];
	}
	return dot / Math.sqrt(aa * bb);
}
/** Atomic across isolates: the only gate before every search embedding call.
 * @param {D1Database} db @param {number} count @param {Date} [now]
 */
export async function reserveEmbeddingBudget(db, count, now = new Date()) {
	const amount = count * INPUT_RESERVATION_MICROS;
	if (!Number.isInteger(count) || count < 1 || amount > MONTHLY_BUDGET_MICROS) return false;
	const row = await db
		.prepare(
			`INSERT INTO search_embedding_budget(month,reserved_micros)
 VALUES(?,?) ON CONFLICT(month) DO UPDATE SET reserved_micros=reserved_micros+excluded.reserved_micros
 WHERE reserved_micros+excluded.reserved_micros<=? RETURNING reserved_micros`
		)
		.bind(now.toISOString().slice(0, 7), amount, MONTHLY_BUDGET_MICROS)
		.first();
	return !!row;
}
/** @param {Environment} env @param {string[]} texts @returns {Promise<number[][]|null>} */
async function embed(env, texts) {
	if (
		!env.AI ||
		!env.READ_COUNTERS ||
		!(await reserveEmbeddingBudget(env.READ_COUNTERS, texts.length))
	)
		return null;
	const response = /** @type {{data?:unknown[]}} */ (
		await env.AI.run(EMBEDDING_MODEL, { text: texts, pooling: 'cls' })
	);
	if (response.data?.length !== texts.length || !response.data.every(validVector))
		throw new Error('Invalid search embedding response');
	return response.data.map((vector) => quantize(/** @type {number[]} */ (vector)));
}
/** @type {Map<string,number[]>} */
let vectors = new Map();
let refreshedAt = 0;
/** @type {D1Database|undefined} */
let vectorDatabase;
/** @type {Promise<void>|undefined} */
let loading;
export const VECTOR_SNAPSHOT_KEY = `search-vector-snapshot:${EMBEDDING_VERSION}`;
/** @param {Map<string,number[]>} entries */
export function encodeVectorSnapshot(entries) {
	return Buffer.from(
		gzipSync(strToU8(JSON.stringify({ model: EMBEDDING_VERSION, entries: [...entries] })))
	).toString('base64');
}
/** @param {string} encoded @returns {Map<string,number[]>} */
export function decodeVectorSnapshot(encoded) {
	const data = JSON.parse(strFromU8(gunzipSync(new Uint8Array(Buffer.from(encoded, 'base64')))));
	if (data.model !== EMBEDDING_VERSION || !Array.isArray(data.entries))
		throw new Error('Invalid search vector snapshot');
	const next = new Map();
	for (const [key, vector] of data.entries) {
		if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key) || !validVector(vector))
			throw new Error('Invalid cached search vector');
		next.set(key, vector);
	}
	return next;
}
/** @param {D1Database} db */
async function readVectors(db) {
	const data = await db
		.prepare('SELECT key,vector FROM search_embeddings WHERE model=?')
		.bind(EMBEDDING_VERSION)
		.all();
	if (!data.success) throw new Error('Search embedding index unavailable');
	/** @type {Map<string,number[]>} */
	const next = new Map();
	for (const row of data.results) {
		const vector = JSON.parse(String(row.vector));
		if (validVector(vector)) next.set(String(row.key), vector);
	}
	return next;
}
/** Publish a derivative cache from the authoritative database. No model call.
 * @param {Environment} env
 */
export async function publishVectorSnapshot(env) {
	if (!env.READ_COUNTERS || !env.CONTENT_MANIFEST) return null;
	const next = await readVectors(env.READ_COUNTERS);
	const encoded = encodeVectorSnapshot(next);
	await env.CONTENT_MANIFEST.put(VECTOR_SNAPSHOT_KEY, encoded);
	vectors = next;
	vectorDatabase = env.READ_COUNTERS;
	refreshedAt = Date.now();
	return { indexed: next.size, bytes: encoded.length };
}
/** @param {Environment} env */
async function refresh(env) {
	const db = env.READ_COUNTERS;
	if (!db || (db === vectorDatabase && Date.now() - refreshedAt < 60_000)) return;
	if (!loading)
		loading = (async () => {
			const cached = await env.CONTENT_MANIFEST?.get(VECTOR_SNAPSHOT_KEY);
			vectors = cached ? decodeVectorSnapshot(cached) : await readVectors(db);
			vectorDatabase = db;
			refreshedAt = Date.now();
		})().finally(() => {
			loading = undefined;
		});
	await loading;
}
/** Populate one bounded batch, off the request path. Hashes prevent old bodies
 * from entering a new public catalog; only vectors (no article/query text) persist.
 * @param {Catalog} catalog @param {Environment} env
 */
export async function warmEmbeddings(catalog, env) {
	await refresh(env);
	const missing = catalog.passages
		.map((p) => ({ text: embeddingText(p), key: embeddingKey(embeddingText(p)) }))
		.filter((p) => !vectors.has(p.key));
	let batch = [...new Map(missing.map((p) => [p.key, p])).values()].slice(0, 32);
	if (!batch.length) return { remaining: 0, indexed: vectors.size };
	// A KV snapshot can lag concurrent writers. Consult D1 for these hashes before
	// charging for inference again; the batched lookup stays below 100 SQL bindings.
	if (env.READ_COUNTERS) {
		const existing = await env.READ_COUNTERS.prepare(
			`SELECT key,vector FROM search_embeddings WHERE model=? AND key IN (${batch.map(() => '?').join(',')})`
		)
			.bind(EMBEDDING_VERSION, ...batch.map((p) => p.key))
			.all();
		if (!existing.success) throw new Error('Search vector lookup unavailable');
		for (const row of existing.results) {
			const vector = JSON.parse(String(row.vector));
			if (validVector(vector)) vectors.set(String(row.key), vector);
		}
		batch = batch.filter((p) => !vectors.has(p.key));
		if (!batch.length) {
			await publishVectorSnapshot(env);
			return {
				remaining: missing.filter((p) => !vectors.has(p.key)).length,
				indexed: vectors.size
			};
		}
	}
	const result = await embed(
		env,
		batch.map((p) => p.text)
	);
	if (!result || !env.READ_COUNTERS)
		return { remaining: missing.length, indexed: vectors.size, capped: true };
	const placeholders = batch.map(() => '(?,?,?)').join(',');
	const values = batch.flatMap((p, i) => [p.key, EMBEDDING_VERSION, JSON.stringify(result[i])]);
	const saved = await env.READ_COUNTERS.prepare(
		`INSERT INTO search_embeddings(key,model,vector) VALUES ${placeholders} ON CONFLICT(key) DO NOTHING RETURNING key`
	)
		.bind(...values)
		.all();
	if (!saved.success) throw new Error('Search embeddings could not persist');
	batch.forEach((p, i) => vectors.set(p.key, result[i]));
	await publishVectorSnapshot(env);
	return { remaining: missing.length - batch.length, indexed: vectors.size };
}
/** @type {Promise<unknown>|undefined} */
let warming;
/** @param {Catalog} catalog @param {App.Platform|undefined} platform */
export function scheduleEmbeddingWarmup(catalog, platform) {
	if (!platform?.env?.AI || !platform.context || warming) return;
	warming = warmEmbeddings(catalog, platform.env)
		.catch(() => {})
		.finally(() => {
			warming = undefined;
		});
	platform.context.waitUntil(warming);
}
/** @type {Map<string,Promise<number[]|null>>} */
const queries = new Map();
/** @param {Environment} env @param {string} q */
async function queryVector(env, q) {
	const text = `Represent this sentence for searching relevant passages: ${q}`;
	const key = `search-query:${embeddingKey(text)}`;
	if (queries.has(key)) return queries.get(key);
	const pending = (async () => {
		const cached = await env.CONTENT_MANIFEST?.get(key);
		if (cached) {
			const vector = JSON.parse(cached);
			if (validVector(vector)) return vector;
		}
		const result = await embed(env, [text]);
		if (!result) return null;
		await env.CONTENT_MANIFEST?.put(key, JSON.stringify(result[0]), { expirationTtl: 86400 * 30 });
		return result[0];
	})();
	queries.set(key, pending);
	try {
		return await pending;
	} finally {
		queries.delete(key);
	}
}
/** Provider/index/budget failure leaves the complete BM25 engine available.
 * @param {Catalog} catalog @param {App.Platform|undefined} platform @param {string} q
 * @returns {Promise<{id:string,score:number}[]|null>}
 */
export async function semanticMatches(catalog, platform, q) {
	const env = platform?.env;
	if (!q || !env?.AI || !env.READ_COUNTERS) return null;
	let timer;
	try {
		const work = (async () => {
			await refresh(env);
			const available = catalog.passages.filter((p) => vectors.has(embeddingKey(embeddingText(p))));
			if (!available.length) return null;
			const query = await queryVector(env, q);
			if (!query) return null;
			return available
				.map((p) => ({
					id: p.id,
					score: cosine(
						query,
						/** @type {number[]} */ (vectors.get(embeddingKey(embeddingText(p))))
					)
				}))
				.filter((p) => p.score >= 0.6)
				.sort((a, b) => b.score - a.score)
				.slice(0, 100);
		})();
		// A deadline must not abandon a budgeted call before it caches its result.
		platform?.context?.waitUntil(work.then(() => {}).catch(() => {}));
		return await Promise.race([
			work,
			/** @type {Promise<null>} */ (
				new Promise((resolve) => {
					timer = setTimeout(() => resolve(null), 900);
				})
			)
		]);
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}
