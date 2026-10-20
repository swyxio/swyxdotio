import assert from 'node:assert/strict';
import test from 'node:test';
import { PresenceRoom } from '../workers/presence/index.js';
import { PRESENCE_FRAME_LIMIT, PRESENCE_ROOM_LIMIT } from '../src/lib/presence-contracts.js';

class Socket {
	constructor() {
		this.readyState = 1;
		this.frames = [];
		this.attachment = null;
	}
	accept() {}
	serializeAttachment(value) {
		this.attachment = structuredClone(value);
	}
	deserializeAttachment() {
		return structuredClone(this.attachment);
	}
	send(value) {
		this.frames.push(JSON.parse(value));
	}
	close(code) {
		this.closeCode = code;
		this.readyState = 3;
	}
}

class FakeContext {
	constructor() {
		this.sockets = [];
		this.tags = new Map();
	}
	acceptWebSocket(socket, tags = []) {
		this.sockets.push(socket);
		this.tags.set(socket, tags);
	}
	getWebSockets(tag) {
		return tag
			? this.sockets.filter((socket) => this.tags.get(socket)?.includes(tag))
			: this.sockets;
	}
}

function setup() {
	const originalPair = globalThis.WebSocketPair;
	const originalResponse = globalThis.Response;
	const pairs = [];
	globalThis.WebSocketPair = class {
		constructor() {
			this[0] = new Socket();
			this[1] = new Socket();
			pairs.push(this);
		}
	};
	globalThis.Response = class {
		constructor(body, options = {}) {
			this.body = body;
			this.status = options.status ?? 200;
			this.webSocket = options.webSocket;
		}
	};
	return {
		async connect(room, roomName, title = '', extra = '', keys = null) {
			const url = new URL('https://presence.internal/connect');
			url.searchParams.set('room', roomName);
			url.searchParams.set('title', title);
			if (extra) url.searchParams.set('unused', extra);
			const headers = new Headers({ upgrade: 'websocket' });
			if (keys) {
				headers.set('x-swyx-presence-rate-key', keys.current);
				headers.set('x-swyx-presence-previous-key', keys.previous);
			}
			const response = await room.fetch(new Request(url, { headers }));
			return { response, socket: pairs.at(-1)?.[1] };
		},
		restore() {
			globalThis.WebSocketPair = originalPair;
			globalThis.Response = originalResponse;
		}
	};
}

const framesOf = (socket, type) => socket.frames.filter((frame) => frame[1] === type);

test('sitewide counts include each admitted socket while cursors stay within a public page', async () => {
	const ctx = new FakeContext();
	const fixture = setup(ctx);
	const oldWarn = console.warn;
	console.warn = () => {};
	try {
		let room = new PresenceRoom(ctx, {});
		const home1 = (await fixture.connect(room, 'page:home', 'Home', 'secret-query')).socket;
		const home2 = (await fixture.connect(room, 'page:home', 'Home')).socket;
		const article = (await fixture.connect(room, 'article:public-post', 'A public article')).socket;

		assert.deepEqual(framesOf(home1, 'g')[0], [1, 'g', 'home', 1, 'Home']);
		assert.ok(home1.frames.some((frame) => frame[1] === 'g' && frame.length === 2));
		assert.ok(
			article.frames.some(
				(frame) => JSON.stringify(frame) === JSON.stringify([1, 'g', 'home', 2, 'Home'])
			)
		);
		assert.ok(
			article.frames.some(
				(frame) =>
					JSON.stringify(frame) === JSON.stringify([1, 'g', 'public-post', 1, 'A public article'])
			)
		);
		assert.equal(framesOf(article, 's').length, 0);
		assert.equal(framesOf(article, 'j').length, 0);
		assert.ok(!JSON.stringify(article.frames).includes('secret-query'));

		room.webSocketMessage(home1, '[1,"p",0.2,0.4,"d"]');
		room.webSocketMessage(home1, '[1,"r","👋"]');
		assert.equal(framesOf(home2, 'm').length, 1);
		assert.equal(framesOf(home2, 'r').length, 1);
		assert.equal(framesOf(article, 'm').length, 0);
		assert.equal(framesOf(article, 'r').length, 0);

		// Reconstruction after hibernation retains tags and per-socket attachments.
		room = new PresenceRoom(ctx, {});
		room.webSocketMessage(article, '[1,"p",0.3,0.7,"d"]');
		assert.equal(framesOf(home1, 'm').length, 0);
		home1.readyState = 3;
		room.webSocketClose(home1, 1000);
		assert.ok(
			article.frames.some(
				(frame) => JSON.stringify(frame) === JSON.stringify([1, 'g', 'home', 1, 'Home'])
			)
		);
		assert.equal(framesOf(home2, 'l').length, 1);
		assert.equal(framesOf(article, 'l').length, 0);
		home2.readyState = 3;
		room.webSocketClose(home2, 1000);
		assert.ok(
			article.frames.some((frame) => JSON.stringify(frame) === JSON.stringify([1, 'g', 'home', 0]))
		);
		assert.equal(room.sitewideCounts().get('public-post').count, 1);
	} finally {
		fixture.restore();
		console.warn = oldWarn;
	}
});

test('legacy per-page sockets continue communicating during worker-first rollout', async () => {
	const ctx = new FakeContext();
	const legacy = new Socket();
	legacy.serializeAttachment({
		id: 'legacy',
		country: 'XX',
		color: '#2563EB',
		x: 0.5,
		y: 0.5,
		mode: 'd'
	});
	ctx.acceptWebSocket(legacy);
	const fixture = setup(ctx);
	const oldWarn = console.warn;
	console.warn = () => {};
	try {
		const room = new PresenceRoom(ctx, {});
		const current = (await fixture.connect(room, 'page:home', 'Home')).socket;
		assert.equal(framesOf(current, 's').length, 1);
		assert.equal(framesOf(legacy, 'j').length, 1);
		room.webSocketMessage(legacy, '[1,"p",0.1,0.2,"d"]');
		room.webSocketMessage(current, '[1,"p",0.3,0.4,"d"]');
		assert.equal(framesOf(current, 'm').length, 1);
		assert.equal(framesOf(legacy, 'm').length, 1);
	} finally {
		fixture.restore();
		console.warn = oldWarn;
	}
});

test('per-page and sitewide limits reject excess sockets, not unrelated pages', async () => {
	const ctx = new FakeContext();
	const fixture = setup(ctx);
	const oldWarn = console.warn;
	console.warn = () => {};
	try {
		const room = new PresenceRoom(ctx, {});
		for (let i = 0; i < PRESENCE_ROOM_LIMIT; i++) {
			assert.equal((await fixture.connect(room, 'page:home')).response.status, 101);
		}
		const fullPage = await fixture.connect(room, 'page:home');
		assert.equal(fullPage.socket.closeCode, 1013);
		const otherPage = await fixture.connect(room, 'page:about');
		assert.equal(otherPage.socket.closeCode, undefined);

		while (ctx.sockets.length < 1_024) {
			const socket = new Socket();
			socket.serializeAttachment({
				id: `fill${ctx.sockets.length}`,
				pageKey: 'about',
				roomTag: 'unrelated'
			});
			ctx.acceptWebSocket(socket, ['unrelated']);
		}
		const fullSite = await fixture.connect(room, 'page:ideas');
		assert.equal(fullSite.socket.closeCode, 1013);
	} finally {
		fixture.restore();
		console.warn = oldWarn;
	}
});

test('per-address cap survives hibernation, page changes, and midnight key rotation', async () => {
	const ctx = new FakeContext();
	const fixture = setup(ctx);
	const oldWarn = console.warn;
	console.warn = () => {};
	try {
		let room = new PresenceRoom(ctx, {});
		const yesterday = 'a'.repeat(64);
		const today = 'b'.repeat(64);
		const beforeYesterday = 'c'.repeat(64);
		for (let i = 0; i < 64; i++) {
			const { socket } = await fixture.connect(room, `article:post-${i}`, '', '', {
				current: yesterday,
				previous: beforeYesterday
			});
			assert.equal(socket.closeCode, undefined);
		}
		room = new PresenceRoom(ctx, {});
		const rejected = await fixture.connect(room, 'page:home', '', '', {
			current: today,
			previous: yesterday
		});
		assert.equal(rejected.socket.closeCode, 1013);
		const other = await fixture.connect(room, 'page:home', '', '', {
			current: 'd'.repeat(64),
			previous: 'e'.repeat(64)
		});
		assert.equal(other.socket.closeCode, undefined);
		assert.ok(!JSON.stringify(other.socket.frames).includes(yesterday));
		assert.ok(!JSON.stringify(other.socket.frames).includes(today));

		const closed = ctx.sockets[0];
		closed.readyState = 3;
		room.webSocketClose(closed, 1000);
		const afterClose = await fixture.connect(room, 'page:about', '', '', {
			current: today,
			previous: yesterday
		});
		assert.equal(afterClose.socket.closeCode, undefined);
		const malformed = await fixture.connect(room, 'page:home', '', '', {
			current: '192.0.2.1',
			previous: yesterday
		});
		assert.equal(malformed.response.status, 400);
	} finally {
		fixture.restore();
		console.warn = oldWarn;
	}
});

test('sitewide frames preserve validated keys and trim public titles to the frame budget', async () => {
	const ctx = new FakeContext();
	const fixture = setup(ctx);
	const oldWarn = console.warn;
	console.warn = () => {};
	try {
		const room = new PresenceRoom(ctx, {});
		const ordinary = (await fixture.connect(room, 'article:public-post', '🌲'.repeat(80))).socket;
		const titleFrame = framesOf(ordinary, 'g').find((frame) => frame.length > 2);
		assert.ok(new TextEncoder().encode(JSON.stringify(titleFrame)).length <= PRESENCE_FRAME_LIMIT);
		assert.ok(titleFrame[4].length > 0);
		const longKey = 'a'.repeat(140);
		const long = (await fixture.connect(room, `article:${longKey}`, 'Title')).socket;
		const longFrame = framesOf(long, 'g').find((frame) => frame[2] === longKey);
		assert.deepEqual(longFrame, [1, 'g', longKey, 1]);
		assert.ok(new TextEncoder().encode(JSON.stringify(longFrame)).length < 8_192);
		const rejected = await fixture.connect(room, 'article:public-post?secret=1');
		assert.equal(rejected.response.status, 400);
	} finally {
		fixture.restore();
		console.warn = oldWarn;
	}
});
