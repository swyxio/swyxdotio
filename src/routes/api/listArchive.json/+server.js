import { toArchiveContentItem } from '$lib/content-list';
import { listAllContent } from '$lib/list-all-content';

/**
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ fetch, setHeaders, platform }) {
	const list = (await listAllContent(fetch, platform)).map(toArchiveContentItem);
	setHeaders({
		'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800'
	});
	return new Response(JSON.stringify(list), {
		headers: {
			'content-type': 'application/json; charset=utf-8'
		}
	});
}
