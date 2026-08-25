/**
 * @typedef {'magic-select' | 'magic-eraser' | 'depth-blur' | 'vectorize'} DrawImageTool
 * @typedef {{
 *   phase: 'download' | 'processing';
 *   loaded?: number;
 *   total?: number;
 *   percent?: number;
 *   progress?: number;
 *   message?: string;
 *   label?: string;
 * }} DrawImageToolProgress
 * @typedef {{
 *   onProgress?: (progress: DrawImageToolProgress) => void;
 *   signal?: AbortSignal;
 *   point?: { x: number; y: number };
 *   radius?: number;
 *   blur?: number;
 *   focus?: number;
 *   colors?: number;
 *   mask?: Blob;
 * }} DrawImageToolOptions
 * @typedef {{
 *   resolve: (image: Blob) => void;
 *   reject: (reason: unknown) => void;
 *   onProgress?: DrawImageToolOptions['onProgress'];
 *   signal?: AbortSignal;
 *   abort: () => void;
 * }} PendingImageOperation
 */

/**
 * Exact ONNX weight sizes come from the Hugging Face model repositories. Small
 * processor/configuration files and the shared runtime are intentionally not
 * represented as model weights.
 */
export const DRAW_IMAGE_TOOLS = /** @type {const} */ ({
	'magic-select': {
		id: 'magic-select',
		label: 'Magic Select',
		model: 'Xenova/slimsam-77-uniform',
		downloadBytes: 8_882_165 + 4_903_810,
		size: '13.8 MB',
		license: 'Apache-2.0'
	},
	'magic-eraser': {
		id: 'magic-eraser',
		label: 'Magic Eraser',
		model: 'g-ronimo/lama/lama_512_int8.onnx',
		downloadBytes: 62_074_990,
		size: '62.1 MB',
		license: 'Apache-2.0'
	},
	'depth-blur': {
		id: 'depth-blur',
		label: 'Depth Blur',
		model: 'onnx-community/depth-anything-v2-small',
		downloadBytes: 27_258_801,
		size: '27.3 MB',
		license: 'Apache-2.0'
	},
	vectorize: {
		id: 'vectorize',
		label: 'Vectorize Image',
		model: null,
		downloadBytes: 0,
		size: 'No download',
		license: null
	}
});

/** @type {Worker | undefined} */
let imageWorker;

/** @type {Map<string, PendingImageOperation>} */
const pendingOperations = new Map();

function abortError() {
	return new DOMException('Image processing was cancelled.', 'AbortError');
}

/** @param {string} id */
function takePendingOperation(id) {
	const pending = pendingOperations.get(id);
	if (!pending) return undefined;
	pendingOperations.delete(id);
	pending.signal?.removeEventListener('abort', pending.abort);
	return pending;
}

/**
 * @param {MessageEvent<{
 *   id: string;
 *   type: 'progress' | 'result' | 'error' | 'aborted';
 *   progress?: DrawImageToolProgress;
 *   image?: Blob;
 *   message?: string;
 * }>} event
 */
function handleWorkerMessage({ data }) {
	const pending = pendingOperations.get(data.id);
	if (!pending) return;

	if (data.type === 'progress') {
		if (data.progress) pending.onProgress?.(data.progress);
		return;
	}

	const completed = takePendingOperation(data.id);
	if (!completed) return;

	if (data.type === 'result' && data.image instanceof Blob) {
		completed.resolve(data.image);
	} else {
		completed.reject(
			data.type === 'aborted'
				? abortError()
				: new Error(data.message ?? 'The selected image could not be processed.')
		);
	}
}

/** @param {ErrorEvent} event */
function handleWorkerError(event) {
	const failure = new Error(event.message || 'The local image-processing worker stopped.');
	for (const id of [...pendingOperations.keys()]) {
		takePendingOperation(id)?.reject(failure);
	}
	imageWorker?.terminate();
	imageWorker = undefined;
}

function getImageWorker() {
	if (!imageWorker) {
		if (typeof Worker === 'undefined') {
			throw new Error('Local image processing requires browser Web Worker support.');
		}

		imageWorker = new Worker(new URL('./draw-image-tools.worker.js', import.meta.url), {
			type: 'module',
			name: 'swyx-draw-image-tools'
		});
		imageWorker.addEventListener('message', handleWorkerMessage);
		imageWorker.addEventListener('error', handleWorkerError);
	}
	return imageWorker;
}

/**
 * Process an image entirely on-device. Network requests only retrieve public
 * model weights; image bytes are transferred exclusively to a local worker.
 * Points and brush radii are normalized to the image's dimensions.
 *
 * @param {DrawImageTool} action
 * @param {Blob} sourceBlob
 * @param {DrawImageToolOptions} [options]
 * @returns {Promise<Blob>}
 */
export async function processImageTool(action, sourceBlob, options = {}) {
	if (!(action in DRAW_IMAGE_TOOLS)) {
		throw new RangeError(`Unknown image tool: ${action}`);
	}
	if (!(sourceBlob instanceof Blob)) {
		throw new TypeError('Local image tools require an image Blob.');
	}
	if (sourceBlob.size === 0) throw new TypeError('The selected image is empty.');
	if (options.signal?.aborted) throw abortError();

	const worker = getImageWorker();
	const id = crypto.randomUUID();
	const { onProgress, signal, ...settings } = options;

	return new Promise((resolve, reject) => {
		const abort = () => {
			const pending = takePendingOperation(id);
			if (!pending) return;
			worker.postMessage({ type: 'abort', id });
			pending.reject(abortError());
		};

		pendingOperations.set(id, { resolve, reject, onProgress, signal, abort });
		signal?.addEventListener('abort', abort, { once: true });
		if (signal?.aborted) {
			abort();
			return;
		}
		worker.postMessage({ type: 'process', id, action, image: sourceBlob, options: settings });
	});
}

/** @param {Blob} image @param {DrawImageToolOptions} [options] */
export function magicSelectImage(image, options) {
	return processImageTool('magic-select', image, options);
}

/** @param {Blob} image @param {DrawImageToolOptions} [options] */
export function magicEraseImage(image, options) {
	return processImageTool('magic-eraser', image, options);
}

/** @param {Blob} image @param {DrawImageToolOptions} [options] */
export function depthBlurImage(image, options) {
	return processImageTool('depth-blur', image, options);
}

/** @param {Blob} image @param {DrawImageToolOptions} [options] */
export function vectorizeImage(image, options) {
	return processImageTool('vectorize', image, options);
}
