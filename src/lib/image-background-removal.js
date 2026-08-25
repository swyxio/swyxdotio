/**
 * @typedef {'portrait-fast' | 'general-fast' | 'general-balanced' | 'general-maximum'} BackgroundRemovalMode
 * @typedef {{
 *   phase: 'download' | 'processing';
 *   loaded?: number;
 *   total?: number;
 *   percent?: number;
 *   progress?: number;
 *   message?: string;
 *   label?: string;
 * }} BackgroundRemovalProgress
 * @typedef {{
 *   mode?: BackgroundRemovalMode;
 *   onProgress?: (progress: BackgroundRemovalProgress) => void;
 *   signal?: AbortSignal;
 * }} BackgroundRemovalOptions
 */

/** @type {Record<Exclude<BackgroundRemovalMode, 'portrait-fast'>, 'isnet_quint8' | 'isnet_fp16' | 'isnet'>} */
export const BACKGROUND_REMOVAL_MODELS = {
	'general-fast': 'isnet_quint8',
	'general-balanced': 'isnet_fp16',
	'general-maximum': 'isnet'
};

/** @param {AbortSignal | undefined} signal */
function rejectIfAborted(signal) {
	if (signal?.aborted) {
		throw new DOMException('Background removal was cancelled.', 'AbortError');
	}
}

/**
 * @template T
 * @param {Promise<T>} operation
 * @param {AbortSignal | undefined} signal
 * @returns {Promise<T>}
 */
async function withCancellation(operation, signal) {
	if (!signal) return operation;
	rejectIfAborted(signal);

	/** @type {(() => void) | undefined} */
	let removeAbortListener;
	const cancellation = new Promise((_, reject) => {
		const onAbort = () =>
			reject(new DOMException('Background removal was cancelled.', 'AbortError'));
		signal.addEventListener('abort', onAbort, { once: true });
		removeAbortListener = () => signal.removeEventListener('abort', onAbort);
	});

	try {
		return await Promise.race([operation, /** @type {Promise<T>} */ (cancellation)]);
	} finally {
		removeAbortListener?.();
	}
}

/**
 * @param {string} key
 * @param {number} loaded
 * @param {number} total
 * @returns {BackgroundRemovalProgress}
 */
export function describeBackgroundRemovalProgress(key, loaded, total) {
	const phase = key.startsWith('fetch:') ? 'download' : 'processing';
	const progress = total > 0 ? Math.min(1, Math.max(0, loaded / total)) : undefined;
	const stage = key.replace(/^compute:/, '');
	const stageMessages = {
		decode: 'Preparing your image…',
		inference: 'Finding the foreground…',
		mask: 'Removing the background…',
		encode: 'Creating the transparent image…'
	};
	const message =
		phase === 'download'
			? 'Downloading the background-removal model…'
			: (stageMessages[/** @type {keyof typeof stageMessages} */ (stage)] ??
				'Processing your image…');

	return {
		phase,
		loaded,
		total,
		...(progress === undefined ? {} : { progress, percent: Math.round(progress * 100) }),
		message,
		label: message
	};
}

/**
 * Remove an image background entirely in the browser. Only model and runtime
 * assets are downloaded; the source image is never uploaded.
 *
 * @param {Blob} sourceBlob
 * @param {BackgroundRemovalOptions} [options]
 * @returns {Promise<Blob>}
 */
export async function removeImageBackground(
	sourceBlob,
	{ mode = 'portrait-fast', onProgress, signal } = {}
) {
	if (!(sourceBlob instanceof Blob)) {
		throw new TypeError('Choose an image before removing its background.');
	}
	if (sourceBlob.size === 0) {
		throw new Error('This image is empty and cannot be processed.');
	}
	rejectIfAborted(signal);

	if (mode === 'portrait-fast') {
		const { removePortraitBackground } = await import('./portrait-background-removal.js');
		rejectIfAborted(signal);
		return withCancellation(removePortraitBackground(sourceBlob, { onProgress, signal }), signal);
	}

	const model = BACKGROUND_REMOVAL_MODELS[mode];
	if (!model) {
		throw new RangeError(`Unknown background-removal mode: ${mode}`);
	}

	onProgress?.({
		phase: 'download',
		percent: 0,
		progress: 0,
		message: 'Loading the background-removal model…',
		label: 'Loading the background-removal model…'
	});

	const { removeBackground } = await import('@imgly/background-removal');
	rejectIfAborted(signal);

	/** @type {import('@imgly/background-removal').Config} */
	const configuration = {
		model,
		device: typeof navigator !== 'undefined' && 'gpu' in navigator ? 'gpu' : 'cpu',
		proxyToWorker: false,
		rescale: true,
		output: { format: 'image/png' },
		...(signal ? { fetchArgs: { signal } } : {}),
		progress: (key, loaded, total) => {
			if (!signal?.aborted) {
				onProgress?.(describeBackgroundRemovalProgress(key, loaded, total));
			}
		}
	};

	try {
		return await withCancellation(removeBackground(sourceBlob, configuration), signal);
	} catch (error) {
		rejectIfAborted(signal);
		if (configuration.device !== 'gpu') throw error;

		onProgress?.({
			phase: 'processing',
			message: 'GPU acceleration is unavailable. Continuing on your device…',
			label: 'GPU acceleration is unavailable. Continuing on your device…'
		});
		return withCancellation(
			removeBackground(sourceBlob, { ...configuration, device: 'cpu' }),
			signal
		);
	}
}
