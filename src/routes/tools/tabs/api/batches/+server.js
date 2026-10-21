import { error, json } from '@sveltejs/kit';
import { requireTabsDatabase } from '$lib/server/tabs-auth.js';
import { makeCapturedItems } from '$lib/tab-review.js';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const db = await requireTabsDatabase(event);
	const result = await db
		.prepare(
			`SELECT b.id, b.name, b.captured_at AS capturedAt, COUNT(i.id) AS count
		FROM batches b LEFT JOIN items i ON i.batch_id = b.id
		GROUP BY b.id ORDER BY b.captured_at DESC, b.name`
		)
		.all();
	return json({ batches: result.results });
}

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	const db = await requireTabsDatabase(event);
	const length = Number(event.request.headers.get('content-length') || 0);
	if (length > 2_000_000) throw error(413, 'The capture is larger than 2 MB.');
	const body = await event.request.text();
	if (new TextEncoder().encode(body).byteLength > 2_000_000)
		throw error(413, 'The capture is larger than 2 MB.');
	let input;
	try {
		input = JSON.parse(body);
	} catch {
		throw error(400, 'Choose a valid capture file.');
	}
	const capturedAt = new Date().toISOString();
	let items;
	try {
		items = await makeCapturedItems(input?.tabs, capturedAt);
	} catch (reason) {
		throw error(400, reason instanceof Error ? reason.message : 'Invalid capture.');
	}
	const name =
		typeof input.name === 'string' && input.name.trim()
			? input.name.trim().slice(0, 120)
			: `Capture ${capturedAt.slice(0, 10)}`;
	const id = `capture-${crypto.randomUUID()}`;
	const batch = { id, name, capturedAt, count: items.length };
	const metadata = {
		generatedAt: capturedAt,
		totalTabs: input.tabs.length,
		uniqueTabs: items.length,
		duplicateTabs: input.tabs.length - items.length
	};
	// Chunk bound JSON below D1's per-value limit; the batch commits atomically.
	const statements = [
		db
			.prepare('INSERT INTO batches (id,name,captured_at,metadata_json) VALUES (?,?,?,?)')
			.bind(id, name, capturedAt, JSON.stringify(metadata))
	];
	let chunk = [];
	let bytes = 2;
	for (const item of items) {
		const size = new TextEncoder().encode(JSON.stringify(item)).byteLength + 1;
		if (size > 900_000) throw error(413, 'A captured tab has too much metadata.');
		if (bytes + size > 900_000) {
			statements.push(
				db
					.prepare(
						`INSERT INTO items (batch_id,id,item_json) SELECT ?, json_extract(value, '$.id'), value FROM json_each(?)`
					)
					.bind(id, JSON.stringify(chunk))
			);
			chunk = [];
			bytes = 2;
		}
		chunk.push(item);
		bytes += size;
	}
	if (chunk.length)
		statements.push(
			db
				.prepare(
					`INSERT INTO items (batch_id,id,item_json) SELECT ?, json_extract(value, '$.id'), value FROM json_each(?)`
				)
				.bind(id, JSON.stringify(chunk))
		);
	await db.batch(statements);
	return json({ batch }, { status: 201 });
}
