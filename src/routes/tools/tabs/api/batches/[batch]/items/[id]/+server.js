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
	if (new TextEncoder().encode(raw).byteLength > 30_000) throw error(413, 'Note is too long.');
	let body;
	try {
		body = JSON.parse(raw);
	} catch {
		throw error(400, 'Invalid update.');
	}
	const hasStatus = Object.hasOwn(body || {}, 'status');
	const hasNote = Object.hasOwn(body || {}, 'note');
	if (
		(!hasStatus && !hasNote) ||
		(hasStatus && !['unread', 'read', 'followup', 'archived'].includes(body.status)) ||
		(hasNote && (typeof body.note !== 'string' || body.note.length > 10000))
	)
		throw error(400, 'Invalid status or note.');
	const result = await db
		.prepare(
			`UPDATE items SET status = COALESCE(?, status), note = COALESCE(?, note), updated_at = ?
		WHERE batch_id = ? AND id = ?`
		)
		.bind(
			hasStatus ? body.status : null,
			hasNote ? body.note : null,
			new Date().toISOString(),
			event.params.batch,
			event.params.id
		)
		.run();
	if (!result.meta.changes) throw error(404, 'Page not found in this batch.');
	const saved = await getItem(db, event.params.batch, event.params.id);
	return json({ status: saved.status, note: saved.note, updatedAt: saved.updatedAt });
}
