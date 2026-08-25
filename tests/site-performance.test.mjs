import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('podcast players make no third-party requests before explicit interaction', async () => {
	const source = await readFile(new URL('src/routes/podcasts/+page.svelte', root), 'utf8');

	assert.match(source, /let showApplePlayer = false/);
	assert.match(source, /let showSpotifyPlayer = false/);
	assert.match(source, /\{#if showApplePlayer\}[\s\S]*?src=\{latentSpace\.appleEmbedUrl\}/);
	assert.match(source, /\{#if showSpotifyPlayer\}[\s\S]*?src=\{latentSpace\.spotifyEmbedUrl\}/);
	assert.match(source, /Load Apple Podcasts player/);
	assert.match(source, /Load Spotify player/);
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
