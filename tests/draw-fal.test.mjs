import { createTestAiLedger, ledgerRequest, seedTestJob } from './helpers/tools-ai-ledger.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

import { createToolsSession } from '../src/lib/server/tools-auth.js';
import {
	cancelDrawingImage,
	drawingGenerationTasks,
	editDrawingImage,
	pollDrawingImage
} from '../src/lib/server/draw-generation.js';
import {
	chargeDrawingAgentBudget,
	createDrawingAgentBudget
} from '../src/lib/server/draw-agent-budget.js';
import { getDrawGenerationModel } from '../src/lib/draw-generation-models.js';
import { drawingGenerationAdapters } from '../src/lib/server/draw-generation-provider.js';
import {
	DEFAULT_DRAW_FAL_MODEL,
	DRAW_FAL_MODELS,
	MAX_DRAW_FAL_REQUEST_BYTES,
	estimateDrawFalModelCost,
	getDrawFalModel,
	getDrawFalModelOverrides,
	getDrawFalModelParameters,
	resolveDrawFalModelSettings
} from '../src/lib/draw-fal-models.js';

const SESSION_SECRET = 'drawing-fal-test-only-session-secret';
const FAL_KEY = 'test-only-provider-secret';
const SOURCE_IMAGE = 'data:image/png;base64,c291cmNl';
const EDITED_IMAGE = 'data:image/png;base64,ZWRpdGVk';
const REQUEST_ID = 'queued-job-123';

/**
 * @param {{
 *   authenticated?: boolean, owner?: boolean,
 *   form?: FormData,
 *   contentLength?: string,
 *   contentType?: string,
 *   body?: string,
 *   falKey?: string,
 *   origin?: string,
 *   method?: 'POST' | 'GET' | 'DELETE',
 *   ledger?: any,
 *   seedJob?: boolean,
 *   query?: string
 * }} [options]
 */
async function createEvent(options = {}) {
	const url = new URL(`https://swyx.io/tools/api/draw/edit${options.query ?? ''}`);
	const method = options.method ?? 'POST';
	const headers = new Headers({
		'X-Tools-User': options.owner === false ? 'other-google-sub' : 'owner-google-sub'
	});
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
		options.authenticated === false
			? undefined
			: await createToolsSession(
					{
						id: options.owner === false ? 'other-google-sub' : 'owner-google-sub',
						email: 'user@example.com',
						name: 'Test User'
					},
					SESSION_SECRET
				);
	const ledger = options.ledger ?? createTestAiLedger();
	const model = getDrawFalModel(url.searchParams.get('model'));
	const requestId = url.searchParams.get('requestId');
	if (
		method !== 'POST' &&
		options.seedJob !== false &&
		model &&
		requestId &&
		/^[A-Za-z0-9_-]{1,128}$/.test(requestId)
	) {
		await seedTestJob(
			ledger,
			options.owner === false ? 'other-google-sub' : 'owner-google-sub',
			model.id,
			requestId
		);
	}
	return /** @type {any} */ ({
		request,
		url,
		cookies: { get: () => session },
		platform: {
			env: {
				TOOLS_SESSION_SECRET: SESSION_SECRET,
				TOOLS_OWNER_GOOGLE_SUB: 'owner-google-sub',
				DRAW_PAGES: options.ledger === null ? undefined : ledger.namespace,
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
		prompt: '  Improve the lighting  ',
		image_urls: [SOURCE_IMAGE],
		sync_mode: true,
		num_images: 1,
		...DEFAULT_DRAW_FAL_MODEL.settings
	});
	const body = await response.text();
	assert.deepEqual(JSON.parse(body), {
		requestId: REQUEST_ID,
		model: DEFAULT_DRAW_FAL_MODEL.id,
		adapter: 'fal',
		status: 'IN_QUEUE',
		queuePosition: 3
	});
	assert.equal(body.includes(FAL_KEY), false);
	assert.equal(body.includes(SESSION_SECRET), false);
	assert.ok(
		drawingGenerationTasks['image-edit'].models.some(
			(model) => model.id === DEFAULT_DRAW_FAL_MODEL.id
		)
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

test('autonomous drawing-agent edits preserve provider-managed safety defaults', async () => {
	for (const id of ['nano-banana-2', 'flux-2']) {
		const form = createForm({
			image: new File(['source'], 'source.png', { type: 'image/png' }),
			prompt: 'Improve the lighting',
			model: id,
			providerSafetyDefaults: '1',
			agentBudget: await createDrawingAgentBudget(1, SESSION_SECRET)
		});
		/** @type {Record<string, unknown> | undefined} */
		let payload;
		const response = await editDrawingImage(
			await createEvent({ owner: false, form }),
			async (_url, init) => {
				payload = JSON.parse(/** @type {string} */ (init?.body));
				return providerResponse({ request_id: REQUEST_ID }, 202);
			}
		);
		assert.equal(response.status, 202);
		const authorization = await response.json();
		assert.equal(typeof authorization.agentBudget, 'string');
		assert.equal(
			authorization.spendingUsd,
			DRAW_FAL_MODELS.find((model) => model.id === id)?.priceUsd
		);
		assert.ok(payload);
		assert.equal('enable_safety_checker' in payload, false);
		assert.equal('safety_tolerance' in payload, false);
	}
});

test('autonomous provider jobs require a signed shared budget and reject overspending before fal is called', async () => {
	const base = {
		image: new File(['source'], 'source.png', { type: 'image/png' }),
		prompt: 'Improve the lighting',
		model: 'nano-banana-2',
		providerSafetyDefaults: '1'
	};
	let providerCalls = 0;
	const provider = async () => {
		providerCalls++;
		return providerResponse({ request_id: REQUEST_ID }, 202);
	};
	const missing = await editDrawingImage(
		await createEvent({ owner: false, form: createForm(base) }),
		provider
	);
	assert.equal(missing.status, 402);
	const grant = await createDrawingAgentBudget(0.25, SESSION_SECRET);
	const almostSpent = await chargeDrawingAgentBudget(grant, 0.2, SESSION_SECRET);
	const exceeded = await editDrawingImage(
		await createEvent({
			owner: false,
			form: createForm({ ...base, agentBudget: almostSpent.token })
		}),
		provider
	);
	assert.equal(exceeded.status, 402);
	const tampered = await editDrawingImage(
		await createEvent({
			owner: false,
			form: createForm({ ...base, agentBudget: `${grant}tampered` })
		}),
		provider
	);
	assert.equal(tampered.status, 402);
	assert.equal(providerCalls, 0);
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
			for (const [setting, value] of Object.entries(model.settings)) {
				assert.equal(payload[setting], value, `${model.id}.${setting}`);
			}
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
			model: model.id
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
	assert.equal(DRAW_FAL_MODELS.length, 26);
	assert.deepEqual(
		DRAW_FAL_MODELS.filter((model) => model.kind === 'image-to-video').map((model) => model.id),
		[
			'grok-imagine-video',
			'grok-imagine-video-1-5',
			'minimax-h3-video',
			'seedance-2-5-video',
			'seedance-2-video',
			'happy-horse-1-1-video',
			'happy-horse-video',
			'wan-2-7-video',
			'veo-3-1-video',
			'veo-3-1-fast-video',
			'gemini-omni-flash-video',
			'flux-3-video'
		]
	);
	assert.deepEqual(
		DRAW_FAL_MODELS.filter((model) => model.kind === 'image-to-video' && model.arenaRank)
			.map((model) => model.arenaRank)
			.filter((rank) => rank <= 10)
			.sort((left, right) => left - right),
		[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
	);
	for (const model of DRAW_FAL_MODELS) {
		assert.equal(typeof model.priceUsd, 'number', model.id);
		assert.ok(model.priceUsd > 0, model.id);
		assert.ok(['open', 'closed'].includes(model.weights), model.id);
		assert.ok(
			model.referenceImages === null || Number.isSafeInteger(model.referenceImages),
			model.id
		);
	}
	const sorted = [...DRAW_FAL_MODELS].sort((left, right) => left.priceUsd - right.priceUsd);
	assert.equal(sorted[0].id, 'flux-klein-9b-generate');
	assert.equal(sorted.at(-1)?.id, 'veo-3-1-video');
	assert.deepEqual(
		DRAW_FAL_MODELS.filter((model) => model.weights === 'open').map((model) => model.id),
		[
			'hunyuan-3-instruct',
			'hidream-o1',
			'qwen-image-edit-2511',
			'flux-klein-9b',
			'flux-2',
			'flux-klein-9b-generate',
			'minimax-h3-video'
		]
	);
	assert.deepEqual(Object.keys(drawingGenerationTasks), [
		'image-edit',
		'text-to-image',
		'image-to-video'
	]);
});

test('each endpoint exposes only officially documented modality parameters and exact provider types', () => {
	const seedance = getDrawFalModel('seedance-2-video');
	const veo = getDrawFalModel('veo-3-1-video');
	const minimax = getDrawFalModel('minimax-h3-video');
	const grok = getDrawFalModel('grok-imagine-video-1-5');
	assert.ok(seedance && veo && minimax && grok);
	assert.deepEqual(
		getDrawFalModelParameters(seedance).map((parameter) => parameter.key),
		['duration', 'resolution', 'aspect_ratio', 'generate_audio']
	);
	assert.deepEqual(
		getDrawFalModelOverrides(seedance, {
			duration: 6,
			resolution: '720P',
			generate_audio: false,
			seed: 42
		}),
		{ duration: '6', resolution: '720p', generate_audio: false }
	);
	assert.deepEqual(getDrawFalModelOverrides(veo, { duration: '6', resolution: '4K', seed: 42 }), {
		duration: '6s',
		resolution: '4k',
		seed: 42
	});
	assert.deepEqual(getDrawFalModelOverrides(minimax, { duration: '8s', resolution: '768p' }), {
		duration: 8,
		resolution: '768P'
	});
	assert.deepEqual(getDrawFalModelOverrides(grok, { generate_audio: false, duration: 8 }), {
		duration: 8
	});
	assert.throws(
		() => resolveDrawFalModelSettings(veo, { duration: 6 }),
		/not available for this model/i
	);
	assert.throws(
		() => resolveDrawFalModelSettings(veo, { enable_safety_checker: false }),
		/does not support/i
	);
	assert.throws(
		() => resolveDrawFalModelSettings(veo, { image_url: 'https://evil.example' }),
		/does not support/i
	);
	assert.throws(() => resolveDrawFalModelSettings(veo, { seed: -1 }), /seed must be an integer/i);
});

test('video duration, output resolution, audio, image quality, and reference fees update estimates', () => {
	const expectations = [
		['grok-imagine-video', { duration: 10, resolution: '720p' }, 0.702],
		['grok-imagine-video-1-5', { duration: 5, resolution: '1080p' }, 1.26],
		['minimax-h3-video', { duration: 10, resolution: '768P' }, 0.8],
		['minimax-h3-video', { duration: 10, resolution: '4K' }, 1.6],
		['gemini-omni-flash-video', { duration: 10, aspect_ratio: '9:16' }, 1.3],
		['flux-3-video', { duration: 10, resolution: '1080p' }, 2.9],
		['seedance-2-5-video', { duration: '10', resolution: '720p' }, 4.73],
		['happy-horse-1-1-video', { duration: 8, resolution: '1080p' }, 1.44],
		['happy-horse-video', { duration: 8, resolution: '1080p' }, 2.24],
		['wan-2-7-video', { duration: 10, resolution: '1080p' }, 1.5],
		['veo-3-1-video', { duration: '4s', resolution: '720p', generate_audio: false }, 0.8],
		['veo-3-1-video', { duration: '6s', resolution: '4k', generate_audio: true }, 3.6],
		['veo-3-1-fast-video', { duration: '8s', resolution: '4k', generate_audio: true }, 2.8],
		['nano-banana-2', { resolution: '2K' }, 0.12],
		['nano-banana-pro', { resolution: '4K' }, 0.3],
		['gpt-image-2', { quality: 'low' }, 0.015],
		['grok-imagine-2', { quality: 'medium', resolution: '2k' }, 0.09]
	];
	for (const [id, settings, expected] of expectations) {
		const model = getDrawFalModel(id);
		assert.ok(model);
		assert.equal(
			estimateDrawFalModelCost(model, /** @type {Record<string, unknown>} */ (settings)),
			expected,
			String(id)
		);
	}
});

test('authenticated model overrides preserve exact API schemas and reject unsafe settings before fal', async () => {
	let calls = 0;
	const provider = async (_url, init) => {
		calls++;
		const payload = JSON.parse(/** @type {string} */ (init?.body));
		assert.equal(payload.duration, '6s');
		assert.equal(payload.resolution, '1080p');
		assert.equal(payload.generate_audio, false);
		assert.equal(payload.seed, 42);
		return providerResponse({ request_id: REQUEST_ID }, 202);
	};
	const base = {
		image: new File(['source'], 'source.png', { type: 'image/png' }),
		prompt: 'Cinematic portrait',
		model: 'veo-3-1-video'
	};
	const accepted = await editDrawingImage(
		await createEvent({
			form: createForm({
				...base,
				settings: JSON.stringify({
					duration: '6s',
					resolution: '1080p',
					generate_audio: false,
					seed: 42
				})
			})
		}),
		provider
	);
	assert.equal(accepted.status, 202);
	for (const settings of [
		'{',
		'null',
		'[]',
		JSON.stringify({ duration: 6 }),
		JSON.stringify({ resolution: '8k' }),
		JSON.stringify({ generate_audio: 'false' }),
		JSON.stringify({ seed: 2_147_483_648 }),
		JSON.stringify({ enable_safety_checker: false }),
		JSON.stringify({ safety_tolerance: '6' }),
		JSON.stringify({ image_url: 'https://attacker.example/image' }),
		JSON.stringify({ model: 'attacker/expensive-model' })
	]) {
		const rejected = await editDrawingImage(
			await createEvent({ form: createForm({ ...base, settings }) }),
			provider
		);
		assert.equal(rejected.status, 422, settings);
	}
	assert.equal(calls, 1);
});

test('agent spending limits use parameter-adjusted provider prices before paid submission', async () => {
	let calls = 0;
	const form = createForm({
		image: new File(['source'], 'source.png', { type: 'image/png' }),
		prompt: 'Animate the scene',
		model: 'veo-3-1-video',
		settings: JSON.stringify({ duration: '4s', generate_audio: false }),
		providerSafetyDefaults: '1',
		agentBudget: await createDrawingAgentBudget(1, SESSION_SECRET)
	});
	const accepted = await editDrawingImage(await createEvent({ owner: false, form }), async () => {
		calls++;
		return providerResponse({ request_id: REQUEST_ID }, 202);
	});
	assert.equal(accepted.status, 202);
	assert.equal((await accepted.json()).spendingUsd, 0.8);
	form.set('settings', JSON.stringify({ duration: '4s', generate_audio: true }));
	const rejected = await editDrawingImage(await createEvent({ owner: false, form }), async () => {
		calls++;
		return providerResponse({ request_id: REQUEST_ID }, 202);
	});
	assert.equal(rejected.status, 402);
	assert.equal(calls, 1);
});

test('provider videos accept only fal-owned CDN or falserverless Google Storage objects', async () => {
	const query = `?requestId=${REQUEST_ID}&model=veo-3-1-video`;
	for (const [video, status] of [
		['https://storage.googleapis.com/falserverless/model_tests/example.mp4', 200],
		['https://storage.googleapis.com/attacker/example.mp4', 502],
		['https://storage.googleapis.com/falserverless-attacker/example.mp4', 502],
		['https://storage.googleapis.com.evil.example/falserverless/example.mp4', 502]
	]) {
		let calls = 0;
		const response = await pollDrawingImage(await createEvent({ method: 'GET', query }), async () =>
			providerResponse(calls++ === 0 ? { status: 'COMPLETED' } : { video: { url: video } })
		);
		assert.equal(response.status, status, String(video));
	}
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
	assert.deepEqual(await running.json(), {
		status: 'IN_PROGRESS',
		message: 'The model is generating.'
	});
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
		model: 'flux-2'
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
	assert.deepEqual(await response.json(), {
		status: 'CANCEL_REQUESTED',
		cancellation: 'requested'
	});
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
	duplicate.append('prompt', 'Duplicate prompt');
	const cases = [
		[{ body: '{}', contentType: 'application/json' }, 415],
		[{ contentLength: String(MAX_DRAW_FAL_REQUEST_BYTES + 1) }, 413],
		[{ body: 'broken', contentType: 'multipart/form-data; boundary=nope' }, 400],
		[{ form: duplicate }, 400],
		[{ form: createForm({ image, prompt: 'Edit', extra: 'nope' }) }, 400],
		[{ form: createForm({ image, prompt: ' ' }) }, 422],
		[{ form: createForm({ image, prompt: 'a'.repeat(32_001) }) }, 422],
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

test('signed nonowner Google identities can submit, read, and cancel their own funded provider jobs', async () => {
	let called = false;
	for (const [handler, method] of [
		[editDrawingImage, 'POST'],
		[pollDrawingImage, 'GET'],
		[cancelDrawingImage, 'DELETE']
	]) {
		const response = await handler(
			await createEvent({ owner: false, method, query: `?requestId=${REQUEST_ID}&model=flux-2` }),
			async () => {
				called = true;
				return providerResponse(
					method === 'POST' ? { request_id: REQUEST_ID } : { status: 'IN_QUEUE' }
				);
			}
		);
		assert.equal(response.status, method === 'POST' ? 202 : 200);
	}
	assert.equal(called, true);
});

test('paid image submission rejects stale account headers before calling the provider', async () => {
	let called = false;
	const event = await createEvent();
	event.request.headers.set('X-Tools-User', 'previous-user');
	assert.equal(
		(
			await editDrawingImage(event, async () => {
				called = true;
				return providerResponse({});
			})
		).status,
		409
	);
	assert.equal(called, false);
});

test('provider status, results and cancellation reject unknown or another Google account jobs before network access', async () => {
	const ledger = createTestAiLedger();
	await seedTestJob(ledger, 'owner-google-sub', 'flux-2', REQUEST_ID);
	let called = false;
	for (const [handler, method] of [
		[pollDrawingImage, 'GET'],
		[cancelDrawingImage, 'DELETE']
	]) {
		for (const requestId of [REQUEST_ID, 'unknown-job']) {
			const response = await handler(
				await createEvent({
					owner: false,
					ledger,
					seedJob: false,
					method,
					query: `?requestId=${requestId}&model=flux-2`
				}),
				async () => {
					called = true;
					return providerResponse({});
				}
			);
			assert.equal(response.status, 404);
		}
	}
	assert.equal(called, false);
});

test('media submission fails closed without a ledger or after durable funded quota exhaustion', async () => {
	let called = false;
	const ledger = createTestAiLedger();
	for (let index = 0; index < 5; index++)
		await ledgerRequest(ledger, 'admit', {
			userId: 'other-google-sub',
			kind: 'media',
			model: 'flux-2',
			estimatedReservedUsd: 0.05
		});
	for (const [value, expected] of [
		[null, 503],
		[ledger, 429]
	]) {
		const response = await editDrawingImage(
			await createEvent({ owner: false, ledger: value }),
			async () => {
				called = true;
				return providerResponse({ request_id: REQUEST_ID });
			}
		);
		assert.equal(response.status, expected);
	}
	assert.equal(called, false);
});

test('accepted media jobs are withheld if ownership registration fails, while the estimated reservation remains charged', async () => {
	const ledger = createTestAiLedger();
	const realGet = ledger.namespace.get;
	ledger.namespace.get = (id) => ({
		fetch: async (request) =>
			new URL(request.url).pathname === '/ai/register'
				? new Response('Unavailable', { status: 503 })
				: realGet(id).fetch(request)
	});
	const response = await editDrawingImage(await createEvent({ ledger }), async () =>
		providerResponse({ request_id: REQUEST_ID })
	);
	assert.equal(response.status, 503);
	assert.equal((await response.text()).includes(REQUEST_ID), false);
	const row = ledger.database.prepare('SELECT * FROM tools_ai_usage').get();
	assert.equal(row.status, 'reserved');
	assert.ok(row.reserved_micros > 0);
	assert.equal(row.provider_request_id, null);
});

test('manual concurrent generation reserves one run budget before provider submission and cannot replay a job', async () => {
	const ledger = createTestAiLedger();
	let calls = 0;
	const provider = async () => providerResponse({ request_id: `manual-${++calls}` }, 202);
	const base = {
		prompt: 'A simple geometric illustration',
		model: 'flux-klein-9b-generate',
		runId: 'manual-run',
		runLimitUsd: '0.1'
	};
	const events = await Promise.all(
		Array.from({ length: 4 }, (_, index) =>
			createEvent({
				owner: false,
				ledger,
				form: createForm({ ...base, clientJobId: `job-${index}` })
			})
		)
	);
	const responses = await Promise.all(events.map((event) => editDrawingImage(event, provider)));
	assert.equal(responses.filter((response) => response.status === 202).length, 2);
	assert.equal(responses.filter((response) => response.status === 402).length, 2);
	assert.equal(calls, 2);
	const duplicate = await editDrawingImage(
		await createEvent({
			owner: false,
			ledger,
			form: createForm({ ...base, clientJobId: 'job-0' })
		}),
		provider
	);
	assert.equal(duplicate.status, 409);
	assert.equal((await duplicate.json()).code, 'job_already_submitted');
	assert.equal(calls, 2);
	for (const fields of [
		{ runId: 'partial' },
		{ runId: 'invalid', clientJobId: 'job', runLimitUsd: 'Infinity' },
		{ runId: 'invalid', clientJobId: 'job', runLimitUsd: '-1' }
	]) {
		const response = await editDrawingImage(
			await createEvent({
				owner: false,
				ledger,
				form: createForm({ prompt: base.prompt, model: base.model, ...fields })
			}),
			provider
		);
		assert.equal(response.status, 422);
	}
	assert.equal(calls, 2);
});

test('owner media has no account or run cap, retains replay protection, and cannot grant that exemption to members', async () => {
	const ledger = createTestAiLedger();
	let calls = 0;
	const provider = async () => providerResponse({ request_id: `owner-job-${++calls}` }, 202);
	const fields = {
		image: new File(['source'], 'source.png', { type: 'image/png' }),
		prompt: 'Animate the scene',
		model: 'veo-3-1-video',
		runId: 'owner-run',
		runLimitUsd: 'null',
		providerSafetyDefaults: '1'
	};
	for (let index = 0; index < 8; index++) {
		const response = await editDrawingImage(
			await createEvent({
				ledger,
				form: createForm({ ...fields, clientJobId: `job-${index}` })
			}),
			provider
		);
		assert.equal(response.status, 202);
		assert.equal((await response.json()).agentBudget, undefined);
	}
	const repeated = await editDrawingImage(
		await createEvent({
			ledger,
			form: createForm({ ...fields, clientJobId: 'job-0' })
		}),
		provider
	);
	assert.equal(repeated.status, 409);
	assert.equal((await repeated.json()).code, 'job_already_submitted');
	const member = await editDrawingImage(
		await createEvent({
			owner: false,
			ledger,
			form: createForm({ ...fields, clientJobId: 'member-job' })
		}),
		provider
	);
	assert.equal(member.status, 422);
	const impersonation = await editDrawingImage(
		await createEvent({
			owner: false,
			ledger,
			form: createForm({ ...fields, clientJobId: 'member-job', isOwner: 'true' })
		}),
		provider
	);
	assert.equal(impersonation.status, 400);
	assert.equal(calls, 8);
	const usage = ledger.database
		.prepare(
			"SELECT COUNT(*) AS count, SUM(reserved_micros) AS reserved FROM tools_ai_usage WHERE user_id = 'owner-google-sub'"
		)
		.get();
	assert.equal(usage.count, 8);
	assert.ok(usage.reserved > 2_000_000);
	assert.equal(
		ledger.database.prepare('SELECT limit_micros FROM tools_ai_generation_runs').get().limit_micros,
		0
	);
});

test('shared route authenticates and registers a fake adapter, then polls its original binding after catalog routing changes', async () => {
	const descriptor = getDrawGenerationModel('flux-klein-9b-generate');
	const originalAdapter = descriptor.adapter;
	const originalImplementation = drawingGenerationAdapters.fal;
	const ledger = createTestAiLedger();
	const calls = [];
	drawingGenerationAdapters.fal = {
		configured: () => true,
		async submit(input) {
			calls.push('submit');
			assert.equal(input.image, undefined);
			return { requestId: 'fake-job' };
		},
		async status(job) {
			calls.push('status');
			assert.equal(job.model.adapter, 'fal');
			return { status: 'COMPLETED', image: EDITED_IMAGE };
		},
		async cancel() {
			calls.push('cancel');
			return { status: 'CANCEL_REQUESTED', cancellation: 'requested' };
		}
	};
	try {
		const request = await createEvent({
			ledger,
			falKey: '',
			form: createForm({ prompt: 'A tree', model: descriptor.id })
		});
		const submitted = await editDrawingImage(request, async () => {
			throw new Error('No fal network is permitted');
		});
		assert.equal(submitted.status, 202);
		assert.equal((await submitted.json()).adapter, 'fal');
		descriptor.adapter = 'new-hosting-route';
		const query = `?model=${descriptor.id}&requestId=fake-job`;
		const completed = await pollDrawingImage(
			await createEvent({ ledger, falKey: '', method: 'GET', query, seedJob: false })
		);
		assert.equal(completed.status, 200);
		assert.equal((await completed.json()).image, EDITED_IMAGE);
		const cancelled = await cancelDrawingImage(
			await createEvent({ ledger, falKey: '', method: 'DELETE', query, seedJob: false })
		);
		assert.equal((await cancelled.json()).cancellation, 'requested');
		assert.deepEqual(calls, ['submit', 'status', 'cancel']);
	} finally {
		descriptor.adapter = originalAdapter;
		drawingGenerationAdapters.fal = originalImplementation;
	}
});

test('accepted cancellation remains a request, with no false refund or terminal completion in the ledger', async () => {
	const ledger = createTestAiLedger();
	const query = '?model=flux-2&requestId=cancel-requested';
	const event = await createEvent({ ledger, method: 'DELETE', query });
	const response = await cancelDrawingImage(event, async () =>
		providerResponse({ status: 'CANCELLATION_REQUESTED' })
	);
	assert.deepEqual(await response.json(), {
		status: 'CANCEL_REQUESTED',
		cancellation: 'requested'
	});
	const owned = await ledgerRequest(ledger, 'owned-job', {
		userId: 'owner-google-sub',
		model: 'flux-2',
		requestId: 'cancel-requested'
	});
	assert.equal((await owned.json()).status, 'submitted');
	const progress = await pollDrawingImage(
		await createEvent({ ledger, method: 'GET', query, seedJob: false }),
		async () => providerResponse({ status: 'CANCELLED' })
	);
	assert.deepEqual(await progress.json(), { status: 'CANCELLED' });
	const summary = await ledgerRequest(ledger, 'summary', { userId: 'owner-google-sub' });
	assert.equal((await summary.json()).usage.estimatedReservedTodayUsd, 0.05);
});

test('generation API lifecycle reaches logs once with server-selected metadata and canonical run/job IDs', async (context) => {
	let now = Date.now();
	context.mock.method(Date, 'now', () => now);
	const started = now;
	const ledger = createTestAiLedger();
	const form = createForm({
		image: new File(['source'], 'PRIVATE-FILENAME.png', { type: 'image/png' }),
		prompt: 'PRIVATE-PROMPT',
		runId: 'experiment-burst',
		clientJobId: 'candidate-1'
	});
	const submitted = await editDrawingImage(await createEvent({ ledger, form }), async () =>
		providerResponse({ request_id: REQUEST_ID }, 202)
	);
	assert.equal(submitted.status, 202);
	const query = `?requestId=${REQUEST_ID}&model=${DEFAULT_DRAW_FAL_MODEL.id}`;
	const progress = () => createEvent({ ledger, seedJob: false, method: 'GET', query });
	now += 2000;
	assert.equal(
		(
			await pollDrawingImage(await progress(), async () =>
				providerResponse({ status: 'IN_PROGRESS', logs: [{ message: 'PRIVATE-PROVIDER-LOG' }] })
			)
		).status,
		200
	);
	now += 1000;
	await cancelDrawingImage(
		await createEvent({ ledger, seedJob: false, method: 'DELETE', query }),
		async () => new Response(null, { status: 202 })
	);
	now += 2000;
	let calls = 0;
	const completed = await pollDrawingImage(await progress(), async () =>
		providerResponse(calls++ === 0 ? { status: 'COMPLETED' } : { images: [{ url: EDITED_IMAGE }] })
	);
	assert.equal(completed.status, 200);
	const readLogs = async () =>
		(
			await ledgerRequest(ledger, 'activity-logs', { userId: 'owner-google-sub', filters: {} })
		).json();
	const result = await readLogs();
	assert.equal(result.summary.aiRequests, 1);
	assert.equal(result.entries.length, 1);
	const generation = result.entries[0].generation;
	assert.equal(generation.runId, 'experiment-burst');
	assert.equal(generation.clientJobId, 'candidate-1');
	assert.equal(generation.providerRequestId, REQUEST_ID);
	assert.equal(generation.adapter, 'fal');
	assert.equal(generation.modelMaker, DEFAULT_DRAW_FAL_MODEL.provider);
	assert.equal(generation.modality, 'image-edit');
	assert.equal(generation.referenceCount, 1);
	assert.equal(generation.requestedOutputs, 1);
	assert.equal(generation.providerStatus, 'COMPLETED');
	assert.equal(generation.cancellation, 'requested');
	assert.equal(generation.observedElapsedMs, 5000);
	assert.equal(generation.finishedObservedAt, new Date(started + 5000).toISOString());
	assert.doesNotMatch(
		JSON.stringify(result),
		/PRIVATE|source.png|test-only-provider-secret|data:image/
	);
	now += 2000;
	calls = 0;
	await pollDrawingImage(await progress(), async () =>
		providerResponse(calls++ === 0 ? { status: 'COMPLETED' } : { images: [{ url: EDITED_IMAGE }] })
	);
	const again = await readLogs();
	assert.equal(again.summary.aiRequests, 1);
	assert.equal(again.entries[0].generation.finishedObservedAt, generation.finishedObservedAt);
});

test('uncertain submit and best-effort observation failure never leak provider text or break delivery', async (context) => {
	const ledger = createTestAiLedger();
	const failed = await editDrawingImage(await createEvent({ ledger }), async () => {
		throw new Error('PRIVATE upstream error');
	});
	assert.equal(failed.status, 502);
	let result = await (
		await ledgerRequest(ledger, 'activity-logs', { userId: 'owner-google-sub', filters: {} })
	).json();
	assert.equal(result.entries[0].generation.errorCode, 'submission_uncertain');
	assert.equal(result.entries[0].generation.providerStatus, null);
	assert.equal(result.entries[0].status, 'failed');
	assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
	const warnings = [];
	context.mock.method(console, 'warn', (value) => warnings.push(value));
	const isolated = createTestAiLedger();
	const original = isolated.namespace.get;
	isolated.namespace.get = (name) => {
		const stub = original(name);
		return {
			fetch: (request) =>
				new URL(request.url).pathname === '/ai/generation-observe'
					? Response.json({ error: 'unavailable' }, { status: 503 })
					: stub.fetch(request)
		};
	};
	const submitted = await editDrawingImage(await createEvent({ ledger: isolated }), async () =>
		providerResponse({ request_id: REQUEST_ID }, 202)
	);
	assert.equal(submitted.status, 202);
	let calls = 0;
	const completed = await pollDrawingImage(
		await createEvent({
			ledger: isolated,
			seedJob: false,
			method: 'GET',
			query: `?requestId=${REQUEST_ID}&model=${DEFAULT_DRAW_FAL_MODEL.id}`
		}),
		async () =>
			providerResponse(
				calls++ === 0 ? { status: 'COMPLETED' } : { images: [{ url: EDITED_IMAGE }] }
			)
	);
	assert.equal(completed.status, 200);
	assert.equal((await completed.json()).image, EDITED_IMAGE);
	assert.ok(warnings.length > 0);
	for (const warning of warnings)
		assert.deepEqual(JSON.parse(warning), {
			event: 'generation_observation_unavailable',
			count: 1
		});
});

test('ordered multi-image references and a 32k prompt reach GPT Image 2 without clipping or role reordering', async () => {
	const form = createForm({
		prompt: 'p'.repeat(32_000),
		model: 'gpt-image-2',
		settings: JSON.stringify({ image_size: { width: 1280, height: 720 } })
	});
	for (let index = 0; index < 16; index++)
		form.append('image', new File([`reference-${index}`], `${index}.png`, { type: 'image/png' }));
	const ledger = createTestAiLedger();
	let payload;
	const response = await editDrawingImage(
		await createEvent({ form, ledger, owner: false }),
		async (_url, init) => {
			payload = JSON.parse(init.body);
			return providerResponse({ request_id: REQUEST_ID }, 202);
		}
	);
	assert.equal(response.status, 202);
	assert.equal(payload.prompt, 'p'.repeat(32_000));
	assert.deepEqual(payload.image_size, { width: 1280, height: 720 });
	assert.deepEqual(
		payload.image_urls.map((value) => Buffer.from(value.split(',')[1], 'base64').toString()),
		Array.from({ length: 16 }, (_, index) => `reference-${index}`)
	);
	assert.equal(ledger.calls.filter((call) => call.path === '/ai/admit').length, 1);
	assert.equal(JSON.stringify(ledger.calls).includes('reference-15'), false);
});

test('unsupported reference counts and 32k prompt overflow are rejected before any quota or provider admission', async () => {
	for (const [model, count, prompt] of [
		['gpt-image-2', 17, 'Edit'],
		['gpt-image-2', 0, 'Edit'],
		['nano-banana-2', 15, 'Edit'],
		['reve-2-1', 2, 'Edit'],
		['veo-3-1-video', 2, 'Edit'],
		['flux-klein-9b-generate', 1, 'Edit'],
		['gpt-image-2', 1, 'p'.repeat(32_001)]
	]) {
		const form = createForm({ model, prompt });
		for (let index = 0; index < count; index++)
			form.append('image', new File(['source'], `${index}.png`, { type: 'image/png' }));
		const ledger = createTestAiLedger();
		const response = await editDrawingImage(
			await createEvent({ form, ledger, owner: false }),
			async () => assert.fail('Invalid reference count reached provider')
		);
		assert.equal(response.status, 422, `${model}: ${count}`);
		assert.deepEqual(ledger.calls, []);
	}
});

test('aggregate multipart body limit is enforced on streamed requests with absent or dishonest Content-Length', async () => {
	for (const contentLength of [undefined, '1']) {
		const form = createForm({ prompt: 'Edit', model: 'gpt-image-2' });
		for (let index = 0; index < 2; index++)
			form.append(
				'image',
				new File([new Uint8Array(6_000_000)], `${index}.png`, { type: 'image/png' })
			);
		const ledger = createTestAiLedger();
		const event = await createEvent({ form, ledger, contentLength, owner: false });
		assert.equal(event.request.headers.get('content-length'), contentLength ?? null);
		const response = await editDrawingImage(event, async () =>
			assert.fail('Oversized body reached provider')
		);
		assert.equal(response.status, 413);
		assert.deepEqual(ledger.calls, []);
	}
});

test('array-input endpoints retain ordered references while scalar image and video endpoints retain their single-image fields', async () => {
	for (const [model, key, count] of [
		['hidream-o1', 'reference_image_urls', 2],
		['qwen-image-edit-2511', 'image_urls', 2],
		['reve-2-1', 'image_url', 1],
		['veo-3-1-video', 'image_url', 1]
	]) {
		const form = createForm({ model, prompt: 'Use the attached references' });
		for (let index = 0; index < count; index++)
			form.append('image', new File([`image-${index}`], `${index}.png`, { type: 'image/png' }));
		let payload;
		const result = await editDrawingImage(await createEvent({ form }), async (_url, init) => {
			payload = JSON.parse(init.body);
			return providerResponse({ request_id: REQUEST_ID }, 202);
		});
		assert.equal(result.status, 202, model);
		const values = Array.from(
			{ length: count },
			(_, index) => `data:image/png;base64,${Buffer.from(`image-${index}`).toString('base64')}`
		);
		assert.deepEqual(payload[key], key === 'image_url' ? values[0] : values, model);
	}
});

test('GPT custom output size is bounded and cannot smuggle nested settings or apply to other models', () => {
	const model = getDrawFalModel('gpt-image-2');
	assert.deepEqual(
		resolveDrawFalModelSettings(model, { image_size: { width: 1280, height: 720 } }).image_size,
		{ width: 1280, height: 720 }
	);
	assert.deepEqual(getDrawFalModelOverrides(model, { image_size: { width: 1280, height: 720 } }), {
		image_size: { width: 1280, height: 720 }
	});
	for (const value of [
		{ width: 1281, height: 720 },
		{ width: 1280, height: 0 },
		{ width: 4096, height: 4096 },
		{ width: 1280, height: 720, image_url: 'https://private.example' },
		{ width: '1280', height: 720 }
	])
		assert.throws(() => resolveDrawFalModelSettings(model, { image_size: value }));
	assert.throws(() =>
		resolveDrawFalModelSettings(getDrawFalModel('seedream-5-pro'), {
			image_size: { width: 1280, height: 720 }
		})
	);
});
