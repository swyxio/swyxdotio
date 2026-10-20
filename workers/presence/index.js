import {
	PRESENCE_COLORS,
	PRESENCE_PROTOCOL_VERSION as V,
	PRESENCE_ROOM_LIMIT,
	consumePresenceToken,
	createPresenceRateState,
	normalizePresenceCountry,
	parsePresenceClientFrame,
	presenceAggregateDelta,
	presenceBucketStart,
	presenceFrame
} from '../../src/lib/presence-contracts.js';

const POLICY_VIOLATION = 1008;
const TRY_AGAIN_LATER = 1013;
const REACTION_INTERVAL_MS = 2_000;
const RATE_LIMIT_CLOSE_THRESHOLD = 20;
// One deliberate sitewide coordinator, with a separate per-page room limit.
// At capacity the next connection is rejected rather than showing a false count.
const SITEWIDE_LIMIT = 1_024;
const ADDRESS_LIMIT = 64;
const PERSISTED_PRESENCE_KINDS = new Set([
	'roomFull',
	'malformed',
	'rateLimited',
	'connections',
	'attempts',
	'rateLimitedConnections'
]);
const EXACT_PRESENCE_KINDS = new Set(['connections', 'attempts', 'rateLimitedConnections']);
const UNSENDABLE_CLOSE_CODES = new Set([1004, 1005, 1006]);

function socketAttachment(socket) {
	try {
		return socket.deserializeAttachment();
	} catch {
		return null;
	}
}

function send(socket, frame) {
	try {
		socket.send(presenceFrame(frame));
		return true;
	} catch {
		return false;
	}
}

// Page keys come only from the public registry/manifest at ingress. Unlike
// position frames, a page key can exceed the tiny 128-byte movement limit.
function sendSitewide(socket, frame) {
	try {
		socket.send(JSON.stringify(frame));
		return true;
	} catch {
		return false;
	}
}

function sitewidePageFrame(key, count, title) {
	const base = [V, 'g', key, count];
	const remaining = Array.from(title || '');
	while (remaining.length) {
		const candidate = [...base, remaining.join('')];
		try {
			presenceFrame(candidate);
			return candidate;
		} catch {
			remaining.pop();
		}
	}
	return base;
}

function isConnected(socket) {
	return socket.readyState !== 2 && socket.readyState !== 3;
}

async function roomTag(roomName) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(roomName));
	return `room:${Array.from(new Uint8Array(digest).slice(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function close(socket, code, reason) {
	try {
		socket.close(code, reason);
	} catch {
		// The peer may already have gone away.
	}
}

function isReplyableCloseCode(code) {
	return (
		Number.isInteger(code) &&
		((code >= 1000 && code <= 1014 && !UNSENDABLE_CLOSE_CODES.has(code)) ||
			(code >= 3000 && code <= 4999))
	);
}

function peerRow(peer) {
	return [peer.id, peer.country, peer.color, peer.x, peer.y, peer.mode];
}

function makeJoinFrame(peer) {
	return [V, 'j', ...peerRow(peer)];
}

export class PresenceRoom {
	constructor(ctx, env) {
		this.ctx = ctx;
		this.env = env;
		// Old per-page objects may still contain untagged hibernating sockets
		// during a rolling deploy. The new sitewide object has no legacy sockets.
		this.legacyPeers = ctx.getWebSockets().filter((socket) => !socketAttachment(socket)?.roomTag);
		this.removedSockets = new WeakSet();
		this.rateStates = new Map();
		this.aggregateBucketStart = presenceBucketStart(Date.now());
		this.aggregateCounts = { connections: 0, malformed: 0, rateLimited: 0, roomFull: 0 };
	}

	get peers() {
		return this.ctx.getWebSockets().filter(isConnected);
	}

	roomPeers(tag) {
		// Untagged legacy sockets only exist in the original per-page object; keep
		// them talking to newly tagged sockets until the main Worker is updated.
		return tag
			? [...this.ctx.getWebSockets(tag), ...this.legacyPeers].filter(isConnected)
			: this.peers;
	}

	sitewideCounts(except = null) {
		const counts = new Map();
		for (const socket of this.peers) {
			if (socket === except) continue;
			const peer = socketAttachment(socket);
			if (!peer?.pageKey) continue;
			const row = counts.get(peer.pageKey) ?? { count: 0, title: peer.pageTitle || '' };
			row.count += 1;
			if (!row.title && peer.pageTitle) row.title = peer.pageTitle;
			counts.set(peer.pageKey, row);
		}
		return counts;
	}

	broadcastSitewide(pageKey, row, except = null) {
		const frame = sitewidePageFrame(pageKey, row.count, row.title);
		for (const socket of this.peers) {
			if (socket !== except && socketAttachment(socket)?.pageKey) sendSitewide(socket, frame);
		}
	}

	report(kind) {
		const bucketStart = presenceBucketStart(Date.now());
		if (bucketStart !== this.aggregateBucketStart) {
			this.aggregateBucketStart = bucketStart;
			this.aggregateCounts = { connections: 0, malformed: 0, rateLimited: 0, roomFull: 0 };
		}
		const count = (this.aggregateCounts[kind] ?? 0) + 1;
		this.aggregateCounts[kind] = count;
		const persistedDelta = EXACT_PRESENCE_KINDS.has(kind) ? 1 : presenceAggregateDelta(count);
		// Emit sparse aggregate-only diagnostics. Never include room, peer, country,
		// position, reaction, URL, user agent, or network identifiers.
		if (presenceAggregateDelta(count) > 0) console.warn('presence.aggregate', { kind, count });
		if (persistedDelta > 0 && PERSISTED_PRESENCE_KINDS.has(kind) && this.env?.READ_COUNTERS) {
			this.ctx.waitUntil(
				incrementPresenceCounter(this.env.READ_COUNTERS, kind, persistedDelta, bucketStart).catch(
					() => console.error('presence.counter_failed', { kind })
				)
			);
		}
	}

	broadcast(frame, except = null, tag = null) {
		for (const socket of this.roomPeers(tag)) {
			if (socket !== except) send(socket, frame);
		}
	}

	newId() {
		const existing = new Set(
			this.peers.map((socket) => socketAttachment(socket)?.id).filter(Boolean)
		);
		let id;
		do {
			id = crypto.randomUUID().replaceAll('-', '').slice(0, 8);
		} while (existing.has(id));
		return id;
	}

	async fetch(request) {
		if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
			return new Response('WebSocket upgrade required', { status: 426 });
		}

		// This internal URL is constructed only after the main Worker validates a
		// key against the public registry or non-private article manifest.
		const url = new URL(request.url);
		const roomName = url.searchParams.get('room');
		if (!roomName || !/^(?:page|article):[a-z0-9][a-z0-9_-]*$/.test(roomName)) {
			return new Response('Unknown public page', { status: 400 });
		}
		const pageKey = roomName;
		const pageTitle = Array.from(url.searchParams.get('title') || '')
			.slice(0, 120)
			.join('');
		// New ingress provides daily keyed digests, never a raw address. Missing
		// keys are accepted only for the old per-page ingress during rollout.
		const rateKey = request.headers.get('x-swyx-presence-rate-key');
		const previousRateKey = request.headers.get('x-swyx-presence-previous-key');
		if (
			(rateKey || previousRateKey) &&
			(!rateKey ||
				!previousRateKey ||
				!/^[a-f0-9]{64}$/.test(rateKey) ||
				!/^[a-f0-9]{64}$/.test(previousRateKey))
		) {
			return new Response('Invalid connection key', { status: 400 });
		}
		const tag = await roomTag(roomName);
		const pagePeers = this.roomPeers(tag);
		const addressPeers = new Set();
		if (rateKey && previousRateKey) {
			for (const addressTag of [`address:${rateKey}`, `address:${previousRateKey}`]) {
				for (const socket of this.ctx.getWebSockets(addressTag).filter(isConnected)) {
					addressPeers.add(socket);
				}
			}
		}
		this.report('attempts');
		if (
			pagePeers.length >= PRESENCE_ROOM_LIMIT ||
			this.peers.length >= SITEWIDE_LIMIT ||
			addressPeers.size >= ADDRESS_LIMIT
		) {
			this.report('roomFull');
			const pair = new WebSocketPair();
			const [client, server] = Object.values(pair);
			server.accept();
			close(server, TRY_AGAIN_LATER, 'Room full');
			return new Response(null, { status: 101, webSocket: client });
		}

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);
		const id = this.newId();
		// Keep the latest validated public title on all sockets for this page. A
		// new reader with no title inherits it; after the updating reader leaves,
		// surviving hibernated sockets still advertise the most recent title.
		const previousTitle = pagePeers
			.map(socketAttachment)
			.find((peer) => peer?.pageTitle)?.pageTitle;
		const currentTitle = pageTitle || previousTitle || '';
		if (currentTitle) {
			for (const socket of pagePeers) {
				const existing = socketAttachment(socket);
				if (!existing || existing.pageTitle === currentTitle) continue;
				existing.pageTitle = currentTitle;
				try {
					socket.serializeAttachment(existing);
				} catch {
					// A socket that closed during the join need not be updated.
				}
			}
		}
		const peer = {
			id,
			pageKey,
			pageTitle: currentTitle,
			roomTag: tag,
			country: normalizePresenceCountry(request.headers.get('x-swyx-presence-country')),
			color: PRESENCE_COLORS[pagePeers.length % PRESENCE_COLORS.length],
			x: 0.5,
			y: 0.5,
			mode: 'd'
		};

		this.ctx.acceptWebSocket(server, rateKey ? [tag, `address:${rateKey}`] : [tag]);
		server.serializeAttachment(peer);
		this.rateStates.set(id, createPresenceRateState());
		this.report('connections');

		// Snapshot rows are chunked one-per-frame so the protocol's strict 128-byte
		// frame ceiling still holds for a full 32-reader room.
		send(server, [V, 'w', peer.id, [peerRow(peer)]]);
		for (const socket of pagePeers) {
			if (socket === server) continue;
			const existingPeer = socketAttachment(socket);
			if (existingPeer) send(server, [V, 's', [peerRow(existingPeer)]]);
		}
		const counts = this.sitewideCounts();
		for (const [key, row] of counts)
			sendSitewide(server, sitewidePageFrame(key, row.count, row.title));
		sendSitewide(server, [V, 'g']);
		this.broadcast(makeJoinFrame(peer), server, tag);
		this.broadcastSitewide(pageKey, counts.get(pageKey) ?? { count: 0, title: '' }, server);

		return new Response(null, { status: 101, webSocket: client });
	}

	webSocketMessage(socket, raw) {
		const peer = socketAttachment(socket);
		if (!peer) {
			this.report('malformed');
			close(socket, POLICY_VIOLATION, 'Missing socket state');
			return;
		}

		const state = this.rateStates.get(peer.id) ?? createPresenceRateState();
		this.rateStates.set(peer.id, state);
		if (!consumePresenceToken(state)) {
			this.report('rateLimited');
			// Attachment survives hibernation; count each affected connection once.
			if (!peer.rateLimitedReported) {
				peer.rateLimitedReported = true;
				socket.serializeAttachment(peer);
				this.report('rateLimitedConnections');
			}
			if (state.violations >= RATE_LIMIT_CLOSE_THRESHOLD) {
				close(socket, POLICY_VIOLATION, 'Rate limit exceeded');
			}
			return;
		}

		const message = parsePresenceClientFrame(raw);
		if (!message) {
			this.report('malformed');
			close(socket, POLICY_VIOLATION, 'Malformed frame');
			return;
		}

		if (message.type === 'position') {
			peer.x = message.x;
			peer.y = message.y;
			peer.mode = message.mode;
			socket.serializeAttachment(peer);
			this.broadcast([V, 'm', peer.id, peer.x, peer.y, peer.mode], socket, peer.roomTag);
			return;
		}

		if (message.type === 'reaction') {
			const now = Date.now();
			if (now - state.reactionAt < REACTION_INTERVAL_MS) return;
			state.reactionAt = now;
			this.broadcast([V, 'r', peer.id, message.reaction], null, peer.roomTag);
			return;
		}

		if (message.type === 'share' && !state.shared) {
			state.shared = true;
			this.broadcast([V, 'c', peer.id], socket, peer.roomTag);
		}
	}

	webSocketClose(socket, code) {
		// Explicitly reciprocate valid peer Close frames. The runtime compatibility
		// flag should do this automatically, but older hibernated objects have been
		// observed leaving clients at 1006 without this reply.
		if (isReplyableCloseCode(code)) close(socket, code, '');
		this.remove(socket);
	}

	webSocketError(socket) {
		this.remove(socket);
	}

	remove(socket) {
		const peer = socketAttachment(socket);
		if (!peer || this.removedSockets.has(socket)) return;
		this.removedSockets.add(socket);
		this.legacyPeers = this.legacyPeers.filter((legacy) => legacy !== socket);
		this.rateStates.delete(peer.id);
		this.broadcast([V, 'l', peer.id], socket, peer.roomTag);
		if (peer.pageKey) {
			const row = this.sitewideCounts(socket).get(peer.pageKey) ?? { count: 0, title: '' };
			this.broadcastSitewide(peer.pageKey, row, socket);
		}
	}
}

export default {
	fetch() {
		return new Response('Not found', { status: 404 });
	}
};

/** @param {D1Database} database @param {string} kind @param {number} delta @param {number} bucketStart */
async function incrementPresenceCounter(database, kind, delta, bucketStart) {
	await database
		.prepare(
			`INSERT INTO presence_monitor_hourly (bucket_start, kind, count)
			 VALUES (?1, ?2, ?3)
			 ON CONFLICT(bucket_start, kind) DO UPDATE SET count = count + excluded.count`
		)
		.bind(bucketStart, kind, delta)
		.run();
}

export { ChatRoom } from './chat-room.js';
