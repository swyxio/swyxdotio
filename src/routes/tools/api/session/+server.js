import { clearPersonalToolsSession } from '$lib/personal-tools-auth';
import { getToolsSession, googleAuthConfig } from '$lib/server/tools-auth.js';
import { privateJson } from '$lib/podcast-admin-route';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	return privateJson(await getToolsSession(event));
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE(event) {
	clearPersonalToolsSession(event);
	return privateJson({
		authenticated: false,
		user: null,
		googleConfigured: Boolean(googleAuthConfig(event.platform))
	});
}
