const POLL_INTERVAL_MS = 900;
const MAX_GENERATION_MS = 300_000;
const POLL_REQUEST_TIMEOUT_MS = 20_000;

/** @param {number} milliseconds @param {AbortSignal} signal */
function waitForNextPoll(milliseconds, signal) {
	signal.throwIfAborted();
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			signal.removeEventListener('abort', abort);
			resolve(undefined);
		}, milliseconds);
		function abort() {
			clearTimeout(timeout);
			reject(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError'));
		}
		signal.addEventListener('abort', abort, { once: true });
	});
}

/** @param {Response} response */
async function readResponse(response) {
	const body = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(
			body.error ??
				(response.status === 401
					? 'Sign in to use cloud image editing.'
					: 'The cloud image edit could not be completed.')
		);
	}
	return body;
}

/**
 * @param {{
 *  image?: Blob,
 *  prompt: string,
 *  model: string,
 *  signal: AbortSignal,
 *  onProgress: (progress: { status: string, requestId?: string, queuePosition?: number, message?: string, elapsedMs?: number }) => void,
 *  fetcher?: typeof fetch,
 *  pollIntervalMs?: number,
 *  requestTimeoutMs?: number,
 *  maxGenerationMs?: number
 *  providerSafetyDefaults?: boolean
 *  settings?: Record<string, string | number | boolean>
 *  agentBudget?: string
 *  onBudget?: (budget: string, spendingUsd: number) => void
 *  cancelOnAbort?: boolean
 * }} options
 */
export async function runDrawingFalGeneration(options) {
	const {
		image,
		prompt,
		model,
		signal,
		onProgress,
		fetcher = fetch,
		pollIntervalMs = POLL_INTERVAL_MS,
		requestTimeoutMs = POLL_REQUEST_TIMEOUT_MS,
		maxGenerationMs = MAX_GENERATION_MS
	} = options;
	const form = new FormData();
	if (image) {
		const extension = image.type === 'image/jpeg' ? 'jpg' : image.type.replace('image/', '');
		form.append('image', image, `drawing-edit.${extension}`);
	}
	form.append('prompt', prompt);
	form.append('model', model);
	if (options.settings && Object.keys(options.settings).length > 0) {
		form.append('settings', JSON.stringify(options.settings));
	}
	if (options.providerSafetyDefaults) form.append('providerSafetyDefaults', '1');
	if (options.agentBudget) form.append('agentBudget', options.agentBudget);
	onProgress({ status: 'UPLOADING' });
	const submitted = await readResponse(
		await fetcher('/tools/api/draw/edit', {
			method: 'POST',
			credentials: 'same-origin',
			body: form,
			signal
		})
	);
	if (
		typeof submitted.requestId !== 'string' ||
		!/^[A-Za-z0-9_-]{1,128}$/.test(submitted.requestId) ||
		submitted.model !== model
	) {
		throw new Error('The image-editing service returned an invalid generation job.');
	}
	const requestId = submitted.requestId;
	if (options.onBudget) {
		if (typeof submitted.agentBudget !== 'string' || !Number.isFinite(submitted.spendingUsd)) {
			throw new Error('The image-editing service returned an invalid spending authorization.');
		}
		options.onBudget(submitted.agentBudget, submitted.spendingUsd);
	}
	onProgress({ status: 'IN_QUEUE', requestId, queuePosition: submitted.queuePosition });
	const startedAt = Date.now();
	const query = new URLSearchParams({ requestId, model });
	const cancel = () => {
		void fetcher(`/tools/api/draw/edit?${query}`, {
			method: 'DELETE',
			credentials: 'same-origin',
			keepalive: true
		}).catch(() => {});
	};
	if (options.cancelOnAbort) signal.addEventListener('abort', cancel, { once: true });
	if (signal.aborted && options.cancelOnAbort) cancel();
	try {
		while (Date.now() - startedAt < maxGenerationMs) {
			signal.throwIfAborted();
			const remainingMs = maxGenerationMs - (Date.now() - startedAt);
			const timeout = AbortSignal.timeout(Math.max(1, Math.min(requestTimeoutMs, remainingMs)));
			const pollingSignal = AbortSignal.any([signal, timeout]);
			let update;
			try {
				update = await readResponse(
					await fetcher(`/tools/api/draw/edit?${query}`, {
						credentials: 'same-origin',
						signal: pollingSignal
					})
				);
			} catch (error) {
				if (!timeout.aborted || signal.aborted) throw error;
				onProgress({
					status: 'IN_PROGRESS',
					requestId,
					message: 'Still waiting for the model to respond',
					elapsedMs: Date.now() - startedAt
				});
				continue;
			}
			if (update.status === 'COMPLETED') {
				if (typeof update.video === 'string') {
					return update;
				}
				if (typeof update.image !== 'string' || !update.image.startsWith('data:image/')) {
					throw new Error('The image-editing service returned an invalid image or video.');
				}
				return update;
			}
			if (update.status !== 'IN_QUEUE' && update.status !== 'IN_PROGRESS') {
				throw new Error('The image-editing service returned invalid generation progress.');
			}
			onProgress({
				status: update.status,
				requestId,
				queuePosition: update.queuePosition,
				message: update.message,
				elapsedMs: Date.now() - startedAt
			});
			await waitForNextPoll(pollIntervalMs, signal);
		}
		throw new Error('Image generation took too long. Please try again.');
	} finally {
		if (options.cancelOnAbort) signal.removeEventListener('abort', cancel);
	}
}
