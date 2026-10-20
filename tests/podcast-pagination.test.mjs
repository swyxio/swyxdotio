import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from '../src/routes/podcasts/+page.server.js';
import { GET } from '../src/routes/api/podcasts/[slug]/+server.js';
import { isValidEpisodePage } from '../src/lib/podcast-page-validation.js';

const slug = 'learn-in-podcast';
const items = Array.from(
	{ length: 43 },
	(_, i) => `<item><title>Episode ${i + 1}</title></item>`
).join('');
const xml = `<rss><channel><title>Test</title>${items}</channel></rss>`;
const platform = { env: { PODCAST_MEDIA: { get: async () => ({ text: async () => xml }) } } };
const url = (query = '') => new URL(`https://example.com/podcasts${query}`);

test('client accepts the final page and rejects invalid or non-advancing cursors', () => {
	assert.equal(isValidEpisodePage({ episodes: [1], nextOffset: null }, 40), true);
	assert.equal(isValidEpisodePage({ episodes: [1], nextOffset: 40 }, 20), true);
	for (const page of [
		null,
		{},
		{ episodes: [1] },
		{ episodes: [1], nextOffset: 20 },
		{ episodes: [], nextOffset: 40 }
	]) {
		assert.equal(isValidEpisodePage(page, 20), false);
	}
});

test('page loader serves a bounded initial page and a navigable second page', async () => {
	const initial = await load({ platform, setHeaders() {}, url: url() });
	assert.equal(initial.shows[0].episodeCount, 43);
	assert.equal(initial.shows[0].episodes.length, 20);
	assert.equal(initial.shows[0].nextOffset, 20);

	const next = await load({ platform, setHeaders() {}, url: url(`?podcast=${slug}&offset=20`) });
	assert.equal(next.requestedShow, slug);
	assert.equal(next.shows[0].episodes[0].title, 'Episode 21');
	assert.equal(next.shows[0].previousOffset, 0);
	assert.equal(next.shows[0].nextOffset, 40);
	assert.equal(next.shows[1].episodes[0].title, 'Episode 1');
});

test('episode API returns pages and rejects unknown shows and invalid offsets', async () => {
	const page = await GET({ params: { slug }, platform, url: url('?offset=40') });
	const payload = await page.json();
	assert.deepEqual(
		payload.episodes.map(({ title }) => title),
		['Episode 41', 'Episode 42', 'Episode 43']
	);
	assert.equal(payload.nextOffset, null);
	assert.match(page.headers.get('cache-control'), /s-maxage=300/);

	for (const query of ['?offset=-1', '?offset=1.5', '?offset=99', '?offset=9007199254740992']) {
		await assert.rejects(() => GET({ params: { slug }, platform, url: url(query) }), {
			status: 400
		});
		await assert.rejects(
			() => load({ platform, setHeaders() {}, url: url(`?podcast=${slug}&${query.slice(1)}`) }),
			{ status: 400 }
		);
	}
	await assert.rejects(() => GET({ params: { slug: 'unknown' }, platform, url: url() }), {
		status: 404
	});
	await assert.rejects(() => load({ platform, setHeaders() {}, url: url('?podcast=unknown') }), {
		status: 404
	});
	await assert.rejects(() => GET({ params: { slug }, url: url() }), { status: 503 });
});
