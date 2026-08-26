import assert from 'node:assert/strict';
import test from 'node:test';
import {
	logFilters,
	logQuery,
	logMoney,
	logStatus,
	mergeLogEntries
} from '../src/lib/tools-logs-view.js';
import { TOOLS_LOG_FILTER_DEFAULTS } from '../src/lib/tools-activity.js';
import { recordToolActivity } from '../src/lib/tools-activity-client.js';

test('log filters have bounded defaults and retain supported bookmarked views', () => {
	assert.deepEqual(
		logFilters(new URLSearchParams('days=999&kind=secrets&tool=private&scope=admin')),
		{ ...TOOLS_LOG_FILTER_DEFAULTS }
	);
	assert.deepEqual(logFilters(new URLSearchParams('days=30&kind=tool&tool=box&scope=all')), {
		...TOOLS_LOG_FILTER_DEFAULTS,
		days: '30',
		kind: 'tool',
		tool: 'box',
		scope: 'all'
	});
	assert.equal(logMoney(null), '—');
	assert.equal(logMoney(0), '$0.00');
});

test('analytics filters round-trip as minimal bookmarks without private identity or snapshot state', () => {
	const query = new URLSearchParams({
		days: '30',
		kind: 'ai',
		scope: 'all',
		status: 'pending',
		source: 'server',
		model: 'fal-ai/test',
		action: 'draw.ai.media',
		account: 'google_123',
		q: 'request-42',
		day: '2026-08-26',
		opens: 'hide'
	});
	const filters = logFilters(query);
	assert.deepEqual(logFilters(logQuery(filters)), filters);
	assert.equal(filters.account, 'google_123');
	assert.equal(filters.model, 'fal-ai/test');
	assert.equal(logQuery({ ...TOOLS_LOG_FILTER_DEFAULTS }).toString(), '');
	assert.equal(
		logQuery({ ...filters, before: 'cursor', snapshot: '2026-08-26T00:00:00.000Z' }).has(
			'snapshot'
		),
		false
	);
	assert.equal(logQuery({ ...filters, before: 'cursor' }).has('before'), false);
});

test('invalid, duplicate, and private URL filters are discarded independently', () => {
	const filters = logFilters(
		new URLSearchParams({
			kind: 'ai',
			status: 'secret',
			source: 'secret',
			day: '2026-02-30',
			model: 'x'.repeat(201),
			q: 'x'.repeat(101),
			action: 'read.private',
			account: 'someone@example.com',
			snapshot: 'not-a-bookmark'
		})
	);
	assert.deepEqual(filters, { ...TOOLS_LOG_FILTER_DEFAULTS, kind: 'ai' });
	assert.equal(
		logFilters(new URLSearchParams('status=failed&status=pending&kind=ai')).status,
		'all'
	);
	assert.equal(logFilters(new URLSearchParams('account=private_user&scope=mine')).account, 'all');
	assert.equal(logFilters(new URLSearchParams('day=2026-08-26')).day, '2026-08-26');
});

test('paging deduplicates the same event without collapsing different accounts or kinds', () => {
	const entry = { id: 'request-1', kind: 'tool', status: 'succeeded' };
	const merged = mergeLogEntries(
		[entry],
		[{ ...entry }, { ...entry, kind: 'ai' }, { ...entry, account: { id: 'other' } }]
	);
	assert.equal(merged.length, 3);
	assert.equal(logStatus('reserved'), 'Pending');
	assert.equal(logStatus('submitted'), 'Pending');
	assert.equal(logStatus('failed'), 'Failed');
});

test('browser activity sends only allowlisted metadata and the expected account header', async () => {
	let calls = 0;
	const send = async (url, options) => {
		calls++;
		assert.equal(url, '/tools/api/logs');
		assert.equal(options.headers['X-Tools-User'], 'alice');
		assert.equal(options.credentials, 'same-origin');
		const body = JSON.parse(options.body);
		assert.deepEqual(Object.keys(body).sort(), ['action', 'id', 'status']);
		assert.equal(body.action, 'draw.image.magic-eraser');
		assert.equal(body.status, 'cancelled');
		assert.match(body.id, /^[0-9a-f-]{36}$/);
		return new Response(null, { status: 201 });
	};
	assert.equal(await recordToolActivity(null, 'draw.open', 'succeeded', send), false);
	assert.equal(await recordToolActivity('alice', 'draw.ai.media', 'succeeded', send), false);
	assert.equal(await recordToolActivity('alice', 'private-content', 'succeeded', send), false);
	assert.equal(
		await recordToolActivity('alice', 'draw.image.magic-eraser', 'cancelled', send),
		true
	);
	assert.equal(calls, 1);
});

test('blocked activity reports failure without retrying or interrupting the local tool', async () => {
	let calls = 0;
	const fail = async () => {
		calls++;
		throw new Error('offline');
	};
	assert.equal(await recordToolActivity('alice', 'draw.open', 'succeeded', fail), false);
	assert.equal(calls, 1);
	assert.equal(
		await recordToolActivity(
			'alice',
			'draw.open',
			'succeeded',
			async () => new Response(null, { status: 409 })
		),
		false
	);
});
