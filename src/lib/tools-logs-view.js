/** @typedef {{id:string,createdAt:string,kind:'ai'|'tool',tool:'draw'|'box'|'podcast'|'reclip',action:string,status:string,source:'server'|'browser',model:string|null,estimatedReservedUsd:number|null,account?:{id:string,email?:string,name?:string}}} ToolLogEntry */
/** @typedef {{date:string,aiRequests:number,toolActions:number,estimatedReservedUsd:number}} ToolLogDay */
/** @typedef {{entries:ToolLogEntry[],nextCursor:string|null,summary:{aiRequests:number,toolActions:number,estimatedReservedUsd:number,failedRequests:number,activeAccounts:number},daily:ToolLogDay[],range:{from:string,to:string},retentionDays:number,coverage?:{message:string}}} ToolLogs */

/** @param {URLSearchParams} params */
export function logFilters(params) {
	const days = params.get('days') ?? '7';
	const kind = params.get('kind') ?? 'all';
	const tool = params.get('tool') ?? 'all';
	const scope = params.get('scope') ?? 'mine';
	return {
		days: ['1', '7', '30'].includes(days) ? days : '7',
		kind: ['all', 'ai', 'tool'].includes(kind) ? kind : 'all',
		tool: ['all', 'draw', 'box', 'podcast', 'reclip'].includes(tool) ? tool : 'all',
		scope: scope === 'all' ? 'all' : 'mine'
	};
}

/** Zero means a recorded zero, never missing provider billing. @param {number | null} amount */
export function logMoney(amount) {
	return amount === null ? '—' : `$${amount.toFixed(2)}`;
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
