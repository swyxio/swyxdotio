/** Quote every field and neutralize spreadsheet formulas, including leading whitespace/control prefixes.
 * Numeric fields remain numbers; numeric-looking account IDs are deliberately spreadsheet text.
 * @param {unknown} value */
function csvCell(value) {
	if (value === null || value === undefined) return '""';
	let text = String(value);
	if (
		typeof value === 'string' &&
		(/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))
	)
		text = "'" + text;
	return '"' + text.replaceAll('"', '""') + '"';
}

/** @param {import('../tools-logs-view.js').ToolLogEntry[]} entries */
export function toolsLogsCsv(entries) {
	const columns = [
		'created_at_utc',
		'kind',
		'tool',
		'action',
		'status',
		'source',
		'model',
		'estimated_reserved_usd',
		'request_id',
		'account_id',
		'account_name',
		'account_email',
		'hosting_adapter',
		'model_maker',
		'modality',
		'run_id',
		'client_job_id',
		'provider_request_id',
		'catalog_estimated_cost_usd',
		'requested_outputs',
		'reference_count',
		'requested_width',
		'requested_height',
		'requested_resolution',
		'requested_duration_seconds',
		'submitted_at_utc',
		'started_observed_at_utc',
		'finished_observed_at_utc',
		'last_observed_at_utc',
		'provider_status',
		'cancellation_state',
		'cancellation_requested_at_utc',
		'error_code',
		'observed_elapsed_ms',
		'observed_queue_ms'
	];
	const rows = entries.map((entry) => [
		entry.createdAt,
		entry.kind,
		entry.tool,
		entry.action,
		entry.status,
		entry.source,
		entry.model,
		entry.estimatedReservedUsd,
		entry.id,
		entry.account?.id ? "'" + entry.account.id : null,
		entry.account?.name,
		entry.account?.email,
		entry.generation?.adapter,
		entry.generation?.modelMaker,
		entry.generation?.modality,
		entry.generation?.runId,
		entry.generation?.clientJobId,
		entry.generation?.providerRequestId,
		entry.generation?.estimatedCostUsd,
		entry.generation?.requestedOutputs,
		entry.generation?.referenceCount,
		entry.generation?.width,
		entry.generation?.height,
		entry.generation?.resolution,
		entry.generation?.durationSeconds,
		entry.generation?.submittedAt,
		entry.generation?.startedObservedAt,
		entry.generation?.finishedObservedAt,
		entry.generation?.lastObservedAt,
		entry.generation?.providerStatus,
		entry.generation?.cancellation,
		entry.generation?.cancellationRequestedAt,
		entry.generation?.errorCode,
		entry.generation?.observedElapsedMs,
		entry.generation?.observedQueueMs
	]);
	return [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
