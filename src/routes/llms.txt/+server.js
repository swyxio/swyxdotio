import { crawlerResponse, loadLlmsIndex } from '$lib/server/llms';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ fetch }) {
	return crawlerResponse(await loadLlmsIndex(fetch), 'text/plain');
}
