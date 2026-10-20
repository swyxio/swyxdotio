import { error, redirect } from '@sveltejs/kit';
import { paginatePodcastEpisodes, parsePodcastFeed } from '../../lib/podcast-catalog.js';
import { PODCAST_SHOWS } from '../../lib/podcast-shows.js';

export const prerender = false;

/** @type {import('./$types').PageServerLoad} */
export async function load({ platform, setHeaders, url }) {
	const bucket = platform?.env?.PODCAST_MEDIA;
	if (!bucket) throw error(503, 'Podcast storage unavailable');
	const requestedShow = url.searchParams.get('podcast');
	const revision = url.searchParams.get('revision');
	const rawOffset = url.searchParams.get('offset') ?? '0';
	if (requestedShow && !PODCAST_SHOWS.some(({ slug }) => slug === requestedShow)) {
		throw error(404, 'Podcast not found');
	}
	if (!/^(0|[1-9]\d*)$/.test(rawOffset) || !Number.isSafeInteger(Number(rawOffset))) {
		throw error(400, 'Invalid episode offset');
	}
	const offset = Number(rawOffset);
	if (url.searchParams.has('offset') && !requestedShow) throw error(400, 'Podcast is required');
	if (url.searchParams.has('offset') && !revision) throw error(400, 'Feed revision is required');

	const shows = await Promise.all(
		PODCAST_SHOWS.map(async (show) => {
			const feed = await bucket.get(`feeds/${show.slug}.xml`);
			if (!feed) throw error(404, `${show.label} feed not found`);
			if (show.slug === requestedShow && revision && revision !== feed.etag) {
				throw redirect(
					303,
					`/podcasts?podcast=${encodeURIComponent(show.slug)}&changed=1&refresh=${Date.now()}#${show.slug}-episodes`
				);
			}
			const parsed = parsePodcastFeed(await feed.text(), show);
			const showOffset = show.slug === requestedShow ? offset : 0;
			if (showOffset > parsed.episodes.length) throw error(400, 'Invalid episode offset');
			return {
				...parsed,
				...paginatePodcastEpisodes(parsed, showOffset),
				offset: showOffset,
				revision: feed.etag
			};
		})
	);

	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
	});

	return { shows, requestedShow, archiveChanged: url.searchParams.get('changed') === '1' };
}
