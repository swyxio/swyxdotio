const MAX_SCENE_BYTES = 1_800_000;
const MAX_PAGE_COUNT = 100;
const MAX_PAGE_NAME_LENGTH = 120;
const PAGE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();

/**
 * @typedef {{
 *   id: string;
 *   name: string;
 *   scene: string;
 *   updated_at: string;
 * }} DrawingPageRow
 */

/**
 * @typedef {{
 *   exec(query: string, ...values: unknown[]): {
 *     toArray(): any[];
 *     one(): any;
 *   };
 * }} SqlStorage
 */

/** @param {unknown} value */
function isObject(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @param {unknown} value */
function validPageName(value) {
	if (typeof value !== 'string') return null;
	const name = value.trim();
	return name && name.length <= MAX_PAGE_NAME_LENGTH ? name : null;
}

/** @param {DrawingPageRow} row */
function pageFromRow(row) {
	return {
		id: row.id,
		name: row.name,
		scene: JSON.parse(row.scene),
		updatedAt: row.updated_at
	};
}

/** @param {unknown} body @param {number} [status] */
function respond(body, status = 200) {
	return Response.json(body, { status });
}

export class DrawingPages {
	/** @param {{ storage: { sql: SqlStorage } }} ctx */
	constructor(ctx) {
		this.sql = ctx.storage.sql;
		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS drawing_pages (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				scene TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
			CREATE TABLE IF NOT EXISTS drawing_workspace (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			);
		`);
	}

	/** @param {string} id */
	findPage(id) {
		return /** @type {DrawingPageRow | undefined} */ (
			this.sql.exec('SELECT * FROM drawing_pages WHERE id = ?', id).toArray()[0]
		);
	}

	/** @param {string | null} id */
	setActivePage(id) {
		if (id === null) {
			this.sql.exec("DELETE FROM drawing_workspace WHERE key = 'activePageId'");
			return;
		}
		this.sql.exec(
			"INSERT INTO drawing_workspace (key, value) VALUES ('activePageId', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
			id
		);
	}

	listPages() {
		const pages = this.sql
			.exec(
				'SELECT id, name, updated_at AS updatedAt FROM drawing_pages ORDER BY updated_at DESC, rowid DESC'
			)
			.toArray();
		const activePageId =
			this.sql.exec("SELECT value FROM drawing_workspace WHERE key = 'activePageId'").toArray()[0]
				?.value ?? null;
		return respond({ pages, activePageId });
	}

	/** @param {Request} request */
	async createPage(request) {
		const body = await request.json().catch(() => null);
		if (!isObject(body)) return respond({ error: 'Invalid page request.' }, 400);

		const name = validPageName(body.name ?? 'Untitled page');
		if (!name) {
			return respond(
				{ error: `Page names must contain 1–${MAX_PAGE_NAME_LENGTH} characters.` },
				400
			);
		}

		const pageCount = this.sql.exec('SELECT COUNT(*) AS count FROM drawing_pages').one().count;
		if (pageCount >= MAX_PAGE_COUNT) {
			return respond({ error: `A workspace can contain at most ${MAX_PAGE_COUNT} pages.` }, 409);
		}

		const id = crypto.randomUUID();
		const updatedAt = new Date().toISOString();
		const scene = { elements: [], appState: {}, files: {} };
		this.sql.exec(
			'INSERT INTO drawing_pages (id, name, scene, updated_at) VALUES (?, ?, ?, ?)',
			id,
			name,
			JSON.stringify(scene),
			updatedAt
		);
		this.setActivePage(id);
		return respond({ id, name, scene, updatedAt }, 201);
	}

	/** @param {string} id @param {Request} request */
	async updatePage(id, request) {
		const current = this.findPage(id);
		if (!current) return respond({ error: 'Drawing page not found.' }, 404);

		const body = await request.json().catch(() => null);
		if (!isObject(body)) return respond({ error: 'Invalid page update.' }, 400);
		if (!('name' in body) && !('scene' in body)) {
			return respond({ error: 'Provide a page name or drawing scene.' }, 400);
		}

		const name = 'name' in body ? validPageName(body.name) : current.name;
		if (!name) {
			return respond(
				{ error: `Page names must contain 1–${MAX_PAGE_NAME_LENGTH} characters.` },
				400
			);
		}

		let scene = current.scene;
		if ('scene' in body) {
			if (
				!isObject(body.scene) ||
				!Array.isArray(body.scene.elements) ||
				(body.scene.appState !== undefined && !isObject(body.scene.appState)) ||
				(body.scene.files !== undefined && !isObject(body.scene.files))
			) {
				return respond({ error: 'Drawing scenes must include an elements array.' }, 400);
			}
			scene = JSON.stringify({
				elements: body.scene.elements,
				appState: body.scene.appState ?? {},
				files: body.scene.files ?? {}
			});
			if (encoder.encode(scene).byteLength > MAX_SCENE_BYTES) {
				return respond({ error: 'This drawing exceeds the 1.8 MB cloud storage limit.' }, 413);
			}
		}

		const updatedAt = new Date().toISOString();
		this.sql.exec(
			'UPDATE drawing_pages SET name = ?, scene = ?, updated_at = ? WHERE id = ?',
			name,
			scene,
			updatedAt,
			id
		);
		this.setActivePage(id);
		return respond({ id, name, scene: JSON.parse(scene), updatedAt });
	}

	/** @param {string} id */
	deletePage(id) {
		if (!this.findPage(id)) return respond({ error: 'Drawing page not found.' }, 404);
		this.sql.exec('DELETE FROM drawing_pages WHERE id = ?', id);
		const currentActivePageId =
			this.sql.exec("SELECT value FROM drawing_workspace WHERE key = 'activePageId'").toArray()[0]
				?.value ?? null;
		const activePageId =
			currentActivePageId === id
				? (this.sql
						.exec('SELECT id FROM drawing_pages ORDER BY updated_at DESC, rowid DESC LIMIT 1')
						.toArray()[0]?.id ?? null)
				: currentActivePageId;
		if (currentActivePageId === id) this.setActivePage(activePageId);
		return respond({ ok: true, activePageId });
	}

	/** @param {Request} request */
	async fetch(request) {
		const path = new URL(request.url).pathname;
		if (path === '/pages') {
			if (request.method === 'GET') return this.listPages();
			if (request.method === 'POST') return this.createPage(request);
			return respond({ error: 'Method not allowed.' }, 405);
		}

		const match = path.match(/^\/pages\/([^/]+)$/);
		if (!match || !PAGE_ID_PATTERN.test(match[1])) {
			return respond({ error: 'Drawing page not found.' }, 404);
		}

		const id = match[1];
		if (request.method === 'GET') {
			const row = this.findPage(id);
			return row ? respond(pageFromRow(row)) : respond({ error: 'Drawing page not found.' }, 404);
		}
		if (request.method === 'PUT') return this.updatePage(id, request);
		if (request.method === 'DELETE') return this.deletePage(id);
		return respond({ error: 'Method not allowed.' }, 405);
	}
}

export default {
	fetch() {
		return new Response('Not found', { status: 404 });
	}
};
