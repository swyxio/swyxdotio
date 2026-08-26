import { TOOLS_AI_POLICY, TOOLS_AI_LOGGING } from '../../src/lib/tools-ai-policy.js';
import { GenerationRuns } from './generation-runs.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const RETENTION_MS = TOOLS_AI_POLICY.retentionDays * DAY_MS;
const MILLION = 1_000_000;
const IDENTIFIER = /^[A-Za-z0-9_-]{1,255}$/;
const MODEL = /^[@A-Za-z0-9][@A-Za-z0-9_./-]{0,199}$/;
const TERMINAL = new Set(['succeeded', 'failed', 'cancelled']);

/** This deliberate low-volume global object atomically reserves both user and site budgets. */
export class ToolsAiUsage {
	/** @param {import('./index.js').SqlStorage} sql */
	constructor(sql) {
		this.sql = sql;
		sql.exec(`CREATE TABLE IF NOT EXISTS tools_ai_usage (
			id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, model TEXT NOT NULL,
			created_at INTEGER NOT NULL, reserved_micros INTEGER NOT NULL, status TEXT NOT NULL,
			provider_request_id TEXT, last_polled_at INTEGER
		);
		CREATE INDEX IF NOT EXISTS tools_ai_usage_user_time ON tools_ai_usage(user_id, created_at);
		CREATE INDEX IF NOT EXISTS tools_ai_usage_time ON tools_ai_usage(created_at);
		CREATE UNIQUE INDEX IF NOT EXISTS tools_ai_usage_job ON tools_ai_usage(model, provider_request_id) WHERE provider_request_id IS NOT NULL;`);
		this.generationRuns = new GenerationRuns(sql);
	}

	/** @param {number} [now] */
	prune(now = Date.now()) {
		this.sql.exec('DELETE FROM tools_ai_usage WHERE created_at <= ?', now - RETENTION_MS);
		this.generationRuns.prune(now - RETENTION_MS);
	}

	nextExpiry() {
		const oldest = this.sql
			.exec('SELECT MIN(created_at) AS oldest FROM tools_ai_usage')
			.one().oldest;
		const runOldest = this.generationRuns.oldest();
		const timestamps = [oldest, runOldest].filter((value) => typeof value === 'number');
		return timestamps.length ? Math.min(...timestamps) + RETENTION_MS : null;
	}

	/** @param {string} userId @param {number} now */
	summary(userId, now) {
		const hour = this.sql
			.exec(
				`SELECT
			COALESCE(SUM(CASE WHEN kind = 'assistant' THEN 1 ELSE 0 END), 0) AS assistantTurnsThisHour,
			COALESCE(SUM(CASE WHEN kind = 'media' THEN 1 ELSE 0 END), 0) AS mediaJobsThisHour,
			MIN(created_at) AS firstAt
			FROM tools_ai_usage WHERE user_id = ? AND created_at > ?`,
				userId,
				now - HOUR_MS
			)
			.one();
		const dayStart = Math.floor(now / DAY_MS) * DAY_MS;
		const spent = this.sql
			.exec(
				'SELECT COALESCE(SUM(reserved_micros), 0) AS total FROM tools_ai_usage WHERE user_id = ? AND created_at >= ?',
				userId,
				dayStart
			)
			.one().total;
		return {
			assistantTurnsThisHour: hour.assistantTurnsThisHour,
			mediaJobsThisHour: hour.mediaJobsThisHour,
			estimatedReservedTodayUsd: spent / MILLION,
			hourResetsAt: new Date((hour.firstAt ?? now) + HOUR_MS).toISOString(),
			dayResetsAt: new Date(dayStart + DAY_MS).toISOString()
		};
	}

	/** All reads and writes below remain synchronous, with no interleaving before the reservation. @param {Record<string, any>} body @param {number} now */
	admit(body, now) {
		const { userId, kind, model, estimatedReservedUsd } = body;
		if (
			!['assistant', 'media'].includes(kind) ||
			typeof model !== 'string' ||
			!MODEL.test(model) ||
			!Number.isFinite(estimatedReservedUsd) ||
			estimatedReservedUsd <= 0 ||
			estimatedReservedUsd > 100
		)
			return Response.json({ error: 'Invalid usage reservation.' }, { status: 400 });
		const micros = Math.ceil(estimatedReservedUsd * MILLION);
		const minimum =
			kind === 'assistant'
				? TOOLS_AI_POLICY.assistantReservationUsd
				: TOOLS_AI_POLICY.mediaMinimumReservationUsd;
		if (micros < Math.round(minimum * MILLION))
			return Response.json({ error: 'Invalid usage reservation.' }, { status: 400 });
		if (body.run !== undefined && kind !== 'media')
			return Response.json({ error: 'Run budgets apply to media generation.' }, { status: 400 });
		const run = this.generationRuns.prepare(userId, body.run, micros);
		if (run instanceof Response) return run;
		const usage = this.summary(userId, now);
		const limit =
			kind === 'assistant'
				? TOOLS_AI_POLICY.assistantTurnsPerHour
				: TOOLS_AI_POLICY.mediaJobsPerHour;
		const used = kind === 'assistant' ? usage.assistantTurnsThisHour : usage.mediaJobsThisHour;
		const dayStart = Math.floor(now / DAY_MS) * DAY_MS;
		const total = this.sql
			.exec(
				'SELECT COALESCE(SUM(reserved_micros), 0) AS total FROM tools_ai_usage WHERE created_at >= ?',
				dayStart
			)
			.one().total;
		let code;
		if (used >= limit) code = 'account_hourly_limit';
		else if (
			Math.round(usage.estimatedReservedTodayUsd * MILLION) + micros >
			TOOLS_AI_POLICY.userEstimatedDailyUsd * MILLION
		)
			code = 'account_daily_limit';
		else if (total + micros > TOOLS_AI_POLICY.siteEstimatedDailyUsd * MILLION)
			code = 'site_daily_limit';
		if (code) {
			const firstOfKind =
				code === 'account_hourly_limit'
					? this.sql
							.exec(
								'SELECT MIN(created_at) AS firstAt FROM tools_ai_usage WHERE user_id = ? AND kind = ? AND created_at > ?',
								userId,
								kind,
								now - HOUR_MS
							)
							.one().firstAt
					: null;
			const retryAt =
				firstOfKind !== null ? new Date(firstOfKind + HOUR_MS).toISOString() : usage.dayResetsAt;
			return Response.json(
				{
					code,
					error: `Funded AI usage is rate limited. Please try again after ${retryAt}.`,
					retryAt,
					usage,
					policy: TOOLS_AI_POLICY
				},
				{
					status: 429,
					headers: {
						'Retry-After': String(Math.max(1, Math.ceil((Date.parse(retryAt) - now) / 1000)))
					}
				}
			);
		}
		const id = crypto.randomUUID();
		this.sql.exec(
			'INSERT INTO tools_ai_usage (id, user_id, kind, model, created_at, reserved_micros, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
			id,
			userId,
			kind,
			model,
			now,
			micros,
			'reserved'
		);
		if (run) this.generationRuns.reserve(run, id, now);
		return Response.json({ id, estimatedReservedUsd: micros / MILLION }, { status: 201 });
	}

	/** @param {Record<string, any>} body */
	owned(body) {
		if (
			typeof body.model !== 'string' ||
			typeof body.requestId !== 'string' ||
			!IDENTIFIER.test(body.requestId)
		)
			return undefined;
		return this.sql
			.exec(
				'SELECT id, status, last_polled_at FROM tools_ai_usage WHERE user_id = ? AND model = ? AND provider_request_id = ?',
				body.userId,
				body.model,
				body.requestId
			)
			.toArray()[0];
	}

	/** Receives server-authenticated metadata only, never request bodies from the public API. @param {string} path @param {Record<string, any>} body @param {number} [now] */
	handle(path, body, now = Date.now()) {
		if (typeof body.userId !== 'string' || !IDENTIFIER.test(body.userId))
			return Response.json({ error: 'Invalid account.' }, { status: 400 });
		this.prune(now);
		if (path === '/ai/admit') return this.admit(body, now);
		if (path === '/ai/summary')
			return Response.json({
				policy: TOOLS_AI_POLICY,
				usage: this.summary(body.userId, now),
				logging: TOOLS_AI_LOGGING
			});
		if (path === '/ai/owned-job') {
			const job = this.owned(body);
			if (!job) return Response.json({ error: 'Generation not found.' }, { status: 404 });
			if (body.poll === true) {
				if (
					job.last_polled_at !== null &&
					now - job.last_polled_at < TOOLS_AI_POLICY.pollMinimumIntervalMs
				)
					return Response.json(
						{
							code: 'poll_rate_limit',
							error: 'Generation progress is rate limited. Try again shortly.'
						},
						{ status: 429, headers: { 'Retry-After': '1' } }
					);
				this.sql.exec('UPDATE tools_ai_usage SET last_polled_at = ? WHERE id = ?', now, job.id);
			}
			return Response.json({
				id: job.id,
				status: job.status,
				adapter: this.generationRuns.adapterFor(job.id)
			});
		}
		if (path === '/ai/register') {
			if (
				typeof body.id !== 'string' ||
				typeof body.requestId !== 'string' ||
				!IDENTIFIER.test(body.requestId)
			)
				return Response.json({ error: 'Invalid job.' }, { status: 400 });
			const row = this.sql
				.exec(
					'SELECT * FROM tools_ai_usage WHERE id = ? AND user_id = ? AND model = ? AND kind = ?',
					body.id,
					body.userId,
					body.model,
					'media'
				)
				.toArray()[0];
			if (
				!row ||
				TERMINAL.has(row.status) ||
				(row.provider_request_id && row.provider_request_id !== body.requestId)
			)
				return Response.json({ error: 'Generation not found.' }, { status: 404 });
			const existing = this.sql
				.exec(
					'SELECT id FROM tools_ai_usage WHERE model = ? AND provider_request_id = ?',
					body.model,
					body.requestId
				)
				.toArray()[0];
			if (existing && existing.id !== body.id)
				return Response.json({ error: 'Generation already registered.' }, { status: 409 });
			const binding = this.generationRuns.bindAdapter(body.userId, body.id, body.adapter);
			if (binding instanceof Response) return binding;
			this.sql.exec(
				"UPDATE tools_ai_usage SET provider_request_id = ?, status = 'submitted' WHERE id = ?",
				body.requestId,
				body.id
			);
			return Response.json({ ok: true });
		}
		if (path === '/ai/finish') {
			if (!TERMINAL.has(body.status))
				return Response.json({ error: 'Invalid usage status.' }, { status: 400 });
			const row =
				typeof body.id === 'string'
					? this.sql
							.exec(
								'SELECT id, status FROM tools_ai_usage WHERE id = ? AND user_id = ?',
								body.id,
								body.userId
							)
							.toArray()[0]
					: this.owned(body);
			if (!row) return Response.json({ error: 'Generation not found.' }, { status: 404 });
			if (!TERMINAL.has(row.status))
				this.sql.exec('UPDATE tools_ai_usage SET status = ? WHERE id = ?', body.status, row.id);
			return Response.json({ ok: true });
		}
		return Response.json({ error: 'Not found.' }, { status: 404 });
	}
}
