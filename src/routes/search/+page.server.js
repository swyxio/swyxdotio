import { error } from '@sveltejs/kit';
import { parseSearchParams } from '$lib/server/site-search.js';
import { loadSiteSearch } from '$lib/server/search-loader.js';
/** @type {import('./$types').PageServerLoad} */
export async function load({ url, fetch, platform, setHeaders }) {
	setHeaders({ 'Cache-Control': 'no-store' });
	let params;
	try {
		params = parseSearchParams(url.searchParams);
	} catch {
		error(400, 'Invalid search query or filters');
	}
	try {
		return { ...(await loadSiteSearch(fetch, platform, params)), unavailable: false };
	} catch {
		return {
			...params,
			results: [],
			total: 0,
			years: /** @type {string[]} */ ([]),
			tags: /** @type {string[]} */ ([]),
			unavailable: true
		};
	}
}
