import { dev } from '$app/environment';
import { semanticMatches, scheduleEmbeddingWarmup } from './search-embeddings.js';
import redirectSource from '../../../_redirects?raw';
import { listAllContent } from '../list-all-content.js';
import {
	cachedSearchIndex,
	projectSearchCatalog,
	searchCatalog,
	parseSearchRedirects
} from './site-search.js';
const redirects = parseSearchRedirects(redirectSource);
/** @type {Promise<import('../types').ContentItem[]> | undefined} */
let pending;
/** Public server-only catalog, shared by keyword search and the assistant.
 * @param {typeof globalThis.fetch} fetch @param {App.Platform | undefined} platform */
export async function loadSearchCatalog(fetch, platform) {
	// Always consult the established loader lifecycle, including KV generations and expiry.
	// Concurrent calls share the load; a failed load is never retained as an index promise.
	if (!pending)
		pending = listAllContent(fetch, platform).finally(() => {
			pending = undefined;
		});
	const items = await pending;
	const records = projectSearchCatalog(items, redirects);
	return cachedSearchIndex(records, items);
}
/** @param {typeof globalThis.fetch} fetch @param {App.Platform | undefined} platform @param {ReturnType<import('./site-search.js').parseSearchParams>} params */
export async function loadSiteSearch(fetch, platform, params) {
	const started = performance.now();
	const catalog = await loadSearchCatalog(fetch, platform);
	const indexed = performance.now();
	const semantic = await semanticMatches(catalog, dev ? undefined : platform, params.q);
	const result = searchCatalog(catalog, params, semantic);
	if (!dev && params.q) scheduleEmbeddingWarmup(catalog, platform);
	return {
		...result,
		timing: {
			loadMs: Math.round((indexed - started) * 100) / 100,
			searchMs: Math.round((performance.now() - indexed) * 100) / 100
		}
	};
}
