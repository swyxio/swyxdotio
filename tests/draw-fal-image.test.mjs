import assert from 'node:assert/strict';
import test from 'node:test';

import {
	drawingGenerationInputDimensions,
	estimateDrawingGenerationUploadBytes
} from '../src/lib/draw-generation-image.js';
import { DRAW_FAL_MODELS, MAX_DRAW_FAL_REQUEST_BYTES } from '../src/lib/draw-fal-models.js';

test('each configured model has an explicit documented resolution and image-format budget', () => {
	assert.equal(MAX_DRAW_FAL_REQUEST_BYTES, 12_000_000);
	for (const model of DRAW_FAL_MODELS) {
		assert.ok(model.workflow.length > 5, model.id);
		assert.ok(model.input.maxPixels >= 1_048_576, model.id);
		assert.ok(model.input.maxEdge <= 2048, model.id);
		assert.ok(['image/jpeg', 'image/webp'].includes(model.input.mimeType), model.id);
	}
	assert.equal(
		DRAW_FAL_MODELS.find((model) => model.id === 'seedream-5-pro')?.input.mimeType,
		'image/jpeg'
	);
	assert.equal(
		DRAW_FAL_MODELS.find((model) => model.id === 'gpt-image-2')?.input.maxPixels,
		1_572_864
	);
});

test('large references downsize to each model budget while retaining their aspect ratio', () => {
	for (const model of DRAW_FAL_MODELS) {
		for (const source of [
			{ width: 6000, height: 4000 },
			{ width: 1600, height: 4000 },
			{ width: 8000, height: 1000 }
		]) {
			const resized = drawingGenerationInputDimensions(source.width, source.height, model);
			assert.ok(resized.width <= model.input.maxEdge, `${model.id} width`);
			assert.ok(resized.height <= model.input.maxEdge, `${model.id} height`);
			assert.ok(resized.width * resized.height <= model.input.maxPixels, `${model.id} pixels`);
			assert.ok(
				Math.abs(resized.width / resized.height - source.width / source.height) < 0.04,
				`${model.id} aspect ratio`
			);
		}
	}
});

test('small references retain their original dimensions instead of being upscaled', () => {
	for (const model of DRAW_FAL_MODELS) {
		assert.deepEqual(drawingGenerationInputDimensions(420, 280, model), {
			width: 420,
			height: 280
		});
	}
});

test('invalid reference dimensions are rejected before upload', () => {
	const model = DRAW_FAL_MODELS[0];
	for (const [width, height] of [
		[0, 300],
		[300, -1],
		[Infinity, 300],
		[300, NaN]
	]) {
		assert.throws(
			() => drawingGenerationInputDimensions(width, height, model),
			/invalid dimensions/i
		);
	}
});

test('binary upload budgets count raw image bytes, UTF-8 fields, and multipart headroom', () => {
	const request = {
		imageBytes: 2_000_000,
		prompt: 'Preserve the subject ✨',
		model: 'flux-2'
	};
	assert.equal(
		estimateDrawingGenerationUploadBytes(request),
		2_000_000 + new TextEncoder().encode(request.prompt).byteLength + request.model.length + 8192
	);
	assert.ok(
		estimateDrawingGenerationUploadBytes({ ...request, prompt: 'a'.repeat(1000) }) > 2_009_000
	);
});

test('reference preparation obeys its allocated share of a multi-image upload instead of the full request ceiling', async (t) => {
	const { prepareDrawingGenerationImage } = await import('../src/lib/draw-generation-image.js');
	const originalBitmap = globalThis.createImageBitmap;
	const originalCanvas = globalThis.OffscreenCanvas;
	let closed = false;
	globalThis.createImageBitmap = async () => ({
		width: 640,
		height: 360,
		close() {
			closed = true;
		}
	});
	globalThis.OffscreenCanvas = class {
		getContext() {
			return { drawImage() {} };
		}
		async convertToBlob() {
			return new Blob([new Uint8Array(1000)], { type: 'image/webp' });
		}
	};
	t.after(() => {
		globalThis.createImageBitmap = originalBitmap;
		globalThis.OffscreenCanvas = originalCanvas;
	});
	const prepared = await prepareDrawingGenerationImage({
		dataURL: `data:image/webp;base64,${'a'.repeat(30_000)}`,
		prompt: 'Keep this subject',
		model: DRAW_FAL_MODELS[0],
		maxUploadBytes: 15_000
	});
	assert.equal(
		prepared.optimized,
		true,
		'the original fits12MB but not its allocated reference budget'
	);
	assert.equal(prepared.blob.size, 1000);
	assert.equal(prepared.originalWidth, 640);
	assert.equal(prepared.originalHeight, 360);
	assert.equal(closed, true);
});
