import { estimateToolsMediaReservation } from '../tools-ai-policy.js';
import { reserveToolsAiUsage, finishToolsAiUsage, toolsAiLedger } from './tools-ai-usage.js';
import { getToolsUser } from './tools-auth.js';
import { privateJson, requireSameOrigin } from '../podcast-admin-route.js';
import {
	DEFAULT_DRAW_GENERATION_MODEL,
	DRAW_GENERATION_MODELS,
	MAX_DRAW_GENERATION_REQUEST_BYTES,
	MAX_DRAW_GENERATION_PROMPT_LENGTH,
	getDrawGenerationReferenceLimit,
	estimateDrawGenerationModelCost,
	getDrawGenerationModel,
	resolveDrawGenerationModelSettings
} from '../draw-generation-models.js';
import { chargeDrawingAgentBudget } from './draw-agent-budget.js';
import { DrawingGenerationError, getDrawingGenerationAdapter } from './draw-generation-provider.js';
import {
	generationLogMetadata,
	generationLogError,
	observeGeneration
} from './tools-generation-observation.js';
import { readCreativeBody } from '../../../workers/draw/creative-library.js';

const IMAGE_MIME_TYPE = /^image\/(?:png|jpeg|webp|avif|gif)$/;
const REQUEST_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** Provider selection remains server-owned; arbitrary paid endpoints are never accepted. */
export const drawingGenerationTasks = Object.freeze({
	'image-edit': Object.freeze({
		model: DEFAULT_DRAW_GENERATION_MODEL.id,
		models: DRAW_GENERATION_MODELS.filter((model) => model.kind === 'image-edit')
	}),
	'text-to-image': Object.freeze({
		models: DRAW_GENERATION_MODELS.filter((model) => model.kind === 'text-to-image')
	}),
	'image-to-video': Object.freeze({
		models: DRAW_GENERATION_MODELS.filter((model) => model.kind === 'image-to-video')
	})
});

/** @param {unknown} error @param {string} fallback */
function generationError(error, fallback) {
	return privateJson(
		error instanceof DrawingGenerationError
			? { code: error.code, error: error.message }
			: { code: 'generation_failed', error: fallback },
		{ status: error instanceof DrawingGenerationError ? error.status : 502 }
	);
}

/** @param {FormData} form @param {boolean} isOwner */
function runAuthorization(form, isOwner) {
	const runId = form.get('runId');
	const clientJobId = form.get('clientJobId');
	const rawLimit = form.get('runLimitUsd');
	if (runId === null && clientJobId === null && rawLimit === null) return undefined;
	const limitUsd = isOwner ? null : typeof rawLimit === 'string' ? Number(rawLimit) : NaN;
	if (
		typeof runId !== 'string' ||
		!REQUEST_ID.test(runId) ||
		typeof clientJobId !== 'string' ||
		!REQUEST_ID.test(clientJobId) ||
		(!isOwner &&
			(limitUsd === null || !Number.isFinite(limitUsd) || limitUsd <= 0 || limitUsd > 100))
	)
		throw new DrawingGenerationError(
			'Choose a valid run spending limit.',
			422,
			'invalid_run_budget'
		);
	return { id: runId, clientJobId, limitUsd };
}

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 */
async function authenticate(event) {
	const user = await getToolsUser(event);
	if (!user) return privateJson({ error: 'Sign in to edit images with AI.' }, { status: 401 });
	const expectedUser = event.request.headers.get('X-Tools-User');
	if ((event.request.method !== 'GET' || expectedUser !== null) && expectedUser !== user.id)
		return privateJson(
			{ code: 'account_changed', error: 'Your Google account changed. Reload before continuing.' },
			{ status: 409 }
		);
	if (event.request.method !== 'GET') requireSameOrigin(event.request, event.url);
	return { user };
}

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 * @param {typeof fetch} [fetchProvider]
 */
export async function editDrawingImage(event, fetchProvider = fetch) {
	const auth = await authenticate(event);
	if (auth instanceof Response) return auth;
	const { user } = auth;

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
			contentLength > MAX_DRAW_GENERATION_REQUEST_BYTES
		) {
			return privateJson({ error: 'The selected image is too large to edit.' }, { status: 413 });
		}
	}

	/** @type {FormData} */
	let form;
	try {
		const bytes = await readCreativeBody(event.request, MAX_DRAW_GENERATION_REQUEST_BYTES);
		form = await new Response(bytes, {
			headers: { 'Content-Type': event.request.headers.get('content-type') ?? '' }
		}).formData();
	} catch (error) {
		if (error instanceof Error && 'status' in error && error.status === 413)
			return privateJson(
				{ error: 'The combined reference upload exceeds 12 MB.' },
				{ status: 413 }
			);
		return privateJson({ error: 'The image-editing request is invalid.' }, { status: 400 });
	}
	const fields = [...form.keys()];
	if (
		fields.some(
			(field) =>
				![
					'image',
					'prompt',
					'model',
					'settings',
					'providerSafetyDefaults',
					'agentBudget',
					'runId',
					'runLimitUsd',
					'clientJobId'
				].includes(field)
		) ||
		new Set(fields.filter((field) => field !== 'image')).size !==
			fields.filter((field) => field !== 'image').length
	) {
		return privateJson({ error: 'The image-editing request is invalid.' }, { status: 400 });
	}
	const promptInput = form.get('prompt');
	const prompt = typeof promptInput === 'string' ? promptInput : '';
	if (!prompt.trim() || prompt.length > MAX_DRAW_GENERATION_PROMPT_LENGTH) {
		return privateJson(
			{ error: 'Enter editing instructions of at most 32,000 characters.' },
			{ status: 422 }
		);
	}
	const requestedModel = form.get('model');
	const providerSafetyDefaults = form.get('providerSafetyDefaults');
	if (providerSafetyDefaults !== null && providerSafetyDefaults !== '1') {
		return privateJson({ error: 'The image-editing request is invalid.' }, { status: 400 });
	}
	const model =
		requestedModel === null
			? DEFAULT_DRAW_GENERATION_MODEL
			: getDrawGenerationModel(requestedModel);
	if (!model) {
		return privateJson(
			{ error: 'Choose one of the available image-generation models.' },
			{ status: 422 }
		);
	}
	const imageParts = form.getAll('image');
	const referenceLimit = getDrawGenerationReferenceLimit(model);
	if (imageParts.length > referenceLimit || (referenceLimit > 0 && imageParts.length === 0))
		return privateJson(
			{
				error:
					referenceLimit === 0
						? 'Text-to-image generation does not accept an image upload.'
						: `Attach one to ${referenceLimit} reference images for this model.`
			},
			{ status: 422 }
		);
	if (
		imageParts.some(
			(image) => !(image instanceof Blob) || !IMAGE_MIME_TYPE.test(image.type) || image.size === 0
		)
	)
		return privateJson(
			{ error: 'Select valid PNG, JPEG, WebP, AVIF, or GIF images.' },
			{ status: 422 }
		);
	const images = /** @type {Blob[]} */ (imageParts);
	if (images.reduce((size, image) => size + image.size, 0) > MAX_DRAW_GENERATION_REQUEST_BYTES)
		return privateJson({ error: 'The combined reference upload exceeds 12 MB.' }, { status: 413 });
	const adapter = getDrawingGenerationAdapter(model);
	const context = { env: event.platform?.env ?? {}, fetcher: fetchProvider };
	if (!adapter.configured(context.env))
		return privateJson(
			{ code: 'provider_unavailable', error: 'AI generation has not been configured.' },
			{ status: 503 }
		);
	let run;
	try {
		run = runAuthorization(form, user.isOwner);
	} catch (error) {
		return generationError(error, 'The run spending limit is invalid.');
	}
	const rawSettings = form.get('settings');
	/** @type {Record<string, unknown>} */
	let modelSettings;
	try {
		if (rawSettings !== null && (typeof rawSettings !== 'string' || rawSettings.length > 2_000)) {
			throw new Error('The selected model settings are invalid.');
		}
		modelSettings = resolveDrawGenerationModelSettings(
			model,
			rawSettings === null ? {} : JSON.parse(rawSettings)
		);
	} catch (error) {
		return privateJson(
			{
				error:
					error instanceof Error && !(error instanceof SyntaxError)
						? error.message
						: 'The selected model settings are invalid.'
			},
			{ status: 422 }
		);
	}
	const agentBudget = form.get('agentBudget');
	if (!user.isOwner && (providerSafetyDefaults === '1') !== (typeof agentBudget === 'string')) {
		return privateJson(
			{ error: 'The assistant requires an authorized spending limit.' },
			{ status: 402 }
		);
	}
	/** @type {{ token: string, spendingUsd: number } | undefined} */
	let chargedBudget;
	if (!user.isOwner && typeof agentBudget === 'string') {
		try {
			chargedBudget = await chargeDrawingAgentBudget(
				agentBudget,
				estimateDrawGenerationModelCost(model, modelSettings),
				/** @type {string} */ (event.platform?.env?.TOOLS_SESSION_SECRET)
			);
		} catch (error) {
			return privateJson(
				{
					error:
						error instanceof Error ? error.message : 'The assistant spending limit was reached.'
				},
				{ status: 402 }
			);
		}
	}

	const reservation = await reserveToolsAiUsage(
		event,
		user.id,
		'media',
		model.id,
		estimateToolsMediaReservation(estimateDrawGenerationModelCost(model, modelSettings)),
		run,
		generationLogMetadata(model, modelSettings, images.length)
	);
	if (reservation instanceof Response) return reservation;
	let submitted;
	try {
		submitted = await adapter.submit({ model, prompt, settings: modelSettings, images }, context);
	} catch (error) {
		await observeGeneration(event, user.id, reservation.id, {
			errorCode: generationLogError(error, 'submission_uncertain')
		});
		await finishToolsAiUsage(event, user.id, reservation.id, 'failed');
		return generationError(error, 'Generation could not be started.');
	}
	const registered = await toolsAiLedger(event, 'register', {
		userId: user.id,
		id: reservation.id,
		model: model.id,
		requestId: submitted.requestId,
		adapter: model.adapter
	});
	if (!registered.ok) {
		await observeGeneration(event, user.id, reservation.id, { errorCode: 'registration_failed' });
		await adapter
			.cancel({ model, requestId: submitted.requestId }, context)
			.then((cancelled) =>
				observeGeneration(event, user.id, reservation.id, { cancellation: cancelled.cancellation })
			)
			.catch(() => {});
		return privateJson(
			{
				code: 'job_registration_failed',
				error:
					'The generation could not be registered safely. Cancellation was requested; provider charges may still apply.'
			},
			{ status: 503 }
		);
	}
	return privateJson(
		{
			...submitted,
			model: model.id,
			adapter: model.adapter,
			status: 'IN_QUEUE',
			...(chargedBudget
				? { agentBudget: chargedBudget.token, spendingUsd: chargedBudget.spendingUsd }
				: {})
		},
		{ status: 202 }
	);
}

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 * @param {typeof fetch} [fetchProvider]
 */
export async function pollDrawingImage(event, fetchProvider = fetch) {
	const auth = await authenticate(event);
	if (auth instanceof Response) return auth;
	const { user } = auth;
	const requestId = event.url.searchParams.get('requestId');
	const model = getDrawGenerationModel(event.url.searchParams.get('model'));
	if (!requestId || !REQUEST_ID.test(requestId) || !model) {
		return privateJson({ error: 'The image-generation request is invalid.' }, { status: 422 });
	}
	const owned = await toolsAiLedger(event, 'owned-job', {
		poll: true,
		userId: user.id,
		model: model.id,
		requestId
	});
	if (!owned.ok) return owned;
	const job = await owned.json();
	if (typeof job.adapter !== 'string')
		return privateJson(
			{
				code: 'provider_unavailable',
				error: 'This job has no provider binding and cannot be rerouted.'
			},
			{ status: 503 }
		);
	const boundModel = { ...model, adapter: job.adapter };
	let adapter;
	try {
		adapter = getDrawingGenerationAdapter(boundModel);
	} catch (error) {
		return generationError(error, 'The generation provider is unavailable.');
	}
	const context = { env: event.platform?.env ?? {}, fetcher: fetchProvider };
	if (!adapter.configured(context.env))
		return privateJson(
			{ code: 'provider_unavailable', error: 'AI generation has not been configured.' },
			{ status: 503 }
		);
	try {
		const progress = await adapter.status({ model: boundModel, requestId }, context);
		await observeGeneration(event, user.id, job.id, {
			status: progress.status,
			...(progress.status === 'FAILED' ? { errorCode: 'generation_failed' } : {})
		});
		if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(progress.status)) {
			const recorded = await finishToolsAiUsage(
				event,
				user.id,
				job.id,
				progress.status === 'COMPLETED'
					? 'succeeded'
					: progress.status === 'CANCELLED'
						? 'cancelled'
						: 'failed'
			);
			if (!recorded.ok) return recorded;
		}
		if (progress.status === 'FAILED')
			return privateJson(
				{ code: 'generation_failed', error: 'The generation failed.' },
				{ status: 502 }
			);
		return privateJson(progress);
	} catch (error) {
		await observeGeneration(event, user.id, job.id, {
			errorCode: generationLogError(error, 'progress_unavailable')
		});
		return generationError(error, 'Generation progress is temporarily unavailable.');
	}
}

/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 * @param {typeof fetch} [fetchProvider]
 */
export async function cancelDrawingImage(event, fetchProvider = fetch) {
	const auth = await authenticate(event);
	if (auth instanceof Response) return auth;
	const { user } = auth;
	const requestId = event.url.searchParams.get('requestId');
	const model = getDrawGenerationModel(event.url.searchParams.get('model'));
	if (!requestId || !REQUEST_ID.test(requestId) || !model) {
		return privateJson({ error: 'The image-generation request is invalid.' }, { status: 422 });
	}
	const owned = await toolsAiLedger(event, 'owned-job', {
		userId: user.id,
		model: model.id,
		requestId
	});
	if (!owned.ok) return owned;
	const job = await owned.json();
	if (typeof job.adapter !== 'string')
		return privateJson(
			{
				code: 'provider_unavailable',
				error: 'This job has no provider binding and cannot be rerouted.'
			},
			{ status: 503 }
		);
	const boundModel = { ...model, adapter: job.adapter };
	let adapter;
	try {
		adapter = getDrawingGenerationAdapter(boundModel);
	} catch (error) {
		return generationError(error, 'The generation provider is unavailable.');
	}
	const context = { env: event.platform?.env ?? {}, fetcher: fetchProvider };
	if (!adapter.configured(context.env))
		return privateJson(
			{ code: 'provider_unavailable', error: 'AI generation has not been configured.' },
			{ status: 503 }
		);
	try {
		const cancelled = await adapter.cancel({ model: boundModel, requestId }, context);
		await observeGeneration(event, user.id, job.id, {
			cancellation: cancelled.cancellation,
			...(cancelled.cancellation === 'confirmed' ? { status: 'CANCELLED' } : {})
		});
		if (cancelled.cancellation === 'confirmed') {
			const recorded = await finishToolsAiUsage(event, user.id, job.id, 'cancelled');
			if (!recorded.ok) return recorded;
		}
		return privateJson(cancelled);
	} catch (error) {
		await observeGeneration(event, user.id, job.id, {
			errorCode: generationLogError(error, 'cancellation_unavailable')
		});
		return generationError(
			error,
			'The queued generation could not be cancelled. It may still complete and be charged.'
		);
	}
}
