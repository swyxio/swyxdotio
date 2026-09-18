import { json } from '@sveltejs/kit';
import { parseSearchParams } from '$lib/server/site-search.js';
import { loadSiteSearch } from '$lib/server/search-loader.js';
/** @type {import('./$types').RequestHandler} */
export async function GET({ url, fetch, platform }) {
	let params;
	try {
		params = parseSearchParams(url.searchParams);
	} catch {
		return json({ error: 'Invalid search query or filters' }, { status: 400 });
	}
	try {
		const result = await loadSiteSearch(fetch, platform, params);
		// Source counts are shared with the archive; larger year/topic vocabularies stay in the full view.
		const { years, tags, ...suggestions } = result;
		return json(suggestions, {
			headers: {
				'Cache-Control': 'no-store',
				'Server-Timing': `catalog;dur=${result.timing.loadMs}, search;dur=${result.timing.searchMs}`
			}
		});
	} catch {
		return json(
			{ error: 'Search is temporarily unavailable' },
			{ status: 503, headers: { 'Cache-Control': 'no-store' } }
		);
	}
}
