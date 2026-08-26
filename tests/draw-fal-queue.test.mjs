import assert from 'node:assert/strict';
import test from 'node:test';

import { runDrawingGeneration } from '../src/lib/draw-generation-client.js';

/** @param {unknown} body @param {number} [status] */
function response(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

test('generation uploads raw multipart bytes once and reports queue position and runner logs', async () => {
	const image = new Blob(['raw-image'], { type: 'image/webp' });
	const signal = new AbortController().signal;
	/** @type {any[]} */
	const progress = [];
	/** @type {Array<[RequestInfo | URL, RequestInit | undefined]>} */
	const calls = [];
	const updates = [
		{ status: 'IN_QUEUE', queuePosition: 2 },
		{ status: 'IN_PROGRESS', message: 'Denoising step 4 of 12' },
		{ status: 'COMPLETED', image: 'data:image/png;base64,ZWRpdGVk', model: 'fal-ai/flux-2/edit' }
	];
	const result = await runDrawingGeneration({
		image,
		prompt: 'Improve lighting',
		model: 'flux-2',
		signal,
		pollIntervalMs: 0,
		onProgress: (update) => progress.push(update),
		fetcher: async (url, init) => {
			calls.push([url, init]);
			if (init?.method === 'POST')
				return response(
					{ requestId: 'job-123', model: 'flux-2', status: 'IN_QUEUE', queuePosition: 3 },
					202
				);
			return response(updates.shift());
		}
	});
	assert.equal(calls.length, 4);
	assert.ok(calls[0][1]?.body instanceof FormData);
	const form = /** @type {FormData} */ (calls[0][1]?.body);
	const file = /** @type {File} */ (form.get('image'));
	assert.equal(await file.text(), 'raw-image');
	assert.equal(file.type, 'image/webp');
	assert.equal(file.name, 'drawing-edit.webp');
	assert.equal(form.get('prompt'), 'Improve lighting');
	assert.equal(form.get('model'), 'flux-2');
	assert.equal(new Headers(calls[0][1]?.headers).has('content-type'), false);
	assert.deepEqual(
		progress.map((update) => update.status),
		['UPLOADING', 'IN_QUEUE', 'IN_QUEUE', 'IN_PROGRESS']
	);
	assert.equal(progress[2].queuePosition, 2);
	assert.equal(progress[3].message, 'Denoising step 4 of 12');
	assert.equal(result.image, 'data:image/png;base64,ZWRpdGVk');
});

test('generation sends only selected endpoint settings as a bounded multipart JSON field', async () => {
	let call = 0;
	await runDrawingGeneration({
		image: new Blob(['image'], { type: 'image/jpeg' }),
		prompt: 'Animate the portrait',
		model: 'veo-3-1-video',
		settings: { duration: '6s', resolution: '1080p', generate_audio: false, seed: 42 },
		signal: new AbortController().signal,
		onProgress: () => {},
		fetcher: async (_url, init) => {
			if (call++ === 0) {
				const form = /** @type {FormData} */ (init?.body);
				assert.deepEqual(JSON.parse(String(form.get('settings'))), {
					duration: '6s',
					resolution: '1080p',
					generate_audio: false,
					seed: 42
				});
				return response({ requestId: 'job', model: 'veo-3-1-video' }, 202);
			}
			return response({
				status: 'COMPLETED',
				video: 'https://storage.googleapis.com/falserverless/example.mp4'
			});
		}
	});
});

test('generation rejects invalid jobs, invalid images, and private endpoint failures', async () => {
	for (const { replies, pattern } of [
		{ replies: [{ requestId: '', model: 'flux-2' }], pattern: /invalid generation job/i },
		{ replies: [{ requestId: 'job', model: 'other' }], pattern: /invalid generation job/i },
		{
			replies: [
				{ requestId: 'job', model: 'flux-2' },
				{ status: 'COMPLETED', image: 'https://example.com/image' }
			],
			pattern: /invalid image/i
		},
		{
			replies: [{ requestId: 'job', model: 'flux-2' }, { status: 'UNKNOWN' }],
			pattern: /invalid generation progress/i
		}
	]) {
		let call = 0;
		await assert.rejects(
			runDrawingGeneration({
				image: new Blob(['image'], { type: 'image/jpeg' }),
				prompt: 'Edit',
				model: 'flux-2',
				signal: new AbortController().signal,
				onProgress: () => {},
				fetcher: async () => response(replies[call++])
			}),
			pattern
		);
	}
});

test('text-to-image queue jobs do not upload a selected image', async () => {
	let call = 0;
	const result = await runDrawingGeneration({
		prompt: 'A cinematic mountain landscape',
		model: 'flux-klein-9b-generate',
		signal: new AbortController().signal,
		onProgress: () => {},
		fetcher: async (_url, init) => {
			if (call++ === 0) {
				const form = /** @type {FormData} */ (init?.body);
				assert.equal(form.has('image'), false);
				return response({ requestId: 'job', model: 'flux-klein-9b-generate' }, 202);
			}
			return response({ status: 'COMPLETED', image: 'data:image/png;base64,ZWRpdGVk' });
		}
	});
	assert.equal(result.image, 'data:image/png;base64,ZWRpdGVk');
});

test('video queue jobs return playable provider URLs without treating them as canvas images', async () => {
	let call = 0;
	const result = await runDrawingGeneration({
		image: new Blob(['image'], { type: 'image/jpeg' }),
		prompt: 'Add a slow cinematic pan',
		model: 'grok-imagine-video',
		signal: new AbortController().signal,
		onProgress: () => {},
		fetcher: async () =>
			response(
				call++ === 0
					? { requestId: 'job', model: 'grok-imagine-video' }
					: { status: 'COMPLETED', video: 'https://v3b.fal.media/files/example/output.mp4' }
			)
	});
	assert.equal(result.video, 'https://v3b.fal.media/files/example/output.mp4');
	assert.equal('image' in result, false);
});

test('queued generation stops promptly when cancelled', async () => {
	const controller = new AbortController();
	let calls = 0;
	await assert.rejects(
		runDrawingGeneration({
			image: new Blob(['image'], { type: 'image/png' }),
			prompt: 'Edit',
			model: 'flux-2',
			signal: controller.signal,
			onProgress: (progress) => {
				if (progress.status === 'IN_PROGRESS') controller.abort();
			},
			fetcher: async () =>
				calls++ === 0
					? response({ requestId: 'job', model: 'flux-2' })
					: response({ status: 'IN_PROGRESS' })
		}),
		{ name: 'AbortError' }
	);
	assert.equal(calls, 2);
});

test('stopping an autonomous generation cancels its existing fal queue job without resubmitting', async () => {
	const controller = new AbortController();
	/** @type {Array<[RequestInfo | URL, RequestInit | undefined]>} */
	const calls = [];
	/** @type {Array<[string, number]>} */
	const budgets = [];
	await assert.rejects(
		runDrawingGeneration({
			image: new Blob(['image'], { type: 'image/png' }),
			prompt: 'Edit',
			model: 'flux-2',
			signal: controller.signal,
			providerSafetyDefaults: true,
			agentBudget: 'signed-start',
			onBudget: (token, spending) => budgets.push([token, spending]),
			cancelOnAbort: true,
			onProgress: (progress) => {
				if (progress.status === 'IN_PROGRESS') controller.abort();
			},
			fetcher: async (url, init) => {
				calls.push([url, init]);
				if (init?.method === 'POST') {
					assert.equal(/** @type {FormData} */ (init.body).get('agentBudget'), 'signed-start');
					return response(
						{
							requestId: 'job-123',
							model: 'flux-2',
							agentBudget: 'signed-next',
							spendingUsd: 0.024
						},
						202
					);
				}
				if (init?.method === 'DELETE') return response({ cancelled: true });
				return response({ status: 'IN_PROGRESS' });
			}
		}),
		{ name: 'AbortError' }
	);
	assert.deepEqual(budgets, [['signed-next', 0.024]]);
	assert.equal(calls.filter(([, init]) => init?.method === 'POST').length, 1);
	const cancellation = calls.find(([, init]) => init?.method === 'DELETE');
	assert.ok(cancellation);
	assert.equal(cancellation[0], '/tools/api/draw/edit?requestId=job-123&model=flux-2');
	assert.equal(cancellation[1]?.keepalive, true);
});

test('a stalled queue poll is retried without resubmitting the paid generation', async () => {
	let calls = 0;
	/** @type {{status: string, message?: string, elapsedMs?: number}[]} */
	const progress = [];
	const result = await runDrawingGeneration({
		image: new Blob(['image'], { type: 'image/png' }),
		prompt: 'Edit',
		model: 'flux-2',
		signal: new AbortController().signal,
		requestTimeoutMs: 5,
		maxGenerationMs: 1_000,
		pollIntervalMs: 0,
		onProgress: (update) => progress.push(update),
		fetcher: async (_url, init) => {
			calls += 1;
			if (calls === 1) return response({ requestId: 'job', model: 'flux-2' }, 202);
			if (calls === 2) {
				return new Promise((resolve, reject) => {
					const signal = /** @type {AbortSignal} */ (init?.signal);
					const pendingRequest = setTimeout(() => {}, 100);
					signal.addEventListener(
						'abort',
						() => {
							clearTimeout(pendingRequest);
							reject(signal.reason);
						},
						{ once: true }
					);
				});
			}
			return response({ status: 'COMPLETED', image: 'data:image/png;base64,ZWRpdGVk' });
		}
	});

	assert.equal(calls, 3);
	assert.equal(result.image, 'data:image/png;base64,ZWRpdGVk');
	assert.ok(
		progress.some(
			(update) =>
				update.status === 'IN_PROGRESS' &&
				update.message === 'Still waiting for the model to respond' &&
				typeof update.elapsedMs === 'number'
		)
	);
});

test('client transmits repeated multipart images in order with original long prompt and user/run authorization', async () => {
	let calls = 0;
	const images = [
		new Blob(['first'], { type: 'image/png' }),
		new Blob(['parent'], { type: 'image/jpeg' })
	];
	const prompt = '  ' + 'x'.repeat(31_995) + '  ';
	const result = await runDrawingGeneration({
		images,
		prompt,
		model: 'gpt-image-2',
		userId: 'current-user',
		runId: 'run',
		clientJobId: 'job',
		runLimitUsd: 1,
		signal: new AbortController().signal,
		onProgress() {},
		fetcher: async (_url, init) => {
			calls++;
			assert.equal(new Headers(init.headers).get('X-Tools-User'), 'current-user');
			if (calls === 1) {
				assert.deepEqual(await Promise.all(init.body.getAll('image').map((part) => part.text())), [
					'first',
					'parent'
				]);
				assert.equal(init.body.get('prompt'), prompt);
				assert.equal(init.body.get('runId'), 'run');
				assert.equal(init.body.get('clientJobId'), 'job');
				return response({ requestId: 'job', model: 'gpt-image-2' }, 202);
			}
			return response({ status: 'COMPLETED', image: 'data:image/png;base64,eA==' });
		}
	});
	assert.equal(result.image, 'data:image/png;base64,eA==');
	assert.equal(calls, 2);
});

test('client rejects ambiguous image APIs, incompatible counts, long prompt overflow and combined bytes before dispatch', async () => {
	const image = new Blob(['x'], { type: 'image/png' });
	for (const overrides of [
		{ image, images: [] },
		{ images: Array(17).fill(image) },
		{ images: [image, image], model: 'reve-2-1' },
		{ images: [image], model: 'flux-klein-9b-generate' },
		{ images: [image], prompt: 'x'.repeat(32_001) },
		{
			images: [
				new Blob([new Uint8Array(6_000_000)], { type: 'image/png' }),
				new Blob([new Uint8Array(6_000_000)], { type: 'image/png' })
			]
		}
	])
		await assert.rejects(
			runDrawingGeneration({
				prompt: 'Edit',
				model: 'gpt-image-2',
				signal: new AbortController().signal,
				onProgress() {},
				fetcher: async () => assert.fail('Invalid request dispatched'),
				...overrides
			})
		);
});
