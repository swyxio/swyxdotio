import { error } from '@sveltejs/kit';
import { parsePodcastFeed } from '$lib/podcast-catalog';
import { PODCAST_SHOWS } from '$lib/podcast-shows';

export const prerender = false;

/** @type {import('./$types').PageServerLoad} */
export async function load({ platform, setHeaders }) {
	const bucket = platform?.env?.PODCAST_MEDIA;
	if (!bucket) throw error(503, 'Podcast storage unavailable');

	const shows = await Promise.all(
		PODCAST_SHOWS.map(async (show) => {
			const feed = await bucket.get(`feeds/${show.slug}.xml`);
			if (!feed) throw error(404, `${show.label} feed not found`);
			return parsePodcastFeed(await feed.text(), show);
		})
	);

	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
	});

	return { shows };
}
