import assert from 'node:assert/strict';
import test from 'node:test';

import {
	drawingFalInputDimensions,
	estimateDrawingFalUploadBytes
} from '../src/lib/draw-fal-image.js';
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
			const resized = drawingFalInputDimensions(source.width, source.height, model);
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
		assert.deepEqual(drawingFalInputDimensions(420, 280, model), { width: 420, height: 280 });
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
		assert.throws(() => drawingFalInputDimensions(width, height, model), /invalid dimensions/i);
	}
});

test('binary upload budgets count raw image bytes, UTF-8 fields, and multipart headroom', () => {
	const request = {
		imageBytes: 2_000_000,
		prompt: 'Preserve the subject ✨',
		model: 'flux-2'
	};
	assert.equal(
		estimateDrawingFalUploadBytes(request),
		2_000_000 + new TextEncoder().encode(request.prompt).byteLength + request.model.length + 8192
	);
	assert.ok(estimateDrawingFalUploadBytes({ ...request, prompt: 'a'.repeat(1000) }) > 2_009_000);
});
