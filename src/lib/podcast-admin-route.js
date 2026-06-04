import { error, json } from '@sveltejs/kit';
import { isPodcastStudioSessionValid, podcastStudioCookieName } from '$lib/podcast-admin-auth';

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
	const sessionSecret = platform?.env?.PODCAST_ADMIN_SESSION_SECRET;
	if (!sessionSecret) throw error(404, 'Not found');
	requireSameOrigin(request, url);
	if (!(await isPodcastStudioSessionValid(cookies.get(podcastStudioCookieName()), sessionSecret))) {
		throw error(401, 'Log in again');
	}
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
