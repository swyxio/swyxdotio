import {
	DRAW_FAL_MODELS,
	MAX_DRAW_FAL_REQUEST_BYTES,
	getDrawFalModel,
	getDrawFalModelParameters,
	getDrawFalModelOverrides,
	resolveDrawFalModelSettings,
	estimateDrawFalModelCost
} from './draw-fal-models.js';
import { estimateToolsMediaReservation } from './tools-ai-policy.js';

/** Hosting is distinct from the model maker (`provider`). No endpoint paths in UI descriptors. */
const falCatalog = {
	models: DRAW_FAL_MODELS.map(({ model: _endpoint, ...entry }) => {
		const transport = {
			adapter: 'fal',
			transportLabel: 'fal',
			disclosure:
				'Prompts and submitted references go to fal. Provider content rules apply; media links may be public-by-link and may expire.',
			maxRequestBytes: MAX_DRAW_FAL_REQUEST_BYTES
		};
		if ('imageInput' in entry) {
			const { imageInput: _field, ...descriptor } = entry;
			return { ...descriptor, ...transport };
		}
		return { ...entry, ...transport };
	}),
	parameters: getDrawFalModelParameters,
	overrides: getDrawFalModelOverrides,
	settings: resolveDrawFalModelSettings,
	estimate: estimateDrawFalModelCost,
	find: getDrawFalModel
};

const catalogs = { fal: falCatalog };
export const DRAW_GENERATION_MODELS = Object.values(catalogs).flatMap((catalog) => catalog.models);
export const MAX_DRAW_GENERATION_REQUEST_BYTES = MAX_DRAW_FAL_REQUEST_BYTES;
export const MAX_DRAW_GENERATION_PROMPT_LENGTH = 32_000;
export const DEFAULT_DRAW_GENERATION_MODEL = DRAW_GENERATION_MODELS[0];
export const DEFAULT_DRAW_TEXT_TO_IMAGE_MODEL = DRAW_GENERATION_MODELS.filter(
	(model) => model.kind === 'text-to-image'
).sort((left, right) => left.priceUsd - right.priceUsd)[0];

/** @typedef {typeof DRAW_GENERATION_MODELS[number]} DrawingGenerationModel */
/** @typedef {import('./draw-fal-models.js').DrawingFalParameter} DrawingGenerationParameter */
/** @param {unknown} id */
export function getDrawGenerationModel(id) {
	return DRAW_GENERATION_MODELS.find((model) => model.id === id);
}

/** Actual bounded transport capacity, including scalar provider endpoints. @param {DrawingGenerationModel} model */
export function getDrawGenerationReferenceLimit(model) {
	if (model.kind === 'text-to-image') return 0;
	const providerModel = catalogModel(model).model;
	if (
		model.kind === 'image-to-video' ||
		('imageInput' in providerModel && providerModel.imageInput === 'image_url')
	)
		return 1;
	return Math.min(16, model.referenceImages ?? 16);
}

/** @param {DrawingGenerationModel} descriptor */
function catalogModel(descriptor) {
	const catalog = Object.hasOwn(catalogs, descriptor.adapter)
		? catalogs[/** @type {keyof typeof catalogs} */ (descriptor.adapter)]
		: undefined;
	const model = catalog?.find(descriptor.id);
	if (!catalog || !model) throw new Error('This generation model is unavailable.');
	return { catalog, model };
}

/** @param {DrawingGenerationModel} descriptor */
export function getDrawGenerationModelParameters(descriptor) {
	const { catalog, model } = catalogModel(descriptor);
	return catalog.parameters(model);
}
/** @param {DrawingGenerationModel} descriptor @param {Record<string, unknown>} overrides */
export function getDrawGenerationModelOverrides(descriptor, overrides) {
	const { catalog, model } = catalogModel(descriptor);
	return catalog.overrides(model, overrides);
}
/** @param {DrawingGenerationModel} descriptor @param {unknown} [overrides] */
export function resolveDrawGenerationModelSettings(descriptor, overrides = {}) {
	const { catalog, model } = catalogModel(descriptor);
	return catalog.settings(model, overrides);
}
/** @param {DrawingGenerationModel} descriptor @param {Record<string, unknown>} [settings] */
export function estimateDrawGenerationModelCost(descriptor, settings) {
	const { catalog, model } = catalogModel(descriptor);
	return catalog.estimate(model, settings);
}
/** Conservative account/run reservations, not an exact provider billing ceiling. */
export const estimateDrawGenerationReservation = estimateToolsMediaReservation;
/** @param {number} value */
export function formatDrawGenerationCost(value) {
	return `$${value.toFixed(value < 0.01 ? 3 : 2)}`;
}
