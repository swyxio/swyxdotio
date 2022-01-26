import { listBlogposts } from '$lib/content';
import { listSpeaking } from '$lib/local-content';

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function get() {
	const blogposts = await listBlogposts();
	const speaking = await listSpeaking();
	const body = blogposts.concat(speaking).sort((a, b) => b.date - a.date);
	return {
		body,
		headers: {
			'Cache-Control': `max-age=0, s-max-age=${60}` // 1 minute.. for now
		}
	};
}
