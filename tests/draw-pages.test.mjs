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

// Exercise the public server boundary with real isolated Durable Object stores.
const { forwardDrawingRequest } = await import('../src/routes/tools/api/draw/pages/workspace.js');
const { createToolsSession, toolsSessionCookieName } =
	await import('../src/lib/server/tools-auth.js');
const SESSION_SECRET = 'drawing-pages-test-session-secret-at-least-32-bytes';
const OWNER_ID = '111111111111111111111';

function createWorkspaceNamespace() {
	const stores = new Map();
	const calls = [];
	return {
		calls,
		idFromName: (name) => name,
		get: (id) => {
			calls.push(id);
			if (!stores.has(id)) stores.set(id, createDrawingPages());
			return stores.get(id);
		}
	};
}

async function workspaceEvent(workspace, id, path = '', method = 'GET', body, expectedUser = id) {
	const url = new URL(`https://swyx.io/tools/api/draw/pages${path}`);
	const token = id
		? await createToolsSession(
				{ id, email: 'same-email@example.com', name: 'Same Name' },
				SESSION_SECRET
			)
		: undefined;
	return {
		url,
		request: new Request(url, {
			method,
			headers: { Origin: url.origin, ...(expectedUser ? { 'X-Tools-User': expectedUser } : {}) },
			...(body === undefined ? {} : { body: JSON.stringify(body) })
		}),
		cookies: { get: (name) => (name === toolsSessionCookieName() ? token : undefined) },
		platform: {
			env: {
				TOOLS_SESSION_SECRET: SESSION_SECRET,
				TOOLS_OWNER_GOOGLE_SUB: OWNER_ID,
				DRAW_PAGES: workspace
			}
		}
	};
}

async function forwardWorkspace(workspace, id, path = '', method = 'GET', body, expectedUser = id) {
	return forwardDrawingRequest(
		await workspaceEvent(workspace, id, path, method, body, expectedUser),
		{ mutation: method !== 'GET' }
	);
}

test('Google subjects isolate complete drawing CRUD even with identical emails, names, and guessed page IDs', async () => {
	const workspace = createWorkspaceNamespace();
	const alice = '222222222222222222222';
	const bob = '333333333333333333333';
	const created = await (
		await forwardWorkspace(workspace, alice, '', 'POST', { name: 'Alice private scene' })
	).json();
	assert.equal(
		(await (await forwardWorkspace(workspace, alice)).json()).pages[0].name,
		'Alice private scene'
	);
	assert.deepEqual((await (await forwardWorkspace(workspace, bob)).json()).pages, []);
	for (const method of ['GET', 'PUT', 'DELETE']) {
		const response = await forwardWorkspace(
			workspace,
			bob,
			`/${created.id}?workspace=personal&user=${alice}`,
			method,
			method === 'PUT'
				? {
						name: 'Stolen',
						scene: { elements: [], appState: {}, files: {} },
						workspace: `google:${alice}`
					}
				: undefined
		);
		assert.equal(response.status, 404, method);
	}
	assert.equal(
		(await (await forwardWorkspace(workspace, alice, `/${created.id}`)).json()).name,
		'Alice private scene'
	);
	assert.ok(workspace.calls.includes(`google:${alice}`));
	assert.ok(workspace.calls.includes(`google:${bob}`));
	assert.equal(workspace.calls.includes('personal'), false);
});

test('only the configured Google owner retains access to existing personal drawings', async () => {
	const workspace = createWorkspaceNamespace();
	const existing = await (
		await workspace
			.get('personal')
			.fetch(request('/pages', 'POST', { name: 'Existing owner work' }))
	).json();
	const owner = await (await forwardWorkspace(workspace, OWNER_ID)).json();
	assert.equal(owner.pages[0].id, existing.id);
	assert.equal(
		(await forwardWorkspace(workspace, 'another-subject', `/${existing.id}`)).status,
		404
	);
	const missingOwner = await workspaceEvent(workspace, OWNER_ID);
	delete missingOwner.platform.env.TOOLS_OWNER_GOOGLE_SUB;
	assert.deepEqual((await (await forwardDrawingRequest(missingOwner)).json()).pages, []);
});

test('cloud drawing requests reject anonymous, cross-origin and stale-account mutations before touching storage', async () => {
	const workspace = createWorkspaceNamespace();
	assert.equal((await forwardWorkspace(workspace, undefined)).status, 401);
	for (const [method, expected] of [
		['POST', undefined],
		['POST', 'another-subject'],
		['GET', 'another-subject']
	]) {
		const event = await workspaceEvent(
			workspace,
			OWNER_ID,
			'',
			method,
			method === 'POST' ? { name: 'Wrong account' } : undefined,
			expected
		);
		if (expected === undefined) event.request.headers.delete('X-Tools-User');
		assert.equal((await forwardDrawingRequest(event, { mutation: method !== 'GET' })).status, 409);
	}
	const crossOrigin = await workspaceEvent(workspace, OWNER_ID, '', 'POST', { name: 'Unsafe' });
	crossOrigin.request.headers.set('Origin', 'https://evil.example');
	await assert.rejects(() => forwardDrawingRequest(crossOrigin, { mutation: true }), {
		status: 403
	});
	assert.equal(workspace.calls.length, 0);
});
