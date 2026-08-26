import assert from 'node:assert/strict';
import test from 'node:test';
import { createToolsSession, toolsSessionCookieName } from '../src/lib/server/tools-auth.js';
import {
	getToolsActivityLogs,
	postToolsActivity,
	recordServerToolActivity,
	withServerToolActivity
} from '../src/lib/server/tools-activity.js';
import { parseToolsActivityFilters } from '../src/lib/tools-activity.js';
import { createTestAiLedger, ledgerRequest } from './helpers/tools-ai-ledger.mjs';

const SECRET = 'tools-activity-tests-private-session-secret';
const NOW = Date.parse('2026-08-25T12:00:00Z');
const DAY = 86_400_000;
const OWNER = '111111111111111111111';
const ALICE = '222222222222222222222';
const BOB = '333333333333333333333';
const uuid = (index) => `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;

async function event(
	ledger,
	{
		userId = ALICE,
		query = '',
		body,
		origin = 'https://swyx.io',
		expectedUser = userId,
		env = {},
		headers = {},
		profile = {}
	} = {}
) {
	const url = new URL(`https://swyx.io/tools/api/logs${query}`);
	const token = userId
		? await createToolsSession(
				{ id: userId, email: `${userId}@example.com`, name: `User ${userId}`, ...profile },
				SECRET
			)
		: undefined;
	return {
		url,
		request: new Request(url, {
			method: body === undefined ? 'GET' : 'POST',
			headers: {
				Origin: origin,
				'Content-Type': 'application/json',
				...(expectedUser ? { 'X-Tools-User': expectedUser } : {}),
				...headers
			},
			...(body === undefined
				? {}
				: { body: typeof body === 'string' ? body : JSON.stringify(body) })
		}),
		cookies: { get: (name) => (name === toolsSessionCookieName() ? token : undefined) },
		platform: {
			env: {
				TOOLS_SESSION_SECRET: SECRET,
				TOOLS_OWNER_GOOGLE_SUB: OWNER,
				DRAW_PAGES: ledger?.namespace,
				...env
			}
		}
	};
}

async function record(ledger, userId, action = 'draw.open', id = crypto.randomUUID(), extra = {}) {
	return ledgerRequest(ledger, 'activity-record', {
		userId,
		source: 'browser',
		entry: { id, action, status: 'succeeded' },
		...extra
	});
}

async function logs(ledger, userId = ALICE, filters = {}, isOwner = false) {
	return ledgerRequest(ledger, 'activity-logs', { userId, filters, isOwner });
}

test('public browser recording is signed-account-only, exact metadata, same-origin and stale-account protected', async () => {
	const ledger = createTestAiLedger();
	const body = { id: uuid(1), action: 'draw.open', status: 'succeeded' };
	assert.equal((await postToolsActivity(await event(ledger, { userId: null, body }))).status, 401);
	await assert.rejects(
		() => event(ledger, { body, origin: 'https://evil.example' }).then(postToolsActivity),
		{ status: 403 }
	);
	assert.equal(
		(await postToolsActivity(await event(ledger, { body, expectedUser: BOB }))).status,
		409
	);
	const missingHeader = await event(ledger, { body });
	missingHeader.request.headers.delete('X-Tools-User');
	assert.equal((await postToolsActivity(missingHeader)).status, 409);
	for (const extra of [
		{ userId: BOB },
		{ profile: { name: 'Forged' } },
		{ prompt: 'PRIVATE_TEXT' },
		{ email: 'private@example.com' },
		{ image: 'PRIVATE_IMAGE' },
		{ source: 'server' }
	]) {
		assert.equal(
			(await postToolsActivity(await event(ledger, { body: { ...body, ...extra } }))).status,
			400
		);
	}
	for (const action of ['draw.page.save', 'draw.ai.assistant', 'podcast.open', 'unknown'])
		assert.equal(
			(await postToolsActivity(await event(ledger, { body: { ...body, action } }))).status,
			400
		);
	assert.equal(
		(await postToolsActivity(await event(ledger, { body: { ...body, status: 'cancelled' } })))
			.status,
		201
	);
	const rows = ledger.database.prepare('SELECT * FROM tools_activity').all();
	assert.equal(rows.length, 1);
	assert.deepEqual(Object.keys(rows[0]).sort(), [
		'action',
		'created_at',
		'id',
		'source',
		'status',
		'tool',
		'user_id'
	]);
	assert.equal(rows[0].user_id, ALICE);
	assert.doesNotMatch(JSON.stringify(rows), /PRIVATE|example.com|Forged/);
});

test('recording rejects malformed, oversized and unsupported body/filter inputs before ledger access', async () => {
	const ledger = createTestAiLedger();
	for (const [body, expected] of [
		['{', 400],
		['[]', 400],
		['x'.repeat(513), 413],
		[{ id: 'bad', action: 'draw.open', status: 'succeeded' }, 400]
	])
		assert.equal((await postToolsActivity(await event(ledger, { body }))).status, expected);
	assert.equal(
		(
			await postToolsActivity(
				await event(ledger, { body: '{}', headers: { 'Content-Type': 'text/plain' } })
			)
		).status,
		415
	);
	assert.equal(
		(
			await postToolsActivity(
				await event(ledger, { body: '{}', headers: { 'Content-Length': '999' } })
			)
		).status,
		413
	);
	assert.equal(
		(await postToolsActivity(await event(ledger, { body: '{}', query: `?userId=${BOB}` }))).status,
		400
	);
	for (const query of [
		'?days=90',
		'?kind=other',
		'?tool=unknown',
		'?userId=other',
		'?scope=admin',
		'?days=7&days=1',
		'?before=not%20base64',
		'?before=',
		`?before=${'x'.repeat(769)}`
	])
		assert.equal((await getToolsActivityLogs(await event(ledger, { query }))).status, 400, query);
	assert.equal(ledger.calls.length, 0);
	assert.deepEqual(parseToolsActivityFilters(new URLSearchParams()), {
		days: 7,
		kind: 'all',
		tool: 'all',
		before: null,
		scope: 'mine'
	});
});

test('browser event IDs are idempotent per account, mismatched retries conflict, and120/hour does not spend AI quota', async () => {
	const ledger = createTestAiLedger();
	const responses = await Promise.all(
		Array.from({ length: 125 }, (_, index) => record(ledger, ALICE, 'draw.open', uuid(index + 1)))
	);
	assert.equal(responses.filter((response) => response.status === 201).length, 120);
	assert.equal(responses.filter((response) => response.status === 429).length, 5);
	const duplicate = await record(ledger, ALICE, 'draw.open', uuid(1));
	assert.equal(duplicate.status, 200);
	assert.deepEqual(await duplicate.json(), { recorded: true, duplicate: true });
	assert.equal((await record(ledger, ALICE, 'box.open', uuid(1))).status, 409);
	assert.equal((await record(ledger, BOB, 'box.open', uuid(1))).status, 201);
	assert.equal(
		ledger.database.prepare('SELECT COUNT(*) AS total FROM tools_ai_usage').get().total,
		0
	);
});

test('mine logs combine existing AI and tool rows without duplication, never leak account identities or other users', async () => {
	const ledger = createTestAiLedger();
	await record(ledger, ALICE, 'draw.open', uuid(1));
	await record(ledger, BOB, 'box.open', uuid(2));
	const admitted = await ledgerRequest(ledger, 'admit', {
		userId: ALICE,
		kind: 'assistant',
		model: '@cf/qwen/qwen3.8-27b',
		estimatedReservedUsd: 0.05
	});
	const { id } = await admitted.json();
	await ledgerRequest(ledger, 'finish', { userId: ALICE, id, status: 'failed' });
	const response = await getToolsActivityLogs(await event(ledger));
	assert.equal(response.status, 200);
	assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
	const result = await response.json();
	assert.equal(result.scope, 'mine');
	assert.equal(result.entries.length, 2);
	assert.equal(result.entries.filter((entry) => entry.kind === 'ai').length, 1);
	assert.equal(result.entries.find((entry) => entry.kind === 'ai').action, 'draw.ai.assistant');
	assert.equal(result.entries.find((entry) => entry.kind === 'tool').estimatedReservedUsd, null);
	assert.deepEqual(result.summary, {
		aiRequests: 1,
		toolActions: 1,
		estimatedReservedUsd: 0.05,
		failedRequests: 1,
		activeAccounts: 1
	});
	assert.equal(
		result.entries.some((entry) => 'account' in entry),
		false
	);
	assert.doesNotMatch(JSON.stringify(result), new RegExp(`${BOB}|${ALICE}|example.com`));
	assert.match(result.coverage.message, /not complete usage/);
});

test('only the configured Google owner sees all accounts; profiles come from verified sessions and historical identities stay ID-only', async () => {
	const ledger = createTestAiLedger();
	await postToolsActivity(
		await event(ledger, {
			body: { id: uuid(1), action: 'draw.open', status: 'succeeded' },
			profile: { name: 'Alice Verified', email: 'alice@example.com' }
		})
	);
	await record(ledger, BOB, 'box.open', uuid(2));
	assert.equal(
		(await getToolsActivityLogs(await event(ledger, { query: '?scope=all' }))).status,
		403
	);
	assert.equal((await logs(ledger, ALICE, { scope: 'all' })).status, 403);
	assert.equal(
		(
			await getToolsActivityLogs(
				await event(ledger, {
					userId: OWNER,
					query: '?scope=all',
					env: { TOOLS_OWNER_GOOGLE_SUB: '' }
				})
			)
		).status,
		403
	);
	const result = await (
		await getToolsActivityLogs(await event(ledger, { userId: OWNER, query: '?scope=all' }))
	).json();
	assert.equal(result.scope, 'all');
	assert.equal(result.entries.length, 2);
	assert.equal(result.summary.activeAccounts, 2);
	assert.deepEqual(result.entries.find((entry) => entry.account.id === ALICE).account, {
		id: ALICE,
		email: 'alice@example.com',
		name: 'Alice Verified'
	});
	assert.deepEqual(result.entries.find((entry) => entry.account.id === BOB).account, { id: BOB });
	const mine = await (await getToolsActivityLogs(await event(ledger, { userId: OWNER }))).json();
	assert.equal(mine.entries.length, 0);
});

test('pagination is stable across tied timestamps/kinds and summaries cover the full filtered snapshot, not the page', async (context) => {
	context.mock.method(Date, 'now', () => NOW);
	const ledger = createTestAiLedger();
	for (let index = 1; index <= 105; index++)
		await record(ledger, ALICE, index % 2 ? 'draw.open' : 'box.open', uuid(index));
	for (let index = 0; index < 4; index++)
		await ledgerRequest(ledger, 'admit', {
			userId: ALICE,
			kind: 'assistant',
			model: '@cf/qwen/qwen3.8-27b',
			estimatedReservedUsd: 0.05
		});
	await record(ledger, BOB, 'draw.open', uuid(999));
	const first = await (await logs(ledger)).json();
	assert.equal(first.entries.length, 50);
	assert.deepEqual(first.summary, {
		aiRequests: 4,
		toolActions: 105,
		estimatedReservedUsd: 0.2,
		failedRequests: 0,
		activeAccounts: 1
	});
	assert.equal(first.daily[0].toolActions, 105);
	const second = await (await logs(ledger, ALICE, { before: first.nextCursor })).json();
	const third = await (await logs(ledger, ALICE, { before: second.nextCursor })).json();
	assert.equal(second.entries.length, 50);
	assert.equal(third.entries.length, 9);
	assert.equal(third.nextCursor, null);
	assert.deepEqual(second.summary, first.summary);
	assert.deepEqual(third.range, first.range);
	assert.equal(
		new Set(
			[...first.entries, ...second.entries, ...third.entries].map(
				(entry) => `${entry.kind}:${entry.id}`
			)
		).size,
		109
	);
	assert.equal((await logs(ledger, BOB, { before: first.nextCursor })).status, 400);
	assert.equal((await logs(ledger, ALICE, { before: first.nextCursor, kind: 'tool' })).status, 400);
	assert.equal(
		(await logs(ledger, ALICE, { before: first.nextCursor, scope: 'all' }, true)).status,
		400
	);
	const filtered = await (await logs(ledger, ALICE, { kind: 'tool', tool: 'box' })).json();
	assert.deepEqual(filtered.summary, {
		aiRequests: 0,
		toolActions: 52,
		estimatedReservedUsd: 0,
		failedRequests: 0,
		activeAccounts: 1
	});
	assert.equal(filtered.daily[0].toolActions, 52);
});

test('admin-all pagination aggregates every account and still binds cursor to its requesting owner', async (context) => {
	context.mock.method(Date, 'now', () => NOW);
	const ledger = createTestAiLedger();
	for (let index = 1; index <= 20; index++) {
		await record(ledger, ALICE, 'draw.open', uuid(index));
		await record(ledger, BOB, 'box.open', uuid(index));
		await record(ledger, 'third-user', 'draw.open', uuid(index));
	}
	const first = await (await logs(ledger, OWNER, { scope: 'all' }, true)).json();
	const second = await (
		await logs(ledger, OWNER, { scope: 'all', before: first.nextCursor }, true)
	).json();
	assert.equal(first.entries.length, 50);
	assert.equal(second.entries.length, 10);
	assert.equal(first.summary.toolActions, 60);
	assert.equal(first.summary.activeAccounts, 3);
	assert.equal(
		new Set([...first.entries, ...second.entries].map((entry) => `${entry.account.id}:${entry.id}`))
			.size,
		60
	);
	assert.equal(
		(await logs(ledger, 'another-owner', { scope: 'all', before: first.nextCursor }, true)).status,
		400
	);
});

test('30-day retention shares one alarm across AI and tool events and deletes profiles only after their last retained record', async (context) => {
	let now = NOW;
	context.mock.method(Date, 'now', () => now);
	const ledger = createTestAiLedger();
	await postToolsActivity(
		await event(ledger, { body: { id: uuid(1), action: 'draw.open', status: 'succeeded' } })
	);
	assert.equal(ledger.alarmAt(), NOW + 30 * DAY);
	now += DAY;
	await ledgerRequest(ledger, 'admit', {
		userId: ALICE,
		kind: 'assistant',
		model: '@cf/qwen/qwen3.8-27b',
		estimatedReservedUsd: 0.05
	});
	now = NOW + 30 * DAY;
	ledger.object.activity = undefined;
	await ledger.object.alarm();
	assert.equal(
		ledger.database.prepare('SELECT COUNT(*) AS total FROM tools_activity').get().total,
		0
	);
	assert.equal(
		ledger.database.prepare('SELECT COUNT(*) AS total FROM tools_activity_accounts').get().total,
		1
	);
	assert.equal(ledger.alarmAt(), NOW + 31 * DAY);
	now += DAY;
	await ledger.object.alarm();
	assert.equal(
		ledger.database.prepare('SELECT COUNT(*) AS total FROM tools_ai_usage').get().total,
		0
	);
	assert.equal(
		ledger.database.prepare('SELECT COUNT(*) AS total FROM tools_activity_accounts').get().total,
		0
	);
});

test('unavailable recording never fabricates zero usage or breaks successful tool operations, warnings carry no private data', async (context) => {
	const warnings = [];
	context.mock.method(console, 'warn', (message) => warnings.push(message));
	const unavailable = await event(null);
	const response = await getToolsActivityLogs(unavailable);
	assert.equal(response.status, 503);
	assert.equal('summary' in (await response.json()), false);
	assert.equal(
		await withServerToolActivity(unavailable, 'draw.page.save', async () => 'completed-user-work'),
		'completed-user-work'
	);
	assert.equal(warnings.length, 1);
	assert.deepEqual(JSON.parse(warnings[0]), {
		event: 'tools_activity_recording_unavailable',
		count: 1
	});
	assert.doesNotMatch(warnings[0], new RegExp(`${ALICE}|${SECRET}|example.com|page`));
	const ledger = createTestAiLedger();
	const valid = await event(ledger);
	await assert.rejects(
		() =>
			withServerToolActivity(valid, 'draw.page.save', async () => {
				throw new Error('private-operation-error');
			}),
		/private-operation-error/
	);
	const rows = ledger.database.prepare('SELECT * FROM tools_activity').all();
	assert.equal(rows[0].status, 'failed');
	assert.doesNotMatch(JSON.stringify(rows), /private-operation-error/);
});

test('all-scope pagination never omits same-ID same-timestamp events across sixty accounts', async (context) => {
	context.mock.method(Date, 'now', () => NOW);
	const ledger = createTestAiLedger();
	for (let index = 0; index < 60; index++)
		await record(ledger, `account-${String(index).padStart(2, '0')}`, 'draw.open', uuid(1));
	const first = await (await logs(ledger, OWNER, { scope: 'all' }, true)).json();
	const second = await (
		await logs(ledger, OWNER, { scope: 'all', before: first.nextCursor }, true)
	).json();
	assert.equal(first.entries.length, 50);
	assert.equal(second.entries.length, 10);
	assert.equal(second.nextCursor, null);
	assert.equal(
		new Set([...first.entries, ...second.entries].map((entry) => entry.account.id)).size,
		60
	);
	assert.equal(first.summary.activeAccounts, 60);
});

test('trusted server actions update readable profiles and failed scheduling still preserves the user operation', async () => {
	const ledger = createTestAiLedger();
	const current = await event(ledger, { profile: { email: 'alice@example.com', name: 'Alice' } });
	current.platform.context = {
		waitUntil: () => {
			throw new Error('Context unavailable');
		}
	};
	assert.equal(
		await withServerToolActivity(current, 'podcast.open', async () => 'completed'),
		'completed'
	);
	const profile = ledger.database.prepare('SELECT * FROM tools_activity_accounts').get();
	assert.deepEqual({ ...profile }, { id: ALICE, email: 'alice@example.com', name: 'Alice' });
});

test('rolling date filters and UTC daily totals reflect only retained filtered rows, even when a prior alarm was delayed', async (context) => {
	let now = NOW - 31 * DAY;
	context.mock.method(Date, 'now', () => now);
	const ledger = createTestAiLedger();
	await ledgerRequest(ledger, 'admit', {
		userId: ALICE,
		kind: 'assistant',
		model: '@cf/qwen/qwen3.8-27b',
		estimatedReservedUsd: 0.05
	});
	await record(ledger, ALICE, 'draw.open', uuid(1));
	now = NOW - 8 * DAY;
	await record(ledger, ALICE, 'box.open', uuid(2));
	now = NOW - 3 * DAY;
	await record(ledger, ALICE, 'draw.open', uuid(3));
	now = NOW;
	await record(ledger, ALICE, 'box.open', uuid(4));
	for (const [days, count] of [
		[1, 1],
		[7, 2],
		[30, 3]
	]) {
		const result = await (await logs(ledger, ALICE, { days })).json();
		assert.equal(result.summary.toolActions, count);
		assert.equal(result.summary.aiRequests, 0);
		assert.equal(
			result.daily.reduce((total, day) => total + day.toolActions, 0),
			count
		);
		assert.equal(result.range.from, new Date(NOW - days * DAY).toISOString());
	}
	assert.equal(
		ledger.database.prepare('SELECT COUNT(*) AS total FROM tools_ai_usage').get().total,
		0
	);
	const filtered = await (await logs(ledger, ALICE, { days: 30, tool: 'box' })).json();
	assert.equal(filtered.summary.toolActions, 2);
	assert.deepEqual(
		filtered.daily.map((day) => day.date),
		[new Date(NOW - 8 * DAY).toISOString().slice(0, 10), new Date(NOW).toISOString().slice(0, 10)]
	);
});
