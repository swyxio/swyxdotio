import assert from 'node:assert/strict';
import test from 'node:test';

import { createPodcastStudioSession } from '../src/lib/podcast-admin-auth.js';
import {
	cancelDrawingImage,
	drawingFalTasks,
	editDrawingImage,
	pollDrawingImage
} from '../src/lib/server/draw-fal.js';
import {
	DEFAULT_DRAW_FAL_MODEL,
	DRAW_FAL_MODELS,
	MAX_DRAW_FAL_REQUEST_BYTES
} from '../src/lib/draw-fal-models.js';

const SESSION_SECRET = 'test-only-session-secret';
const FAL_KEY = 'test-only-provider-secret';
const SOURCE_IMAGE = 'data:image/png;base64,c291cmNl';
const EDITED_IMAGE = 'data:image/png;base64,ZWRpdGVk';
const REQUEST_ID = 'queued-job-123';

/**
 * @param {{
 *   authenticated?: boolean,
 *   form?: FormData,
 *   contentLength?: string,
 *   contentType?: string,
 *   body?: string,
 *   falKey?: string,
 *   origin?: string,
 *   method?: 'POST' | 'GET' | 'DELETE',
 *   query?: string
 * }} [options]
 */
async function createEvent(options = {}) {
	const url = new URL(`https://swyx.io/tools/api/draw/edit${options.query ?? ''}`);
	const method = options.method ?? 'POST';
	const headers = new Headers();
	if (method !== 'GET' || options.origin) headers.set('Origin', options.origin ?? url.origin);
	if (options.contentType) headers.set('Content-Type', options.contentType);
	if (options.contentLength) headers.set('Content-Length', options.contentLength);
	let form = options.form;
	if (!form && method === 'POST' && !options.body) {
		form = new FormData();
		form.set('image', new File(['source'], 'source.png', { type: 'image/png' }));
		form.set('prompt', '  Improve the lighting  ');
	}
	const request = new Request(url, {
		method,
		headers,
		...(method === 'POST' ? { body: options.body ?? form } : {})
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

/** @param {Record<string, string | File>} entries */
function createForm(entries) {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) form.set(key, value);
	return form;
}

test('binary uploads authenticate privately, submit fal queue jobs, and keep credentials server-side', async () => {
	const event = await createEvent();
	/** @type {Array<[RequestInfo | URL, RequestInit | undefined]>} */
	const calls = [];
	const response = await editDrawingImage(event, async (url, init) => {
		calls.push([url, init]);
		return providerResponse(
			{ request_id: REQUEST_ID, queue_position: 3, private_detail: FAL_KEY },
			202
		);
	});
	assert.equal(response.status, 202);
	assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
	assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
	assert.equal(calls.length, 1);
	const [url, init] = calls[0];
	assert.equal(url, 'https://queue.fal.run/fal-ai/nano-banana-2/edit');
	assert.equal(init?.method, 'POST');
	assert.equal(new Headers(init?.headers).get('Authorization'), `Key ${FAL_KEY}`);
	assert.deepEqual(JSON.parse(/** @type {string} */ (init?.body)), {
		prompt: 'Improve the lighting',
		image_urls: [SOURCE_IMAGE],
		sync_mode: true,
		num_images: 1,
		...DEFAULT_DRAW_FAL_MODEL.settings
	});
	const body = await response.text();
	assert.deepEqual(JSON.parse(body), {
		requestId: REQUEST_ID,
		model: DEFAULT_DRAW_FAL_MODEL.id,
		status: 'IN_QUEUE',
		queuePosition: 3
	});
	assert.equal(body.includes(FAL_KEY), false);
	assert.equal(body.includes(SESSION_SECRET), false);
	assert.ok(
		drawingFalTasks['image-edit'].models.some((model) => model.id === DEFAULT_DRAW_FAL_MODEL.id)
	);
});

test('all 12 curated models retain their verified endpoints and model-specific provider settings', async () => {
	const imageEditingModels = DRAW_FAL_MODELS.filter((model) => model.kind === 'image-edit');
	assert.deepEqual(
		imageEditingModels.map((model) => model.id),
		[
			'nano-banana-2',
			'reve-2-1',
			'gpt-image-2',
			'grok-imagine-2',
			'seedream-5-pro',
			'nano-banana-pro',
			'ideogram-v4',
			'hunyuan-3-instruct',
			'hidream-o1',
			'qwen-image-edit-2511',
			'flux-klein-9b',
			'flux-2'
		]
	);
	assert.deepEqual(
		imageEditingModels.map((model) => model.artificialAnalysisRank),
		[6, 2, 3, null, 8, 9, null, 12, 24, 34, 33, 48]
	);
	for (const model of imageEditingModels) {
		const form = createForm({
			image: new File(['source'], 'source.png', { type: 'image/png' }),
			prompt: 'Preserve the subject',
			model: model.id
		});
		/** @type {[RequestInfo | URL, RequestInit | undefined] | undefined} */
		let captured;
		const response = await editDrawingImage(await createEvent({ form }), async (url, init) => {
			captured = [url, init];
			return providerResponse({ request_id: REQUEST_ID }, 202);
		});
		assert.equal(response.status, 202, model.id);
		assert.ok(captured);
		assert.equal(captured[0], `https://queue.fal.run/${model.model}`);
		const payload = JSON.parse(/** @type {string} */ (captured[1]?.body));
		assert.equal(payload.sync_mode, true);
		if ('imageInput' in model && model.imageInput === 'image_url') {
			assert.equal(payload.image_url, SOURCE_IMAGE, model.id);
			assert.equal('image_urls' in payload, false, model.id);
		} else if ('imageInput' in model && model.imageInput === 'reference_image_urls') {
			assert.deepEqual(payload.reference_image_urls, [SOURCE_IMAGE], model.id);
			assert.equal('image_urls' in payload, false, model.id);
		} else {
			assert.deepEqual(payload.image_urls, [SOURCE_IMAGE], model.id);
		}
		for (const [name, value] of Object.entries(model.settings))
			assert.equal(payload[name], value, `${model.id}.${name}`);
		if (model.id === 'gpt-image-2') assert.equal('enable_safety_checker' in payload, false);
		if (model.id === 'seedream-5-pro') assert.equal(payload.output_format, 'jpeg');
		if (model.id === 'grok-imagine-2') assert.equal(payload.resolution, '1k');
		if (model.id === 'ideogram-v4') assert.equal(payload.expansion_model, 'None');
		if (model.id === 'hidream-o1') assert.equal(payload.keep_original_aspect, true);
	}
});

test('text-to-image models send prompts only and reject accidental reference uploads', async () => {
	for (const model of DRAW_FAL_MODELS.filter((entry) => entry.kind === 'text-to-image')) {
		const form = createForm({ prompt: 'A warm sunrise over mountain peaks', model: model.id });
		/** @type {Record<string, unknown> | undefined} */
		let payload;
		const response = await editDrawingImage(await createEvent({ form }), async (url, init) => {
			assert.equal(url, `https://queue.fal.run/${model.model}`);
			payload = JSON.parse(/** @type {string} */ (init?.body));
			return providerResponse({ request_id: REQUEST_ID }, 202);
		});
		assert.equal(response.status, 202, model.id);
		assert.ok(payload);
		assert.equal(payload.prompt, 'A warm sunrise over mountain peaks');
		assert.equal(payload.sync_mode, true);
		assert.equal('image_url' in payload, false);
		assert.equal('image_urls' in payload, false);
		assert.equal('reference_image_urls' in payload, false);

		form.set('image', new File(['private'], 'private.png', { type: 'image/png' }));
		const rejected = await editDrawingImage(await createEvent({ form }), async () => {
			throw new Error('A text-only request must never upload the selected image.');
		});
		assert.equal(rejected.status, 422, model.id);
	}
});

test('image-to-video models use documented queue inputs and return only trusted fal media URLs', async () => {
	for (const model of DRAW_FAL_MODELS.filter((entry) => entry.kind === 'image-to-video')) {
		const form = createForm({
			image: new File(['source'], 'source.png', { type: 'image/png' }),
			prompt: 'Animate the scene with gentle camera motion',
			model: model.id
		});
		const submitted = await editDrawingImage(await createEvent({ form }), async (url, init) => {
			assert.equal(url, `https://queue.fal.run/${model.model}`);
			const payload = JSON.parse(/** @type {string} */ (init?.body));
			assert.equal(payload.image_url, SOURCE_IMAGE);
			assert.equal(payload.duration, 5);
			assert.equal(payload.resolution, '480p');
			assert.equal('sync_mode' in payload, false);
			assert.equal('num_images' in payload, false);
			return providerResponse({ request_id: REQUEST_ID }, 202);
		});
		assert.equal(submitted.status, 202, model.id);

		const query = `?requestId=${REQUEST_ID}&model=${model.id}`;
		let calls = 0;
		const completed = await pollDrawingImage(
			await createEvent({ method: 'GET', query }),
			async () =>
				providerResponse(
					calls++ === 0
						? { status: 'COMPLETED' }
						: { video: { url: 'https://v3b.fal.media/files/example/output.mp4' } }
				)
		);
		assert.deepEqual(await completed.json(), {
			status: 'COMPLETED',
			video: 'https://v3b.fal.media/files/example/output.mp4',
			model: model.model
		});

		calls = 0;
		const untrusted = await pollDrawingImage(
			await createEvent({ method: 'GET', query }),
			async () =>
				providerResponse(
					calls++ === 0
						? { status: 'COMPLETED' }
						: { video: { url: 'https://fal.media.attacker.example/private.mp4' } }
				)
		);
		assert.equal(untrusted.status, 502, model.id);
	}
});

test('all workflow cards expose sortable estimates and honest reference-image capabilities', () => {
	assert.equal(DRAW_FAL_MODELS.length, 16);
	for (const model of DRAW_FAL_MODELS) {
		assert.equal(typeof model.priceUsd, 'number', model.id);
		assert.ok(model.priceUsd > 0, model.id);
		assert.ok(
			model.referenceImages === null || Number.isSafeInteger(model.referenceImages),
			model.id
		);
	}
	const sorted = [...DRAW_FAL_MODELS].sort((left, right) => left.priceUsd - right.priceUsd);
	assert.equal(sorted[0].id, 'flux-klein-9b-generate');
	assert.equal(sorted.at(-1)?.id, 'grok-imagine-video-1-5');
	assert.deepEqual(Object.keys(drawingFalTasks), ['image-edit', 'text-to-image', 'image-to-video']);
});

test('the authenticated status proxy exposes queue positions and sanitized progress logs', async () => {
	const query = `?requestId=${REQUEST_ID}&model=flux-2`;
	const queued = await pollDrawingImage(
		await createEvent({ method: 'GET', query }),
		async (url, init) => {
			assert.equal(url, `https://queue.fal.run/fal-ai/flux-2/requests/${REQUEST_ID}/status?logs=1`);
			assert.equal(new Headers(init?.headers).get('Authorization'), `Key ${FAL_KEY}`);
			return providerResponse({ status: 'IN_QUEUE', queue_position: 5 });
		}
	);
	assert.deepEqual(await queued.json(), { status: 'IN_QUEUE', queuePosition: 5 });
	const running = await pollDrawingImage(await createEvent({ method: 'GET', query }), async () =>
		providerResponse({
			status: 'IN_PROGRESS',
			logs: [{ message: 'Preparing\nimage' }, { message: 'Denoising 4/12' }]
		})
	);
	assert.deepEqual(await running.json(), { status: 'IN_PROGRESS', message: 'Denoising 4/12' });
	const leaked = await pollDrawingImage(await createEvent({ method: 'GET', query }), async () =>
		providerResponse({ status: 'IN_PROGRESS', logs: [{ message: `private ${FAL_KEY}` }] })
	);
	assert.equal((await leaked.text()).includes(FAL_KEY), false);
});

test('completed queue jobs return only private inline image output', async () => {
	const query = `?requestId=${REQUEST_ID}&model=flux-2`;
	/** @type {Array<RequestInfo | URL>} */
	const calls = [];
	const response = await pollDrawingImage(
		await createEvent({ method: 'GET', query }),
		async (url) => {
			calls.push(url);
			return providerResponse(
				calls.length === 1
					? { status: 'COMPLETED' }
					: { images: [{ url: EDITED_IMAGE }], prompt: 'private prompt' }
			);
		}
	);
	assert.deepEqual(calls, [
		`https://queue.fal.run/fal-ai/flux-2/requests/${REQUEST_ID}/status?logs=1`,
		`https://queue.fal.run/fal-ai/flux-2/requests/${REQUEST_ID}`
	]);
	const text = await response.text();
	assert.deepEqual(JSON.parse(text), {
		status: 'COMPLETED',
		image: EDITED_IMAGE,
		model: 'fal-ai/flux-2/edit'
	});
	assert.equal(text.includes('private prompt'), false);
});

test('queued jobs can be cancelled without disclosing credentials', async () => {
	const query = `?requestId=${REQUEST_ID}&model=flux-2`;
	const response = await cancelDrawingImage(
		await createEvent({ method: 'DELETE', query }),
		async (url, init) => {
			assert.equal(url, `https://queue.fal.run/fal-ai/flux-2/requests/${REQUEST_ID}/cancel`);
			assert.equal(init?.method, 'PUT');
			assert.equal(new Headers(init?.headers).get('Authorization'), `Key ${FAL_KEY}`);
			return new Response(null, { status: 202 });
		}
	);
	assert.deepEqual(await response.json(), { status: 'CANCELLED' });
});

test('every model polls, retrieves, and cancels jobs at its canonical application root', async () => {
	for (const model of DRAW_FAL_MODELS) {
		const [owner, application] = model.model.split('/');
		const jobUrl = `https://queue.fal.run/${owner}/${application}/requests/${REQUEST_ID}`;
		const query = `?requestId=${REQUEST_ID}&model=${model.id}`;

		const queued = await pollDrawingImage(
			await createEvent({ method: 'GET', query }),
			async (url) => {
				assert.equal(url, `${jobUrl}/status?logs=1`, `${model.id} status URL`);
				return providerResponse({ status: 'IN_QUEUE' });
			}
		);
		assert.equal(queued.status, 200, `${model.id} status response`);

		/** @type {Array<RequestInfo | URL>} */
		const retrievalCalls = [];
		const completed = await pollDrawingImage(
			await createEvent({ method: 'GET', query }),
			async (url) => {
				retrievalCalls.push(url);
				return providerResponse(
					retrievalCalls.length === 1
						? { status: 'COMPLETED' }
						: model.kind === 'image-to-video'
							? { video: { url: 'https://v3b.fal.media/files/example/output.mp4' } }
							: { images: [{ url: EDITED_IMAGE }] }
				);
			}
		);
		assert.equal(completed.status, 200, `${model.id} result response`);
		assert.deepEqual(retrievalCalls, [`${jobUrl}/status?logs=1`, jobUrl], `${model.id} result URL`);

		const cancelled = await cancelDrawingImage(
			await createEvent({ method: 'DELETE', query }),
			async (url, init) => {
				assert.equal(url, `${jobUrl}/cancel`, `${model.id} cancellation URL`);
				assert.equal(init?.method, 'PUT');
				return new Response(null, { status: 202 });
			}
		);
		assert.equal(cancelled.status, 200, `${model.id} cancellation response`);
	}
});

test('submit, poll, and cancellation all reject unauthenticated requests', async () => {
	let called = false;
	/** @type {typeof fetch} */
	const unexpectedProvider = async () => {
		called = true;
		return providerResponse({});
	};
	for (const [handler, method] of [
		[editDrawingImage, 'POST'],
		[pollDrawingImage, 'GET'],
		[cancelDrawingImage, 'DELETE']
	]) {
		const response = await /** @type {typeof editDrawingImage} */ (handler)(
			await createEvent({
				authenticated: false,
				method: /** @type {'POST'|'GET'|'DELETE'} */ (method)
			}),
			unexpectedProvider
		);
		assert.equal(response.status, 401);
	}
	await assert.rejects(
		editDrawingImage(await createEvent({ origin: 'https://evil.example' }), unexpectedProvider),
		{ status: 403 }
	);
	await assert.rejects(
		cancelDrawingImage(
			await createEvent({ method: 'DELETE', origin: 'https://evil.example' }),
			unexpectedProvider
		),
		{ status: 403 }
	);
	assert.equal(called, false);
});

test('the drawing editor fails closed when its Worker secret is absent', async () => {
	let called = false;
	const response = await editDrawingImage(await createEvent({ falKey: '' }), async () => {
		called = true;
		return providerResponse({});
	});
	assert.equal(response.status, 503);
	assert.match((await response.json()).error, /not been configured/i);
	assert.equal(called, false);
});

test('multipart uploads reject invalid content, prompts, model names, and the 12 MB ceiling', async () => {
	const image = new File(['source'], 'source.png', { type: 'image/png' });
	const duplicate = createForm({ image, prompt: 'Edit' });
	duplicate.append('image', image);
	const cases = [
		[{ body: '{}', contentType: 'application/json' }, 415],
		[{ contentLength: String(MAX_DRAW_FAL_REQUEST_BYTES + 1) }, 413],
		[{ body: 'broken', contentType: 'multipart/form-data; boundary=nope' }, 400],
		[{ form: duplicate }, 400],
		[{ form: createForm({ image, prompt: 'Edit', extra: 'nope' }) }, 400],
		[{ form: createForm({ image, prompt: ' ' }) }, 422],
		[{ form: createForm({ image, prompt: 'a'.repeat(1_001) }) }, 422],
		[{ form: createForm({ image: 'not-a-file', prompt: 'Edit' }) }, 422],
		[
			{
				form: createForm({
					image: new File(['<svg>'], 'image.svg', { type: 'image/svg+xml' }),
					prompt: 'Edit'
				})
			},
			422
		],
		[
			{
				form: createForm({
					image: new File([], 'image.png', { type: 'image/png' }),
					prompt: 'Edit'
				})
			},
			422
		],
		[{ form: createForm({ image, prompt: 'Edit', model: 'fal-ai/any-paid-model' }) }, 422]
	];
	for (const [options, expected] of cases) {
		const response = await editDrawingImage(
			await createEvent(/** @type {any} */ (options)),
			async () => {
				throw new Error('The provider should not receive invalid requests.');
			}
		);
		assert.equal(response.status, expected, JSON.stringify(options));
	}
});

test('status and cancellation reject invalid models and request identifiers', async () => {
	for (const query of [
		'',
		'?requestId=../../secrets&model=flux-2',
		'?requestId=valid&model=unknown'
	]) {
		for (const [handler, method] of [
			[pollDrawingImage, 'GET'],
			[cancelDrawingImage, 'DELETE']
		]) {
			const response = await /** @type {typeof pollDrawingImage} */ (handler)(
				await createEvent({ method: /** @type {'GET'|'DELETE'} */ (method), query }),
				async () => {
					throw new Error('Unexpected provider call');
				}
			);
			assert.equal(response.status, 422, query);
		}
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
		const response = await editDrawingImage(await createEvent(), async () =>
			providerResponse({ detail: `sensitive details ${FAL_KEY}` }, upstreamStatus)
		);
		const text = await response.text();
		assert.equal(response.status, expectedStatus);
		assert.equal(text.includes(FAL_KEY), false);
		assert.equal(text.includes('sensitive details'), false);
	}
});

test('queue submission rejects invalid provider jobs and malformed JSON', async () => {
	for (const body of [{}, { request_id: '../../private' }, { request_id: 'x'.repeat(129) }]) {
		const response = await editDrawingImage(await createEvent(), async () =>
			providerResponse(body)
		);
		assert.equal(response.status, 502);
	}
	const response = await editDrawingImage(
		await createEvent(),
		async () => new Response(`not-json ${FAL_KEY}`)
	);
	assert.equal(response.status, 502);
	assert.equal((await response.text()).includes(FAL_KEY), false);
});

test('completed jobs reject public URLs, unsafe images, and oversized results', async () => {
	for (const invalidImage of [
		undefined,
		'https://fal.media/public-output.png',
		'data:image/svg+xml;base64,PHN2Zz4=',
		`data:image/png;base64,${'A'.repeat(MAX_DRAW_FAL_REQUEST_BYTES)}`
	]) {
		let calls = 0;
		const response = await pollDrawingImage(
			await createEvent({ method: 'GET', query: `?requestId=${REQUEST_ID}&model=flux-2` }),
			async () =>
				providerResponse(
					calls++ === 0 ? { status: 'COMPLETED' } : { images: [{ url: invalidImage }] }
				)
		);
		assert.equal(response.status, 502);
	}
});

test('provider network failures never disclose the Worker secret', async () => {
	const response = await editDrawingImage(await createEvent(), async () => {
		throw new Error(`Connection failed with ${FAL_KEY}`);
	});
	assert.equal(response.status, 502);
	assert.equal((await response.text()).includes(FAL_KEY), false);
});
