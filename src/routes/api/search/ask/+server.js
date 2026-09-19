import { dev } from '$app/environment';
import { handleAssistantSearch } from '$lib/server/search-assistant.js';
import { loadSearchCatalog } from '$lib/server/search-loader.js';
import { reserveAiBudget } from '$lib/server/ai-budget.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, url, fetch, platform }) {
	return handleAssistantSearch(request, url, platform?.env, {
		dev,
		loadCatalog: () => loadSearchCatalog(fetch, platform),
		reserveBudget: reserveAiBudget
	});
}
