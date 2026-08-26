import { getDrawFalModel, MAX_DRAW_FAL_REQUEST_BYTES } from '../draw-fal-models.js';
import { DrawingGenerationError } from './draw-generation-error.js';

const REQUEST_ID = /^[A-Za-z0-9_-]{1,128}$/;
const IMAGE_DATA_URL = /^data:image\/(?:png|jpeg|webp|avif|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
const encoder = new TextEncoder();

/** @param {number} status */
function upstreamError(status) {
	if (status === 401 || status === 403)
		return new DrawingGenerationError(
			'The generation provider is unavailable.',
			503,
			'provider_unavailable'
		);
	if (status === 429)
		return new DrawingGenerationError(
			'Generation is busy. Please try again.',
			429,
			'provider_busy'
		);
	// A generic 422 is NOT proof of a policy rejection. Do not invent a policy code.
	if (status === 400 || status === 422)
		return new DrawingGenerationError(
			'The reference or instructions were not accepted.',
			422,
			'input_rejected'
		);
	return new DrawingGenerationError('Generation could not be completed.');
}

/** @param {Response} response @param {string} description */
async function providerJson(response, description) {
	if (!response.ok) throw upstreamError(response.status);
	try {
		return await response.json();
	} catch {
		throw new DrawingGenerationError(`The generation provider returned invalid ${description}.`);
	}
}

/** @param {string} id */
function modelFor(id) {
	const model = getDrawFalModel(id);
	if (!model)
		throw new DrawingGenerationError('This generation model is unavailable.', 422, 'invalid_model');
	return model;
}

/** @param {string} modelId @param {string} requestId */
function jobUrl(modelId, requestId) {
	if (!REQUEST_ID.test(requestId))
		throw new DrawingGenerationError('Invalid generation job.', 422, 'invalid_job');
	const [owner, application] = modelFor(modelId).model.split('/');
	return `https://queue.fal.run/${owner}/${application}/requests/${requestId}`;
}

/** @param {unknown} value */
function isFalVideoUrl(value) {
	if (typeof value !== 'string') return false;
	try {
		const url = new URL(value);
		return (
			url.protocol === 'https:' &&
			!url.username &&
			!url.password &&
			(url.hostname === 'fal.media' ||
				url.hostname.endsWith('.fal.media') ||
				(url.hostname === 'storage.googleapis.com' && url.pathname.startsWith('/falserverless/')))
		);
	} catch {
		return false;
	}
}

/** @param {Blob} image */
async function imageDataUrl(image) {
	const bytes = new Uint8Array(await image.arrayBuffer());
	let binary = '';
	for (let offset = 0; offset < bytes.length; offset += 0x8000)
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
	return `data:${image.type};base64,${btoa(binary)}`;
}

/** @type {import('./draw-generation-provider.js').DrawingGenerationAdapter} */
export const drawingFalAdapter = {
	configured: (env) => typeof env.FAL_KEY === 'string' && env.FAL_KEY.length > 0,
	async submit(input, { env, fetcher }) {
		const model = modelFor(input.model.id);
		/** @type {Record<string, unknown>} */
		const payload = { prompt: input.prompt, ...input.settings };
		// Safeguards always use the provider defaults, including manual submissions.
		delete payload.enable_safety_checker;
		delete payload.safety_tolerance;
		if (input.image) {
			const image = await imageDataUrl(input.image);
			const key = 'imageInput' in model ? model.imageInput : 'image_urls';
			payload[key] = key === 'image_url' ? image : [image];
		}
		if (model.kind !== 'image-to-video') Object.assign(payload, { sync_mode: true, num_images: 1 });
		let response;
		try {
			response = await fetcher(`https://queue.fal.run/${model.model}`, {
				method: 'POST',
				headers: { Authorization: `Key ${env.FAL_KEY}`, 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
				signal: AbortSignal.timeout(30_000)
			});
		} catch {
			throw new DrawingGenerationError(
				'Generation could not be started. The provider may still charge; do not retry automatically.'
			);
		}
		const result = await providerJson(response, 'job');
		if (typeof result?.request_id !== 'string' || !REQUEST_ID.test(result.request_id))
			throw new DrawingGenerationError('The generation provider returned an invalid job.');
		return {
			requestId: result.request_id,
			queuePosition: Number.isSafeInteger(result.queue_position)
				? Math.max(0, result.queue_position)
				: undefined
		};
	},
	async status(job, { env, fetcher }) {
		const url = jobUrl(job.model.id, job.requestId);
		const options = {
			headers: { Authorization: `Key ${env.FAL_KEY}` },
			signal: AbortSignal.timeout(20_000)
		};
		const progress = await providerJson(await fetcher(`${url}/status?logs=1`, options), 'progress');
		if (progress?.status === 'IN_QUEUE')
			return {
				status: 'IN_QUEUE',
				queuePosition: Number.isSafeInteger(progress.queue_position)
					? Math.max(0, progress.queue_position)
					: undefined
			};
		// Provider logs may echo private prompts or credentials. Expose only our fixed message.
		if (progress?.status === 'IN_PROGRESS')
			return { status: 'IN_PROGRESS', message: 'The model is generating.' };
		if (progress?.status === 'FAILED' || progress?.status === 'CANCELLED')
			return { status: progress.status };
		if (progress?.status !== 'COMPLETED')
			throw new DrawingGenerationError('The generation provider returned invalid progress.');
		const result = await providerJson(await fetcher(url, options), 'output');
		if (modelFor(job.model.id).kind === 'image-to-video') {
			if (!isFalVideoUrl(result?.video?.url))
				throw new DrawingGenerationError('The generation provider returned an invalid video.');
			return { status: 'COMPLETED', video: result.video.url, model: job.model.id };
		}
		const image = result?.images?.[0]?.url;
		if (
			typeof image !== 'string' ||
			!IMAGE_DATA_URL.test(image) ||
			image.slice(image.indexOf(',') + 1).length % 4 !== 0 ||
			encoder.encode(image).byteLength > MAX_DRAW_FAL_REQUEST_BYTES
		)
			throw new DrawingGenerationError('The generation provider returned an invalid image.');
		return { status: 'COMPLETED', image, model: job.model.id };
	},
	async cancel(job, { env, fetcher }) {
		const response = await fetcher(`${jobUrl(job.model.id, job.requestId)}/cancel`, {
			method: 'PUT',
			headers: { Authorization: `Key ${env.FAL_KEY}` },
			signal: AbortSignal.timeout(15_000)
		});
		if (!response.ok) throw upstreamError(response.status);
		// Acceptance is not proof the provider stopped already-running inference.
		return { status: 'CANCEL_REQUESTED', cancellation: 'requested' };
	}
};
