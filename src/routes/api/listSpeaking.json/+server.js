import { listSpeaking } from '$lib/local-content';

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function get({ setHeaders }) {
	const body = await listSpeaking();
	setHeaders({
		'Cache-Control': `max-age=0, s-max-age=${3600}` // 1 hour
	})
	return new Response(JSON.stringify(body), {
		headers: {
			'Cache-Control': `max-age=0, s-maxage=${3600}` // 1 hour
		}
	});
}
