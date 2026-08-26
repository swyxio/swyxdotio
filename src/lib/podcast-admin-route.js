import { error, json } from '@sveltejs/kit';
import { getToolsUser } from './server/tools-auth.js';

/**
 * @param {Request} request
 * @param {URL} url
 */
export function requireSameOrigin(request, url) {
	const origin = request.headers.get('origin');
	if (origin !== url.origin) {
		console.warn('Rejected cross-origin podcast studio mutation', {
			origin,
			expectedOrigin: url.origin
		});
		throw error(403, 'Cross-origin request denied');
	}
}

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'params' | 'platform' | 'request' | 'url'>} event
 * @returns {Promise<R2Bucket | undefined>}
 */
export async function requirePodcastStudio({ cookies, platform, request, url }) {
	const user = await getToolsUser({ cookies, platform, url });
	if (!user) throw error(401, 'Sign in with Google');
	if (!user.isOwner) throw error(403, 'Podcast publishing is available only to the site owner.');
	const expectedUser = request.headers.get('X-Tools-User');
	if (expectedUser !== null && expectedUser !== user.id)
		throw error(409, {
			code: 'account_changed',
			message: 'Your Google account changed. Reload before continuing.'
		});
	requireSameOrigin(request, url);
	return platform?.env?.PODCAST_MEDIA;
}

/**
 * @param {unknown} body
 * @param {ResponseInit} [init]
 * @returns {Response}
 */
export function privateJson(body, init) {
	const response = json(body, init);
	response.headers.set('Cache-Control', 'private, no-store');
	response.headers.set('Referrer-Policy', 'no-referrer');
	return response;
}
