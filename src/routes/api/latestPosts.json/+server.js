// import { json } from '@sveltejs/kit';
import { listContent } from '$lib/content';
import { listSpeaking } from '$lib/local-content';

/**
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ fetch, setHeaders }) {
	let degraded = false;
	let list = await listContent(fetch).catch((err) => {
		console.error('failed to load GitHub content for latest posts', err);
		degraded = true;
		return [];
	});
	const speaking = await listSpeaking().catch((err) => {
		console.error('failed to load speaking content for latest posts', err);
		degraded = true;
		return [];
	});
	list = list.concat(speaking).sort((a, b) => b.date - a.date);
	const cacheControl = degraded
		? 'public, max-age=0, s-maxage=60'
		: 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800';
	setHeaders({ 'Cache-Control': cacheControl });
	return new Response(
		JSON.stringify(
			list
					.slice(0, 20) // homepage uses 20; article pages trim this to 10
				.map((item) => {
					return {
						slug: item.slug,
						url: item.url,
						category: item.category,
						title: item.title,
						date: item.date,
						instances: item.instances
					};
				})
		),
		{
			headers: {
				'content-type': 'application/json; charset=utf-8',
				'Cache-Control': cacheControl
			}
		}
	);
}
