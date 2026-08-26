/** Explicit SQL projection: only these columns may cross into log reads/exports. */
export const GENERATION_LOG_PROJECTION = [
	['j.run_id', 'run_id'],
	['j.client_job_id', 'client_job_id'],
	['j.adapter', 'adapter'],
	['u.provider_request_id', 'provider_request_id'],
	...[
		'model_maker',
		'modality',
		'estimated_micros',
		'requested_outputs',
		'reference_count',
		'width',
		'height',
		'resolution',
		'duration_seconds',
		'submitted_at',
		'started_observed_at',
		'finished_observed_at',
		'last_observed_at',
		'provider_status',
		'cancellation',
		'cancellation_requested_at',
		'error_code'
	].map((k) => ['o.' + k, 'generation_' + k])
];
/** @param {number|null|undefined} value */
const time = (value) => (typeof value === 'number' ? new Date(value).toISOString() : null);
/** @param {number|null|undefined} end @param {number|null|undefined} start */
const elapsed = (end, start) =>
	typeof end === 'number' && typeof start === 'number' && end >= start ? end - start : null;
/** @param {Record<string,any>} row */
export function generationFromRow(row) {
	return {
		adapter: row.adapter ?? null,
		modelMaker: row.generation_model_maker ?? null,
		modality: row.generation_modality ?? null,
		runId: row.run_id ?? null,
		clientJobId: row.client_job_id ?? null,
		providerRequestId: row.provider_request_id ?? null,
		estimatedCostUsd:
			typeof row.generation_estimated_micros === 'number'
				? row.generation_estimated_micros / 1_000_000
				: null,
		requestedOutputs: row.generation_requested_outputs ?? null,
		referenceCount: row.generation_reference_count ?? null,
		width: row.generation_width ?? null,
		height: row.generation_height ?? null,
		resolution: row.generation_resolution ?? null,
		durationSeconds: row.generation_duration_seconds ?? null,
		submittedAt: time(row.generation_submitted_at),
		startedObservedAt: time(row.generation_started_observed_at),
		finishedObservedAt: time(row.generation_finished_observed_at),
		lastObservedAt: time(row.generation_last_observed_at),
		providerStatus: row.generation_provider_status ?? null,
		cancellation: row.generation_cancellation ?? null,
		cancellationRequestedAt: time(row.generation_cancellation_requested_at),
		errorCode: row.generation_error_code ?? null,
		observedElapsedMs: elapsed(row.generation_finished_observed_at, row.created_at),
		observedQueueMs: elapsed(row.generation_started_observed_at, row.generation_submitted_at)
	};
}
/** Matching admitted jobs only: filters and retention can show part of a run. No planned/unsubmitted jobs are inferred.
 * @param {import('./index.js').SqlStorage} sql @param {string} filtered @param {unknown[]} bindings @param {boolean} showAccounts */
export function generationRunsForLogs(sql, filtered, bindings, showAccounts) {
	return sql
		.exec(
			`SELECT run_id AS id,user_id,COUNT(*) AS jobs,
  SUM(status='succeeded') AS succeeded, SUM(status='failed') AS failed, SUM(status='cancelled') AS cancelled,
  SUM(status IN ('reserved','submitted')) AS pending,
  COUNT(generation_estimated_micros) AS estimateCoverage, COUNT(generation_finished_observed_at) AS timingCoverage,
  SUM(generation_estimated_micros) AS estimatedMicros, SUM(reserved_micros) AS reservedMicros,
  MIN(created_at) AS firstAt, MAX(generation_finished_observed_at) AS lastAt
  FROM (${filtered}) WHERE kind='ai' AND run_id IS NOT NULL GROUP BY user_id,run_id ORDER BY MAX(created_at) DESC,user_id,run_id LIMIT 20`,
			...bindings
		)
		.toArray()
		.map((row) => ({
			id: row.id,
			jobs: row.jobs,
			succeeded: row.succeeded,
			failed: row.failed,
			cancelled: row.cancelled,
			pending: row.pending,
			estimateCoverage: row.estimateCoverage,
			timingCoverage: row.timingCoverage,
			estimatedCostUsd: row.estimateCoverage === row.jobs ? row.estimatedMicros / 1_000_000 : null,
			estimatedReservedUsd: row.reservedMicros / 1_000_000,
			firstAdmittedAt: time(row.firstAt),
			lastOutcomeAt: time(row.lastAt),
			observedElapsedMs: row.timingCoverage === row.jobs ? elapsed(row.lastAt, row.firstAt) : null,
			...(showAccounts
				? {
						account: sql
							.exec('SELECT id,email,name FROM tools_activity_accounts WHERE id=?', row.user_id)
							.toArray()[0] ?? { id: row.user_id }
					}
				: {})
		}));
}
