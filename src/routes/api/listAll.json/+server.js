import { listContent } from '$lib/content';
import { listSpeaking } from '$lib/local-content';

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function get({ setHeaders }) {
	const blogposts = await listContent();
	const speaking = await listSpeaking();
	const body = blogposts.concat(speaking).sort((a, b) => b.date - a.date);
	setHeaders({
		'Cache-Control': `max-age=0, s-max-age=${3600}` // 1 hour
	})
	return { body };
}
