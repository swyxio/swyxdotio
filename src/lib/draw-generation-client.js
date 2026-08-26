import {
	getDrawGenerationModel,
	getDrawGenerationReferenceLimit,
	MAX_DRAW_GENERATION_PROMPT_LENGTH,
	MAX_DRAW_GENERATION_REQUEST_BYTES
} from './draw-generation-models.js';

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
		const error = new Error(
			body.error ??
				(response.status === 401
					? 'Sign in to use cloud image editing.'
					: 'The cloud image edit could not be completed.')
		);
		Object.assign(error, {
			code: typeof body.code === 'string' ? body.code : 'generation_failed',
			status: response.status
		});
		throw error;
	}
	return body;
}

/**
 * @param {{
 *  image?: Blob,
 *  images?: Blob[],
 *  userId?: string,
 *  prompt: string,
 *  model: string,
 *  signal: AbortSignal,
 *  onProgress: (progress: { status: string, requestId?: string, queuePosition?: number, message?: string, elapsedMs?: number }) => void,
 *  fetcher?: typeof fetch,
 *  pollIntervalMs?: number,
 *  requestTimeoutMs?: number,
 *  maxGenerationMs?: number
 *  providerSafetyDefaults?: boolean
 *  settings?: Record<string, unknown>
 *  agentBudget?: string
 *  onBudget?: (budget: string, spendingUsd: number) => void
 *  runId?: string
 *  runLimitUsd?: number | null
 *  clientJobId?: string
 *  cancelOnAbort?: boolean
 * }} options
 */
export async function runDrawingGeneration(options) {
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
	if (options.image !== undefined && options.images !== undefined)
		throw new Error('Provide image or images, not both.');
	if (
		typeof prompt !== 'string' ||
		!prompt.trim() ||
		prompt.length > MAX_DRAW_GENERATION_PROMPT_LENGTH
	)
		throw new Error('Enter a prompt of at most 32,000 characters.');
	const descriptor = getDrawGenerationModel(model);
	if (!descriptor) throw new Error('The selected model is unavailable.');
	const images = options.images ?? (image ? [image] : []);
	const limit = getDrawGenerationReferenceLimit(descriptor);
	if (!Array.isArray(images) || images.length > limit || (limit > 0 && !images.length))
		throw new Error(
			limit === 0
				? 'Text-to-image does not send reference images.'
				: `Attach one to ${limit} reference image${limit === 1 ? '' : 's'} for this model.`
		);
	if (
		images.some(
			(image) =>
				!(image instanceof Blob) ||
				!/^image\/(?:png|jpeg|webp|avif|gif)$/.test(image.type) ||
				!image.size
		)
	)
		throw new Error('Attach valid image files.');
	if (images.reduce((size, image) => size + image.size, 0) > MAX_DRAW_GENERATION_REQUEST_BYTES)
		throw new Error('The combined reference upload exceeds 12 MB.');
	const form = new FormData();
	for (const [index, image] of images.entries()) {
		const extension = image.type === 'image/jpeg' ? 'jpg' : image.type.replace('image/', '');
		form.append(
			'image',
			image,
			`drawing-edit${images.length > 1 ? `-${index + 1}` : ''}.${extension}`
		);
	}
	form.append('prompt', prompt);
	form.append('model', model);
	if (options.settings && Object.keys(options.settings).length > 0) {
		form.append('settings', JSON.stringify(options.settings));
	}
	if (options.providerSafetyDefaults) form.append('providerSafetyDefaults', '1');
	if (options.agentBudget) form.append('agentBudget', options.agentBudget);
	if (options.runId !== undefined) form.append('runId', options.runId);
	if (options.runLimitUsd !== undefined) form.append('runLimitUsd', String(options.runLimitUsd));
	if (options.clientJobId !== undefined) form.append('clientJobId', options.clientJobId);
	// Measure the complete multipart encoding, not only its image bytes or Content-Length.
	if ((await new Response(form).blob()).size > MAX_DRAW_GENERATION_REQUEST_BYTES)
		throw new Error('The combined reference upload exceeds 12 MB.');
	signal.throwIfAborted();
	onProgress({ status: 'UPLOADING' });
	const submitted = await readResponse(
		await fetcher('/tools/api/draw/edit', {
			method: 'POST',
			credentials: 'same-origin',
			headers: options.userId ? { 'X-Tools-User': options.userId } : undefined,
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
	let cancellationRequested = false;
	const cancel = () => {
		if (cancellationRequested) return;
		cancellationRequested = true;
		onProgress({
			status: 'CANCEL_REQUESTED',
			requestId,
			message: 'Cancellation requested; provider work may still complete and be charged.'
		});
		void fetcher(`/tools/api/draw/edit?${query}`, {
			method: 'DELETE',
			credentials: 'same-origin',
			headers: options.userId ? { 'X-Tools-User': options.userId } : undefined,
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
						headers: options.userId ? { 'X-Tools-User': options.userId } : undefined,
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
			if (update.status === 'CANCELLED') {
				throw Object.assign(new Error('The generation was cancelled.'), {
					name: 'AbortError',
					code: 'cancelled'
				});
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
		if (options.cancelOnAbort) cancel();
		throw Object.assign(
			new Error(
				'Generation timed out. The provider may still finish and charge; do not retry automatically.'
			),
			{ code: 'generation_timeout' }
		);
	} finally {
		if (options.cancelOnAbort) signal.removeEventListener('abort', cancel);
	}
}
