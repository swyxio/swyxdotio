import { getToolsUser } from './tools-auth.js';
import { privateJson } from '../podcast-admin-route.js';

/** @typedef {Pick<import('@sveltejs/kit').RequestEvent, 'platform'>} UsageEvent */

/** Only metadata assembled by server code crosses this private binding. @param {UsageEvent} event @param {string} path @param {Record<string, unknown>} body */
export async function toolsAiLedger(event, path, body) {
	const namespace = event.platform?.env?.DRAW_PAGES;
	if (!namespace)
		return privateJson(
			{ error: 'Funded AI usage tracking is unavailable. Please try again later.' },
			{ status: 503 }
		);
	try {
		const result = await namespace.get(namespace.idFromName('tools-ai-usage')).fetch(
			new Request(`https://drawing.internal/ai/${path}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(10_000)
			})
		);
		if (result.status >= 500 || result.status === 405) throw new Error('Usage ledger unavailable');
		const payload = await result.json();
		return privateJson(payload, {
			status: result.status,
			headers: result.headers.has('Retry-After')
				? { 'Retry-After': /** @type {string} */ (result.headers.get('Retry-After')) }
				: undefined
		});
	} catch {
		return privateJson(
			{ error: 'Funded AI usage tracking is unavailable. Please try again later.' },
			{ status: 503 }
		);
	}
}

/** @param {UsageEvent & Pick<import('@sveltejs/kit').RequestEvent, 'cookies'>} event @param {string} userId @param {'assistant'|'media'} kind @param {string} model @param {number} estimatedReservedUsd */
export async function reserveToolsAiUsage(event, userId, kind, model, estimatedReservedUsd) {
	const user = await getToolsUser(event);
	const profile =
		user?.id === userId ? { id: user.id, email: user.email, name: user.name } : undefined;
	const result = await toolsAiLedger(event, 'admit', {
		userId,
		kind,
		model,
		estimatedReservedUsd,
		profile
	});
	if (!result.ok) return result;
	const reservation = await result.json();
	if (typeof reservation?.id !== 'string')
		return privateJson({ error: 'Funded AI usage tracking is unavailable.' }, { status: 503 });
	return /** @type {{id: string, estimatedReservedUsd: number}} */ (reservation);
}

/** @param {UsageEvent} event @param {string} userId @param {string} id @param {'succeeded'|'failed'|'cancelled'} status */
export function finishToolsAiUsage(event, userId, id, status) {
	return toolsAiLedger(event, 'finish', { userId, id, status });
}
