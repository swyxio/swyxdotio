import { TOOLS_ACTIVITY_ACTIONS } from './tools-activity.js';

/** Metadata only. Never queue an action for a different account or persist payloads locally.
 * @param {string | null | undefined} userId
 * @param {string} action
 * @param {'succeeded' | 'failed' | 'cancelled'} [status]
 * @param {typeof fetch} [send]
 */
export async function recordToolActivity(userId, action, status = 'succeeded', send = fetch) {
	if (!userId || TOOLS_ACTIVITY_ACTIONS[action]?.source !== 'browser') return false;
	try {
		const response = await send('/tools/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Tools-User': userId },
			body: JSON.stringify({ id: crypto.randomUUID(), action, status }),
			credentials: 'same-origin',
			signal: AbortSignal.timeout(5000)
		});
		return response.ok;
	} catch {
		return false;
	}
}
