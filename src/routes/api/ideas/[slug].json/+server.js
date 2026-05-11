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
		setHeaders({
			'Cache-Control': `max-age=0, s-max-age=${3600}` // 1 hour
		})
		return new Response(JSON.stringify(data), {
			headers: {
				'Cache-Control': `max-age=0, s-max-age=${3600}` // 1 hour
			}
		});
	} catch (err) {
		console.log("didn't find ", slug)
		console.error(err);
		throw error(404, err.message);
	}
}
