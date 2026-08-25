import { isPodcastStudioSessionValid, podcastStudioCookieName } from '../podcast-admin-auth.js';
import { privateJson, requireSameOrigin } from '../podcast-admin-route.js';
import {
	DEFAULT_DRAW_FAL_MODEL,
	DRAW_FAL_MODELS,
	MAX_DRAW_FAL_REQUEST_BYTES,
	getDrawFalModel
} from '../draw-fal-models.js';

const MAX_PROMPT_LENGTH = 1_000;
const IMAGE_DATA_URL = /^data:image\/(?:png|jpeg|webp|avif|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
const encoder = new TextEncoder();

/**
 * Keep provider task selection server-owned: callers cannot choose an arbitrary
 * paid model or turn this endpoint into an authenticated forwarding proxy.
 */
export const drawingFalTasks = Object.freeze({
	'image-edit': Object.freeze({ model: DEFAULT_DRAW_FAL_MODEL.model, models: DRAW_FAL_MODELS })
});

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isImageDataUrl(value) {
	if (typeof value !== 'string' || !IMAGE_DATA_URL.test(value)) return false;
	const base64 = value.slice(value.indexOf(',') + 1);
	return base64.length % 4 === 0;
}

/**
 * @param {number} status
 * @returns {Response}
 */
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
			{
				status: 422
			}
		);
	}
	return privateJson({ error: 'Image editing could not be completed.' }, { status: 502 });
}

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 * @param {typeof fetch} [fetchProvider]
 * @returns {Promise<Response>}
 */
export async function editDrawingImage(event, fetchProvider = fetch) {
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

	requireSameOrigin(event.request, event.url);

	const falKey = event.platform?.env?.FAL_KEY;
	if (!falKey) {
		return privateJson({ error: 'AI image editing has not been configured.' }, { status: 503 });
	}

	if (!event.request.headers.get('content-type')?.startsWith('application/json')) {
		return privateJson({ error: 'Send the image and prompt as JSON.' }, { status: 415 });
	}

	const contentLength = Number(event.request.headers.get('content-length'));
	if (Number.isFinite(contentLength) && contentLength > MAX_DRAW_FAL_REQUEST_BYTES) {
		return privateJson({ error: 'The selected image is too large to edit.' }, { status: 413 });
	}

	const text = await event.request.text();
	if (encoder.encode(text).byteLength > MAX_DRAW_FAL_REQUEST_BYTES) {
		return privateJson({ error: 'The selected image is too large to edit.' }, { status: 413 });
	}

	/** @type {unknown} */
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		return privateJson({ error: 'The image-editing request is invalid.' }, { status: 400 });
	}

	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return privateJson({ error: 'The image-editing request is invalid.' }, { status: 400 });
	}

	const input = /** @type {{ prompt?: unknown, image?: unknown, model?: unknown }} */ (body);
	const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
	if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
		return privateJson(
			{ error: 'Enter editing instructions under 1,000 characters.' },
			{
				status: 422
			}
		);
	}
	if (!isImageDataUrl(input.image)) {
		return privateJson(
			{ error: 'Select a valid PNG, JPEG, WebP, AVIF, or GIF image.' },
			{
				status: 422
			}
		);
	}

	const model = input.model === undefined ? DEFAULT_DRAW_FAL_MODEL : getDrawFalModel(input.model);
	if (!model) {
		return privateJson(
			{ error: 'Choose one of the available image-editing models.' },
			{ status: 422 }
		);
	}
	/** @type {Response} */
	let upstream;
	try {
		upstream = await fetchProvider(`https://fal.run/${model.model}`, {
			method: 'POST',
			headers: {
				Authorization: `Key ${falKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				prompt,
				image_urls: [input.image],
				sync_mode: true,
				num_images: 1,
				...model.settings
			}),
			signal: AbortSignal.timeout(120_000)
		});
	} catch {
		return privateJson({ error: 'Image editing could not be completed.' }, { status: 502 });
	}

	if (!upstream.ok) return upstreamError(upstream.status);

	/** @type {unknown} */
	let result;
	try {
		result = await upstream.json();
	} catch {
		return privateJson(
			{ error: 'The image-editing provider returned an invalid image.' },
			{
				status: 502
			}
		);
	}

	const image = /** @type {{ images?: Array<{ url?: unknown }> }} */ (result)?.images?.[0]?.url;
	if (!isImageDataUrl(image) || encoder.encode(image).byteLength > MAX_DRAW_FAL_REQUEST_BYTES) {
		return privateJson(
			{ error: 'The image-editing provider returned an invalid image.' },
			{
				status: 502
			}
		);
	}

	return privateJson({ image, model: model.model });
}
