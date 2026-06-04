import { error, fail, redirect } from '@sveltejs/kit';
import {
	createPodcastStudioSession,
	isPodcastStudioSessionValid,
	podcastStudioCookieName,
	podcastStudioCookieOptions,
	secretsMatch
} from '$lib/podcast-admin-auth';
import { requireSameOrigin } from '$lib/podcast-admin-route';

/**
 * @typedef {{
 *   password: string;
 *   sessionSecret: string;
 * }} PersonalToolsConfig
 */

/**
 * @param {App.Platform | undefined} platform
 * @returns {PersonalToolsConfig}
 */
function toolsConfig(platform) {
	const password = platform?.env?.PODCAST_ADMIN_PASSWORD;
	const sessionSecret = platform?.env?.PODCAST_ADMIN_SESSION_SECRET;
	if (!password || !sessionSecret) throw error(404, 'Not found');
	return { password, sessionSecret };
}

/**
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {PersonalToolsConfig} config
 * @returns {Promise<boolean>}
 */
async function isAuthenticated(cookies, config) {
	return isPodcastStudioSessionValid(cookies.get(podcastStudioCookieName()), config.sessionSecret);
}

/**
 * @param {URL} url
 * @returns {Parameters<import('@sveltejs/kit').Cookies['set']>[2]}
 */
function cookieOptions(url) {
	return podcastStudioCookieOptions(url.protocol === 'https:');
}

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 * @param {unknown} password
 * @returns {Promise<void>}
 */
export async function createPersonalToolsSession({ cookies, platform, request, url }, password) {
	const config = toolsConfig(platform);
	requireSameOrigin(request, url);
	if (!secretsMatch(password, config.password)) {
		throw error(401, 'Incorrect password');
	}
	cookies.set(
		podcastStudioCookieName(),
		await createPodcastStudioSession(config.sessionSecret),
		cookieOptions(url)
	);
}

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 * @returns {void}
 */
export function clearPersonalToolsSession({ cookies, platform, request, url }) {
	toolsConfig(platform);
	requireSameOrigin(request, url);
	cookies.delete(podcastStudioCookieName(), cookieOptions(url));
}

/** @type {import('@sveltejs/kit').ServerLoad} */
export async function loadPersonalTools({ cookies, platform, setHeaders }) {
	const config = toolsConfig(platform);
	setHeaders({
		'Cache-Control': 'private, no-store',
		'Referrer-Policy': 'no-referrer',
		'X-Robots-Tag': 'noindex, nofollow, noarchive'
	});
	return {
		authenticated: await isAuthenticated(cookies, config)
	};
}

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform'>} event
 * @param {string} [next]
 * @returns {Promise<void>}
 */
export async function requirePersonalToolsSession({ cookies, platform }, next = '/tools') {
	const config = toolsConfig(platform);
	if (!(await isAuthenticated(cookies, config))) {
		const params = new URLSearchParams({ next });
		throw redirect(303, `/tools?${params}`);
	}
}

/** @type {import('@sveltejs/kit').Actions} */
export const personalToolsActions = {
	login: async (event) => {
		const formData = await event.request.formData();
		try {
			await createPersonalToolsSession(event, formData.get('password'));
		} catch (loginError) {
			if (
				!(
					loginError &&
					typeof loginError === 'object' &&
					'status' in loginError &&
					loginError.status === 401
				)
			) {
				throw loginError;
			}
			return fail(401, { loginError: 'Incorrect password' });
		}
		return { loggedIn: true };
	},
	logout: async (event) => {
		clearPersonalToolsSession(event);
		return { loggedOut: true };
	}
};
