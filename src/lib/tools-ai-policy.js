/** Public limits are also enforced by the private durable admission ledger. */
export const TOOLS_AI_POLICY = Object.freeze({
	assistantTurnsPerHour: 20,
	mediaJobsPerHour: 5,
	userEstimatedDailyUsd: 2,
	siteEstimatedDailyUsd: 20,
	retentionDays: 30,
	pollMinimumIntervalMs: 500,
	assistantReservationUsd: 0.05,
	mediaReservationMultiplier: 1.25,
	mediaMinimumReservationUsd: 0.05
});

export const TOOLS_AI_LOGGING = Object.freeze({
	retentionDays: TOOLS_AI_POLICY.retentionDays,
	fields: [
		'Google account ID',
		'request and reservation IDs',
		'generation run and client job IDs',
		'hosting adapter',
		'model maker and media modality',
		'catalog cost estimate and requested output/reference counts',
		'requested dimensions, resolution and video duration',
		'server-observed lifecycle timestamps, provider status, cancellation state and bounded error codes',
		'model',
		'timestamp',
		'status',
		'estimated reserved cost',
		'authorized run spending limit'
	],
	excludes: ['prompts', 'images', 'generated content', 'tokens', 'provider keys']
});

/** Estimates are conservative admission reservations, not actual provider billing. @param {number} costUsd */
export function estimateToolsMediaReservation(costUsd) {
	if (!Number.isFinite(costUsd) || costUsd < 0) throw new Error('Invalid media cost estimate');
	return (
		Math.ceil(
			Math.max(
				TOOLS_AI_POLICY.mediaMinimumReservationUsd,
				costUsd * TOOLS_AI_POLICY.mediaReservationMultiplier
			) * 1_000_000
		) / 1_000_000
	);
}
