/**
 * Coarse lifetime read estimates from before the sampled D1 counter launched.
 *
 * These are editorial estimates, not analytics measurements. The v1 research
 * used public Hacker News engagement, DEV reactions/comments, GitHub citations,
 * search results, and known social reach as order-of-magnitude proxies. The
 * initial model was then multiplied by five after an editorial calibration.
 *
 * Keep this map static and sparse: articles not listed here intentionally start
 * at zero. Add or revise entries only when there is meaningful new evidence,
 * and update HISTORICAL_READ_ESTIMATE_VERSION when changing the methodology.
 */
export const HISTORICAL_READ_ESTIMATE_VERSION = 'historical_estimate_v1';

/** @type {Readonly<Record<string, number>>} */
export const HISTORICAL_READ_ESTIMATES = Object.freeze({
	'learn-in-public': 10_000_000,
	'create-luck': 1_500_000,
	'cloudflare-go': 750_000,
	'js-third-age': 625_000,
	'css-100-bytes': 500_000,
	'svelte-sites-react-apps': 375_000,
	'no-smarter': 375_000,
	'markdown-mistakes': 250_000,
	'why-tailwind': 250_000,
	'time-management-randy-pausch': 250_000,
	'webperf-tests': 250_000,
	'client-server-battle': 200_000,
	'part-time-creator-manifesto': 200_000,
	'api-economy': 175_000,
	'writing-mise-en-place': 150_000,
	'career-ladders': 150_000,
	'measuring-devrel': 150_000,
	'turborepo-why': 150_000,
	'react-server-components-demo': 125_000,
	'prettier-eslint-react': 125_000,
	'self-provisioning-runtime': 100_000,
	'why-temporal': 100_000,
	'the-end-of-localhost': 100_000,
	'coronavirus-recession': 100_000
});

/** @param {string} requestedKey */
export function historicalReadEstimate(requestedKey) {
	const estimate = HISTORICAL_READ_ESTIMATES[requestedKey];
	return Number.isSafeInteger(estimate) && estimate >= 0 ? estimate : 0;
}

/** @param {string} requestedKey @param {number} sampledReads */
export function displayedReadCount(requestedKey, sampledReads) {
	const liveReads = Number.isSafeInteger(sampledReads) && sampledReads >= 0 ? sampledReads : 0;
	return historicalReadEstimate(requestedKey) + liveReads;
}
