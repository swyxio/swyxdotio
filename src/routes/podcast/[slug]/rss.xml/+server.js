export const prerender = false;

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, platform }) {
	const bucket = platform?.env?.PODCAST_MEDIA;
	if (!bucket) return new Response('Podcast storage unavailable', { status: 503 });

	let feed;
	try {
		feed = await bucket.get(`feeds/${params.slug}.xml`);
	} catch {
		return new Response('Podcast storage unavailable', { status: 503 });
	}
	if (!feed) return new Response('Not found', { status: 404 });

	const headers = new Headers();
	feed.writeHttpMetadata(headers);
	if (feed.httpEtag) headers.set('ETag', feed.httpEtag);
	headers.set('Content-Type', 'application/rss+xml; charset=utf-8');
	headers.set('Cache-Control', 'public, max-age=0, must-revalidate');

	return new Response(feed.body, { headers });
}
