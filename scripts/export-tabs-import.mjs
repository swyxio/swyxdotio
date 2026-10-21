#!/usr/bin/env node
// Produce a private D1 import file from the local reader's hydrated API. The
// file contains personal browsing data and must remain outside the repository.
import { randomUUID } from 'node:crypto';
import { open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { safeCapturedUrl } from '../src/lib/tab-review.js';

const source = process.argv[2];
const output = process.argv[3];
if (!source || !output)
	throw new Error(
		'Usage: node scripts/export-tabs-import.mjs http://127.0.0.1:PORT /private/path/import.sql'
	);
const origin = new URL(source);
if (
	origin.protocol !== 'http:' ||
	!['127.0.0.1', 'localhost'].includes(origin.hostname) ||
	origin.pathname !== '/' ||
	origin.search ||
	origin.hash
)
	throw new Error('The source must be a local reader origin.');
if (resolve(output).startsWith(`${process.cwd()}/`))
	throw new Error('Keep the private import file outside this repository.');

async function read(path, allowMissing = false) {
	const response = await fetch(new URL(path, origin), { redirect: 'error' });
	if (allowMissing && response.status === 404) return { text: '' };
	if (!response.ok) throw new Error(`Local reader request failed (${response.status}).`);
	return response.json();
}
const sql = (value) => (value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`);
const maxStatementBytes = 95_000; // D1's limit is 100,000, including SQL syntax.
const chunkBytes = 36_000;
const directBytes = 28_000;
const stagingTable = `_tabs_import_${randomUUID().replaceAll('-', '')}`;

// Chunk by escaped SQL bytes and Unicode code point, so no UTF-8 sequence or
// apostrophe escape can be split. JSON.stringify already escapes NUL/newlines.
function* chunks(value) {
	let chunk = '';
	let bytes = 0;
	for (const character of value) {
		const size = Buffer.byteLength(character) + (character === "'" ? 1 : 0);
		if (chunk && bytes + size > chunkBytes) {
			yield chunk;
			chunk = '';
			bytes = 0;
		}
		chunk += character;
		bytes += size;
	}
	if (chunk || !value) yield chunk;
}
let redacted = 0;
function cleanUrls(value) {
	if (Array.isArray(value)) return value.map(cleanUrls);
	if (!value || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value).map(([key, child]) => {
			if (/url$/i.test(key) && typeof child === 'string') {
				const cleaned = safeCapturedUrl(child);
				if (cleaned !== child) redacted++;
				return [key, cleaned];
			}
			return [key, cleanUrls(child)];
		})
	);
}

const { batches } = await read('/api/batches');
const file = await open(output, 'wx', 0o600);
const counts = [];
let largestStatementBytes = 0;
async function writeStatement(statement) {
	const bytes = Buffer.byteLength(statement);
	if (bytes > maxStatementBytes)
		throw new Error('An import SQL statement exceeds the safe D1 size limit.');
	largestStatementBytes = Math.max(largestStatementBytes, bytes);
	await file.writeFile(`${statement}\n`);
}

// Large values are reassembled from ordered chunks before inserting the row.
// A distinct staging table per generated file keeps retries idempotent and
// avoids collisions with another import; successful imports remove it.
async function importValue(value, batchId, itemId, kind) {
	const quoted = sql(value);
	if (Buffer.byteLength(quoted) <= directBytes) return quoted;
	let sequence = 0;
	for (const chunk of chunks(value)) {
		await writeStatement(
			`INSERT INTO ${stagingTable} (batch_id,item_id,kind,seq,value) VALUES (${sql(batchId)},${sql(itemId)},${sql(kind)},${sequence++},${sql(chunk)}) ON CONFLICT(batch_id,item_id,kind,seq) DO NOTHING;`
		);
	}
	return `(SELECT group_concat(value,'') FROM (SELECT value FROM ${stagingTable} WHERE batch_id=${sql(batchId)} AND item_id=${sql(itemId)} AND kind=${sql(kind)} ORDER BY seq))`;
}

async function clearChunks(batchId, itemId) {
	await writeStatement(
		`DELETE FROM ${stagingTable} WHERE batch_id=${sql(batchId)} AND item_id=${sql(itemId)};`
	);
}

let complete = false;
try {
	await writeStatement(
		`CREATE TABLE IF NOT EXISTS ${stagingTable} (batch_id TEXT NOT NULL,item_id TEXT NOT NULL,kind TEXT NOT NULL,seq INTEGER NOT NULL,value TEXT NOT NULL,PRIMARY KEY(batch_id,item_id,kind,seq));`
	);
	for (const batch of batches) {
		const query = `?batch=${encodeURIComponent(batch.id)}`;
		const [library, triage] = await Promise.all([
			read(`/api/library${query}`),
			read(`/api/triage${query}`)
		]);
		const { items, ...metadata } = library;
		const metadataJson = await importValue(
			JSON.stringify(cleanUrls(metadata)),
			batch.id,
			'',
			'metadata'
		);
		await writeStatement(
			`INSERT INTO batches (id,name,captured_at,metadata_json) VALUES (${sql(batch.id)},${sql(batch.name)},${sql(batch.capturedAt || metadata.generatedAt)},${metadataJson}) ON CONFLICT(id) DO NOTHING;`
		);
		await clearChunks(batch.id, '');
		let index = 0;
		let textCount = 0;
		let summaryCount = 0;
		const lines = new Array(items.length);
		async function worker() {
			while (index < items.length) {
				const current = index++;
				const item = items[current];
				const page = cleanUrls(await read(`/api/page/${item.id}${query}`, true));
				if (page.text) textCount++;
				if (item.summary) summaryCount++;
				const status = ['unread', 'read', 'followup', 'archived'].includes(triage[item.id]?.status)
					? triage[item.id].status
					: 'unread';
				lines[current] = {
					id: item.id,
					itemJson: JSON.stringify(cleanUrls(item)),
					pageJson: JSON.stringify(page),
					status,
					updatedAt: triage[item.id]?.updatedAt
				};
			}
		}
		await Promise.all(Array.from({ length: 12 }, () => worker()));
		for (const line of lines) {
			// D1 also limits a complete row to 2 MB. Fail before emitting an
			// import that could silently leave a captured page behind.
			if (
				Buffer.byteLength(line.itemJson) +
					Buffer.byteLength(line.pageJson) +
					Buffer.byteLength(batch.id) +
					Buffer.byteLength(line.id) >
				1_900_000
			)
				throw new Error('An item and its saved page exceed the safe D1 row size limit.');
			const itemJson = await importValue(line.itemJson, batch.id, line.id, 'item');
			const pageJson = await importValue(line.pageJson, batch.id, line.id, 'page');
			await writeStatement(
				`INSERT INTO items (batch_id,id,item_json,page_json,status,updated_at) VALUES (${sql(batch.id)},${sql(line.id)},${itemJson},${pageJson},${sql(line.status)},${sql(line.updatedAt)}) ON CONFLICT(batch_id,id) DO NOTHING;`
			);
			await clearChunks(batch.id, line.id);
		}
		counts.push({ id: batch.id, items: items.length, text: textCount, summaries: summaryCount });
	}
	await writeStatement(`DROP TABLE ${stagingTable};`);
	complete = true;
} finally {
	await file.close();
	if (!complete) await unlink(output).catch(() => {});
}
console.log(
	JSON.stringify({ batches: counts, redactedUrlFields: redacted, largestStatementBytes })
);
