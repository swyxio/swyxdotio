import { validGenerationObservation } from '../../src/lib/tools-generation-telemetry.js';
const TERMINAL = ['COMPLETED', 'FAILED', 'CANCELLED'];

/** One metadata extension per existing usage reservation. This is not a scheduler or second job ledger. */
export class GenerationObservations {
	/** @param {import('./index.js').SqlStorage} sql */
	constructor(sql) {
		this.sql = sql;
		sql.exec(`CREATE TABLE IF NOT EXISTS tools_ai_generation_observations (
   usage_id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
   model_maker TEXT, modality TEXT, estimated_micros INTEGER,
   requested_outputs INTEGER, reference_count INTEGER, width INTEGER, height INTEGER, resolution TEXT, duration_seconds INTEGER,
   submitted_at INTEGER, started_observed_at INTEGER, finished_observed_at INTEGER, last_observed_at INTEGER,
   provider_status TEXT, cancellation TEXT, cancellation_requested_at INTEGER, error_code TEXT
  );`);
	}
	/** Metadata was validated before admission. @param {string} userId @param {string} id @param {Record<string,any>} m */
	admit(userId, id, m) {
		this.sql.exec(
			`INSERT INTO tools_ai_generation_observations
   (usage_id,user_id,model_maker,modality,estimated_micros,requested_outputs,reference_count,width,height,resolution,duration_seconds)
   VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
			id,
			userId,
			m.modelMaker,
			m.modality,
			Math.round(m.estimatedCostUsd * 1_000_000),
			m.requestedOutputs,
			m.referenceCount,
			m.width,
			m.height,
			m.resolution,
			m.durationSeconds
		);
	}
	/** Existing historical jobs gain only newly observed facts, never inferred catalog/timing backfill.
	 * @param {string} userId @param {string} id */
	ensure(userId, id) {
		this.sql.exec(
			'INSERT OR IGNORE INTO tools_ai_generation_observations (usage_id,user_id) VALUES (?,?)',
			id,
			userId
		);
	}
	/** @param {string} userId @param {string} id @param {number} now */
	submitted(userId, id, now) {
		this.ensure(userId, id);
		this.sql.exec(
			'UPDATE tools_ai_generation_observations SET submitted_at = COALESCE(submitted_at, ?) WHERE usage_id = ? AND user_id = ?',
			now,
			id,
			userId
		);
	}
	/** Request outcome observed by our server, not GPU completion time. @param {string} userId @param {string} id @param {number} now */
	finished(userId, id, now) {
		this.ensure(userId, id);
		this.sql.exec(
			'UPDATE tools_ai_generation_observations SET finished_observed_at = COALESCE(finished_observed_at, ?) WHERE usage_id = ? AND user_id = ?',
			now,
			id,
			userId
		);
	}
	/** Caller has checked the existing account-bound media reservation. @param {string} userId @param {string} id @param {unknown} input @param {number} now */
	observe(userId, id, input, now) {
		if (!validGenerationObservation(input))
			return Response.json({ error: 'Invalid generation observation.' }, { status: 400 });
		const o = /** @type {{status?:string,cancellation?:string,errorCode?:string}} */ (input);
		this.ensure(userId, id);
		const row = this.sql
			.exec(
				'SELECT * FROM tools_ai_generation_observations WHERE usage_id = ? AND user_id = ?',
				id,
				userId
			)
			.one();
		const status =
			TERMINAL.includes(row.provider_status) || !o.status ? row.provider_status : o.status;
		const cancellation =
			row.cancellation === 'confirmed' || !o.cancellation ? row.cancellation : o.cancellation;
		const errorCode = o.errorCode ?? row.error_code;
		// Polling one provider job never adds another admission, outcome, or duration sample.
		if (
			status === row.provider_status &&
			cancellation === row.cancellation &&
			errorCode === row.error_code
		)
			return Response.json({ recorded: true, duplicate: true });
		this.sql.exec(
			`UPDATE tools_ai_generation_observations SET provider_status = ?, cancellation = ?, error_code = ?, last_observed_at = ?,
   started_observed_at = COALESCE(started_observed_at, ?), cancellation_requested_at = COALESCE(cancellation_requested_at, ?)
   WHERE usage_id = ? AND user_id = ?`,
			status,
			cancellation,
			errorCode,
			now,
			status === 'IN_PROGRESS' ? now : null,
			o.cancellation === 'requested' ? now : null,
			id,
			userId
		);
		return Response.json({ recorded: true });
	}
	prune() {
		this.sql.exec(
			'DELETE FROM tools_ai_generation_observations WHERE usage_id NOT IN (SELECT id FROM tools_ai_usage)'
		);
	}
}
