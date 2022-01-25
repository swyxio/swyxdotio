import { listSpeaking } from '$lib/local-content';

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function get() {
	const body = await listSpeaking()
	return {
		body,
		headers: {
			'Cache-Control': `max-age=0, s-max-age=${60}`, // 1 minute.. for now
		}
	};
}
