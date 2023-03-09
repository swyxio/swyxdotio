import { getContent } from '$lib/content';
import { error } from '@sveltejs/kit';
/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function get({ fetch, params, setHeaders }) {
	const { slug } = params;
	let data;
	try {
		data = await getContent(fetch, slug);
		setHeaders({
			'Cache-Control': `max-age=0, s-max-age=${3600}` // 1 minute.. for now
		})
		return new Response(JSON.stringify(data), {
			headers: {
				'Cache-Control': `max-age=0, s-maxage=${3600}` // 1 hour
			}
		});
	} catch (err) {
		console.log("didn't find ", slug)
		console.error(err);
		throw error(404, err.message);
	}
}
