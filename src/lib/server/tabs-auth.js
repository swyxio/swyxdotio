import { error } from '@sveltejs/kit';
import { getToolsUser } from './tools-auth.js';

/** @param {import('@sveltejs/kit').RequestEvent} event */
export async function requireTabsDatabase(event) {
	const user = await getToolsUser(event);
	if (!user) throw error(401, 'Sign in to your tools to continue.');
	if (!user.isOwner) throw error(403, 'This tool is available only to the site owner.');
	const expected = event.request.headers.get('X-Tools-User');
	if (expected !== null && expected !== user.id)
		throw error(409, 'Your account changed. Reload before continuing.');
	if (
		!['GET', 'HEAD'].includes(event.request.method) &&
		event.request.headers.get('origin') !== event.url.origin
	)
		throw error(403, 'Cross-origin request denied.');
	const database = event.platform?.env?.TABS_DB;
	if (!database) throw error(503, 'Tab storage is unavailable.');
	return database;
}
