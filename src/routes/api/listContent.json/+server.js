// import { json } from '@sveltejs/kit';
import { listContent } from '$lib/content';
import { listSpeaking } from '$lib/local-content';

/**
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ fetch, setHeaders }) {
	let list = await listContent(fetch);
	const speaking = await listSpeaking();
	list = list.concat(speaking).sort((a, b) => b.date - a.date);
	list = list.map((item) => {
		item.description = item.description?.replace(/[[\]]/gm, ' ') // replace markdown formatting purely for descriptions
		return item
	});
	setHeaders({
		'Cache-Control': `max-age=0, s-maxage=${3600}` // 1 hour
	});
	return new Response(JSON.stringify(list), {
		headers: {
			'content-type': 'application/json; charset=utf-8'
		}
	});
}
