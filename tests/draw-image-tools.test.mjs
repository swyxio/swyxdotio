import assert from 'node:assert/strict';
import test from 'node:test';

import {
	blendDepthBlur,
	boxBlur,
	createInpaintingInput,
	createVectorSvg,
	strongestMaskIndex
} from '../src/lib/draw-image-processing.js';

/** @type {typeof Worker | undefined} */
const originalWorker = globalThis.Worker;

class FakeWorker extends EventTarget {
	static instances = [];

	/** @param {URL} url @param {WorkerOptions} options */
	constructor(url, options) {
		super();
		this.url = url;
		this.options = options;
		this.messages = [];
		this.terminated = false;
		FakeWorker.instances.push(this);
	}

	/** @param {unknown} message */
	postMessage(message) {
		this.messages.push(message);
	}

	terminate() {
		this.terminated = true;
	}

	/** @param {unknown} data */
	emit(data) {
		this.dispatchEvent(new MessageEvent('message', { data }));
	}
}

test.after(() => {
	if (originalWorker === undefined) delete globalThis.Worker;
	else globalThis.Worker = originalWorker;
});

test('tool metadata describes exact independently downloaded permissive model weights', async () => {
	const { DRAW_IMAGE_TOOLS } = await import('../src/lib/draw-image-tools.js?metadata');
	assert.equal(DRAW_IMAGE_TOOLS['magic-select'].downloadBytes, 13_785_975);
	assert.equal(DRAW_IMAGE_TOOLS['magic-select'].size, '13.8 MB');
	assert.equal(DRAW_IMAGE_TOOLS['magic-eraser'].downloadBytes, 62_074_990);
	assert.equal(DRAW_IMAGE_TOOLS['depth-blur'].downloadBytes, 27_258_801);
	assert.equal(DRAW_IMAGE_TOOLS.vectorize.downloadBytes, 0);
	assert.equal(DRAW_IMAGE_TOOLS.vectorize.model, null);
	for (const tool of Object.values(DRAW_IMAGE_TOOLS)) {
		assert.equal(tool.id in DRAW_IMAGE_TOOLS, true);
		if (tool.model) assert.equal(tool.license, 'Apache-2.0');
	}
});

test('image tools lazily reuse one private module worker and preserve action settings', async () => {
	FakeWorker.instances.length = 0;
	globalThis.Worker = /** @type {typeof Worker} */ (/** @type {unknown} */ (FakeWorker));
	const { magicSelectImage, vectorizeImage } =
		await import('../src/lib/draw-image-tools.js?worker');
	assert.equal(FakeWorker.instances.length, 0);

	const input = new Blob(['original image'], { type: 'image/jpeg' });
	const selected = new Blob(['selection'], { type: 'image/png' });
	const updates = [];
	const pending = magicSelectImage(input, {
		point: { x: 0.25, y: 0.75 },
		onProgress: (update) => updates.push(update)
	});
	assert.equal(FakeWorker.instances.length, 1);
	const worker = FakeWorker.instances[0];
	assert.equal(worker.options.type, 'module');
	assert.match(worker.url.pathname, /draw-image-tools\.worker\.js$/);
	const request = worker.messages[0];
	assert.equal(request.action, 'magic-select');
	assert.equal(request.image, input);
	assert.deepEqual(request.options, { point: { x: 0.25, y: 0.75 } });

	worker.emit({
		id: request.id,
		type: 'progress',
		progress: { phase: 'download', loaded: 5, total: 10, percent: 50 }
	});
	worker.emit({ id: request.id, type: 'result', image: selected });
	assert.equal(await pending, selected);
	assert.deepEqual(updates, [{ phase: 'download', loaded: 5, total: 10, percent: 50 }]);

	const svg = new Blob(['<svg/>'], { type: 'image/svg+xml' });
	const vectorized = vectorizeImage(input, { colors: 5 });
	assert.equal(FakeWorker.instances.length, 1);
	assert.equal(worker.messages[1].action, 'vectorize');
	worker.emit({ id: worker.messages[1].id, type: 'result', image: svg });
	assert.equal(await vectorized, svg);
});

test('image tools cancel operations without uploading the selected image', async () => {
	FakeWorker.instances.length = 0;
	globalThis.Worker = /** @type {typeof Worker} */ (/** @type {unknown} */ (FakeWorker));
	const { magicEraseImage } = await import('../src/lib/draw-image-tools.js?abort');
	const controller = new AbortController();
	const pending = magicEraseImage(new Blob(['image']), {
		point: { x: 0.5, y: 0.5 },
		radius: 0.12,
		signal: controller.signal
	});
	const worker = FakeWorker.instances[0];
	const request = worker.messages[0];
	controller.abort();
	await assert.rejects(pending, { name: 'AbortError' });
	assert.deepEqual(worker.messages[1], { type: 'abort', id: request.id });
	await assert.rejects(magicEraseImage(new Blob(['image']), { signal: controller.signal }), {
		name: 'AbortError'
	});
});

test('image tools reject invalid requests and surface clear model failures', async () => {
	FakeWorker.instances.length = 0;
	globalThis.Worker = /** @type {typeof Worker} */ (/** @type {unknown} */ (FakeWorker));
	const { depthBlurImage, processImageTool } =
		await import('../src/lib/draw-image-tools.js?errors');
	await assert.rejects(
		processImageTool(/** @type {any} */ ('unknown'), new Blob(['image'])),
		/unknown image tool/i
	);
	await assert.rejects(depthBlurImage(/** @type {any} */ ('image')), /image Blob/i);
	await assert.rejects(depthBlurImage(new Blob()), /selected image is empty/i);

	const pending = depthBlurImage(new Blob(['image']), { blur: 18, focus: 0.8 });
	const worker = FakeWorker.instances[0];
	worker.emit({
		id: worker.messages[0].id,
		type: 'error',
		message: 'The depth model could not be downloaded.'
	});
	await assert.rejects(pending, /depth model could not be downloaded/i);
});

test('Magic Select chooses the most confident model mask', () => {
	assert.equal(strongestMaskIndex(new Float32Array([0.72, 0.97, 0.81])), 1);
	assert.equal(strongestMaskIndex(new Float32Array([0.99, 0.3, 0.2])), 0);
});

test('Magic Eraser packs the exact LaMa ONNX image and binary-mask tensor contract', () => {
	const pixels = new Uint8ClampedArray([255, 128, 0, 255, 12, 34, 56, 255]);
	const tensor = createInpaintingInput(pixels, new Uint8Array([0, 1]));
	assert.deepEqual([...tensor], [1, 0, 128 / 255, 0, 0, 0, 0, 1].map(Math.fround));
	assert.throws(() => createInpaintingInput(pixels, new Uint8Array([0])), /dimensions/);
});

test('Depth Blur preserves original alpha and keeps the selected focal plane sharp', () => {
	const sharp = new Uint8ClampedArray([100, 120, 140, 64, 255, 10, 20, 200]);
	const blurry = new Uint8ClampedArray([5, 5, 5, 255, 20, 30, 40, 255]);
	const output = blendDepthBlur(sharp, blurry, new Uint8Array([128, 0]), 128 / 255);
	assert.deepEqual([...output.slice(0, 4)], [100, 120, 140, 64]);
	assert.deepEqual([...output.slice(4)], [20, 30, 40, 200]);
	assert.throws(() => blendDepthBlur(sharp, blurry, new Uint8Array([0]), 0.5), /dimensions/);
});

test('portable blur spreads neighboring colors while preserving canvas dimensions', () => {
	const pixels = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255]);
	const blurred = boxBlur(pixels, 3, 1, 1);
	assert.equal(blurred.length, pixels.length);
	assert.equal(blurred[0], 85);
	assert.equal(blurred[4], 85);
	assert.equal(blurred[8], 85);
	assert.equal(blurred[3], 255);
});

test('vectorization creates compact true SVG paths and preserves source dimensions', () => {
	const pixels = new Uint8ClampedArray([
		255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 255, 255, 0, 0, 255, 255, 0, 0, 255,
		0, 0, 255, 255, 0, 0, 255, 255
	]);
	const svg = createVectorSvg(pixels, 4, 2, { width: 1920, height: 960, colors: 2 });
	assert.match(svg, /^<svg /);
	assert.match(svg, /width="1920" height="960" viewBox="0 0 4 2"/);
	assert.match(svg, /<path fill="#ff0000"/);
	assert.match(svg, /<path fill="#0000ff"/);
	assert.match(svg, /M0 0h2v2h-2Z/);
	assert.doesNotMatch(svg, /<image|data:image/i);
	assert.ok(svg.length < 400);
	assert.throws(
		() => createVectorSvg(new Uint8ClampedArray([1]), 1, 1, { width: 1, height: 1 }),
		/dimensions/
	);
});

test('vectorization respects fully transparent images without embedding raster data', () => {
	const svg = createVectorSvg(new Uint8ClampedArray(16), 2, 2, {
		width: 800,
		height: 600
	});
	assert.match(svg, /width="800" height="600"/);
	assert.doesNotMatch(svg, /<path|<image/);
});
