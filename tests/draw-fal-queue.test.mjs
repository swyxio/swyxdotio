import assert from 'node:assert/strict';
import test from 'node:test';

import { runDrawingFalGeneration } from '../src/lib/draw-fal-queue.js';

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
	const result = await runDrawingFalGeneration({
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
			runDrawingFalGeneration({
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
	const result = await runDrawingFalGeneration({
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
	const result = await runDrawingFalGeneration({
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
		runDrawingFalGeneration({
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
