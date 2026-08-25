import { isPodcastStudioSessionValid, podcastStudioCookieName } from '$lib/podcast-admin-auth';
import { privateJson, requireSameOrigin } from '$lib/podcast-admin-route';

const MAX_REQUEST_BYTES = 1_900_000;
const encoder = new TextEncoder();

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 * @param {{ mutation?: boolean }} [options]
 */
export async function forwardDrawingRequest(event, { mutation = false } = {}) {
	const sessionSecret = event.platform?.env?.PODCAST_ADMIN_SESSION_SECRET;
	if (
		!sessionSecret ||
		!(await isPodcastStudioSessionValid(
			event.cookies.get(podcastStudioCookieName()),
			sessionSecret
		))
	) {
		return privateJson({ error: 'Sign in to save your drawings.' }, { status: 401 });
	}

	if (mutation) requireSameOrigin(event.request, event.url);

	const workspace = event.platform?.env?.DRAW_PAGES;
	if (!workspace) {
		return privateJson({ error: 'Cloud drawing storage is unavailable.' }, { status: 503 });
	}

	/** @type {string | undefined} */
	let body;
	if (event.request.method === 'POST' || event.request.method === 'PUT') {
		const contentLength = Number(event.request.headers.get('content-length'));
		if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
			return privateJson({ error: 'This drawing is too large to save.' }, { status: 413 });
		}
		body = await event.request.text();
		if (encoder.encode(body).byteLength > MAX_REQUEST_BYTES) {
			return privateJson({ error: 'This drawing is too large to save.' }, { status: 413 });
		}
	}

	const path = event.url.pathname.replace(/^\/tools\/api\/draw/, '');
	const request = new Request(new URL(path, 'https://drawing.internal'), {
		method: event.request.method,
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body
	});
	const response = await workspace.get(workspace.idFromName('personal')).fetch(request);
	return privateJson(await response.json(), { status: response.status });
}
