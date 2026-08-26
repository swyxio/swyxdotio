import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { FEATURED_PODCAST_EPISODES } from '../src/lib/featured-podcast-episodes.js';

const subscribe = fs.readFileSync(
	new URL('../src/routes/subscribe/+page.svelte', import.meta.url),
	'utf8'
);
const newsletter = fs.readFileSync(
	new URL('../src/components/Newsletter.svelte', import.meta.url),
	'utf8'
);
const podcasts = fs.readFileSync(
	new URL('../src/routes/podcasts/+page.svelte', import.meta.url),
	'utf8'
);

test('Subscribe owns one newsletter invitation without changing other Newsletter placements', () => {
	assert.equal((subscribe.match(/<Newsletter\b/g) || []).length, 1);
	assert.match(subscribe, /<Newsletter embedded\s*\/>/);
	assert.equal((subscribe.match(/10,000/g) || []).length, 1);
	assert.match(newsletter, /export let embedded = false/);
	assert.match(newsletter, /\{#if !embedded\}/);
	assert.match(newsletter, /Stay in correspondence/);
	assert.match(newsletter, /Subscribe to the newsletter/);
});

test('the embedded newsletter preserves the existing email submission contract', () => {
	assert.match(
		newsletter,
		/action="https:\/\/buttondown\.email\/api\/emails\/embed-subscribe\/swyx"/
	);
	assert.match(newsletter, /method="post"/);
	assert.match(newsletter, /target="popupwindow"/);
	assert.match(newsletter, /name="email"/);
	assert.match(newsletter, /type="email"/);
	assert.match(newsletter, /required=\{true\}/);
	assert.match(newsletter, /class:sr-only=\{!embedded\}/);
});

test('Subscribe groups writing, YouTube-first podcasts, and all original audio feeds', () => {
	assert.match(subscribe, /<h2 id="rss-heading">Read by RSS<\/h2>/);
	assert.match(subscribe, /<h2 id="podcasts-heading">Podcasts<\/h2>/);
	assert.match(subscribe, /href="\/rss\.xml" data-sveltekit-reload/);
	assert.match(subscribe, /https:\/\/www\.youtube\.com\/@LatentSpacePod/);
	assert.match(subscribe, /playlist\?list=PLWEAb1SXhjlfkEF_PxzYHonU_v5LPMI8L/);
	assert.ok(
		subscribe.indexOf('youtube.com/@LatentSpacePod') < subscribe.indexOf('podcasts.apple.com')
	);
	for (const slug of ['learn-in-podcast', 'the-temporal-podcast', 'career-chats']) {
		assert.ok(subscribe.includes(`/podcast/${slug}/rss.xml`));
	}
	assert.doesNotMatch(subscribe, /<iframe\b/);
});

test('Podcasts has one current-show introduction and moves legacy context beside the archive', () => {
	const intro = podcasts.slice(podcasts.indexOf('<header'), podcasts.indexOf('</header>'));
	assert.match(intro, /Latent Space: The AI Engineer Podcast/);
	assert.equal((intro.match(/class="editorial-deck"/g) || []).length, 1);
	assert.doesNotMatch(intro, /episodeCount|first-party episodes|My current work/);
	assert.ok(podcasts.indexOf('class="legacy-intro"') > podcasts.indexOf('class="podcast-praise"'));
	assert.match(
		podcasts,
		/Three original swyx\.io feeds, <strong>\{episodeCount\}<\/strong> episodes/
	);
});

test('the compact podcast page retains curated videos, sourced praise, and the complete archive', () => {
	assert.equal(FEATURED_PODCAST_EPISODES.length, 12);
	assert.equal(new Set(FEATURED_PODCAST_EPISODES.map(({ id }) => id)).size, 12);
	assert.match(podcasts, /#each FEATURED_PODCAST_EPISODES as episode, index/);
	assert.match(podcasts, /https:\/\/www\.youtube\.com\/watch\?v=\$\{episode\.id\}/);
	assert.match(
		podcasts,
		/Has ranked in the <strong>Top 30 for US Technology<\/strong> on Apple Podcasts/
	);
	for (const author of ['Andrej Karpathy', 'George Hotz', 'Dharmesh Shah']) {
		assert.ok(podcasts.includes(author));
	}
	assert.match(podcasts, /<blockquote cite=\{item\.source\}/);
	assert.match(podcasts, /#each data\.shows as show, index/);
	assert.match(podcasts, /open=\{index !== 0\}/);
	assert.match(podcasts, /#each show\.episodes as episode/);
	assert.doesNotMatch(podcasts, /<iframe\b/);
});
