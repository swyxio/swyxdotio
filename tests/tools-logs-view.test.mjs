import assert from 'node:assert/strict';
import test from 'node:test';
import { logFilters, logMoney } from '../src/lib/tools-logs-view.js';
import { recordToolActivity } from '../src/lib/tools-activity-client.js';

test('log filters have bounded defaults and retain supported bookmarked views', () => {
	assert.deepEqual(
		logFilters(new URLSearchParams('days=999&kind=secrets&tool=private&scope=admin')),
		{ days: '7', kind: 'all', tool: 'all', scope: 'mine' }
	);
	assert.deepEqual(logFilters(new URLSearchParams('days=30&kind=tool&tool=box&scope=all')), {
		days: '30',
		kind: 'tool',
		tool: 'box',
		scope: 'all'
	});
	assert.equal(logMoney(null), '—');
	assert.equal(logMoney(0), '$0.00');
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
