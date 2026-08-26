import { getToolsUser } from '$lib/server/tools-auth.js';
import { toolsAiLedger } from '$lib/server/tools-ai-usage.js';
import { privateJson } from '$lib/podcast-admin-route.js';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const user = await getToolsUser(event);
	if (!user) return privateJson({ error: 'Sign in to see your AI usage.' }, { status: 401 });
	const expectedUser = event.request.headers.get('X-Tools-User');
	if (expectedUser !== null && expectedUser !== user.id)
		return privateJson(
			{ code: 'account_changed', error: 'Your Google account changed. Reload before continuing.' },
			{ status: 409 }
		);
	return toolsAiLedger(event, 'summary', { userId: user.id });
}
