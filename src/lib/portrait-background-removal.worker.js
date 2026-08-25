/// <reference lib="webworker" />

const MODEL_ID = 'Xenova/modnet';

/** @typedef {import('./portrait-background-removal.js').PortraitRemovalProgress} PortraitRemovalProgress */

/** @typedef {import('@huggingface/transformers').BackgroundRemovalPipeline} BackgroundRemovalPipeline */

/** @type {Promise<BackgroundRemovalPipeline> | undefined} */
let segmenterPromise;

/** @type {Promise<void>} */
let removalQueue = Promise.resolve();

/** @type {Set<string>} */
const cancelledRemovals = new Set();

/**
 * @param {string} id
 * @param {PortraitRemovalProgress} progress
 */
function reportProgress(id, progress) {
	if (cancelledRemovals.has(id)) return;
	const percent =
		typeof progress.percent === 'number' ? Math.max(0, Math.min(100, progress.percent)) : undefined;
	self.postMessage({
		id,
		type: 'progress',
		progress: {
			...progress,
			...(percent === undefined ? {} : { percent, progress: percent / 100 }),
			...(progress.message ? { label: progress.message } : {})
		}
	});
}

/** @param {string} id */
function throwIfCancelled(id) {
	if (cancelledRemovals.has(id)) {
		throw new DOMException('Portrait background removal was cancelled.', 'AbortError');
	}
}

/**
 * @param {string} id
 * @param {import('@huggingface/transformers').ProgressInfo} update
 */
function reportModelDownload(id, update) {
	if (update.status !== 'progress' && update.status !== 'progress_total') return;
	const percent = Number.isFinite(update.progress) ? update.progress : 0;
	reportProgress(id, {
		phase: 'download',
		percent,
		loaded: update.loaded,
		total: update.total,
		message: 'Downloading the portrait model (about 6.6 MB)…'
	});
}

/**
 * @param {string} id
 * @returns {Promise<BackgroundRemovalPipeline>}
 */
async function loadSegmenter(id) {
	const { env, pipeline } = await import('@huggingface/transformers');
	throwIfCancelled(id);

	// A single WASM thread works without cross-origin-isolation headers.
	if (env.backends.onnx?.wasm) env.backends.onnx.wasm.numThreads = 1;

	/** @type {import('@huggingface/transformers').PretrainedModelOptions} */
	const options = {
		dtype: 'q8',
		progress_callback: (update) => reportModelDownload(id, update)
	};

	const workerNavigator = /** @type {Navigator & {
		gpu?: { requestAdapter: () => Promise<unknown> }
	}} */ (self.navigator);
	let supportsWebGPU = false;
	if (workerNavigator.gpu) {
		try {
			supportsWebGPU = Boolean(await workerNavigator.gpu.requestAdapter());
		} catch {
			// Permission, browser, or driver issues simply select the WASM backend.
		}
	}

	if (supportsWebGPU) {
		try {
			return await pipeline('background-removal', MODEL_ID, { ...options, device: 'webgpu' });
		} catch (error) {
			throwIfCancelled(id);
			console.warn('Portrait model could not start WebGPU; using browser CPU instead.', error);
			reportProgress(id, {
				phase: 'processing',
				percent: 5,
				message: 'Starting the browser CPU background-removal model…'
			});
		}
	}

	return pipeline('background-removal', MODEL_ID, { ...options, device: 'wasm' });
}

/** @param {string} id */
function getSegmenter(id) {
	if (!segmenterPromise) {
		segmenterPromise = loadSegmenter(id).catch((error) => {
			segmenterPromise = undefined;
			throw error;
		});
	}
	return segmenterPromise;
}

/**
 * @param {import('@huggingface/transformers').RawImage} original
 * @param {import('@huggingface/transformers').RawImage | import('@huggingface/transformers').RawImage[]} result
 * @returns {Promise<Blob>}
 */
async function createTransparentPng(original, result) {
	let output = Array.isArray(result) ? result[0] : result;
	if (!output) throw new Error('The portrait model returned no image.');

	if (output.width !== original.width || output.height !== original.height) {
		output = await output.resize(original.width, original.height);
	}

	if (output.channels === 1) {
		const portrait = original.clone().rgba();
		portrait.putAlpha(output);
		output = portrait;
	} else if (output.channels !== 4) {
		output = output.rgba();
	}

	if (typeof OffscreenCanvas === 'undefined') {
		throw new Error('Portrait background removal requires OffscreenCanvas support.');
	}

	const canvas = new OffscreenCanvas(original.width, original.height);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Could not create an image-processing canvas.');
	context.putImageData(
		new ImageData(new Uint8ClampedArray(output.data), original.width, original.height),
		0,
		0
	);
	return canvas.convertToBlob({ type: 'image/png' });
}

/**
 * @param {string} id
 * @param {Blob} image
 */
async function removeBackground(id, image) {
	try {
		throwIfCancelled(id);
		reportProgress(id, {
			phase: 'download',
			percent: 0,
			message: 'Preparing the local portrait background-removal model…'
		});

		const segmenter = await getSegmenter(id);
		throwIfCancelled(id);
		reportProgress(id, { phase: 'processing', percent: 15, message: 'Reading the portrait…' });

		const { RawImage } = await import('@huggingface/transformers');
		const original = await RawImage.fromBlob(image);
		throwIfCancelled(id);
		reportProgress(id, {
			phase: 'processing',
			percent: 35,
			message: 'Separating the portrait from its background…'
		});

		const output = await segmenter(original);
		throwIfCancelled(id);
		reportProgress(id, {
			phase: 'processing',
			percent: 85,
			message: 'Creating a transparent PNG…'
		});
		const transparentImage = await createTransparentPng(original, output);
		throwIfCancelled(id);
		reportProgress(id, { phase: 'processing', percent: 100, message: 'Portrait is ready.' });
		self.postMessage({ id, type: 'result', image: transparentImage });
	} catch (error) {
		if (cancelledRemovals.has(id) || (error instanceof Error && error.name === 'AbortError')) {
			self.postMessage({ id, type: 'aborted' });
		} else {
			self.postMessage({
				id,
				type: 'error',
				message: error instanceof Error ? error.message : 'Portrait background removal failed.'
			});
		}
	} finally {
		cancelledRemovals.delete(id);
	}
}

/** @param {MessageEvent<{type: 'remove' | 'abort'; id: string; image?: Blob}>} event */
self.addEventListener('message', ({ data }) => {
	if (data.type === 'abort') {
		cancelledRemovals.add(data.id);
		return;
	}

	if (!(data.image instanceof Blob)) {
		self.postMessage({ id: data.id, type: 'error', message: 'The selected image is invalid.' });
		return;
	}

	const image = data.image;
	removalQueue = removalQueue.then(() => removeBackground(data.id, image));
});
