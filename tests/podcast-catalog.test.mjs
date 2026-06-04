import assert from 'node:assert/strict';
import test from 'node:test';

import { parsePodcastFeed } from '../src/lib/podcast-catalog.js';

const show = {
	slug: 'test-show',
	label: 'Fallback title',
	summary: 'Fallback summary'
};

test('podcast catalog exposes public feed metadata without descriptions from episode bodies', () => {
	const result = parsePodcastFeed(
		`<?xml version="1.0"?>
		<rss>
			<channel>
				<title>Test show</title>
				<description>Test summary</description>
				<itunes:image href="https://media.example/artwork.jpg"></itunes:image>
				<item>
					<title>First episode</title>
					<guid isPermaLink="false">episode-1</guid>
					<description>Do not expose this long body.</description>
					<pubDate>Wed, 03 Jun 2026 12:00:00 GMT</pubDate>
					<enclosure url="https://media.example/episode.mp3" length="10" type="audio/mpeg"></enclosure>
					<itunes:duration>125</itunes:duration>
				</item>
			</channel>
		</rss>`,
		show
	);

	assert.equal(result.title, 'Test show');
	assert.equal(result.imageUrl, 'https://media.example/artwork.jpg');
	assert.equal(result.feedUrl, '/podcast/test-show/rss.xml');
	assert.deepEqual(result.episodes, [
		{
			title: 'First episode',
			publishedAt: '2026-06-03',
			duration: '2:05',
			audioUrl: 'https://media.example/episode.mp3',
			guid: 'episode-1'
		}
	]);
	assert.equal(JSON.stringify(result).includes('Do not expose this long body.'), false);
});

test('podcast catalog supports studio duration strings and a single item', () => {
	const result = parsePodcastFeed(
		`<rss><channel><item><title>Manual upload</title><itunes:duration>13:30</itunes:duration></item></channel></rss>`,
		show
	);

	assert.equal(result.title, 'Fallback title');
	assert.equal(result.description, 'Fallback summary');
	assert.equal(result.episodes.length, 1);
	assert.equal(result.episodes[0].duration, '13:30');
});
