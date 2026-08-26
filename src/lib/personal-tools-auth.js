import { error, redirect } from '@sveltejs/kit';
import {
	getToolsSession,
	getToolsUser,
	safeToolsNext,
	toolsSessionCookieName,
	toolsSessionCookieOptions
} from './server/tools-auth.js';
import { requireSameOrigin } from './podcast-admin-route.js';

/** @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'request' | 'url'>} event */
export function clearPersonalToolsSession({ cookies, request, url }) {
	requireSameOrigin(request, url);
	cookies.delete(toolsSessionCookieName(), toolsSessionCookieOptions(url.protocol === 'https:'));
}

/** @param {import('@sveltejs/kit').ServerLoadEvent} event */
export async function loadPersonalTools(event) {
	event.setHeaders({
		'Cache-Control': 'private, no-store',
		'Referrer-Policy': 'no-referrer',
		'X-Robots-Tag': 'noindex, nofollow, noarchive'
	});
	return getToolsSession(event);
}

/** @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform'>} event @param {string} [next] */
export async function requirePersonalToolsOwner(event, next = '/tools') {
	const user = await getToolsUser(event);
	if (!user) throw redirect(303, `/tools?${new URLSearchParams({ next: safeToolsNext(next) })}`);
	if (!user.isOwner) throw error(403, 'This tool is available only to the site owner.');
	return user;
}
