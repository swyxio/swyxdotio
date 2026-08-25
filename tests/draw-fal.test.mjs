import assert from 'node:assert/strict';
import test from 'node:test';

import { createPodcastStudioSession } from '../src/lib/podcast-admin-auth.js';
import { drawingFalTasks, editDrawingImage } from '../src/lib/server/draw-fal.js';
import { DEFAULT_DRAW_FAL_MODEL, DRAW_FAL_MODELS } from '../src/lib/draw-fal-models.js';

const SESSION_SECRET = 'test-only-session-secret';
const FAL_KEY = 'test-only-provider-secret';
const SOURCE_IMAGE = 'data:image/png;base64,c291cmNl';
const EDITED_IMAGE = 'data:image/png;base64,ZWRpdGVk';

/**
 * @param {{
 *   authenticated?: boolean,
 *   body?: unknown,
 *   contentLength?: string,
 *   contentType?: string | null,
 *   falKey?: string,
 *   origin?: string
 * }} [options]
 */
async function createEvent(options = {}) {
	const url = new URL('https://swyx.io/tools/api/draw/edit');
	const headers = new Headers({ Origin: options.origin ?? url.origin });
	if (options.contentType !== null) {
		headers.set('Content-Type', options.contentType ?? 'application/json');
	}
	if (options.contentLength) headers.set('Content-Length', options.contentLength);
	const rawBody = options.body ?? { image: SOURCE_IMAGE, prompt: '  Improve the lighting  ' };
	const request = new Request(url, {
		method: 'POST',
		headers,
		body: typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)
	});
	const session =
		options.authenticated === false ? undefined : await createPodcastStudioSession(SESSION_SECRET);
	return /** @type {any} */ ({
		request,
		url,
		cookies: { get: () => session },
		platform: {
			env: {
				PODCAST_ADMIN_SESSION_SECRET: SESSION_SECRET,
				FAL_KEY: options.falKey === undefined ? FAL_KEY : options.falKey
			}
		}
	});
}

/** @param {unknown} body @param {number} [status] */
function providerResponse(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

test('the drawing editor authenticates privately and keeps fal credentials server-side', async () => {
	const event = await createEvent();
	/** @type {Array<[RequestInfo | URL, RequestInit | undefined]>} */
	const calls = [];

	const response = await editDrawingImage(event, async (url, init) => {
		calls.push([url, init]);
		return providerResponse({ images: [{ url: EDITED_IMAGE }], prompt: 'private prompt' });
	});

	assert.equal(response.status, 200);
	assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
	assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
	assert.equal(calls.length, 1);
	const [url, init] = calls[0];
	assert.equal(url, 'https://fal.run/fal-ai/nano-banana-2/edit');
	assert.equal(init?.method, 'POST');
	assert.equal(new Headers(init?.headers).get('Authorization'), `Key ${FAL_KEY}`);
	assert.deepEqual(JSON.parse(/** @type {string} */ (init?.body)), {
		prompt: 'Improve the lighting',
		image_urls: [SOURCE_IMAGE],
		sync_mode: true,
		num_images: 1,
		resolution: '1K',
		aspect_ratio: 'auto',
		output_format: 'webp'
	});

	const body = await response.text();
	assert.deepEqual(JSON.parse(body), {
		image: EDITED_IMAGE,
		model: DEFAULT_DRAW_FAL_MODEL.model
	});
	assert.equal(body.includes(FAL_KEY), false);
	assert.equal(body.includes(SESSION_SECRET), false);
	assert.equal(body.includes('private prompt'), false);
	assert.deepEqual(Object.keys(drawingFalTasks), ['image-edit']);
});

test('curated models use only verified endpoints and model-specific provider settings', async () => {
	assert.deepEqual(
		DRAW_FAL_MODELS.map((model) => model.id),
		['nano-banana-2', 'gpt-image-2', 'seedream-5-pro', 'nano-banana-pro', 'flux-2']
	);
	assert.deepEqual(
		DRAW_FAL_MODELS.map((model) => model.artificialAnalysisRank),
		[6, 3, 8, 9, 48]
	);

	for (const model of DRAW_FAL_MODELS) {
		const event = await createEvent({
			body: { image: SOURCE_IMAGE, prompt: 'Preserve the subject', model: model.id }
		});
		/** @type {[RequestInfo | URL, RequestInit | undefined] | undefined} */
		let captured;
		const response = await editDrawingImage(event, async (url, init) => {
			captured = [url, init];
			return providerResponse({ images: [{ url: EDITED_IMAGE }] });
		});
		assert.equal(response.status, 200, model.id);
		assert.ok(captured);
		assert.equal(captured[0], `https://fal.run/${model.model}`);
		const payload = JSON.parse(/** @type {string} */ (captured[1]?.body));
		assert.equal(payload.sync_mode, true);
		assert.deepEqual(payload.image_urls, [SOURCE_IMAGE]);
		for (const [name, value] of Object.entries(model.settings)) {
			assert.equal(payload[name], value, `${model.id}.${name}`);
		}
		if (model.id === 'gpt-image-2') assert.equal('enable_safety_checker' in payload, false);
		if (model.id === 'seedream-5-pro') assert.equal(payload.output_format, 'jpeg');
	}
});

test('the drawing editor rejects unauthenticated and cross-origin requests before provider calls', async () => {
	let called = false;
	/** @type {typeof fetch} */
	const unexpectedProvider = async () => {
		called = true;
		return providerResponse({ images: [{ url: EDITED_IMAGE }] });
	};

	const unauthenticated = await editDrawingImage(
		await createEvent({ authenticated: false }),
		unexpectedProvider
	);
	assert.equal(unauthenticated.status, 401);

	const crossOrigin = await createEvent({ origin: 'https://evil.example' });
	await assert.rejects(editDrawingImage(crossOrigin, unexpectedProvider), { status: 403 });
	assert.equal(called, false);
});

test('the drawing editor fails closed when its Worker secret is absent', async () => {
	const event = await createEvent({ falKey: '' });
	let called = false;
	const response = await editDrawingImage(event, async () => {
		called = true;
		return providerResponse({ images: [{ url: EDITED_IMAGE }] });
	});

	assert.equal(response.status, 503);
	assert.match((await response.json()).error, /not been configured/i);
	assert.equal(called, false);
});

test('the drawing editor rejects invalid content, prompts, images, and oversized requests', async () => {
	const cases = [
		[{ contentType: null }, 415],
		[{ contentLength: '1900001' }, 413],
		[{ body: { image: SOURCE_IMAGE, prompt: 'a'.repeat(1_900_001) } }, 413],
		[{ body: '{broken' }, 400],
		[{ body: [] }, 400],
		[{ body: { image: SOURCE_IMAGE, prompt: ' ' } }, 422],
		[{ body: { image: SOURCE_IMAGE, prompt: 'a'.repeat(1_001) } }, 422],
		[{ body: { image: 'https://example.com/private-image.png', prompt: 'Edit' } }, 422],
		[{ body: { image: 'data:image/svg+xml;base64,PHN2Zz4=', prompt: 'Edit' } }, 422],
		[{ body: { image: 'data:image/png;base64,not-valid', prompt: 'Edit' } }, 422],
		[{ body: { image: SOURCE_IMAGE, prompt: 'Edit', model: 'fal-ai/any-paid-model' } }, 422],
		[{ body: { image: SOURCE_IMAGE, prompt: 'Edit', model: 42 } }, 422]
	];

	for (const [options, expected] of cases) {
		const event = await createEvent(/** @type {any} */ (options));
		const response = await editDrawingImage(event, async () => {
			throw new Error('The provider should not receive invalid requests.');
		});
		assert.equal(response.status, expected, JSON.stringify(options));
	}
});

test('the drawing editor sanitizes provider errors and never leaks upstream response data', async () => {
	for (const [upstreamStatus, expectedStatus] of [
		[400, 422],
		[401, 503],
		[403, 503],
		[422, 422],
		[429, 429],
		[500, 502]
	]) {
		const event = await createEvent();
		const response = await editDrawingImage(event, async () =>
			providerResponse({ detail: `sensitive details ${FAL_KEY}` }, upstreamStatus)
		);
		const text = await response.text();
		assert.equal(response.status, expectedStatus);
		assert.equal(text.includes(FAL_KEY), false);
		assert.equal(text.includes('sensitive details'), false);
	}
});

test('the drawing editor accepts only private inline provider output', async () => {
	for (const invalidImage of [
		undefined,
		'https://fal.media/public-output.png',
		'data:image/svg+xml;base64,PHN2Zz4=',
		`data:image/png;base64,${'A'.repeat(1_900_000)}`
	]) {
		const event = await createEvent();
		const response = await editDrawingImage(event, async () =>
			providerResponse({ images: [{ url: invalidImage }] })
		);
		assert.equal(response.status, 502);
	}
});

test('the drawing editor rejects invalid provider JSON without exposing response contents', async () => {
	const event = await createEvent();
	const response = await editDrawingImage(
		event,
		async () => new Response(`not-json ${FAL_KEY}`, { status: 200 })
	);
	const text = await response.text();
	assert.equal(response.status, 502);
	assert.equal(text.includes(FAL_KEY), false);
});

test('the drawing editor sanitizes network failures', async () => {
	const event = await createEvent();
	const response = await editDrawingImage(event, async () => {
		throw new Error(`Connection failed with ${FAL_KEY}`);
	});
	const text = await response.text();
	assert.equal(response.status, 502);
	assert.equal(text.includes(FAL_KEY), false);
});
