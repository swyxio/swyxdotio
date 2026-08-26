import { TOOLS_LOG_FILTER_DEFAULTS, parseToolsActivityFilters } from './tools-activity.js';

/** @typedef {{id:string,createdAt:string,kind:'ai'|'tool',tool:'draw'|'box'|'podcast'|'reclip',action:string,status:string,source:'server'|'browser',model:string|null,estimatedReservedUsd:number|null,account?:{id:string,email?:string,name?:string}}} ToolLogEntry */
/** @typedef {{date:string,aiRequests:number,toolActions:number,estimatedReservedUsd:number,failedRequests:number,pendingRequests:number}} ToolLogDay */
/** @typedef {{key:string,count:number,aiRequests:number,toolActions:number,failedRequests:number,pendingRequests:number,estimatedReservedUsd:number,account?:{id:string,email?:string,name?:string}}} ToolLogBreakdown */
/** @typedef {{entries:ToolLogEntry[],nextCursor:string|null,summary:{aiRequests:number,toolActions:number,estimatedReservedUsd:number,failedRequests:number,pendingRequests:number,succeededRequests:number,cancelledRequests:number,activeAccounts:number},daily:ToolLogDay[],breakdowns:{tools:ToolLogBreakdown[],models:ToolLogBreakdown[],actions:ToolLogBreakdown[],accounts:ToolLogBreakdown[]},breakdownLimit:number,range:{from:string,to:string},retentionDays:number,coverage?:{message:string}}} ToolLogs */
/** @typedef {{days:string,kind:string,tool:string,scope:string,status:string,source:string,model:string,action:string,account:string,q:string,day:string,opens:string}} ToolLogFilters */

/** Restore only bounded, supported bookmark state, using the API's validation rules.
 * Invalid individual fields cannot discard otherwise useful filters.
 * @param {URLSearchParams} params @returns {ToolLogFilters}
 */
export function logFilters(params) {
	const filters = { ...TOOLS_LOG_FILTER_DEFAULTS };
	for (const key of /** @type {(keyof ToolLogFilters)[]} */ (Object.keys(filters))) {
		const value = params.get(key);
		if (value === null || params.getAll(key).length !== 1) continue;
		const candidate = new URLSearchParams({ [key]: value });
		if (key === 'account') candidate.set('scope', 'all');
		const parsed = parseToolsActivityFilters(candidate);
		if (parsed) filters[key] = String(parsed[key]);
	}
	if (filters.scope !== 'all') filters.account = 'all';
	return filters;
}

/** Canonical bookmarks omit defaults and never contain pagination or export snapshot state.
 * @param {ToolLogFilters} filters
 */
export function logQuery(filters) {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) {
		if (
			Object.hasOwn(TOOLS_LOG_FILTER_DEFAULTS, key) &&
			value !== TOOLS_LOG_FILTER_DEFAULTS[/** @type {keyof ToolLogFilters} */ (key)]
		)
			query.set(key, value);
	}
	return query;
}

/** @param {ToolLogEntry[]} previous @param {ToolLogEntry[]} next */
export function mergeLogEntries(previous, next) {
	return [
		...new Map(
			[...previous, ...next].map((entry) => [
				`${entry.kind}:${entry.id}:${entry.account?.id ?? ''}`,
				entry
			])
		).values()
	];
}

/** Zero means a recorded zero, never missing provider billing. @param {number | null} amount */
export function logMoney(amount) {
	return amount === null ? '—' : `$${amount.toFixed(2)}`;
}

/** @param {string} status */
export function logStatus(status) {
	return status === 'reserved' || status === 'submitted'
		? 'Pending'
		: status.charAt(0).toUpperCase() + status.slice(1);
}

/** UTC keeps chart buckets, filters, and displayed event times consistent. @param {string} date */
export function logTime(date) {
	return new Date(date).toLocaleString('en-US', {
		timeZone: 'UTC',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});
}
