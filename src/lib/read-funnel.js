export const READ_FUNNEL_CLIENT_STAGES = /** @type {const} */ ([
	'eligible',
	'visible_8s',
	'depth_25',
	'sample_selected'
]);
export const READ_FUNNEL_ACCEPTED_STAGE = 'd1_accepted';
const READ_FUNNEL_CLIENT_STAGE_SET = new Set(
	/** @type {readonly string[]} */ (READ_FUNNEL_CLIENT_STAGES)
);
const READ_FUNNEL_STAGES = new Set([...READ_FUNNEL_CLIENT_STAGES, READ_FUNNEL_ACCEPTED_STAGE]);

/** @param {unknown} value */
export function isReadFunnelClientStage(value) {
	return typeof value === 'string' && READ_FUNNEL_CLIENT_STAGE_SET.has(value);
}

/**
 * Accept only the pathless stage contract. Extra fields are rejected so a
 * caller cannot accidentally add identity or content to persisted telemetry.
 * @param {unknown} value
 */
export function normalizeReadFunnelPayload(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const input = /** @type {Record<string, unknown>} */ (value);
	if (Object.keys(input).length !== 1 || !isReadFunnelClientStage(input.stage)) return null;
	return { stage: /** @type {string} */ (input.stage) };
}

/** @param {{ globalPrivacyControl?: boolean; doNotTrack?: string | null }} navigatorLike */
export function hasReadFunnelPrivacyOptOut(navigatorLike) {
	const doNotTrack = navigatorLike.doNotTrack?.toLowerCase();
	return navigatorLike.globalPrivacyControl === true || doNotTrack === '1' || doNotTrack === 'yes';
}

/** @param {unknown} pageKey */
export function isArticleReadFunnelKey(pageKey) {
	return typeof pageKey === 'string' && pageKey.startsWith('article:');
}

/**
 * Cloudflare's limiter keys are ephemeral and never enter D1. Funnel traffic
 * has its own limiter so it cannot consume the sampled-read write allowance.
 * @param {{ READ_FUNNEL_RATE_LIMITER?: RateLimit }} env
 * @param {string} clientAddress
 */
export async function isReadFunnelRateAllowed(env, clientAddress) {
	if (!env.READ_FUNNEL_RATE_LIMITER) return true;
	try {
		return (await env.READ_FUNNEL_RATE_LIMITER.limit({ key: `ip:${clientAddress}` })).success;
	} catch {
		return false;
	}
}

/**
 * Increment one global hourly stage. The timestamp and bucket are server-owned;
 * no page path, reader identity, or content is accepted by this function.
 * @param {D1Database} database
 * @param {string} stage
 * @param {number} [nowSeconds]
 */
export async function incrementReadFunnelStage(
	database,
	stage,
	nowSeconds = Math.floor(Date.now() / 1000)
) {
	if (!READ_FUNNEL_STAGES.has(stage)) throw new TypeError('Invalid read funnel stage');
	const bucketStart = Math.floor(nowSeconds / 3600) * 3600;
	const row = await database
		.prepare(
			`INSERT INTO read_funnel_hourly (bucket_start, stage, count)
			 VALUES (?1, ?2, 1)
			 ON CONFLICT(bucket_start, stage) DO UPDATE SET count = count + 1
			 RETURNING count`
		)
		.bind(bucketStart, stage)
		.first();
	return Number(row?.count ?? 0);
}
