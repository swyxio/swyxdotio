import { error, json } from '@sveltejs/kit';
import { requireTabsDatabase } from '$lib/server/tabs-auth.js';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const db = await requireTabsDatabase(event);
	const batch = await db
		.prepare('SELECT id, name, captured_at AS capturedAt, metadata_json FROM batches WHERE id = ?')
		.bind(event.params.batch)
		.first();
	if (!batch) throw error(404, 'Batch not found.');
	const result = await db
		.prepare(
			'SELECT item_json, status, note, updated_at FROM items WHERE batch_id = ? ORDER BY rowid'
		)
		.bind(event.params.batch)
		.all();
	const items = result.results.map((row) => ({
		...JSON.parse(/** @type {string} */ (row.item_json)),
		status: row.status,
		note: row.note,
		updatedAt: row.updated_at
	}));
	return json({
		batch: {
			id: batch.id,
			name: batch.name,
			capturedAt: batch.capturedAt,
			...JSON.parse(/** @type {string} */ (batch.metadata_json))
		},
		items
	});
}
