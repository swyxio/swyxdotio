import { isPodcastStudioSessionValid, podcastStudioCookieName } from '../podcast-admin-auth.js';
import { privateJson, requireSameOrigin } from '../podcast-admin-route.js';
import {
	DEFAULT_DRAW_FAL_MODEL,
	DRAW_FAL_MODELS,
	MAX_DRAW_FAL_REQUEST_BYTES,
	getDrawFalModel
} from '../draw-fal-models.js';

const MAX_PROMPT_LENGTH = 1_000;
const IMAGE_MIME_TYPE = /^image\/(?:png|jpeg|webp|avif|gif)$/;
const IMAGE_DATA_URL = /^data:image\/(?:png|jpeg|webp|avif|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
const REQUEST_ID = /^[A-Za-z0-9_-]{1,128}$/;
const encoder = new TextEncoder();

/** Provider selection remains server-owned; arbitrary paid endpoints are never accepted. */
export const drawingFalTasks = Object.freeze({
	'image-edit': Object.freeze({
		model: DEFAULT_DRAW_FAL_MODEL.model,
		models: DRAW_FAL_MODELS.filter((model) => model.kind === 'image-edit')
	}),
	'text-to-image': Object.freeze({
		models: DRAW_FAL_MODELS.filter((model) => model.kind === 'text-to-image')
	}),
	'image-to-video': Object.freeze({
		models: DRAW_FAL_MODELS.filter((model) => model.kind === 'image-to-video')
	})
});

/** @param {unknown} value @returns {value is string} */
function isImageDataUrl(value) {
	if (typeof value !== 'string' || !IMAGE_DATA_URL.test(value)) return false;
	return value.slice(value.indexOf(',') + 1).length % 4 === 0;
}

/** @param {unknown} value @returns {value is string} */
function isFalVideoUrl(value) {
	if (typeof value !== 'string') return false;
	try {
		const url = new URL(value);
		return (
			url.protocol === 'https:' &&
			!url.username &&
			!url.password &&
			(url.hostname === 'fal.media' || url.hostname.endsWith('.fal.media'))
		);
	} catch {
		return false;
	}
}

/** @param {number} status */
function upstreamError(status) {
	if (status === 401 || status === 403) {
		return privateJson({ error: 'The image-editing provider is unavailable.' }, { status: 503 });
	}
	if (status === 429) {
		return privateJson({ error: 'Image editing is busy. Please try again.' }, { status: 429 });
	}
	if (status === 400 || status === 422) {
		return privateJson(
			{ error: 'The image or editing instructions were not accepted.' },
			{ status: 422 }
		);
	}
	return privateJson({ error: 'Image editing could not be completed.' }, { status: 502 });
}

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 */
async function authenticate(event) {
	const sessionSecret = event.platform?.env?.PODCAST_ADMIN_SESSION_SECRET;
	if (
		!sessionSecret ||
		!(await isPodcastStudioSessionValid(
			event.cookies.get(podcastStudioCookieName()),
			sessionSecret
		))
	) {
		return privateJson({ error: 'Sign in to edit images with AI.' }, { status: 401 });
	}
	if (event.request.method !== 'GET') requireSameOrigin(event.request, event.url);
	const falKey = event.platform?.env?.FAL_KEY;
	if (!falKey)
		return privateJson({ error: 'AI image editing has not been configured.' }, { status: 503 });
	return falKey;
}

/** @param {Blob} image */
async function serverOnlyImageDataUrl(image) {
	const bytes = new Uint8Array(await image.arrayBuffer());
	let binary = '';
	for (let offset = 0; offset < bytes.length; offset += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
	}
	return `data:${image.type};base64,${btoa(binary)}`;
}

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 * @param {typeof fetch} [fetchProvider]
 */
export async function editDrawingImage(event, fetchProvider = fetch) {
	const falKey = await authenticate(event);
	if (falKey instanceof Response) return falKey;

	if (!event.request.headers.get('content-type')?.startsWith('multipart/form-data;')) {
		return privateJson(
			{ error: 'Send the image and prompt as a binary form upload.' },
			{ status: 415 }
		);
	}
	const contentLengthHeader = event.request.headers.get('content-length');
	if (contentLengthHeader !== null) {
		const contentLength = Number(contentLengthHeader);
		if (
			!Number.isSafeInteger(contentLength) ||
			contentLength < 0 ||
			contentLength > MAX_DRAW_FAL_REQUEST_BYTES
		) {
			return privateJson({ error: 'The selected image is too large to edit.' }, { status: 413 });
		}
	}

	/** @type {FormData} */
	let form;
	try {
		form = await event.request.formData();
	} catch {
		return privateJson({ error: 'The image-editing request is invalid.' }, { status: 400 });
	}
	const fields = [...form.keys()];
	if (
		fields.some((field) => !['image', 'prompt', 'model'].includes(field)) ||
		new Set(fields).size !== fields.length
	) {
		return privateJson({ error: 'The image-editing request is invalid.' }, { status: 400 });
	}
	const promptInput = form.get('prompt');
	const prompt = typeof promptInput === 'string' ? promptInput.trim() : '';
	if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
		return privateJson(
			{ error: 'Enter editing instructions under 1,000 characters.' },
			{ status: 422 }
		);
	}
	const requestedModel = form.get('model');
	const model = requestedModel === null ? DEFAULT_DRAW_FAL_MODEL : getDrawFalModel(requestedModel);
	if (!model) {
		return privateJson(
			{ error: 'Choose one of the available image-generation models.' },
			{ status: 422 }
		);
	}
	const image = form.get('image');
	if (model.kind === 'text-to-image') {
		if (image !== null) {
			return privateJson(
				{ error: 'Text-to-image generation does not accept an image upload.' },
				{ status: 422 }
			);
		}
	} else {
		if (
			typeof image === 'string' ||
			!image ||
			!IMAGE_MIME_TYPE.test(image.type) ||
			image.size === 0
		) {
			return privateJson(
				{ error: 'Select a valid PNG, JPEG, WebP, AVIF, or GIF image.' },
				{ status: 422 }
			);
		}
		if (image.size > MAX_DRAW_FAL_REQUEST_BYTES) {
			return privateJson({ error: 'The selected image is too large to edit.' }, { status: 413 });
		}
	}

	/** @type {Record<string, unknown>} */
	const providerInput = { prompt };
	if (model.kind !== 'text-to-image') {
		const imageDataUrl = await serverOnlyImageDataUrl(/** @type {File} */ (image));
		const imageInput = 'imageInput' in model ? model.imageInput : 'image_urls';
		providerInput[imageInput] = imageInput === 'image_url' ? imageDataUrl : [imageDataUrl];
	}
	if (model.kind !== 'image-to-video') {
		providerInput.sync_mode = true;
		providerInput.num_images = 1;
	}
	Object.assign(providerInput, model.settings);
	/** @type {Response} */
	let upstream;
	try {
		upstream = await fetchProvider(`https://queue.fal.run/${model.model}`, {
			method: 'POST',
			headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(providerInput),
			signal: AbortSignal.timeout(30_000)
		});
	} catch {
		return privateJson({ error: 'Image editing could not be started.' }, { status: 502 });
	}
	if (!upstream.ok) return upstreamError(upstream.status);
	/** @type {any} */
	let result;
	try {
		result = await upstream.json();
	} catch {
		return privateJson(
			{ error: 'The image-editing provider returned an invalid job.' },
			{ status: 502 }
		);
	}
	if (typeof result?.request_id !== 'string' || !REQUEST_ID.test(result.request_id)) {
		return privateJson(
			{ error: 'The image-editing provider returned an invalid job.' },
			{ status: 502 }
		);
	}
	return privateJson(
		{
			requestId: result.request_id,
			model: model.id,
			status: 'IN_QUEUE',
			queuePosition: Number.isSafeInteger(result.queue_position)
				? Math.max(0, result.queue_position)
				: undefined
		},
		{ status: 202 }
	);
}

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 * @param {typeof fetch} [fetchProvider]
 */
export async function pollDrawingImage(event, fetchProvider = fetch) {
	const falKey = await authenticate(event);
	if (falKey instanceof Response) return falKey;
	const requestId = event.url.searchParams.get('requestId');
	const model = getDrawFalModel(event.url.searchParams.get('model'));
	if (!requestId || !REQUEST_ID.test(requestId) || !model) {
		return privateJson({ error: 'The image-generation request is invalid.' }, { status: 422 });
	}
	const jobUrl = `https://queue.fal.run/${model.model}/requests/${requestId}`;
	const providerOptions = {
		headers: { Authorization: `Key ${falKey}` },
		signal: AbortSignal.timeout(20_000)
	};
	/** @type {Response} */
	let upstream;
	try {
		upstream = await fetchProvider(`${jobUrl}/status?logs=1`, providerOptions);
	} catch {
		return privateJson(
			{ error: 'Image-generation progress is temporarily unavailable.' },
			{ status: 502 }
		);
	}
	if (!upstream.ok) return upstreamError(upstream.status);
	/** @type {any} */
	let progress;
	try {
		progress = await upstream.json();
	} catch {
		return privateJson(
			{ error: 'The image-editing provider returned invalid progress.' },
			{ status: 502 }
		);
	}
	if (progress?.status === 'IN_QUEUE') {
		return privateJson({
			status: 'IN_QUEUE',
			queuePosition: Number.isSafeInteger(progress.queue_position)
				? Math.max(0, progress.queue_position)
				: undefined
		});
	}
	if (progress?.status === 'IN_PROGRESS') {
		const lastLog = Array.isArray(progress.logs) ? progress.logs.at(-1)?.message : undefined;
		const message =
			typeof lastLog === 'string' && !lastLog.includes(falKey)
				? lastLog.replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 160)
				: undefined;
		return privateJson({ status: 'IN_PROGRESS', message });
	}
	if (progress?.status !== 'COMPLETED') {
		return privateJson(
			{ error: 'The image-editing provider returned invalid progress.' },
			{ status: 502 }
		);
	}
	try {
		upstream = await fetchProvider(jobUrl, providerOptions);
	} catch {
		return privateJson({ error: 'The generated image could not be retrieved.' }, { status: 502 });
	}
	if (!upstream.ok) return upstreamError(upstream.status);
	/** @type {any} */
	let result;
	try {
		result = await upstream.json();
	} catch {
		return privateJson(
			{ error: 'The image-editing provider returned an invalid image.' },
			{ status: 502 }
		);
	}
	if (model.kind === 'image-to-video') {
		const video = result?.video?.url;
		if (!isFalVideoUrl(video)) {
			return privateJson(
				{ error: 'The image-editing provider returned an invalid video.' },
				{ status: 502 }
			);
		}
		return privateJson({ status: 'COMPLETED', video, model: model.model });
	}
	const image = result?.images?.[0]?.url;
	if (!isImageDataUrl(image) || encoder.encode(image).byteLength > MAX_DRAW_FAL_REQUEST_BYTES) {
		return privateJson(
			{ error: 'The image-editing provider returned an invalid image.' },
			{ status: 502 }
		);
	}
	return privateJson({ status: 'COMPLETED', image, model: model.model });
}

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 * @param {typeof fetch} [fetchProvider]
 */
export async function cancelDrawingImage(event, fetchProvider = fetch) {
	const falKey = await authenticate(event);
	if (falKey instanceof Response) return falKey;
	const requestId = event.url.searchParams.get('requestId');
	const model = getDrawFalModel(event.url.searchParams.get('model'));
	if (!requestId || !REQUEST_ID.test(requestId) || !model) {
		return privateJson({ error: 'The image-generation request is invalid.' }, { status: 422 });
	}
	try {
		const upstream = await fetchProvider(
			`https://queue.fal.run/${model.model}/requests/${requestId}/cancel`,
			{
				method: 'PUT',
				headers: { Authorization: `Key ${falKey}` },
				signal: AbortSignal.timeout(15_000)
			}
		);
		if (!upstream.ok) return upstreamError(upstream.status);
	} catch {
		return privateJson(
			{ error: 'The queued image generation could not be cancelled.' },
			{ status: 502 }
		);
	}
	return privateJson({ status: 'CANCELLED' });
}
