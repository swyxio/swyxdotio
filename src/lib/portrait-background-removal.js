/**
 * @typedef {{
 *   phase: 'download' | 'processing';
 *   percent?: number;
 *   progress?: number;
 *   loaded?: number;
 *   total?: number;
 *   message?: string;
 *   label?: string;
 * }} PortraitRemovalProgress
 */

/**
 * @typedef {{
 *   onProgress?: (progress: PortraitRemovalProgress) => void;
 *   signal?: AbortSignal;
 * }} PortraitRemovalOptions
 */

/**
 * @typedef {{
 *   resolve: (image: Blob) => void;
 *   reject: (reason: unknown) => void;
 *   onProgress?: PortraitRemovalOptions['onProgress'];
 *   signal?: AbortSignal;
 *   abort: () => void;
 * }} PendingPortraitRemoval
 */

/** @type {Worker | undefined} */
let portraitWorker;

/** @type {Map<string, PendingPortraitRemoval>} */
const pendingRemovals = new Map();

function abortError() {
	return new DOMException('Portrait background removal was cancelled.', 'AbortError');
}

/**
 * @param {string} id
 * @returns {PendingPortraitRemoval | undefined}
 */
function takePendingRemoval(id) {
	const pending = pendingRemovals.get(id);
	if (!pending) return undefined;
	pendingRemovals.delete(id);
	pending.signal?.removeEventListener('abort', pending.abort);
	return pending;
}

/**
 * @param {MessageEvent<{
 *   id: string;
 *   type: 'progress' | 'result' | 'error' | 'aborted';
 *   progress?: PortraitRemovalProgress;
 *   image?: Blob;
 *   message?: string;
 * }>} event
 */
function handleWorkerMessage({ data }) {
	const pending = pendingRemovals.get(data.id);
	if (!pending) return;

	if (data.type === 'progress') {
		if (data.progress) pending.onProgress?.(data.progress);
		return;
	}

	const completed = takePendingRemoval(data.id);
	if (!completed) return;

	if (data.type === 'result' && data.image instanceof Blob) {
		completed.resolve(data.image);
		return;
	}

	completed.reject(
		data.type === 'aborted'
			? abortError()
			: new Error(data.message ?? 'Portrait background removal failed.')
	);
}

/** @param {ErrorEvent} event */
function handleWorkerError(event) {
	const error = new Error(event.message || 'The portrait background-removal worker stopped.');
	for (const id of [...pendingRemovals.keys()]) {
		takePendingRemoval(id)?.reject(error);
	}
	portraitWorker?.terminate();
	portraitWorker = undefined;
}

function getPortraitWorker() {
	if (!portraitWorker) {
		if (typeof Worker === 'undefined') {
			throw new Error('Portrait background removal requires browser Web Worker support.');
		}

		portraitWorker = new Worker(
			new URL('./portrait-background-removal.worker.js', import.meta.url),
			{
				type: 'module',
				name: 'swyx-portrait-background-removal'
			}
		);
		portraitWorker.addEventListener('message', handleWorkerMessage);
		portraitWorker.addEventListener('error', handleWorkerError);
	}

	return portraitWorker;
}

/**
 * Remove a portrait's background entirely on-device with a cached MODNet model.
 * The returned PNG preserves the source image's original dimensions.
 *
 * @param {Blob} sourceBlob
 * @param {PortraitRemovalOptions} [options]
 * @returns {Promise<Blob>}
 */
export async function removePortraitBackground(sourceBlob, { onProgress, signal } = {}) {
	if (!(sourceBlob instanceof Blob)) {
		throw new TypeError('Portrait background removal requires an image Blob.');
	}
	if (sourceBlob.size === 0) throw new TypeError('The selected image is empty.');
	if (signal?.aborted) throw abortError();

	const worker = getPortraitWorker();
	const id = crypto.randomUUID();

	return new Promise((resolve, reject) => {
		const abort = () => {
			const pending = takePendingRemoval(id);
			if (!pending) return;
			worker.postMessage({ type: 'abort', id });
			pending.reject(abortError());
		};

		pendingRemovals.set(id, { resolve, reject, onProgress, signal, abort });
		signal?.addEventListener('abort', abort, { once: true });

		if (signal?.aborted) {
			abort();
			return;
		}

		worker.postMessage({ type: 'remove', id, image: sourceBlob });
	});
}
