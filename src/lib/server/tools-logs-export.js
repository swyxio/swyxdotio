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
		'account_email'
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
		entry.account?.email
	]);
	return [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
