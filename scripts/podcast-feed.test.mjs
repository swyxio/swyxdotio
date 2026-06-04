import assert from 'node:assert/strict';
import test from 'node:test';
import {
	applyAssetUrls,
	buildXml,
	collectFeed,
	createManifest,
	ensureCanonicalFeedLinks,
	parseXml,
	rewriteLegacyProviderLinks,
	syncManifestAssets
} from './lib/podcast-feed.mjs';

test('rewrites Transistor media, auxiliary assets, and episode pages to first-party URLs', () => {
	const slug = 'fixture-show';
	const sourceUrl = 'https://feeds.transistor.fm/fixture-show';
	const manifest = createManifest({ slug, sourceUrl, mediaBase: 'https://media.swyx.io/' });
	const document = parseXml(`<?xml version="1.0"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0">
	<channel>
		<atom:link rel="self" type="application/atom+xml" href="${sourceUrl}"/>
		<generator>Transistor (https://transistor.fm)</generator>
		<link>https://fixture.transistor.fm/</link>
		<item>
			<guid>episode-one</guid>
			<link>https://share.transistor.fm/s/abc123</link>
			<description>Listen at https://share.transistor.fm/s/abc123#t=0m5s</description>
			<enclosure url="https://media.transistor.fm/abc123/episode.mp3" length="1" type="audio/mpeg"/>
			<podcast:chapters url="https://share.transistor.fm/s/abc123/chapters.json" type="application/json+chapters"/>
		</item>
	</channel>
</rss>`);
	const feed = collectFeed(document, sourceUrl);
	syncManifestAssets(manifest, feed.references);
	for (const asset of manifest.assets) {
		asset.objectKey = `podcasts/${slug}/${asset.kind}/${asset.id}`;
		asset.size = asset.kind === 'enclosure' ? 42 : 12;
		asset.contentType = asset.kind === 'enclosure' ? 'audio/mpeg' : 'application/json+chapters';
	}

	applyAssetUrls(feed.references, manifest.assets, manifest.mediaBase);
	ensureCanonicalFeedLinks(document, slug);
	rewriteLegacyProviderLinks(document, {
		slug,
		references: feed.references,
		assets: manifest.assets,
		mediaBase: manifest.mediaBase
	});
	const replacement = buildXml(document);

	assert.doesNotMatch(replacement, /transistor\.fm|mixtape\.swyx\.io/i);
	assert.match(replacement, /type="application\/rss\+xml"/);
	assert.match(replacement, /https:\/\/media\.swyx\.io\/podcasts\/fixture-show\/enclosure\//);
	assert.match(replacement, /https:\/\/media\.swyx\.io\/podcasts\/fixture-show\/auxiliary\//);
	assert.match(replacement, /#t=0m5s/);
});
