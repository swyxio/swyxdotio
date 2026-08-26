/** Bounded operational metadata, never recipes, prompts, URLs, output bytes, or provider error text. */
export const GENERATION_MODALITIES = ['text-to-image', 'image-edit', 'image-to-video'];
export const GENERATION_PROVIDER_STATUSES = [
	'IN_QUEUE',
	'IN_PROGRESS',
	'COMPLETED',
	'FAILED',
	'CANCELLED'
];
export const GENERATION_CANCELLATIONS = ['requested', 'confirmed', 'unsupported'];
export const GENERATION_ERROR_CODES = [
	'provider_unavailable',
	'provider_busy',
	'input_rejected',
	'content_policy_violation',
	'policy_violation',
	'generation_failed',
	'submission_uncertain',
	'registration_failed',
	'progress_unavailable',
	'cancellation_unavailable'
];
export const GENERATION_METADATA_KEYS = [
	'adapter',
	'modelMaker',
	'modality',
	'estimatedCostUsd',
	'requestedOutputs',
	'referenceCount',
	'width',
	'height',
	'resolution',
	'durationSeconds'
];

/** @param {unknown} value @param {number} min @param {number} max */
const integer = (value, min, max) =>
	typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
/** @param {unknown} value */
export function validGenerationMetadata(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const m = /** @type {Record<string,unknown>} */ (value);
	return (
		Object.keys(m).length === GENERATION_METADATA_KEYS.length &&
		Object.keys(m).every((k) => GENERATION_METADATA_KEYS.includes(k)) &&
		typeof m.adapter === 'string' &&
		/^[A-Za-z0-9_-]{1,128}$/.test(m.adapter) &&
		typeof m.modelMaker === 'string' &&
		/^[A-Za-z0-9 ._-]{1,80}$/.test(m.modelMaker) &&
		typeof m.modality === 'string' &&
		GENERATION_MODALITIES.includes(m.modality) &&
		typeof m.estimatedCostUsd === 'number' &&
		m.estimatedCostUsd >= 0 &&
		Number.isSafeInteger(Math.round(m.estimatedCostUsd * 1_000_000)) &&
		integer(m.requestedOutputs, 1, 100) &&
		integer(m.referenceCount, 0, 32) &&
		(m.width === null || integer(m.width, 1, 16384)) &&
		(m.height === null || integer(m.height, 1, 16384)) &&
		(m.resolution === null ||
			(typeof m.resolution === 'string' && /^(?:[1-8][kK]|[0-9]{3,4}[pP])$/.test(m.resolution))) &&
		(m.durationSeconds === null || integer(m.durationSeconds, 1, 3600))
	);
}

/** @param {unknown} value */
export function validGenerationObservation(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const o = /** @type {Record<string,unknown>} */ (value);
	return (
		Object.keys(o).length > 0 &&
		Object.keys(o).every((k) => ['status', 'cancellation', 'errorCode'].includes(k)) &&
		(o.status === undefined ||
			(typeof o.status === 'string' && GENERATION_PROVIDER_STATUSES.includes(o.status))) &&
		(o.cancellation === undefined ||
			(typeof o.cancellation === 'string' && GENERATION_CANCELLATIONS.includes(o.cancellation))) &&
		(o.errorCode === undefined ||
			(typeof o.errorCode === 'string' && GENERATION_ERROR_CODES.includes(o.errorCode)))
	);
}
