import { PRODUCER_SCRIPT_NAME, faultBucket, isRuntimeFaultOutcome } from './classify.js';

const UPSERT_FAULT_BUCKET = `INSERT INTO worker_fault_hourly (
	bucket_start,
	route_class,
	outcome,
	duration_bucket,
	count
) VALUES (?1, ?2, ?3, ?4, ?5)
ON CONFLICT (bucket_start, route_class, outcome, duration_bucket)
DO UPDATE SET count = count + excluded.count`;

export default {
	async tail(events, env, ctx) {
		const buckets = collectFaultBuckets(events, env.PRODUCER_SCRIPT_NAME || PRODUCER_SCRIPT_NAME);
		if (buckets.length === 0) return;

		ctx.waitUntil(
			writeFaultBuckets(env.READ_COUNTERS, buckets).catch(() => {
				console.error(
					JSON.stringify({ event: 'fault_attribution_write_failed', bucketCount: buckets.length })
				);
			})
		);
	}
};

/**
 * @param {unknown} events
 * @param {string} producerScriptName
 * @param {number} [fallbackNowMs]
 */
export function collectFaultBuckets(events, producerScriptName, fallbackNowMs = Date.now()) {
	const grouped = new Map();
	for (const event of Array.isArray(events) ? events : []) {
		if (!event || typeof event !== 'object') continue;
		const input = /** @type {Record<string, unknown>} */ (event);
		if (input.scriptName !== producerScriptName || !isRuntimeFaultOutcome(input.outcome)) continue;
		const bucket = faultBucket(input, fallbackNowMs);
		if (!bucket) continue;
		const key = [bucket.bucketStart, bucket.routeClass, bucket.outcome, bucket.durationBucket].join(
			'|'
		);
		const existing = grouped.get(key);
		if (existing) existing.count += 1;
		else grouped.set(key, bucket);
	}
	return [...grouped.values()];
}

/** @param {D1Database} database @param {ReturnType<typeof collectFaultBuckets>} buckets */
export async function writeFaultBuckets(database, buckets) {
	if (buckets.length === 0) return;
	await database.batch(
		buckets.map((bucket) =>
			database
				.prepare(UPSERT_FAULT_BUCKET)
				.bind(
					bucket.bucketStart,
					bucket.routeClass,
					bucket.outcome,
					bucket.durationBucket,
					bucket.count
				)
		)
	);
}
