import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { FEATURED_PODCAST_EPISODES } from '../src/lib/featured-podcast-episodes.js';

const root = new URL('../', import.meta.url);

test('Vite site previews do not require a remote Cloudflare session', async () => {
	const source = await readFile(new URL('svelte.config.js', root), 'utf8');
	assert.match(source, /platformProxy:\s*\{\s*remoteBindings:\s*false\s*\}/);
});

test('podcasts offer a lightweight gallery of verified episode links without embedded players', async () => {
	const source = await readFile(new URL('src/routes/podcasts/+page.svelte', root), 'utf8');

	assert.doesNotMatch(source, /<iframe\b|iframe_api|embedUrl/);
	assert.match(source, /youtube\.com\/watch\?v=\$\{episode\.id\}/);
	assert.match(source, /i\.ytimg\.com\/vi\/\$\{episode\.id\}\/hqdefault\.jpg/);
	assert.match(source, /youtube\.com\/playlist\?list=\$\{youtubePlaylistId\}/);
	assert.match(source, /loading=\{index < 3 \? 'eager' : 'lazy'\}/);
	assert.doesNotMatch(
		source,
		/appleEmbedUrl|spotifyEmbedUrl|podcasts\.apple\.com|open\.spotify\.com/
	);
	assert.doesNotMatch(source, /autoplay=1/);
	assert.equal(FEATURED_PODCAST_EPISODES.length, 12);
	assert.equal(new Set(FEATURED_PODCAST_EPISODES.map(({ id }) => id)).size, 12);
	assert.ok(
		FEATURED_PODCAST_EPISODES.every(
			({ id, guests, title }) => /^[\w-]{11}$/.test(id) && guests && title
		)
	);
});

test('webmentions wait until the discussion is near the viewport', async () => {
	const source = await readFile(new URL('src/components/WebMentions.svelte', root), 'utf8');

	assert.match(source, /new IntersectionObserver/);
	assert.match(source, /observer\.observe\(mentionsElement\)/);
	assert.match(source, /rootMargin: '400px 0px'/);
	assert.match(source, /loading="lazy"[\s\S]*?decoding="async"/);
});

test('edge cache lookups preserve versioning without expired migration cleanup', async () => {
	const source = await readFile(new URL('src/hooks.server.js', root), 'utf8');

	assert.match(source, /cacheUrl\.searchParams\.set\('__swyxCache'/);
	assert.match(source, /await readContentCacheGeneration/);
	assert.match(source, /await cache\.match\(cacheRequest\)/);
	assert.doesNotMatch(source, /cache\.delete\(/);
});
