// One site-wide room. Neither nicknames nor IP addresses establish identity.
export const CHAT_RETENTION_MS = 48 * 60 * 60 * 1000;
export const CHAT_HISTORY_LIMIT = 150;
export const CHAT_FRAME_LIMIT = 4096;
export const CHAT_MESSAGE_LIMIT = 500;
export const CHAT_NICK_LIMIT = 24;
const MESSAGE_INTERVAL_MS = 3000;
const ROOM_LIMIT = 256;
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const TEXT_CONTROL = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const REQUEST_ID = /^[a-zA-Z0-9_-]{1,64}$/;

/** @param {unknown} raw */
export function parseChatMessage(raw) {
	if (
		typeof raw !== 'string' ||
		raw.length > CHAT_FRAME_LIMIT ||
		new TextEncoder().encode(raw).byteLength > CHAT_FRAME_LIMIT
	)
		return null;
	try {
		const frame = JSON.parse(raw);
		if (!frame || typeof frame !== 'object' || frame.type !== 'message') return null;
		if (typeof frame.requestId !== 'string' || !REQUEST_ID.test(frame.requestId)) return null;
		if (typeof frame.nick !== 'string' || typeof frame.text !== 'string') return null;
		const nick = frame.nick.trim();
		const text = frame.text.trim();
		if (
			!nick ||
			nick.length > CHAT_NICK_LIMIT ||
			CONTROL.test(nick) ||
			!text ||
			text.length > CHAT_MESSAGE_LIMIT ||
			TEXT_CONTROL.test(text)
		)
			return {
				error: 'Please use a name and a message within the character limits.',
				requestId: frame.requestId
			};
		return { requestId: frame.requestId, nick, text };
	} catch {
		return null;
	}
}

function send(socket, frame) {
	try {
		socket.send(JSON.stringify(frame));
	} catch {
		// The browser may have disconnected before the reply was ready.
	}
}

export class ChatRoom {
	constructor(ctx, env) {
		this.ctx = ctx;
		this.env = env;
		// Pending handlers keep the object awake, so this transient lock resets
		// safely if the object is restarted after a failed operation.
		this.pendingSockets = new WeakSet();
		this.ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS chat_messages (
			id TEXT PRIMARY KEY,
			nick TEXT NOT NULL,
			text TEXT NOT NULL,
			created_at INTEGER NOT NULL
		)`);
		this.ctx.storage.sql.exec(
			'CREATE INDEX IF NOT EXISTS chat_messages_created_at ON chat_messages(created_at)'
		);
	}

	async fetch(request) {
		if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
			return new Response('WebSocket upgrade required', { status: 426 });
		}
		const rateKey = request.headers.get('x-chat-rate-key');
		if (!rateKey || !/^[a-f0-9]{64}$/.test(rateKey) || !this.env.CHAT_MESSAGE_RATE_LIMITER) {
			return new Response('Chat unavailable', { status: 503 });
		}
		if (this.ctx.getWebSockets().length >= ROOM_LIMIT) {
			return new Response('Chat room is full', { status: 503 });
		}

		// Filter and delete stale rows even if Cloudflare delayed an alarm.
		this.deleteExpired(Date.now());
		const rows = this.ctx.storage.sql
			.exec(
				'SELECT id, nick, text, created_at AS createdAt FROM chat_messages ORDER BY created_at DESC, id DESC LIMIT ?',
				CHAT_HISTORY_LIMIT
			)
			.toArray()
			.reverse();
		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);
		this.ctx.acceptWebSocket(server);
		server.serializeAttachment({ lastMessageAt: 0, rateKey });
		send(server, { type: 'history', messages: rows });
		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(socket, raw) {
		const now = Date.now();
		const attachment = socket.deserializeAttachment() || { lastMessageAt: 0 };
		// This bounds all frames, including malformed ones, before parsing them.
		if (!attachment.frameWindowAt || now - attachment.frameWindowAt >= 1000) {
			attachment.frameWindowAt = now;
			attachment.framesInWindow = 0;
		}
		attachment.framesInWindow = (attachment.framesInWindow || 0) + 1;
		socket.serializeAttachment(attachment);
		if (attachment.framesInWindow > 10) {
			try {
				socket.close(1008, 'Rate limit exceeded');
			} catch {
				// It may already be closed.
			}
			return;
		}
		const input = parseChatMessage(raw);
		if (!input) {
			send(socket, { type: 'error', message: 'Invalid chat message.' });
			return;
		}
		if ('error' in input) {
			send(socket, { type: 'error', requestId: input.requestId, message: input.error });
			return;
		}
		if (this.pendingSockets.has(socket) || now - attachment.lastMessageAt < MESSAGE_INTERVAL_MS) {
			send(socket, {
				type: 'error',
				requestId: input.requestId,
				message: 'Please wait a moment before sending again.'
			});
			return;
		}
		this.pendingSockets.add(socket);

		try {
			if (!attachment.rateKey || !this.env.CHAT_MESSAGE_RATE_LIMITER) throw new Error();
			if (!(await this.env.CHAT_MESSAGE_RATE_LIMITER.limit({ key: attachment.rateKey })).success) {
				send(socket, {
					type: 'error',
					requestId: input.requestId,
					message: 'Please wait before sending more messages.'
				});
				return;
			}
			// Schedule first: if an invocation ends between these operations, an
			// empty alarm is harmless; an unscheduled persisted message is not.
			const due = now + CHAT_RETENTION_MS;
			const existing = await this.ctx.storage.getAlarm();
			if (existing === null || existing > due) await this.ctx.storage.setAlarm(due);
			const message = {
				id: crypto.randomUUID(),
				nick: input.nick,
				text: input.text,
				createdAt: Date.now()
			};
			this.ctx.storage.sql.exec(
				'INSERT INTO chat_messages (id, nick, text, created_at) VALUES (?, ?, ?, ?)',
				message.id,
				message.nick,
				message.text,
				message.createdAt
			);
			// Only successful sends start the cooldown. Re-read the attachment to
			// preserve frame-limit updates from any overlapping rejected send.
			try {
				const latest = socket.deserializeAttachment() || attachment;
				latest.lastMessageAt = message.createdAt;
				socket.serializeAttachment(latest);
			} catch {
				// A disconnected sender may no longer have an attachment.
			}
			for (const peer of this.ctx.getWebSockets()) send(peer, { type: 'message', message });
			send(socket, { type: 'ack', requestId: input.requestId, id: message.id });
		} catch {
			// Never log public message contents or network identifiers.
			send(socket, {
				type: 'error',
				requestId: input.requestId,
				message: 'Message could not be sent. Please try again.'
			});
		} finally {
			this.pendingSockets.delete(socket);
		}
	}

	deleteExpired(now) {
		this.ctx.storage.sql.exec(
			'DELETE FROM chat_messages WHERE created_at <= ?',
			now - CHAT_RETENTION_MS
		);
	}

	async alarm() {
		this.deleteExpired(Date.now());
		const oldest = this.ctx.storage.sql
			.exec('SELECT MIN(created_at) AS createdAt FROM chat_messages')
			.one().createdAt;
		if (oldest !== null) await this.ctx.storage.setAlarm(oldest + CHAT_RETENTION_MS);
	}

	webSocketClose(socket, code) {
		if (
			(code >= 1000 && code <= 1014 && ![1004, 1005, 1006].includes(code)) ||
			(code >= 3000 && code <= 4999)
		) {
			try {
				socket.close(code, '');
			} catch {
				// It may already be closed.
			}
		}
	}

	webSocketError() {
		// The runtime discards failed sockets; there is no user state to retain.
	}
}
