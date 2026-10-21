import { error, json } from '@sveltejs/kit';
import { requireTabsDatabase } from '$lib/server/tabs-auth.js';

/** @param {D1Database} db @param {string} batch @param {string} id */
async function getItem(db, batch, id) {
	const row = await db
		.prepare(
			'SELECT item_json, page_json, status, note, updated_at FROM items WHERE batch_id = ? AND id = ?'
		)
		.bind(batch, id)
		.first();
	if (!row) throw error(404, 'Page not found in this batch.');
	return {
		item: JSON.parse(/** @type {string} */ (row.item_json)),
		page: JSON.parse(/** @type {string} */ (row.page_json)),
		status: row.status,
		note: row.note,
		updatedAt: row.updated_at
	};
}

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const db = await requireTabsDatabase(event);
	return json(await getItem(db, event.params.batch, event.params.id));
}

/** @type {import('./$types').RequestHandler} */
export async function PATCH(event) {
	const db = await requireTabsDatabase(event);
	const raw = await event.request.text();
	if (new TextEncoder().encode(raw).byteLength > 30_000) throw error(413, 'Update is too large.');
	let body;
	try {
		body = JSON.parse(raw);
	} catch {
		throw error(400, 'Invalid update.');
	}
	const hasStatus = Object.hasOwn(body || {}, 'status');
	const hasNote = Object.hasOwn(body || {}, 'note');
	const hasTopic = Object.hasOwn(body || {}, 'topic');
	const hasExpectedStatus = Object.hasOwn(body || {}, 'expectedStatus');
	const hasExpectedTopic = Object.hasOwn(body || {}, 'expectedTopic');
	const topic = hasTopic && typeof body.topic === 'string' ? body.topic.trim() : null;
	const statuses = ['unread', 'read', 'followup', 'archived'];
	if (
		(!hasStatus && !hasNote && !hasTopic) ||
		(hasStatus && !statuses.includes(body.status)) ||
		(hasExpectedStatus && (!hasStatus || !statuses.includes(body.expectedStatus))) ||
		(hasNote && (typeof body.note !== 'string' || body.note.length > 10000)) ||
		(hasTopic && (!topic || topic.length > 100 || /\p{Cc}/u.test(topic))) ||
		(hasExpectedTopic && (!hasTopic || typeof body.expectedTopic !== 'string'))
	)
		throw error(400, 'Invalid status, note, or topic.');
	const result = await db
		.prepare(
			`UPDATE items SET status = COALESCE(?, status), note = COALESCE(?, note),
		item_json = CASE WHEN ? IS NULL THEN item_json ELSE json_set(item_json, '$.group', ?) END,
		updated_at = ?
		WHERE batch_id = ? AND id = ? AND (? IS NULL OR status = ?)
		AND (? IS NULL OR COALESCE(NULLIF(json_extract(item_json, '$.group'), ''), 'Reading pile') = ?)`
		)
		.bind(
			hasStatus ? body.status : null,
			hasNote ? body.note : null,
			topic,
			topic,
			new Date().toISOString(),
			event.params.batch,
			event.params.id,
			hasExpectedStatus ? body.expectedStatus : null,
			hasExpectedStatus ? body.expectedStatus : null,
			hasExpectedTopic ? body.expectedTopic : null,
			hasExpectedTopic ? body.expectedTopic : null
		)
		.run();
	const saved = await db
		.prepare(
			`SELECT status, note, updated_at,
		COALESCE(NULLIF(json_extract(item_json, '$.group'), ''), 'Reading pile') AS topic
		FROM items WHERE batch_id = ? AND id = ?`
		)
		.bind(event.params.batch, event.params.id)
		.first();
	if (!saved) throw error(404, 'Page not found in this batch.');
	if (!result.meta.changes)
		throw error(409, 'This page changed on another device. Refresh the batch.');
	return json({
		status: saved.status,
		note: saved.note,
		topic: saved.topic,
		updatedAt: saved.updated_at
	});
}
