const MILLION = 1_000_000;
const ID = /^[A-Za-z0-9_-]{1,128}$/;

/** Metadata only: no prompts, references, output URLs, or provider credentials. */
export class GenerationRuns {
	/** @param {import('./index.js').SqlStorage} sql */
	constructor(sql) {
		this.sql = sql;
		sql.exec(`CREATE TABLE IF NOT EXISTS tools_ai_generation_runs (
			user_id TEXT NOT NULL, run_id TEXT NOT NULL, limit_micros INTEGER NOT NULL,
			reserved_micros INTEGER NOT NULL, updated_at INTEGER NOT NULL,
			PRIMARY KEY (user_id, run_id)
		);
		CREATE TABLE IF NOT EXISTS tools_ai_generation_jobs (
			usage_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, run_id TEXT, client_job_id TEXT,
			adapter TEXT, UNIQUE (user_id, run_id, client_job_id)
		);`);
	}

	/** Called synchronously with account/site admission, before any external I/O.
	 * @param {string} userId @param {unknown} raw @param {number} micros
	 */
	prepare(userId, raw, micros) {
		if (raw === undefined) return undefined;
		const run = /** @type {{id?: unknown, limitUsd?: unknown, clientJobId?: unknown} | null} */ (
			raw
		);
		if (
			!run ||
			typeof run !== 'object' ||
			typeof run.id !== 'string' ||
			!ID.test(run.id) ||
			typeof run.clientJobId !== 'string' ||
			!ID.test(run.clientJobId) ||
			typeof run.limitUsd !== 'number' ||
			!Number.isFinite(run.limitUsd) ||
			run.limitUsd <= 0 ||
			run.limitUsd > 100
		)
			return Response.json(
				{ code: 'invalid_run_budget', error: 'Choose a valid run spending limit.' },
				{ status: 422 }
			);
		const limitMicros = Math.floor(run.limitUsd * MILLION + 1e-7);
		const existing = this.sql
			.exec(
				'SELECT limit_micros, reserved_micros FROM tools_ai_generation_runs WHERE user_id = ? AND run_id = ?',
				userId,
				run.id
			)
			.toArray()[0];
		if (existing && existing.limit_micros !== limitMicros)
			return Response.json(
				{
					code: 'run_budget_changed',
					error:
						'This run already has a different spending limit. Start a new run to authorize a new limit.'
				},
				{ status: 409 }
			);
		const duplicate = this.sql
			.exec(
				'SELECT usage_id FROM tools_ai_generation_jobs WHERE user_id = ? AND run_id = ? AND client_job_id = ?',
				userId,
				run.id,
				run.clientJobId
			)
			.toArray()[0];
		if (duplicate)
			return Response.json(
				{
					code: 'job_already_submitted',
					error: 'This job was already reserved. It will not be submitted twice.'
				},
				{ status: 409 }
			);
		const reservedMicros = (existing?.reserved_micros ?? 0) + micros;
		if (reservedMicros > limitMicros)
			return Response.json(
				{
					code: 'run_budget_exceeded',
					error:
						'The run spending limit was reached. Failed and cancelled requests may still be charged.',
					runReservedUsd: (existing?.reserved_micros ?? 0) / MILLION
				},
				{ status: 402 }
			);
		return { userId, runId: run.id, clientJobId: run.clientJobId, limitMicros, reservedMicros };
	}

	/** No await is allowed between prepare, account/site checks, and this reservation.
	 * @param {Exclude<ReturnType<GenerationRuns['prepare']>, Response | undefined>} run
	 * @param {string} usageId @param {number} now
	 */
	reserve(run, usageId, now) {
		this.sql.exec(
			`INSERT INTO tools_ai_generation_runs (user_id, run_id, limit_micros, reserved_micros, updated_at)
			VALUES (?, ?, ?, ?, ?) ON CONFLICT (user_id, run_id) DO UPDATE SET reserved_micros = excluded.reserved_micros, updated_at = excluded.updated_at`,
			run.userId,
			run.runId,
			run.limitMicros,
			run.reservedMicros,
			now
		);
		this.sql.exec(
			'INSERT INTO tools_ai_generation_jobs (usage_id, user_id, run_id, client_job_id) VALUES (?, ?, ?, ?)',
			usageId,
			run.userId,
			run.runId,
			run.clientJobId
		);
	}

	/** Bind transport independently from a mutable catalog; account ownership is checked by the caller.
	 * @param {string} userId @param {string} usageId @param {unknown} adapter
	 */
	bindAdapter(userId, usageId, adapter) {
		if (typeof adapter !== 'string' || !ID.test(adapter))
			return Response.json({ error: 'Invalid generation provider.' }, { status: 400 });
		const existing = this.adapterFor(usageId);
		if (existing && existing !== adapter)
			return Response.json(
				{ error: 'The generation provider cannot be changed.' },
				{ status: 409 }
			);
		this.sql.exec(
			`INSERT INTO tools_ai_generation_jobs (usage_id, user_id, adapter) VALUES (?, ?, ?)
			ON CONFLICT (usage_id) DO UPDATE SET adapter = excluded.adapter`,
			usageId,
			userId,
			adapter
		);
		return undefined;
	}

	/** @param {string} usageId */
	adapterFor(usageId) {
		return this.sql
			.exec('SELECT adapter FROM tools_ai_generation_jobs WHERE usage_id = ?', usageId)
			.toArray()[0]?.adapter;
	}

	/** Keep replay claims while their run is retained, even if an older usage row was pruned. @param {number} cutoff */
	prune(cutoff) {
		this.sql.exec('DELETE FROM tools_ai_generation_runs WHERE updated_at <= ?', cutoff);
		this.sql
			.exec(`DELETE FROM tools_ai_generation_jobs WHERE usage_id NOT IN (SELECT id FROM tools_ai_usage)
			AND NOT EXISTS (SELECT 1 FROM tools_ai_generation_runs r WHERE r.user_id = tools_ai_generation_jobs.user_id AND r.run_id = tools_ai_generation_jobs.run_id)`);
	}

	oldest() {
		return this.sql.exec('SELECT MIN(updated_at) AS oldest FROM tools_ai_generation_runs').one()
			.oldest;
	}
}
