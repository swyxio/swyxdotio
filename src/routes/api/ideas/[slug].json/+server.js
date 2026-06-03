import { getContent } from '$lib/content';
import { isBlogSlug } from '$lib/slug';
import { error } from '@sveltejs/kit';
/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function GET({ fetch, params, setHeaders }) {
	const { slug } = params;
	let data;
	if (!slug) throw error(404, ' - no slug provided');
	if (!isBlogSlug(slug)) throw error(404, ' - invalid slug');
	try {
		data = await getContent(fetch, slug);
		const cacheControl = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800';
		setHeaders({ 'Cache-Control': cacheControl });
		return new Response(JSON.stringify(data), {
			headers: {
				'content-type': 'application/json; charset=utf-8',
				'Cache-Control': cacheControl
			}
		});
	} catch (err) {
		console.log("didn't find ", slug)
		console.error(err);
		throw error(404, err.message);
	}
}
