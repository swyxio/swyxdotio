import assert from 'node:assert/strict';
import test from 'node:test';
import { XMLParser } from 'fast-xml-parser';
import { backupPath, verifyObject } from './backup-podcast-r2.mjs';
import redirects from '../workers/podcast-redirects/index.js';
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

test('canonical website links target the archive without changing episodes or feed URLs', () => {
	const parser = new XMLParser({ ignoreAttributes: false });
	for (const previous of [
		'',
		'<link>https://temporal.io</link>',
		'<link>https://swyx.io/podcast/learn-in-podcast/rss.xml</link>'
	]) {
		const xml = `<rss version="2.0"><channel>${previous}<image><url>https://media.swyx.io/art.jpg</url><link>https://old.example</link></image><item><guid isPermaLink="false">original-guid</guid><link>https://media.swyx.io/audio.mp3</link><enclosure url="https://media.swyx.io/audio.mp3" length="42" type="audio/mpeg"/></item></channel></rss>`;
		const document = parseXml(xml);
		ensureCanonicalFeedLinks(document, 'learn-in-podcast');
		const channel = parser.parse(buildXml(document)).rss.channel;
		assert.equal(channel.link, 'https://swyx.io/podcasts#learn-in-podcast');
		assert.equal(channel.image.link, channel.link);
		assert.equal(
			channel['atom:link']['@_href'],
			'https://swyx.io/podcast/learn-in-podcast/rss.xml'
		);
		assert.equal(
			channel['itunes:new-feed-url'],
			'https://swyx.io/podcast/learn-in-podcast/rss.xml'
		);
		assert.deepEqual(channel.item, parser.parse(xml).rss.channel.item);
		const once = buildXml(document);
		ensureCanonicalFeedLinks(document, 'learn-in-podcast');
		assert.equal(buildXml(document), once);
	}
});

test('legacy podcast pages permanently redirect to their own archive without an open redirect', () => {
	for (const [host, slug] of [
		['mixtape.swyx.io', 'learn-in-podcast'],
		['temporal.swyx.io', 'the-temporal-podcast'],
		['careerchats.swyx.io', 'career-chats']
	]) {
		for (const method of ['GET', 'HEAD']) {
			for (const path of ['/', '/episodes/example', '/?url=https://evil.example']) {
				const response = redirects.fetch(new Request(`https://${host}${path}`, { method }));
				assert.equal(response.status, 301);
				assert.equal(response.headers.get('location'), `https://swyx.io/podcasts#${slug}`);
			}
		}
		assert.equal(redirects.fetch(new Request(`https://${host}/`, { method: 'POST' })).status, 405);
	}
	assert.equal(redirects.fetch(new Request('https://unknown.example/')).status, 404);
});

test('offline backups reject unsafe paths and mismatched remote checksums', () => {
	assert.equal(backupPath('/tmp/backup', 'feeds/show.xml'), '/tmp/backup/feeds/show.xml');
	for (const key of ['../escape', '/absolute', 'feeds/../../escape', 'feeds//show.xml']) {
		assert.throws(() => backupPath('/tmp/backup', key));
	}
	const actual = { size: 42, md5: 'a'.repeat(32), sha256: 'b'.repeat(64) };
	const object = { key: `audio/${'b'.repeat(16)}-episode.mp3`, size: 42, etag: actual.md5 };
	assert.doesNotThrow(() => verifyObject(object, actual));
	assert.throws(() => verifyObject(object, { ...actual, size: 41 }), /Size mismatch/);
	assert.throws(
		() => verifyObject(object, { ...actual, md5: 'c'.repeat(32) }),
		/ETag\/MD5 mismatch/
	);
	assert.throws(
		() => verifyObject(object, { ...actual, sha256: 'c'.repeat(64) }),
		/SHA-256 mismatch/
	);
});
