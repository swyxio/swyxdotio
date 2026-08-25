/// <reference lib="webworker" />

import {
	blendDepthBlur,
	boxBlur,
	clamp,
	createInpaintingInput,
	createVectorSvg,
	strongestMaskIndex
} from './draw-image-processing.js';

/** @typedef {import('./draw-image-tools.js').DrawImageTool} DrawImageTool */
/** @typedef {import('./draw-image-tools.js').DrawImageToolOptions} DrawImageToolOptions */
/** @typedef {import('./draw-image-tools.js').DrawImageToolProgress} DrawImageToolProgress */

const SAM_MODEL = 'Xenova/slimsam-77-uniform';
const DEPTH_MODEL = 'onnx-community/depth-anything-v2-small';
const INPAINTING_URL = 'https://huggingface.co/g-ronimo/lama/resolve/main/lama_512_int8.onnx';
const INPAINTING_BYTES = 62_074_990;
const INPAINTING_SIZE = 512;
const VECTOR_SAMPLE_EDGE = 144;

/** @type {Map<DrawImageTool, Promise<any>>} */
const loadedModels = new Map();

/** @type {Set<string>} */
const cancelledOperations = new Set();

/** @type {Promise<void>} */
let operationQueue = Promise.resolve();

/** @param {string} id */
function throwIfCancelled(id) {
	if (cancelledOperations.has(id)) {
		throw new DOMException('Image processing was cancelled.', 'AbortError');
	}
}

/** @param {string} id @param {DrawImageToolProgress} update */
function report(id, update) {
	if (cancelledOperations.has(id)) return;
	const percent =
		typeof update.percent === 'number' ? clamp(Math.round(update.percent), 0, 100) : undefined;
	self.postMessage({
		id,
		type: 'progress',
		progress: {
			...update,
			...(percent === undefined ? {} : { percent, progress: percent / 100 }),
			...(update.message ? { label: update.message } : {})
		}
	});
}

/** @param {string} id @param {string} label @param {number} expectedBytes */
function createModelProgress(id, label, expectedBytes) {
	/** @type {Map<string, number>} */
	const loadedFiles = new Map();
	/** @param {import('@huggingface/transformers').ProgressInfo} update */
	return (update) => {
		if (update.status !== 'progress' && update.status !== 'progress_total') return;
		if ('file' in update && update.file && !update.file.endsWith('.onnx')) return;
		const filename = 'file' in update && update.file ? update.file : 'model.onnx';
		loadedFiles.set(filename, Number(update.loaded) || 0);
		const loaded = [...loadedFiles.values()].reduce((total, value) => total + value, 0);
		const total = Math.max(expectedBytes, Number(update.total) || 0, loaded);
		report(id, {
			phase: 'download',
			loaded,
			total,
			percent: total > 0 ? (loaded / total) * 100 : undefined,
			message: `Downloading the ${label} model (${(expectedBytes / 1_000_000).toFixed(1)} MB)…`
		});
	};
}

async function supportsWebGpu() {
	const browser = /** @type {Navigator & {
		gpu?: { requestAdapter: () => Promise<unknown> }
	}} */ (self.navigator);
	if (!browser.gpu) return false;
	try {
		return Boolean(await browser.gpu.requestAdapter());
	} catch {
		return false;
	}
}

/**
 * @template T
 * @param {string} id
 * @param {(device: 'webgpu' | 'wasm') => Promise<T>} initialize
 */
async function withPreferredDevice(id, initialize) {
	if (await supportsWebGpu()) {
		try {
			return await initialize('webgpu');
		} catch (error) {
			throwIfCancelled(id);
			console.warn('Local image model could not initialize WebGPU; using browser CPU.', error);
			report(id, {
				phase: 'processing',
				message: 'GPU acceleration is unavailable. Continuing on your device…'
			});
		}
	}
	return initialize('wasm');
}

/** @param {string} id */
async function loadSam(id) {
	const { AutoProcessor, SamModel, env } = await import('@huggingface/transformers');
	if (env.backends.onnx?.wasm) env.backends.onnx.wasm.numThreads = 1;
	const progress_callback = createModelProgress(id, 'Magic Select', 13_785_975);
	return withPreferredDevice(id, async (device) => {
		const [model, processor] = await Promise.all([
			SamModel.from_pretrained(SAM_MODEL, { dtype: 'q8', device, progress_callback }),
			AutoProcessor.from_pretrained(SAM_MODEL)
		]);
		return { model, processor };
	});
}

/** @param {string} id */
async function loadDepth(id) {
	const { env, pipeline } = await import('@huggingface/transformers');
	if (env.backends.onnx?.wasm) env.backends.onnx.wasm.numThreads = 1;
	return withPreferredDevice(id, (device) =>
		pipeline('depth-estimation', DEPTH_MODEL, {
			dtype: 'q8',
			device,
			progress_callback: createModelProgress(id, 'Depth Blur', 27_258_801)
		})
	);
}

/** @param {string} id */
async function downloadInpaintingModel(id) {
	let cache;
	try {
		cache = await self.caches?.open('swyx-draw-image-models-v1');
		const cached = await cache?.match(INPAINTING_URL);
		if (cached) {
			report(id, {
				phase: 'download',
				loaded: INPAINTING_BYTES,
				total: INPAINTING_BYTES,
				percent: 100,
				message: 'Loading the cached Magic Eraser model…'
			});
			return new Uint8Array(await cached.arrayBuffer());
		}
	} catch {
		// Private browsing may disallow Cache Storage; inference still works.
		cache = undefined;
	}

	const response = await fetch(INPAINTING_URL);
	if (!response.ok) {
		throw new Error(`Could not download the Magic Eraser model (${response.status}).`);
	}
	const total = Number(response.headers.get('content-length')) || INPAINTING_BYTES;
	const reader = response.body?.getReader();
	if (!reader) {
		const bytes = new Uint8Array(await response.arrayBuffer());
		try {
			await cache?.put(INPAINTING_URL, new Response(bytes));
		} catch {
			// Storage quota should not prevent using the downloaded model.
		}
		return bytes;
	}

	/** @type {Uint8Array[]} */
	const chunks = [];
	let loaded = 0;
	while (true) {
		throwIfCancelled(id);
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		loaded += value.byteLength;
		report(id, {
			phase: 'download',
			loaded,
			total,
			percent: (loaded / total) * 100,
			message: 'Downloading the Magic Eraser model (62.1 MB)…'
		});
	}

	const bytes = new Uint8Array(loaded);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	try {
		await cache?.put(INPAINTING_URL, new Response(bytes));
	} catch {
		// Cache quota must not discard a successful download.
	}
	return bytes;
}

/** @param {string} id */
async function loadInpainter(id) {
	const runtime = await import('onnxruntime-web/webgpu');
	runtime.env.wasm.numThreads = 1;
	const bytes = await downloadInpaintingModel(id);
	return withPreferredDevice(id, async (device) => {
		const session = await runtime.InferenceSession.create(bytes, {
			executionProviders: [device],
			graphOptimizationLevel: 'all'
		});
		return { session, Tensor: runtime.Tensor };
	});
}

/**
 * @param {DrawImageTool} action
 * @param {string} id
 */
function getModel(action, id) {
	const existing = loadedModels.get(action);
	if (existing) return existing;

	const initialize =
		action === 'magic-select'
			? loadSam(id)
			: action === 'magic-eraser'
				? loadInpainter(id)
				: loadDepth(id);
	const model = initialize.catch((error) => {
		loadedModels.delete(action);
		throw error;
	});
	loadedModels.set(action, model);
	return model;
}

/** @param {number} width @param {number} height */
function createCanvas(width, height) {
	if (typeof OffscreenCanvas === 'undefined') {
		throw new Error('Local image processing requires OffscreenCanvas browser support.');
	}
	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) throw new Error('Could not create an image-processing canvas.');
	return { canvas, context };
}

/** @param {string} id @param {Blob} image @param {DrawImageToolOptions} options */
async function selectObject(id, image, options) {
	const { model, processor } = await getModel('magic-select', id);
	throwIfCancelled(id);
	report(id, { phase: 'processing', percent: 25, message: 'Locating the selected object…' });
	const { RawImage } = await import('@huggingface/transformers');
	const original = await RawImage.fromBlob(image);
	const point = options.point ?? { x: 0.5, y: 0.5 };
	const x = clamp(point.x, 0, 1) * Math.max(0, original.width - 1);
	const y = clamp(point.y, 0, 1) * Math.max(0, original.height - 1);
	const inputs = await processor(original, { input_points: [[[x, y]]] });
	throwIfCancelled(id);
	report(id, { phase: 'processing', percent: 55, message: 'Creating an accurate object mask…' });
	const outputs = await model(inputs);
	const masks = await processor.post_process_masks(
		outputs.pred_masks,
		inputs.original_sizes,
		inputs.reshaped_input_sizes
	);
	const mask = masks[0];
	if (!mask) throw new Error('Magic Select could not identify an object in the image.');
	const selected = strongestMaskIndex(outputs.iou_scores.data);
	const area = original.width * original.height;
	const pixels = new Uint8ClampedArray(original.clone().rgba().data);
	for (let index = 0; index < area; index += 1) {
		if (!mask.data[selected * area + index]) pixels[index * 4 + 3] = 0;
	}
	const { canvas, context } = createCanvas(original.width, original.height);
	context.putImageData(new ImageData(pixels, original.width, original.height), 0, 0);
	return canvas.convertToBlob({ type: 'image/png' });
}

/**
 * @param {DrawImageToolOptions} options
 * @returns {Promise<Uint8Array>}
 */
async function createEraserMask(options) {
	const area = INPAINTING_SIZE * INPAINTING_SIZE;
	const mask = new Uint8Array(area);
	if (options.mask instanceof Blob) {
		const bitmap = await createImageBitmap(options.mask);
		const { context } = createCanvas(INPAINTING_SIZE, INPAINTING_SIZE);
		context.drawImage(bitmap, 0, 0, INPAINTING_SIZE, INPAINTING_SIZE);
		bitmap.close();
		const pixels = context.getImageData(0, 0, INPAINTING_SIZE, INPAINTING_SIZE).data;
		for (let index = 0; index < area; index += 1) {
			const pixel = index * 4;
			const brightness = (pixels[pixel] + pixels[pixel + 1] + pixels[pixel + 2]) / 3;
			mask[index] = pixels[pixel + 3] > 24 && brightness > 80 ? 1 : 0;
		}
		return mask;
	}

	const point = options.point ?? { x: 0.5, y: 0.5 };
	const x = clamp(point.x, 0, 1) * (INPAINTING_SIZE - 1);
	const y = clamp(point.y, 0, 1) * (INPAINTING_SIZE - 1);
	const radius = clamp(options.radius ?? 0.09, 0.01, 0.45) * INPAINTING_SIZE;
	const squaredRadius = radius * radius;
	for (let row = 0; row < INPAINTING_SIZE; row += 1) {
		for (let column = 0; column < INPAINTING_SIZE; column += 1) {
			mask[row * INPAINTING_SIZE + column] =
				(column - x) ** 2 + (row - y) ** 2 <= squaredRadius ? 1 : 0;
		}
	}
	return mask;
}

/** @param {string} id @param {Blob} image @param {DrawImageToolOptions} options */
async function eraseObject(id, image, options) {
	const { session, Tensor } = await getModel('magic-eraser', id);
	throwIfCancelled(id);
	report(id, { phase: 'processing', percent: 20, message: 'Preparing the eraser brush…' });
	const original = await createImageBitmap(image);
	const { canvas: reducedCanvas, context: reducedContext } = createCanvas(
		INPAINTING_SIZE,
		INPAINTING_SIZE
	);
	reducedContext.drawImage(original, 0, 0, INPAINTING_SIZE, INPAINTING_SIZE);
	const source = reducedContext.getImageData(0, 0, INPAINTING_SIZE, INPAINTING_SIZE);
	const mask = await createEraserMask(options);
	const input = createInpaintingInput(source.data, mask);
	throwIfCancelled(id);
	report(id, { phase: 'processing', percent: 45, message: 'Rebuilding the erased area locally…' });
	const outputs = await session.run({
		input: new Tensor('float32', input, [1, 4, INPAINTING_SIZE, INPAINTING_SIZE])
	});
	const result = outputs.output ?? outputs[session.outputNames[0]];
	if (!result) throw new Error('Magic Eraser returned no repaired image.');
	const area = INPAINTING_SIZE * INPAINTING_SIZE;
	const repaired = new Uint8ClampedArray(area * 4);
	for (let index = 0; index < area; index += 1) {
		for (let channel = 0; channel < 3; channel += 1) {
			repaired[index * 4 + channel] = clamp(
				Math.round(Number(result.data[channel * area + index]) * 255),
				0,
				255
			);
		}
		repaired[index * 4 + 3] = mask[index] ? 255 : 0;
	}
	reducedContext.putImageData(new ImageData(repaired, INPAINTING_SIZE, INPAINTING_SIZE), 0, 0);
	const { canvas, context } = createCanvas(original.width, original.height);
	context.drawImage(original, 0, 0);
	context.drawImage(reducedCanvas, 0, 0, original.width, original.height);
	original.close();
	return canvas.convertToBlob({ type: 'image/png' });
}

/** @param {string} id @param {Blob} image @param {DrawImageToolOptions} options */
async function createDepthBlur(id, image, options) {
	const estimateDepth = await getModel('depth-blur', id);
	throwIfCancelled(id);
	report(id, { phase: 'processing', percent: 25, message: 'Estimating image depth…' });
	const { RawImage } = await import('@huggingface/transformers');
	const original = await RawImage.fromBlob(image);
	const prediction = await estimateDepth(original);
	const depth = prediction.depth;
	if (!depth) throw new Error('Depth Blur could not create a depth map.');
	throwIfCancelled(id);
	report(id, { phase: 'processing', percent: 70, message: 'Applying depth-aware lens blur…' });
	const pixels = new Uint8ClampedArray(original.clone().rgba().data);
	const radius = clamp(Math.round(options.blur ?? 12), 1, 40);
	const blurred = boxBlur(pixels, original.width, original.height, radius);
	const output = blendDepthBlur(pixels, blurred, depth.data, options.focus ?? 0.7);
	const { canvas, context } = createCanvas(original.width, original.height);
	context.putImageData(new ImageData(output, original.width, original.height), 0, 0);
	return canvas.convertToBlob({ type: 'image/png' });
}

/** @param {string} id @param {Blob} image @param {DrawImageToolOptions} options */
async function createVectors(id, image, options) {
	report(id, { phase: 'processing', percent: 15, message: 'Analyzing image colors…' });
	const original = await createImageBitmap(image);
	const scale = Math.min(1, VECTOR_SAMPLE_EDGE / Math.max(original.width, original.height));
	const width = Math.max(1, Math.round(original.width * scale));
	const height = Math.max(1, Math.round(original.height * scale));
	const { context } = createCanvas(width, height);
	context.drawImage(original, 0, 0, width, height);
	const pixels = context.getImageData(0, 0, width, height).data;
	throwIfCancelled(id);
	report(id, { phase: 'processing', percent: 50, message: 'Tracing editable vector shapes…' });
	const svg = createVectorSvg(pixels, width, height, {
		width: original.width,
		height: original.height,
		colors: options.colors
	});
	original.close();
	return new Blob([svg], { type: 'image/svg+xml' });
}

/** @param {string} id @param {DrawImageTool} action @param {Blob} image @param {DrawImageToolOptions} options */
async function processImage(id, action, image, options) {
	try {
		throwIfCancelled(id);
		if (action !== 'vectorize') {
			report(id, {
				phase: 'download',
				percent: 0,
				message: 'Preparing the private, on-device image model…'
			});
		}
		const result =
			action === 'magic-select'
				? await selectObject(id, image, options)
				: action === 'magic-eraser'
					? await eraseObject(id, image, options)
					: action === 'depth-blur'
						? await createDepthBlur(id, image, options)
						: await createVectors(id, image, options);
		throwIfCancelled(id);
		report(id, { phase: 'processing', percent: 100, message: 'Your image is ready.' });
		self.postMessage({ id, type: 'result', image: result });
	} catch (error) {
		self.postMessage(
			cancelledOperations.has(id) || (error instanceof Error && error.name === 'AbortError')
				? { id, type: 'aborted' }
				: {
						id,
						type: 'error',
						message: error instanceof Error ? error.message : 'The image could not be processed.'
					}
		);
	} finally {
		cancelledOperations.delete(id);
	}
}

/** @param {MessageEvent<{
 *   type: 'process' | 'abort';
 *   id: string;
 *   action: DrawImageTool;
 *   image?: Blob;
 *   options?: DrawImageToolOptions;
 * }>} event */
self.addEventListener('message', ({ data }) => {
	if (data.type === 'abort') {
		cancelledOperations.add(data.id);
		return;
	}
	if (!(data.image instanceof Blob)) {
		self.postMessage({ id: data.id, type: 'error', message: 'The selected image is invalid.' });
		return;
	}
	const image = data.image;
	operationQueue = operationQueue.then(() =>
		processImage(data.id, data.action, image, data.options ?? {})
	);
});
