import { estimateDrawGenerationModelCost } from '../draw-generation-models.js';
import { GENERATION_ERROR_CODES, validGenerationMetadata } from '../tools-generation-telemetry.js';
import { toolsAiLedger } from './tools-ai-usage.js';

/** Build only allowlisted metadata from the validated server catalog/settings. Never spread form/provider data.
 * @param {import('../draw-generation-models.js').DrawingGenerationModel} model
 * @param {Record<string,unknown>} settings @param {number} referenceCount */
export function generationLogMetadata(model, settings, referenceCount) {
	const size =
		settings.image_size && typeof settings.image_size === 'object'
			? /** @type {{width?:unknown,height?:unknown}} */ (settings.image_size)
			: null;
	const duration = settings.duration;
	const durationSeconds =
		typeof duration === 'number'
			? duration
			: typeof duration === 'string' && /^\d+s?$/.test(duration)
				? Number(duration.replace(/s$/, ''))
				: null;
	const resolution =
		typeof settings.resolution === 'string' &&
		/^(?:[1-8][kK]|[0-9]{3,4}[pP])$/.test(settings.resolution)
			? settings.resolution
			: null;
	const metadata = {
		adapter: model.adapter,
		modelMaker: model.provider,
		modality: model.kind,
		estimatedCostUsd: estimateDrawGenerationModelCost(model, settings),
		requestedOutputs: 1,
		referenceCount,
		width: typeof size?.width === 'number' ? size.width : null,
		height: typeof size?.height === 'number' ? size.height : null,
		resolution,
		durationSeconds
	};
	if (!validGenerationMetadata(metadata)) throw new Error('Invalid generation log metadata.');
	return metadata;
}

/** Telemetry cannot break delivery of a generated result. The existing reservation/settlement remains authoritative.
 * @param {Pick<import('@sveltejs/kit').RequestEvent,'platform'>} event @param {string} userId @param {string} id
 * @param {{status?:string,cancellation?:string,errorCode?:string}} observation */
export async function observeGeneration(event, userId, id, observation) {
	const result = await toolsAiLedger(event, 'generation-observe', { userId, id, observation });
	if (!result.ok)
		console.warn(JSON.stringify({ event: 'generation_observation_unavailable', count: 1 }));
	return result.ok;
}

/** Freeform errors may include private data; keep only known bounded classification codes.
 * @param {unknown} error @param {string} fallback */
export function generationLogError(error, fallback) {
	const code =
		error && typeof error === 'object' ? /** @type {{code?:unknown}} */ (error).code : null;
	return typeof code === 'string' &&
		GENERATION_ERROR_CODES.includes(code) &&
		code !== 'generation_failed'
		? code
		: fallback;
}
