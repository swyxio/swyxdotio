import { listContent } from '$lib/content';
import { listSpeaking } from '$lib/local-content';

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function GET({ fetch, setHeaders, platform }) {
	const blogposts = await listContent(fetch, platform?.env?.CONTENT_MANIFEST, {
		context: platform?.context
	});
	const speaking = await listSpeaking();
	const body = blogposts.concat(speaking).sort((a, b) => b.date - a.date);
	setHeaders({
		'Cache-Control': `max-age=0, s-max-age=${3600}` // 1 hour
	});
	return { body };
}
