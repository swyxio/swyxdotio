import {
	PRESENCE_COLORS,
	PRESENCE_PROTOCOL_VERSION as V,
	PRESENCE_ROOM_LIMIT,
	consumePresenceToken,
	createPresenceRateState,
	normalizePresenceCountry,
	parsePresenceClientFrame,
	presenceFrame
} from '../../src/lib/presence-contracts.js';

const POLICY_VIOLATION = 1008;
const TRY_AGAIN_LATER = 1013;
const REACTION_INTERVAL_MS = 2_000;
const RATE_LIMIT_CLOSE_THRESHOLD = 20;

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

function close(socket, code, reason) {
	try {
		socket.close(code, reason);
	} catch {
		// The peer may already have gone away.
	}
}

function peerRow(peer) {
	return [peer.id, peer.country, peer.color, peer.x, peer.y, peer.mode];
}

function makeJoinFrame(peer) {
	return [V, 'j', ...peerRow(peer)];
}

export class PresenceRoom {
	constructor(ctx) {
		this.ctx = ctx;
		this.rateStates = new Map();
		this.aggregateCounts = { connections: 0, malformed: 0, rateLimited: 0, roomFull: 0 };
	}

	get peers() {
		return this.ctx.getWebSockets();
	}

	report(kind) {
		const count = (this.aggregateCounts[kind] ?? 0) + 1;
		this.aggregateCounts[kind] = count;
		// Emit sparse aggregate-only diagnostics. Never include room, peer, country,
		// position, reaction, URL, user agent, or network identifiers.
		if ((count & (count - 1)) === 0) console.warn('presence.aggregate', { kind, count });
	}

	broadcast(frame, except = null) {
		for (const socket of this.peers) {
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

		if (this.peers.length >= PRESENCE_ROOM_LIMIT) {
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
		const peer = {
			id,
			country: normalizePresenceCountry(request.headers.get('x-swyx-presence-country')),
			color: PRESENCE_COLORS[this.peers.length % PRESENCE_COLORS.length],
			x: 0.5,
			y: 0.5,
			mode: 'd'
		};

		this.ctx.acceptWebSocket(server);
		server.serializeAttachment(peer);
		this.rateStates.set(id, createPresenceRateState());
		this.report('connections');

		// Snapshot rows are chunked one-per-frame so the protocol's strict 128-byte
		// frame ceiling still holds for a full 32-reader room.
		send(server, [V, 'w', peer.id, [peerRow(peer)]]);
		for (const socket of this.peers) {
			if (socket === server) continue;
			const existingPeer = socketAttachment(socket);
			if (existingPeer) send(server, [V, 's', [peerRow(existingPeer)]]);
		}
		this.broadcast(makeJoinFrame(peer), server);

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
			this.broadcast([V, 'm', peer.id, peer.x, peer.y, peer.mode], socket);
			return;
		}

		if (message.type === 'reaction') {
			const now = Date.now();
			if (now - state.reactionAt < REACTION_INTERVAL_MS) return;
			state.reactionAt = now;
			this.broadcast([V, 'r', peer.id, message.reaction]);
			return;
		}

		if (message.type === 'share' && !state.shared) {
			state.shared = true;
			this.broadcast([V, 'c', peer.id], socket);
		}
	}

	webSocketClose(socket) {
		this.remove(socket);
	}

	webSocketError(socket) {
		this.remove(socket);
	}

	remove(socket) {
		const peer = socketAttachment(socket);
		if (!peer) return;
		this.rateStates.delete(peer.id);
		this.broadcast([V, 'l', peer.id], socket);
	}
}

export default {
	fetch() {
		return new Response('Not found', { status: 404 });
	}
};
