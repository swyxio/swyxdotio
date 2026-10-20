import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { chatRateKey } from '../src/lib/chat-server.js';
import { isAllowedPresenceRequest } from '../src/lib/presence-server.js';
import { CHAT_RETENTION_MS, ChatRoom, parseChatMessage } from '../workers/presence/chat-room.js';

const TOKEN = 'a'.repeat(64);

function socket(rateKey = TOKEN) {
	let attachment = { lastMessageAt: 0, rateKey };
	return {
		frames: [],
		closed: null,
		deserializeAttachment: () => structuredClone(attachment),
		serializeAttachment(value) {
			attachment = structuredClone(value);
		},
		send(frame) {
			this.frames.push(JSON.parse(frame));
		},
		close(code, reason) {
			this.closed = { code, reason };
		}
	};
}

function roomHarness(limiter = { limit: async () => ({ success: true }) }) {
	const db = new DatabaseSync(':memory:');
	let nextAlarm = null;
	const peers = [];
	const ctx = {
		getWebSockets: () => peers,
		storage: {
			sql: {
				exec(statement, ...params) {
					const prepared = db.prepare(statement);
					if (/^\s*select/i.test(statement)) {
						const rows = prepared.all(...params);
						return { toArray: () => rows, one: () => rows[0] };
					}
					prepared.run(...params);
					return {};
				}
			},
			async getAlarm() {
				return nextAlarm;
			},
			async setAlarm(time) {
				nextAlarm = time;
			}
		}
	};
	return {
		db,
		ctx,
		peers,
		env: { CHAT_MESSAGE_RATE_LIMITER: limiter },
		get nextAlarm() {
			return nextAlarm;
		},
		clearAlarm() {
			nextAlarm = null;
		}
	};
}

function frame(requestId, nick, text) {
	return JSON.stringify({ type: 'message', requestId, nick, text });
}

test('chat accepts bounded plain text and rejects malformed and control characters', () => {
	assert.deepEqual(parseChatMessage(frame('request_1', ' visitor ', ' hello ')), {
		requestId: 'request_1',
		nick: 'visitor',
		text: 'hello'
	});
	assert.equal(parseChatMessage('x'.repeat(4097)), null);
	assert.equal(parseChatMessage(frame('bad id!', 'visitor', 'hello')), null);
	assert.equal(parseChatMessage(new Uint8Array([1])), null);
	assert.ok(parseChatMessage(frame('abc', 'visitor', 'x'.repeat(501))).error);
	assert.ok(parseChatMessage(frame('abc', 'x'.repeat(25), 'hello')).error);
	assert.ok(parseChatMessage(frame('abc', 'visitor', 'hello\u202Eevil')).error);
	assert.equal(parseChatMessage(frame('abc', 'visitor', 'first\nsecond')).text, 'first\nsecond');
});

test('chat ingress uses the existing same-origin socket boundary and a rotating keyed address digest', async () => {
	const headers = { origin: 'https://swyx.io', upgrade: 'websocket', 'user-agent': 'Mozilla/5.0' };
	assert.equal(
		isAllowedPresenceRequest(new Request('https://swyx.io/api/chat', { headers })),
		true
	);
	assert.equal(
		isAllowedPresenceRequest(
			new Request('https://swyx.io/api/chat', {
				headers: { ...headers, origin: 'https://evil.example' }
			})
		),
		false
	);
	const first = await chatRateKey('test secret', '192.0.2.1', '2026-10-20');
	assert.match(first, /^[a-f0-9]{64}$/);
	assert.equal(first, await chatRateKey('test secret', '192.0.2.1', '2026-10-20'));
	assert.notEqual(first, await chatRateKey('test secret', '192.0.2.1', '2026-10-21'));
	assert.notEqual(first, await chatRateKey('different secret', '192.0.2.1', '2026-10-20'));
	assert.ok(!first.includes('192.0.2.1'));
});

test('persists before acknowledging, broadcasts to all peers, and keeps socket limits after hibernation', async () => {
	const realNow = Date.now;
	let now = 1_000_000;
	Date.now = () => now;
	try {
		const h = roomHarness();
		const a = socket();
		const b = socket('b'.repeat(64));
		h.peers.push(a, b);
		let room = new ChatRoom(h.ctx, h.env);
		await room.webSocketMessage(a, frame('first', 'alice', 'hello'));
		const saved = h.db.prepare('SELECT nick, text, created_at FROM chat_messages').all();
		assert.equal(saved.length, 1);
		assert.deepEqual({ ...saved[0] }, { nick: 'alice', text: 'hello', created_at: now });
		assert.equal(h.nextAlarm, now + CHAT_RETENTION_MS);
		assert.equal(a.frames[0].type, 'message');
		assert.deepEqual(b.frames[0], a.frames[0]);
		assert.deepEqual(a.frames[1], { type: 'ack', requestId: 'first', id: a.frames[0].message.id });

		// Reconstruct the object as the runtime does after hibernation.
		room = new ChatRoom(h.ctx, h.env);
		now += 1000;
		await room.webSocketMessage(a, frame('second', 'alice', 'too soon'));
		assert.equal(a.frames.at(-1).type, 'error');
		assert.equal(a.frames.at(-1).requestId, 'second');
		now += 3000;
		await room.webSocketMessage(a, frame('third', 'alice', 'back again'));
		assert.equal(h.db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n, 2);
		assert.equal(b.frames.at(-1).message.text, 'back again');
	} finally {
		Date.now = realNow;
	}
});

test('alarm deletes expired rows even with no connected clients and schedules remaining rows', async () => {
	const realNow = Date.now;
	let now = 2_000_000;
	Date.now = () => now;
	try {
		const h = roomHarness();
		const room = new ChatRoom(h.ctx, h.env);
		const peer = socket();
		h.peers.push(peer);
		await room.webSocketMessage(peer, frame('a', 'alice', 'old'));
		now += 5000;
		await room.webSocketMessage(peer, frame('b', 'alice', 'new'));
		h.peers.length = 0;
		now = 2_000_000 + CHAT_RETENTION_MS;
		h.clearAlarm(); // Cloudflare clears the alarm as it starts invoking it.
		await room.alarm();
		const rows = h.db.prepare('SELECT text FROM chat_messages').all();
		assert.deepEqual(
			rows.map((row) => row.text),
			['new']
		);
		assert.equal(h.nextAlarm, now + 5000);
		now += 5000;
		h.clearAlarm();
		await room.alarm();
		assert.equal(h.db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n, 0);
		assert.equal(h.nextAlarm, null);
	} finally {
		Date.now = realNow;
	}
});

test('shared-key message limits survive reconnecting; malformed frame floods close the socket', async () => {
	let count = 0;
	const seenKeys = [];
	const h = roomHarness({
		async limit({ key }) {
			seenKeys.push(key);
			count += 1;
			return { success: count === 1 };
		}
	});
	const room = new ChatRoom(h.ctx, h.env);
	const first = socket();
	const second = socket();
	h.peers.push(first, second);
	await room.webSocketMessage(first, frame('first', 'alice', 'one'));
	await room.webSocketMessage(second, frame('next', 'alice', 'two'));
	assert.equal(second.frames.at(-1).type, 'error');
	assert.deepEqual(seenKeys, [TOKEN, TOKEN]);
	assert.equal(h.db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n, 1);
	const spammer = socket();
	for (let i = 0; i < 11; i++) await room.webSocketMessage(spammer, 'bad');
	assert.equal(spammer.closed.code, 1008);
});
