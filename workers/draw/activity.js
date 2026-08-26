import { createHash } from 'node:crypto';
import {
	GENERATION_LOG_PROJECTION,
	generationFromRow,
	generationRunsForLogs
} from './generation-log-view.js';
import { TOOLS_AI_POLICY } from '../../src/lib/tools-ai-policy.js';
import {
	TOOLS_ACTIVITY_ACTIONS,
	TOOLS_ACTIVITY_BROWSER_LIMIT,
	TOOLS_ACTIVITY_COVERAGE,
	TOOLS_ACTIVITY_ID_PATTERN,
	TOOLS_LOG_EXPORT_LIMIT,
	validToolsActivityInput,
	parseToolsActivityFilters
} from '../../src/lib/tools-activity.js';

const DAY_MS = 86_400_000;
const RETENTION_MS = TOOLS_AI_POLICY.retentionDays * DAY_MS;
const PAGE_SIZE = 50;
const USER_ID = /^[A-Za-z0-9_-]{1,255}$/;

/** @param {unknown} data */
function encodeCursor(data) {
	return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data))))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');
}

/** @param {string} token */
function decodeCursor(token) {
	try {
		return JSON.parse(
			new TextDecoder().decode(
				Uint8Array.from(atob(token.replaceAll('-', '+').replaceAll('_', '/')), (c) =>
					c.charCodeAt(0)
				)
			)
		);
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

	/** All reads use one tenant-scoped SQL relation, including aggregates and exports.
	 * @param {string} userId @param {Record<string, unknown>} input @param {number} now @param {boolean} isOwner @param {boolean} [exportAll] */
	logs(userId, input, now, isOwner, exportAll = false) {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(input)) {
			if (value !== null && !['string', 'number'].includes(typeof value))
				return Response.json({ error: 'Invalid log filters.' }, { status: 400 });
			// Keep unknown null keys so the shared parser rejects them too.
			if (value !== null || !['before', 'snapshot'].includes(key)) params.set(key, String(value));
		}
		const filters = parseToolsActivityFilters(params);
		if (!filters || (exportAll && filters.before))
			return Response.json({ error: 'Invalid log filters.' }, { status: 400 });
		if (filters.scope === 'all' && !isOwner)
			return Response.json(
				{ error: 'Only the site owner can inspect all accounts.' },
				{ status: 403 }
			);
		const { before, snapshot, ...selection } = filters;
		const fingerprint = createHash('sha256').update(JSON.stringify(selection)).digest('hex');
		let to = snapshot ? Date.parse(snapshot) : now;
		let cursor = null;
		if (before) {
			cursor = decodeCursor(before);
			if (
				!cursor ||
				Object.keys(cursor).sort().join(',') !== 'actor,at,entryAccount,filters,id,to,type' ||
				!Number.isSafeInteger(cursor.at) ||
				!Number.isSafeInteger(cursor.to) ||
				cursor.at > cursor.to ||
				cursor.at <= cursor.to - filters.days * DAY_MS ||
				!['ai', 'tool'].includes(cursor.type) ||
				typeof cursor.id !== 'string' ||
				!TOOLS_ACTIVITY_ID_PATTERN.test(cursor.id) ||
				cursor.filters !== fingerprint ||
				cursor.actor !== userId ||
				typeof cursor.entryAccount !== 'string' ||
				!USER_ID.test(cursor.entryAccount) ||
				(filters.scope === 'mine' && cursor.entryAccount !== userId) ||
				(filters.account !== 'all' && cursor.entryAccount !== filters.account) ||
				(snapshot && to !== cursor.to)
			)
				return Response.json({ error: 'Invalid or expired log cursor.' }, { status: 400 });
			to = cursor.to;
		}
		if (to > now || to < now - RETENTION_MS)
			return Response.json(
				{ error: 'Invalid or expired log snapshot. Refresh this view.' },
				{ status: 400 }
			);
		// Delayed exports cannot resurrect records that expired since the initial read.
		const from = Math.max(to - filters.days * DAY_MS, now - RETENTION_MS);
		const base = `SELECT u.id, u.user_id, u.created_at, 'ai' AS kind, 'draw' AS tool,
   CASE u.kind WHEN 'assistant' THEN 'draw.ai.assistant' ELSE 'draw.ai.media' END AS action,
   u.status, 'server' AS source, u.model, u.reserved_micros,
   ${GENERATION_LOG_PROJECTION.map(([expression, name]) => `${expression} AS ${name}`).join(', ')}
   FROM tools_ai_usage u
   LEFT JOIN tools_ai_generation_jobs j ON j.usage_id=u.id AND j.user_id=u.user_id
   LEFT JOIN tools_ai_generation_observations o ON o.usage_id=u.id AND o.user_id=u.user_id
   WHERE (? = 1 OR u.user_id = ?) AND u.created_at > ? AND u.created_at <= ?
   UNION ALL SELECT id,user_id,created_at,'tool' AS kind,tool,action,status,source,NULL AS model,NULL AS reserved_micros,
   ${GENERATION_LOG_PROJECTION.map(([, name]) => `NULL AS ${name}`).join(', ')}
   FROM tools_activity WHERE (? = 1 OR user_id = ?) AND created_at > ? AND created_at <= ?`;
		const bindings = [
			filters.scope === 'all' ? 1 : 0,
			userId,
			from,
			to,
			filters.scope === 'all' ? 1 : 0,
			userId,
			from,
			to
		];
		const conditions = [];
		for (const [key, column] of [
			['kind', 'kind'],
			['tool', 'tool'],
			['source', 'source'],
			['model', 'model'],
			['action', 'action'],
			['account', 'user_id'],
			['adapter', 'adapter'],
			['modality', 'generation_modality'],
			['run', 'run_id']
		]) {
			if (filters[key] !== 'all') {
				conditions.push(`${column} = ?`);
				bindings.push(filters[key]);
			}
		}
		if (filters.status === 'pending') conditions.push("status IN ('reserved', 'submitted')");
		else if (filters.status !== 'all') {
			conditions.push('status = ?');
			bindings.push(filters.status);
		}
		if (filters.opens === 'hide')
			conditions.push("action NOT IN ('draw.open', 'box.open', 'podcast.open', 'reclip.open')");
		if (filters.q) {
			conditions.push(
				"instr(lower(id || ' ' || action || ' ' || tool || ' ' || coalesce(model, '') || ' ' || coalesce(adapter,'') || ' ' || coalesce(run_id,'') || ' ' || coalesce(client_job_id,'') || ' ' || coalesce(provider_request_id,'')), lower(?)) > 0"
			);
			bindings.push(filters.q.trim());
		}
		if (filters.day) {
			conditions.push('created_at >= ? AND created_at < ?');
			bindings.push(Date.parse(filters.day), Date.parse(filters.day) + DAY_MS);
		}
		const filtered = `SELECT * FROM (${base})${conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''}`;
		const metrics = `COUNT(*) AS count,
			COALESCE(SUM(kind = 'ai'), 0) AS aiRequests,
			COALESCE(SUM(kind = 'tool'), 0) AS toolActions,
			COALESCE(SUM(reserved_micros), 0) AS reservedMicros,
			COALESCE(SUM(status = 'failed'), 0) AS failedRequests,
			COALESCE(SUM(status IN ('reserved', 'submitted')), 0) AS pendingRequests`;
		const aggregate = this.sql
			.exec(
				`SELECT ${metrics},
			COALESCE(SUM(status = 'succeeded'), 0) AS succeededRequests,
			COALESCE(SUM(status = 'cancelled'), 0) AS cancelledRequests,
			COUNT(DISTINCT user_id) AS activeAccounts FROM (${filtered})`,
				...bindings
			)
			.one();
		if (exportAll && aggregate.count > TOOLS_LOG_EXPORT_LIMIT)
			return Response.json(
				{
					error: `This view contains ${aggregate.count} records. Narrow the filters to ${TOOLS_LOG_EXPORT_LIMIT.toLocaleString('en-US')} or fewer before exporting. No partial file was created.`
				},
				{ status: 413 }
			);
		const summary = {
			aiRequests: aggregate.aiRequests,
			toolActions: aggregate.toolActions,
			estimatedReservedUsd: aggregate.reservedMicros / 1_000_000,
			failedRequests: aggregate.failedRequests,
			pendingRequests: aggregate.pendingRequests,
			succeededRequests: aggregate.succeededRequests,
			cancelledRequests: aggregate.cancelledRequests,
			activeAccounts: aggregate.activeAccounts
		};
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
		const limit = exportAll ? TOOLS_LOG_EXPORT_LIMIT : PAGE_SIZE;
		const rows = this.sql
			.exec(
				`SELECT activity.*${filters.scope === 'all' ? ', account.email, account.name' : ''}
			FROM (SELECT * FROM (${filtered})${condition} ORDER BY created_at DESC, kind DESC, id DESC, user_id DESC LIMIT ${limit + 1}) activity
			${filters.scope === 'all' ? 'LEFT JOIN tools_activity_accounts account ON account.id = activity.user_id' : ''}
			ORDER BY created_at DESC, kind DESC, activity.id DESC, user_id DESC`,
				...pageBindings
			)
			.toArray();
		const page = rows.slice(0, limit);
		const last = page.at(-1);
		const accountFromRow = (row) => ({
			id: row.user_id,
			...(row.email ? { email: row.email, name: row.name } : {})
		});
		const result = {
			scope: filters.scope,
			entries: page.map((row) => ({
				...(filters.scope === 'all' ? { account: accountFromRow(row) } : {}),
				...(row.action === 'draw.ai.media' ? { generation: generationFromRow(row) } : {}),
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
				rows.length > limit
					? encodeCursor({
							at: last.created_at,
							type: last.kind,
							id: last.id,
							to,
							filters: fingerprint,
							actor: userId,
							entryAccount: last.user_id
						})
					: null,
			summary,
			range: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
			retentionDays: TOOLS_AI_POLICY.retentionDays,
			coverage: TOOLS_ACTIVITY_COVERAGE
		};
		if (exportAll)
			return Response.json({
				...result,
				schemaVersion: 2,
				generatedAt: new Date(now).toISOString(),
				filters: selection,
				exportedCount: page.length,
				complete: true,
				costBasis:
					'Estimated reservations, not provider bills. Failed AI attempts retain their reservation.',
				snapshotNote:
					'Creation-time window is fixed; outcomes reflect the time of export. Retention may remove expired records.'
			});
		const daily = this.sql
			.exec(
				`SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS date,
			${metrics} FROM (${filtered}) GROUP BY date ORDER BY date`,
				...bindings
			)
			.toArray();
		const breakdown = (column, aiOnly = false, knownOnly = false) =>
			this.sql
				.exec(
					`SELECT ${column} AS key, ${metrics}
			FROM (${filtered}) ${aiOnly ? "WHERE kind = 'ai'" + (knownOnly ? ` AND ${column} IS NOT NULL` : '') : ''} GROUP BY ${column} ORDER BY count DESC, key ASC LIMIT 20`,
					...bindings
				)
				.toArray()
				.map(({ reservedMicros, ...row }) => ({
					...row,
					estimatedReservedUsd: reservedMicros / 1_000_000
				}));
		const accounts =
			filters.scope === 'all'
				? breakdown('user_id').map((row) => ({
						...row,
						account: this.sql
							.exec('SELECT id, email, name FROM tools_activity_accounts WHERE id = ?', row.key)
							.toArray()[0] ?? { id: row.key }
					}))
				: [];
		return Response.json({
			...result,
			daily: daily.map(({ reservedMicros, ...row }) => ({
				...row,
				estimatedReservedUsd: reservedMicros / 1_000_000
			})),
			breakdowns: {
				tools: breakdown('tool'),
				models: breakdown('model', true),
				actions: breakdown('action'),
				adapters: breakdown('adapter', true, true),
				modalities: breakdown('generation_modality', true, true),
				accounts
			},
			generationRuns: generationRunsForLogs(this.sql, filtered, bindings, filters.scope === 'all'),
			breakdownLimit: 20
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
			return this.logs(
				body.userId,
				body.filters ?? {},
				now,
				body.isOwner === true,
				body.exportAll === true
			);
		return Response.json({ error: 'Not found.' }, { status: 404 });
	}
}
