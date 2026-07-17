export const CALIBRATION_MIN_SAMPLES = 20;
export const CALIBRATION_WEIGHT = 200;

/** @param {Date} now @param {number | null} previousCapturedAt */
export function calibrationWindow(now, previousCapturedAt) {
	if (!previousCapturedAt) return null;
	const start = new Date(previousCapturedAt * 1000);
	const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
	return {
		startDate: start.toISOString().slice(0, 10),
		endDate: end.toISOString().slice(0, 10)
	};
}

/**
 * @param {{
 *   d1ReadDelta: number;
 *   d1SampleDelta: number;
 *   gaEngagedEvents: number;
 *   gaSessions: number;
 *   gaTotalUsers: number;
 *   gaPageViews: number;
 *   previousD1SampleDelta?: number | null;
 * }} input
 */
export function analyzeCalibration(input) {
	const deliveryRatio = safeRatio(input.d1SampleDelta, input.gaEngagedEvents);
	const correctionFactor = safeRatio(input.d1ReadDelta, input.gaSessions * CALIBRATION_WEIGHT);
	const monthRatio = safeRatio(input.d1SampleDelta, input.previousD1SampleDelta ?? 0);

	let status = 'ok';
	if (input.d1SampleDelta < CALIBRATION_MIN_SAMPLES) status = 'insufficient_data';
	else if (deliveryRatio === null || deliveryRatio < 0.5 || deliveryRatio > 2) {
		status = 'delivery_anomaly';
	} else if (
		(input.previousD1SampleDelta ?? 0) >= 100 &&
		(monthRatio === null || monthRatio < 0.2 || monthRatio > 5)
	) {
		status = 'traffic_anomaly';
	}

	return {
		...input,
		deliveryRatio,
		correctionFactor,
		correctedGaEstimatedReads:
			correctionFactor === null
				? null
				: Math.round(input.gaSessions * CALIBRATION_WEIGHT * correctionFactor),
		status,
		shouldAlert: status === 'delivery_anomaly' || status === 'traffic_anomaly'
	};
}

/**
 * @param {{ startDate: string; endDate: string }} window
 * @param {ReturnType<typeof analyzeCalibration>} analysis
 */
export function renderCalibrationReport(window, analysis) {
	return `# Read-counter calibration: ${window.startDate} to ${window.endDate}

| Signal | Value |
| --- | ---: |
| D1 sampled events | ${analysis.d1SampleDelta.toLocaleString('en-US')} |
| D1 weighted engaged reads | ${analysis.d1ReadDelta.toLocaleString('en-US')} |
| GA4 engaged_read events | ${analysis.gaEngagedEvents.toLocaleString('en-US')} |
| GA4 sampled sessions | ${analysis.gaSessions.toLocaleString('en-US')} |
| GA4 sampled users | ${analysis.gaTotalUsers.toLocaleString('en-US')} |
| GA4 page views | ${analysis.gaPageViews.toLocaleString('en-US')} |
| D1 / GA4 event delivery ratio | ${formatRatio(analysis.deliveryRatio)} |
| Site-wide session correction factor | ${formatRatio(analysis.correctionFactor)} |
| Corrected GA4 engaged-read estimate | ${analysis.correctedGaEstimatedReads?.toLocaleString('en-US') ?? 'n/a'} |
| Status | ${analysis.status} |

The correction factor is diagnostic and applies only to this reporting window.
It does not rewrite static historical estimates. Alerts are emitted only for a
greater-than-2x delivery mismatch or a greater-than-5x month-over-month change
after the minimum sample threshold is met.`;
}

/** @param {number} numerator @param {number} denominator */
function safeRatio(numerator, denominator) {
	if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
	return numerator / denominator;
}

/** @param {number | null} value */
function formatRatio(value) {
	return value === null ? 'n/a' : `${value.toFixed(2)}x`;
}
