import { error, json } from '@sveltejs/kit';
import { paginatePodcastEpisodes, parsePodcastFeed } from '../../../../lib/podcast-catalog.js';
import { PODCAST_SHOWS } from '../../../../lib/podcast-shows.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, platform, url }) {
	const show = PODCAST_SHOWS.find(({ slug }) => slug === params.slug);
	if (!show) throw error(404, 'Podcast not found');

	const rawOffset = url.searchParams.get('offset') ?? '0';
	const revision = url.searchParams.get('revision');
	if (!revision) throw error(400, 'Feed revision is required');
	if (!/^(0|[1-9]\d*)$/.test(rawOffset)) throw error(400, 'Invalid episode offset');
	const offset = Number(rawOffset);
	if (!Number.isSafeInteger(offset)) throw error(400, 'Invalid episode offset');

	const bucket = platform?.env?.PODCAST_MEDIA;
	if (!bucket) throw error(503, 'Podcast storage unavailable');
	const feed = await bucket.get(`feeds/${show.slug}.xml`);
	if (!feed) throw error(404, `${show.label} feed not found`);
	if (revision !== feed.etag) throw error(409, 'Podcast feed changed');

	const parsed = parsePodcastFeed(await feed.text(), show);
	if (offset > parsed.episodes.length) throw error(400, 'Invalid episode offset');

	return json(paginatePodcastEpisodes(parsed, offset), {
		headers: {
			'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
		}
	});
}
