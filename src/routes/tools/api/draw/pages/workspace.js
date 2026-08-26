import { recordServerToolActivity } from '../../../../../lib/server/tools-activity.js';
import { getToolsUser } from '../../../../../lib/server/tools-auth.js';
import { privateJson, requireSameOrigin } from '../../../../../lib/podcast-admin-route.js';

const MAX_REQUEST_BYTES = 1_900_000;
const encoder = new TextEncoder();

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 * @param {{ mutation?: boolean }} [options]
 */
export async function forwardDrawingRequest(event, { mutation = false } = {}) {
	const user = await getToolsUser(event);
	if (!user) return privateJson({ error: 'Sign in to save your drawings.' }, { status: 401 });
	const expectedUser = event.request.headers.get('X-Tools-User');
	if ((mutation || expectedUser !== null) && expectedUser !== user.id) {
		return privateJson(
			{ code: 'account_changed', error: 'Your Google account changed. Reload before saving.' },
			{ status: 409 }
		);
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
	const actions = /** @type {Record<string, string>} */ ({
		POST: 'draw.page.create',
		PUT: 'draw.page.save',
		DELETE: 'draw.page.delete'
	});
	const action = actions[event.request.method];
	let response;
	try {
		response = await workspace
			.get(workspace.idFromName(user.isOwner ? 'personal' : `google:${user.id}`))
			.fetch(request);
	} catch (error) {
		if (action) await recordServerToolActivity(event, user.id, action, 'failed');
		throw error;
	}
	if (action)
		await recordServerToolActivity(event, user.id, action, response.ok ? 'succeeded' : 'failed');
	return privateJson(await response.json(), { status: response.status });
}
