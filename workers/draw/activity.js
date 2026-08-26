import { TOOLS_AI_POLICY } from '../../src/lib/tools-ai-policy.js';
import {
	TOOLS_ACTIVITY_ACTIONS,
	TOOLS_ACTIVITY_BROWSER_LIMIT,
	TOOLS_ACTIVITY_COVERAGE,
	TOOLS_ACTIVITY_ID_PATTERN,
	validToolsActivityInput,
	parseToolsActivityFilters
} from '../../src/lib/tools-activity.js';

const DAY_MS = 86_400_000;
const RETENTION_MS = TOOLS_AI_POLICY.retentionDays * DAY_MS;
const PAGE_SIZE = 50;
const USER_ID = /^[A-Za-z0-9_-]{1,255}$/;

/** @param {unknown} data */
function encodeCursor(data) {
	return btoa(JSON.stringify(data)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** @param {string} token */
function decodeCursor(token) {
	try {
		return JSON.parse(atob(token.replaceAll('-', '+').replaceAll('_', '/')));
	} catch {
		return null;
	}
}

export class ToolsActivity {
	/** @param {import('./index.js').SqlStorage} sql */
	constructor(sql) {
		this.sql = sql;
		sql.exec(`CREATE TABLE IF NOT EXISTS tools_activity (
			id TEXT NOT NULL, user_id TEXT NOT NULL, created_at INTEGER NOT NULL,
			tool TEXT NOT NULL, action TEXT NOT NULL, status TEXT NOT NULL, source TEXT NOT NULL,
			PRIMARY KEY(user_id, id)
		);
		CREATE INDEX IF NOT EXISTS tools_activity_user_time ON tools_activity(user_id, created_at);
		CREATE INDEX IF NOT EXISTS tools_activity_time ON tools_activity(created_at);
		CREATE TABLE IF NOT EXISTS tools_activity_accounts (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL);`);
	}

	/** @param {number} [now] */
	prune(now = Date.now()) {
		this.sql.exec('DELETE FROM tools_activity WHERE created_at <= ?', now - RETENTION_MS);
		this.sql.exec(
			'DELETE FROM tools_activity_accounts WHERE NOT EXISTS (SELECT 1 FROM tools_activity WHERE user_id = tools_activity_accounts.id AND created_at > ?) AND NOT EXISTS (SELECT 1 FROM tools_ai_usage WHERE user_id = tools_activity_accounts.id AND created_at > ?)',
			now - RETENTION_MS,
			now - RETENTION_MS
		);
	}

	/** Profiles come exclusively from a server-verified session, never the browser event body. @param {string} userId @param {unknown} profile */
	recordProfile(userId, profile) {
		if (!profile || typeof profile !== 'object') return;
		const value = /** @type {Record<string,unknown>} */ (profile);
		if (
			value.id !== userId ||
			typeof value.email !== 'string' ||
			value.email.length > 320 ||
			!/^[^\s@]+@[^\s@]+$/.test(value.email) ||
			typeof value.name !== 'string' ||
			value.name.length > 200
		)
			return;
		this.sql.exec(
			'INSERT INTO tools_activity_accounts (id, email, name) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name',
			userId,
			value.email,
			value.name
		);
	}

	nextExpiry() {
		const oldest = this.sql
			.exec('SELECT MIN(created_at) AS oldest FROM tools_activity')
			.one().oldest;
		return typeof oldest === 'number' ? oldest + RETENTION_MS : null;
	}

	/** @param {string} userId @param {'server'|'browser'} source @param {unknown} input @param {number} now */
	record(userId, source, input, now) {
		if (!validToolsActivityInput(input, source))
			return Response.json({ error: 'Invalid activity metadata.' }, { status: 400 });
		const body = /** @type {{id:string, action:string, status:string}} */ (input);
		const id = body.id.toLowerCase();
		const existing = this.sql
			.exec(
				'SELECT action, status, source FROM tools_activity WHERE user_id = ? AND id = ?',
				userId,
				id
			)
			.toArray()[0];
		if (existing) {
			return existing.action === body.action &&
				existing.status === body.status &&
				existing.source === source
				? Response.json({ recorded: true, duplicate: true })
				: Response.json({ error: 'This activity ID was already used.' }, { status: 409 });
		}
		if (source === 'browser') {
			const hour = this.sql
				.exec(
					"SELECT COUNT(*) AS total, MIN(created_at) AS firstAt FROM tools_activity WHERE user_id = ? AND source = 'browser' AND created_at > ?",
					userId,
					now - 3_600_000
				)
				.one();
			if (hour.total >= TOOLS_ACTIVITY_BROWSER_LIMIT)
				return Response.json(
					{
						recorded: false,
						code: 'activity_rate_limit',
						error: 'Activity recording is temporarily rate limited. Your tool still works.'
					},
					{
						status: 429,
						headers: {
							'Retry-After': String(Math.max(1, Math.ceil((hour.firstAt + 3_600_000 - now) / 1000)))
						}
					}
				);
		}
		this.sql.exec(
			'INSERT INTO tools_activity (id, user_id, created_at, tool, action, status, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
			id,
			userId,
			now,
			TOOLS_ACTIVITY_ACTIONS[body.action].tool,
			body.action,
			body.status,
			source
		);
		return Response.json({ recorded: true, duplicate: false }, { status: 201 });
	}

	/** @param {string} userId @param {Record<string, unknown>} input @param {number} now @param {boolean} isOwner */
	logs(userId, input, now, isOwner) {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(input)) {
			if (
				!['days', 'kind', 'tool', 'before', 'scope'].includes(key) ||
				(value !== null && !['string', 'number'].includes(typeof value))
			)
				return Response.json({ error: 'Invalid log filters.' }, { status: 400 });
			if (value !== null) params.set(key, String(value));
		}
		const filters = parseToolsActivityFilters(params);
		if (!filters) return Response.json({ error: 'Invalid log filters.' }, { status: 400 });
		if (filters.scope === 'all' && !isOwner)
			return Response.json(
				{ error: 'Only the site owner can inspect all accounts.' },
				{ status: 403 }
			);
		let to = now;
		let cursor = null;
		if (filters.before) {
			cursor = decodeCursor(filters.before);
			if (
				!cursor ||
				Object.keys(cursor).sort().join(',') !==
					'actor,at,days,entryAccount,id,kind,scope,to,tool,type' ||
				!Number.isSafeInteger(cursor.at) ||
				!Number.isSafeInteger(cursor.to) ||
				cursor.to > now ||
				cursor.to < now - RETENTION_MS ||
				cursor.at > cursor.to ||
				cursor.at <= cursor.to - filters.days * DAY_MS ||
				!['ai', 'tool'].includes(cursor.type) ||
				typeof cursor.id !== 'string' ||
				!TOOLS_ACTIVITY_ID_PATTERN.test(cursor.id) ||
				cursor.days !== filters.days ||
				cursor.kind !== filters.kind ||
				cursor.tool !== filters.tool ||
				cursor.scope !== filters.scope ||
				cursor.actor !== userId ||
				typeof cursor.entryAccount !== 'string' ||
				!USER_ID.test(cursor.entryAccount) ||
				(filters.scope === 'mine' && cursor.entryAccount !== userId)
			)
				return Response.json({ error: 'Invalid or expired log cursor.' }, { status: 400 });
			to = cursor.to;
		}
		const from = to - filters.days * DAY_MS;
		// Both arms bind the server-authenticated account before filtering or aggregation.
		const base = `SELECT id, user_id, created_at, 'ai' AS kind, 'draw' AS tool,
			CASE kind WHEN 'assistant' THEN 'draw.ai.assistant' ELSE 'draw.ai.media' END AS action,
			status, 'server' AS source, model, reserved_micros
			FROM tools_ai_usage WHERE (? = 1 OR user_id = ?) AND created_at > ? AND created_at <= ?
			UNION ALL SELECT id, user_id, created_at, 'tool' AS kind, tool, action, status, source, NULL AS model, NULL AS reserved_micros
			FROM tools_activity WHERE (? = 1 OR user_id = ?) AND created_at > ? AND created_at <= ?`;
		const filtered = `SELECT * FROM (${base}) WHERE (? = 'all' OR kind = ?) AND (? = 'all' OR tool = ?)`;
		const bindings = [
			filters.scope === 'all' ? 1 : 0,
			userId,
			from,
			to,
			filters.scope === 'all' ? 1 : 0,
			userId,
			from,
			to,
			filters.kind,
			filters.kind,
			filters.tool,
			filters.tool
		];
		const aggregate = this.sql
			.exec(
				`SELECT
			COALESCE(SUM(CASE WHEN kind = 'ai' THEN 1 ELSE 0 END), 0) AS aiRequests,
			COALESCE(SUM(CASE WHEN kind = 'tool' THEN 1 ELSE 0 END), 0) AS toolActions,
			COALESCE(SUM(reserved_micros), 0) AS reservedMicros,
			COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failedRequests,
			COUNT(DISTINCT user_id) AS activeAccounts
			FROM (${filtered})`,
				...bindings
			)
			.one();
		const daily = this.sql
			.exec(
				`SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS date,
			SUM(CASE WHEN kind = 'ai' THEN 1 ELSE 0 END) AS aiRequests,
			SUM(CASE WHEN kind = 'tool' THEN 1 ELSE 0 END) AS toolActions,
			COALESCE(SUM(reserved_micros), 0) AS reservedMicros
			FROM (${filtered}) GROUP BY date ORDER BY date`,
				...bindings
			)
			.toArray();
		const pageBindings = [...bindings];
		let condition = '';
		if (cursor) {
			condition =
				' WHERE created_at < ? OR (created_at = ? AND (kind < ? OR (kind = ? AND (id < ? OR (id = ? AND user_id < ?)))))';
			pageBindings.push(
				cursor.at,
				cursor.at,
				cursor.type,
				cursor.type,
				cursor.id,
				cursor.id,
				cursor.entryAccount
			);
		}
		const rows = this.sql
			.exec(
				`SELECT * FROM (${filtered})${condition} ORDER BY created_at DESC, kind DESC, id DESC, user_id DESC LIMIT ${PAGE_SIZE + 1}`,
				...pageBindings
			)
			.toArray();
		const page = rows.slice(0, PAGE_SIZE);
		const last = page.at(-1);
		return Response.json({
			scope: filters.scope,
			entries: page.map((row) => ({
				...(filters.scope === 'all'
					? {
							account: this.sql
								.exec(
									'SELECT id, email, name FROM tools_activity_accounts WHERE id = ?',
									row.user_id
								)
								.toArray()[0] ?? { id: row.user_id }
						}
					: {}),
				id: row.id,
				createdAt: new Date(row.created_at).toISOString(),
				kind: row.kind,
				tool: row.tool,
				action: row.action,
				status: row.status,
				source: row.source,
				model: row.model,
				estimatedReservedUsd: row.reserved_micros === null ? null : row.reserved_micros / 1_000_000
			})),
			nextCursor:
				rows.length > PAGE_SIZE
					? encodeCursor({
							at: last.created_at,
							type: last.kind,
							id: last.id,
							to,
							days: filters.days,
							kind: filters.kind,
							tool: filters.tool,
							scope: filters.scope,
							actor: userId,
							entryAccount: last.user_id
						})
					: null,
			summary: {
				aiRequests: aggregate.aiRequests,
				toolActions: aggregate.toolActions,
				estimatedReservedUsd: aggregate.reservedMicros / 1_000_000,
				failedRequests: aggregate.failedRequests,
				activeAccounts: aggregate.activeAccounts
			},
			daily: daily.map((row) => ({
				date: row.date,
				aiRequests: row.aiRequests,
				toolActions: row.toolActions,
				estimatedReservedUsd: row.reservedMicros / 1_000_000
			})),
			range: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
			retentionDays: TOOLS_AI_POLICY.retentionDays,
			coverage: TOOLS_ACTIVITY_COVERAGE
		});
	}

	/** @param {string} path @param {Record<string, any>} body @param {number} [now] */
	handle(path, body, now = Date.now()) {
		if (typeof body.userId !== 'string' || !USER_ID.test(body.userId))
			return Response.json({ error: 'Invalid account.' }, { status: 400 });
		this.prune(now);
		if (path === '/ai/activity-record') {
			if (!['browser', 'server'].includes(body.source))
				return Response.json({ error: 'Invalid activity source.' }, { status: 400 });
			return this.record(body.userId, body.source, body.entry, now);
		}
		if (path === '/ai/activity-logs')
			return this.logs(body.userId, body.filters ?? {}, now, body.isOwner === true);
		return Response.json({ error: 'Not found.' }, { status: 404 });
	}
}
