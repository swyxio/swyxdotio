export const DEFAULT_LOOKBACK_MINUTES = 60;
export const DEFAULT_MIN_SAMPLE_COUNT = 20;
export const DEFAULT_EXCEEDED_RESOURCES_MIN_COUNT = 5;
export const DEFAULT_EXCEEDED_RESOURCES_MAX_RATE = 0.005;
export const PRESENCE_BUCKET_SECONDS = 60 * 60;
export const MONITOR_READ_KEYS = Object.freeze(['home', 'learn-in-public']);

/** @param {number} capturedAt @param {number} lookbackMinutes */
export function completedPresenceBucketWindow(capturedAt, lookbackMinutes) {
	const end = Math.floor(capturedAt / PRESENCE_BUCKET_SECONDS) * PRESENCE_BUCKET_SECONDS;
	const bucketCount = Math.max(1, Math.ceil(lookbackMinutes / 60));
	return { start: end - bucketCount * PRESENCE_BUCKET_SECONDS, end };
}

/** @param {string} baseUrl */
export function monitorSmokeUrls(baseUrl) {
	const readsUrl = new URL('/api/reads/batch', baseUrl);
	for (const key of MONITOR_READ_KEYS) readsUrl.searchParams.append('key', key);
	return {
		readsUrl,
		presenceUrl: new URL('/api/presence/home', baseUrl)
	};
}

/** @param {number} sampleTotal @param {number | null} capturedSampleTotal */
export function calibrationWindowSampleCount(sampleTotal, capturedSampleTotal) {
	if (capturedSampleTotal === null) return Math.max(0, sampleTotal);
	return Math.max(0, sampleTotal - capturedSampleTotal);
}

/** @param {Record<string, string | undefined>} env */
export function monitorConfig(env) {
	return {
		baseUrl: env.MONITOR_BASE_URL || 'https://swyx.io',
		siteScriptName: env.MONITOR_SITE_SCRIPT_NAME || 'swyxdotio',
		lookbackMinutes: positiveInt(env.MONITOR_LOOKBACK_MINUTES, DEFAULT_LOOKBACK_MINUTES),
		minSampleCount: positiveInt(env.MONITOR_MIN_SAMPLE_COUNT, DEFAULT_MIN_SAMPLE_COUNT),
		exceededResourcesMinCount: positiveInt(
			env.MONITOR_EXCEEDED_RESOURCES_MIN_COUNT,
			DEFAULT_EXCEEDED_RESOURCES_MIN_COUNT
		),
		exceededResourcesMaxRate: positiveNumber(
			env.MONITOR_EXCEEDED_RESOURCES_MAX_RATE,
			DEFAULT_EXCEEDED_RESOURCES_MAX_RATE
		)
	};
}

/**
 * @param {{
 *  calibrationSampleCount: number;
 *  readBatchOk: boolean;
 *  presenceHttpOk: boolean;
 *  calibrationStatus: string | null;
 *  workerRequests: number | null;
 *  workerExceededResources: number | null;
 *  workerErrors: number | null;
 *  presenceCounts: { roomFull: number; malformed: number; rateLimited: number; };
 *  config: ReturnType<typeof monitorConfig>;
 * }} input
 */
export function analyzeMonitor(input) {
	const alerts = [];

	if (input.calibrationSampleCount < input.config.minSampleCount) {
		alerts.push(
			`Calibration remains statistically inactive: ${input.calibrationSampleCount}/${input.config.minSampleCount} D1 samples in the current window`
		);
	}

	if (!input.readBatchOk) alerts.push('Public read-count smoke check failed');
	if (!input.presenceHttpOk) alerts.push('Presence HTTP gating smoke check failed');

	if (
		input.workerRequests !== null &&
		input.workerExceededResources !== null &&
		input.workerRequests > 0
	) {
		const exceededRate = input.workerExceededResources / input.workerRequests;
		if (
			input.workerExceededResources >= input.config.exceededResourcesMinCount &&
			exceededRate >= input.config.exceededResourcesMaxRate
		) {
			alerts.push(
				`Main Worker exceededResources is elevated: ${input.workerExceededResources}/${input.workerRequests} in the last ${input.config.lookbackMinutes}m`
			);
		}
	}

	if (input.presenceCounts.roomFull > 0) {
		alerts.push(`Presence room-full events detected: ${input.presenceCounts.roomFull}`);
	}
	if (input.presenceCounts.malformed > 0) {
		alerts.push(`Presence malformed-frame closes detected: ${input.presenceCounts.malformed}`);
	}
	if (input.presenceCounts.rateLimited > 0) {
		alerts.push(`Presence rate-limit events detected: ${input.presenceCounts.rateLimited}`);
	}

	if (input.calibrationStatus === 'delivery_anomaly') {
		alerts.push('Latest read calibration row reports delivery_anomaly');
	}

	return {
		status: alerts.length ? 'alert' : 'ok',
		alerts
	};
}

/**
 * @param {{
 *  capturedAt: number;
 *  config: ReturnType<typeof monitorConfig>;
 *  totals: { readCount: number; sampleCount: number; };
 *  calibration: { captured_at: number | null; d1_sample_total: number | null; status: string | null; };
 *  calibrationSampleCount: number;
 *  smoke: { readBatchOk: boolean; presenceHttpOk: boolean; publicReads: Record<string, number>; };
 *  worker: { requests: number | null; errors: number | null; exceededResources: number | null; clientDisconnected: number | null; };
 *  presence: { roomFull: number; malformed: number; rateLimited: number; };
 *  analysis: ReturnType<typeof analyzeMonitor>;
 * }} snapshot
 */
export function renderMonitorReport(snapshot) {
	const capturedAt = new Date(snapshot.capturedAt * 1000).toISOString();
	const workerWindow =
		snapshot.worker.requests === null
			? 'Unavailable (set CLOUDFLARE_ANALYTICS_TOKEN to enable Worker status monitoring)'
			: `${snapshot.worker.requests.toLocaleString('en-US')} requests, ${snapshot.worker.errors?.toLocaleString('en-US') ?? 0} errors, ${snapshot.worker.exceededResources?.toLocaleString('en-US') ?? 0} exceededResources`;
	const alerts =
		snapshot.analysis.alerts.length > 0
			? snapshot.analysis.alerts.map((line) => `- ${line}`).join('\n')
			: '- none';

	return `# Read and presence monitor snapshot

- Captured at: ${capturedAt}
- Status: ${snapshot.analysis.status}
- Lookback: ${snapshot.config.lookbackMinutes} minutes
- D1 totals: ${snapshot.totals.readCount.toLocaleString('en-US')} reads, ${snapshot.totals.sampleCount.toLocaleString('en-US')} samples
- Current calibration window: ${snapshot.calibrationSampleCount.toLocaleString('en-US')}/${snapshot.config.minSampleCount.toLocaleString('en-US')} samples
- Latest calibration row: ${snapshot.calibration.status ?? 'none'}${snapshot.calibration.captured_at ? ` at ${new Date(snapshot.calibration.captured_at * 1000).toISOString()}` : ''}
- Public read smoke: ${snapshot.smoke.readBatchOk ? 'ok' : 'failed'}
- Presence HTTP smoke: ${snapshot.smoke.presenceHttpOk ? 'ok' : 'failed'}
- Main Worker window: ${workerWindow}
- Presence anomalies: room-full ${snapshot.presence.roomFull}, malformed ${snapshot.presence.malformed}, rate-limited ${snapshot.presence.rateLimited}
- Public reads checked: ${Object.entries(snapshot.smoke.publicReads)
		.map(([key, value]) => `${key}=${value}`)
		.join(', ')}

## Alerts

${alerts}
`;
}

/** @param {string | undefined} raw @param {number} fallback */
function positiveInt(raw, fallback) {
	const value = Number.parseInt(raw || '', 10);
	return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

/** @param {string | undefined} raw @param {number} fallback */
function positiveNumber(raw, fallback) {
	const value = Number(raw);
	return Number.isFinite(value) && value > 0 ? value : fallback;
}
