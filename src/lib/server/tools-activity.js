import { getToolsUser } from './tools-auth.js';
import { toolsAiLedger } from './tools-ai-usage.js';
import { privateJson, requireSameOrigin } from '../podcast-admin-route.js';
import { parseToolsActivityFilters, validToolsActivityInput } from '../tools-activity.js';
import { toolsLogsCsv } from './tools-logs-export.js';

/** @typedef {Pick<import('@sveltejs/kit').RequestEvent, 'cookies'|'platform'|'request'|'url'>} ActivityEvent */

/** @param {ActivityEvent} event @param {string} path @param {Record<string, unknown>} payload */
async function activityLedger(event, path, payload) {
	const response = await toolsAiLedger(event, path, payload);
	return response.status === 404 || response.status >= 500
		? privateJson(
				{
					recorded: false,
					error:
						'Activity recording is unavailable. Your tool still works; the log may be incomplete.'
				},
				{ status: 503 }
			)
		: response;
}

/** @param {ActivityEvent} event @param {boolean} [exportAll] */
export async function getToolsActivityLogs(event, exportAll = false) {
	const user = await getToolsUser(event);
	if (!user)
		return privateJson({ error: 'Sign in to see your private activity.' }, { status: 401 });
	const expected = event.request.headers.get('X-Tools-User');
	if ((exportAll || expected !== null) && expected !== user.id)
		return privateJson(
			{ code: 'account_changed', error: 'Your Google account changed. Reload before continuing.' },
			{ status: 409 }
		);
	const params = new URLSearchParams(event.url.searchParams);
	if (exportAll) params.delete('format');
	const filters = parseToolsActivityFilters(params);
	if (!filters || (exportAll && filters.before))
		return privateJson({ error: 'Invalid log filters.' }, { status: 400 });
	if (filters.scope === 'all' && !user.isOwner)
		return privateJson({ error: 'Only the site owner can inspect all accounts.' }, { status: 403 });
	return activityLedger(event, 'activity-logs', {
		userId: user.id,
		isOwner: user.isOwner,
		filters,
		exportAll
	});
}

/** Export only the same authorized metadata relation used by the dashboard. @param {ActivityEvent} event */
export async function exportToolsActivityLogs(event) {
	const formats = event.url.searchParams.getAll('format');
	if (formats.length !== 1 || !['csv', 'json'].includes(formats[0]))
		return privateJson({ error: 'Choose CSV or JSON export.' }, { status: 400 });
	const result = await getToolsActivityLogs(event, true);
	if (!result.ok) return result;
	const data = await result.json();
	// Fail closed if a stale/unavailable companion cannot prove a complete export.
	if (
		data.complete !== true ||
		data.nextCursor !== null ||
		!Array.isArray(data.entries) ||
		!Number.isSafeInteger(data.exportedCount) ||
		data.exportedCount < 0 ||
		data.exportedCount !== data.entries.length ||
		data.exportedCount !== data.summary?.aiRequests + data.summary?.toolActions
	)
		return privateJson(
			{
				error:
					'A complete export is unavailable. Refresh and try again; no partial file was created.'
			},
			{ status: 503 }
		);
	const format = formats[0];
	return new Response(
		format === 'csv' ? toolsLogsCsv(data.entries) : JSON.stringify(data, null, 2),
		{
			headers: {
				'Content-Type':
					format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
				'Content-Disposition': `attachment; filename="tool-logs-${data.scope}-${data.range.to.slice(0, 10)}.${format}"`,
				'Cache-Control': 'private, no-store',
				'Referrer-Policy': 'no-referrer',
				'X-Content-Type-Options': 'nosniff',
				'X-Export-Count': String(data.exportedCount),
				'X-Export-Complete': 'true'
			}
		}
	);
}

/** @param {ActivityEvent} event */
export async function postToolsActivity(event) {
	const user = await getToolsUser(event);
	if (!user) return privateJson({ error: 'Sign in to record private activity.' }, { status: 401 });
	requireSameOrigin(event.request, event.url);
	if (event.request.headers.get('X-Tools-User') !== user.id)
		return privateJson(
			{ code: 'account_changed', error: 'Your Google account changed. Reload before continuing.' },
			{ status: 409 }
		);
	if (event.request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
		return privateJson({ error: 'Send JSON activity metadata.' }, { status: 415 });
	if (event.url.search)
		return privateJson(
			{ error: 'Activity recording does not accept query parameters.' },
			{ status: 400 }
		);
	const declared = event.request.headers.get('content-length');
	if (
		declared !== null &&
		(!Number.isSafeInteger(Number(declared)) || Number(declared) < 0 || Number(declared) > 512)
	)
		return privateJson({ error: 'Activity metadata is too large.' }, { status: 413 });
	const reader = event.request.body?.getReader();
	if (!reader) return privateJson({ error: 'Invalid activity metadata.' }, { status: 400 });
	let raw = '';
	let length = 0;
	const decoder = new TextDecoder();
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			length += value.byteLength;
			if (length > 512) {
				await reader.cancel();
				return privateJson({ error: 'Activity metadata is too large.' }, { status: 413 });
			}
			raw += decoder.decode(value, { stream: true });
		}
		raw += decoder.decode();
	} catch {
		return privateJson({ error: 'Invalid activity metadata.' }, { status: 400 });
	}
	let entry;
	try {
		entry = JSON.parse(raw);
	} catch {
		return privateJson({ error: 'Invalid activity metadata.' }, { status: 400 });
	}
	if (!validToolsActivityInput(entry, 'browser'))
		return privateJson({ error: 'Invalid activity metadata.' }, { status: 400 });
	return activityLedger(event, 'activity-record', {
		userId: user.id,
		source: 'browser',
		entry,
		profile: { id: user.id, email: user.email, name: user.name }
	});
}

/** Best-effort telemetry never changes a successful tool operation. Only bounded action/status metadata is sent. @param {ActivityEvent} event @param {string} userId @param {string} action @param {'succeeded'|'failed'|'cancelled'} status */
export async function recordServerToolActivity(event, userId, action, status) {
	const entry = { id: crypto.randomUUID(), action, status };
	if (!validToolsActivityInput(entry, 'server')) return false;
	const write = async () => {
		try {
			const user = await getToolsUser(event);
			const profile =
				user?.id === userId ? { id: user.id, email: user.email, name: user.name } : undefined;
			const result = await activityLedger(event, 'activity-record', {
				userId,
				source: 'server',
				entry,
				profile
			});
			if (result.ok) return true;
		} catch {
			/* Keep telemetry failure independent of user work. */
		}
		console.warn(JSON.stringify({ event: 'tools_activity_recording_unavailable', count: 1 }));
		return false;
	};
	const pending = write();
	if (event.platform?.context?.waitUntil) {
		try {
			event.platform.context.waitUntil(pending);
			return true;
		} catch {
			/* If scheduling fails, still settle the best-effort write safely. */
		}
	}
	return pending;
}

/** Explicitly wraps a small set of authenticated operations, never general request middleware. @template T @param {ActivityEvent} event @param {string} action @param {() => Promise<T>} operation @returns {Promise<T>} */
export async function withServerToolActivity(event, action, operation) {
	const user = await getToolsUser(event);
	try {
		const result = await operation();
		if (user)
			await recordServerToolActivity(
				event,
				user.id,
				action,
				result instanceof Response && !result.ok ? 'failed' : 'succeeded'
			);
		return result;
	} catch (error) {
		if (user) await recordServerToolActivity(event, user.id, action, 'failed');
		throw error;
	}
}
