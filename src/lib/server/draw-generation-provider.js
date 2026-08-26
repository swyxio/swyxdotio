import { drawingFalAdapter } from './draw-fal-adapter.js';

import { DrawingGenerationError } from './draw-generation-error.js';
export { DrawingGenerationError } from './draw-generation-error.js';

/**
 * @typedef {{ model: { id: string, adapter: string }, requestId: string }} GenerationJob
 * @typedef {{ env: Record<string, any>, fetcher: typeof fetch }} ProviderContext
 * @typedef {{ model: { id: string, adapter: string }, prompt: string, image?: Blob, images?: Blob[], settings: Record<string, unknown> }} GenerationInput
 * @typedef {{
 *   configured: (env: Record<string, any>) => boolean,
 *   submit: (input: GenerationInput, context: ProviderContext) => Promise<{ requestId: string, queuePosition?: number }>,
 *   status: (job: GenerationJob, context: ProviderContext) => Promise<{ status: string, queuePosition?: number, message?: string, image?: string, video?: string, model?: string }>,
 *   cancel: (job: GenerationJob, context: ProviderContext) => Promise<{ status: string, cancellation: 'requested'|'confirmed'|'unsupported' }>
 * }} DrawingGenerationAdapter
 */

/** @type {Record<string, DrawingGenerationAdapter>} */
export const drawingGenerationAdapters = { fal: drawingFalAdapter };

/** Registry injection makes the same boundary testable with a second adapter, without integrating a service. */
export function getDrawingGenerationAdapter(
	/** @type {{adapter: string}} */ model,
	/** @type {Record<string, DrawingGenerationAdapter>} */ adapters = drawingGenerationAdapters
) {
	const adapter = Object.hasOwn(adapters, model.adapter) ? adapters[model.adapter] : undefined;
	if (!adapter)
		throw new DrawingGenerationError(
			'This generation provider is unavailable.',
			503,
			'provider_unavailable'
		);
	return adapter;
}
