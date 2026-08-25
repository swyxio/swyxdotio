import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import drawWorker, { DrawingPages } from '../workers/draw/index.js';

function createDrawingPages() {
	const database = new DatabaseSync(':memory:');
	const sql = {
		exec(query, ...values) {
			if (/^\s*CREATE\s/i.test(query)) {
				database.exec(query);
				return { toArray: () => [], one: () => undefined };
			}

			const statement = database.prepare(query);
			if (/^\s*SELECT\s/i.test(query)) {
				const rows = statement.all(...values);
				return { toArray: () => rows, one: () => rows[0] };
			}

			statement.run(...values);
			return { toArray: () => [], one: () => undefined };
		}
	};

	return new DrawingPages({ storage: { sql } });
}

function request(path, method = 'GET', body) {
	return new Request(`https://drawing.internal${path}`, {
		method,
		body: body === undefined ? undefined : JSON.stringify(body),
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }
	});
}

test('drawing pages create, list, update, and persist complete native scenes', async () => {
	const pages = createDrawingPages();
	assert.deepEqual(await (await pages.fetch(request('/pages'))).json(), {
		pages: [],
		activePageId: null
	});

	const createdResponse = await pages.fetch(request('/pages', 'POST', { name: '  Ideas  ' }));
	assert.equal(createdResponse.status, 201);
	const created = await createdResponse.json();
	assert.equal(created.name, 'Ideas');
	assert.deepEqual(created.scene, { elements: [], appState: {}, files: {} });

	const scene = {
		elements: [{ id: 'rectangle-1', type: 'rectangle', roughness: 2 }],
		appState: { viewBackgroundColor: '#fff9ea' },
		files: {}
	};
	const savedResponse = await pages.fetch(
		request(`/pages/${created.id}`, 'PUT', { name: 'Sketches', scene })
	);
	assert.equal(savedResponse.status, 200);
	assert.deepEqual((await savedResponse.json()).scene, scene);

	const restored = await (await pages.fetch(request(`/pages/${created.id}`))).json();
	assert.equal(restored.name, 'Sketches');
	assert.deepEqual(restored.scene, scene);

	const list = await (await pages.fetch(request('/pages'))).json();
	assert.equal(list.activePageId, created.id);
	assert.deepEqual(
		list.pages.map(({ id, name }) => ({ id, name })),
		[{ id: created.id, name: 'Sketches' }]
	);
});

test('deleting the active drawing selects the next saved page', async () => {
	const pages = createDrawingPages();
	const first = await (await pages.fetch(request('/pages', 'POST', { name: 'First' }))).json();
	const second = await (await pages.fetch(request('/pages', 'POST', { name: 'Second' }))).json();

	const deleted = await (await pages.fetch(request(`/pages/${second.id}`, 'DELETE'))).json();
	assert.deepEqual(deleted, { ok: true, activePageId: first.id });
	assert.equal((await pages.fetch(request(`/pages/${second.id}`))).status, 404);

	const last = await (await pages.fetch(request(`/pages/${first.id}`, 'DELETE'))).json();
	assert.deepEqual(last, { ok: true, activePageId: null });
});

test('drawing pages reject invalid input and scenes above the SQLite row limit', async () => {
	const pages = createDrawingPages();
	assert.equal((await pages.fetch(request('/pages/not-a-page'))).status, 404);
	assert.equal((await pages.fetch(request('/pages', 'POST', { name: ' ' }))).status, 400);

	const page = await (await pages.fetch(request('/pages', 'POST', { name: 'Sketch' }))).json();
	assert.equal((await pages.fetch(request(`/pages/${page.id}`, 'PUT', { scene: {} }))).status, 400);
	assert.equal(
		(
			await pages.fetch(
				request(`/pages/${page.id}`, 'PUT', {
					scene: { elements: [{ type: 'text', text: 'x'.repeat(1_800_001) }] }
				})
			)
		).status,
		413
	);

	const restored = await (await pages.fetch(request(`/pages/${page.id}`))).json();
	assert.deepEqual(restored.scene.elements, []);
});

test('the public drawing companion worker never exposes its private Durable Object', () => {
	assert.equal(drawWorker.fetch().status, 404);
});
