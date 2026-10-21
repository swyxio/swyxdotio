import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCapturedItems, safeCapturedUrl } from '../src/lib/tab-review.js';
import { requireTabsDatabase } from '../src/lib/server/tabs-auth.js';
import { createToolsSession } from '../src/lib/server/tools-auth.js';

test('capture keeps window and group hints and folds exact duplicates', async () => {
	const items = await makeCapturedItems(
		[
			{ title: 'A', url: 'https://example.test/a', windowId: 1, tabGroup: 'Work' },
			{ title: 'A again', url: 'https://example.test/a', windowId: 2, tabGroup: 'Later' },
			{ title: 'B', url: 'https://example.test/a#other', windowId: 1 }
		],
		'2026-10-21T00:00:00Z'
	);
	assert.equal(items.length, 2);
	assert.equal(items[0].duplicateCount, 2);
	assert.deepEqual(items[0].capturedWindowIds, ['1', '2']);
	assert.deepEqual(items[0].tabGroups, ['Work', 'Later']);
	assert.notEqual(items[0].id, items[1].id);
});

test('capture strips credentials without changing ordinary query URLs', () => {
	assert.equal(
		safeCapturedUrl('https://example.test/?code=example'),
		'https://example.test/?code=example'
	);
	for (const url of [
		'https://user:password@example.test/',
		'https://example.test/?access_token=secret',
		'https://example.test/oauth/callback?code=secret',
		'https://example.test/#access_token=secret'
	])
		assert.equal(
			safeCapturedUrl(url).includes('secret') || safeCapturedUrl(url).includes('password'),
			false
		);
});

test('tab API requires the current owner and a same-origin mutation', async () => {
	const secret = 'example-test-session-secret-at-least-thirty-two-bytes';
	const cookie = await createToolsSession(
		{ id: 'owner', email: 'owner@example.test', name: 'Owner' },
		secret
	);
	const db = {};
	const event = {
		cookies: { get: () => cookie },
		platform: {
			env: { TOOLS_SESSION_SECRET: secret, TOOLS_OWNER_GOOGLE_SUB: 'owner', TABS_DB: db }
		},
		request: new Request('https://swyx.io/tools/tabs/api/batches', {
			method: 'POST',
			headers: { origin: 'https://swyx.io', 'x-tools-user': 'owner' }
		}),
		url: new URL('https://swyx.io/tools/tabs/api/batches')
	};
	assert.equal(await requireTabsDatabase(event), db);
	await assert.rejects(requireTabsDatabase({ ...event, cookies: { get: () => null } }), {
		status: 401
	});
	await assert.rejects(
		requireTabsDatabase({
			...event,
			platform: { env: { ...event.platform.env, TOOLS_OWNER_GOOGLE_SUB: 'someone-else' } }
		}),
		{ status: 403 }
	);
	await assert.rejects(
		requireTabsDatabase({
			...event,
			request: new Request(event.url, {
				method: 'POST',
				headers: { origin: 'https://attacker.test' }
			})
		}),
		{ status: 403 }
	);
	await assert.rejects(
		requireTabsDatabase({
			...event,
			request: new Request(event.url, { headers: { 'x-tools-user': 'someone-else' } })
		}),
		{ status: 409 }
	);
});
