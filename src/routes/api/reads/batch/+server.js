import { error, json } from '@sveltejs/kit';
import { readContentManifest } from '$lib/content-manifest.js';
import { getReadCounts, READ_COUNT_BATCH_LIMIT, resolveReadCounterKey } from '$lib/read-counter.js';
import { displayedReadCount } from '$lib/server/historical-read-estimates.js';

export const prerender = false;

const GET_HEADERS = {
	'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
};

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, platform }) {
	const requestedKeys = [...new Set(url.searchParams.getAll('key'))];
	if (!requestedKeys.length) throw error(400, 'At least one read-count key is required');
	if (requestedKeys.length > READ_COUNT_BATCH_LIMIT) throw error(400, 'Too many read-count keys');

	const database = platform?.env?.READ_COUNTERS;
	if (!database) throw error(503, 'Read counter is unavailable');
	const manifest = await readContentManifest(platform?.env?.CONTENT_MANIFEST);
	const resolved = requestedKeys.map((requestedKey) => ({
		requestedKey,
		pageKey: resolveReadCounterKey(manifest, requestedKey)
	}));
	if (resolved.some(({ pageKey }) => !pageKey)) throw error(404, 'Unknown public page');

	try {
		const sampledReads = await getReadCounts(
			database,
			resolved.map(({ pageKey }) => /** @type {string} */ (pageKey))
		);
		return json(
			{
				reads: Object.fromEntries(
					resolved.map(({ requestedKey, pageKey }) => [
						requestedKey,
						displayedReadCount(requestedKey, sampledReads.get(pageKey) ?? 0)
					])
				)
			},
			{ headers: GET_HEADERS }
		);
	} catch (cause) {
		console.error('Read counter batch lookup failed', {
			requestedCount: requestedKeys.length,
			errorName: cause instanceof Error ? cause.name : typeof cause
		});
		throw error(503, 'Read counter is unavailable');
	}
}
