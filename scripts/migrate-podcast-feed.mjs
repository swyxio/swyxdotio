#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
	DEFAULT_MEDIA_BASE,
	DEFAULT_STAGING_ROOT,
	applyAssetUrls,
	assertSlug,
	buildXml,
	collectFeed,
	createManifest,
	createManifestSaver,
	downloadAsset,
	ensureCanonicalFeedLinks,
	mapLimit,
	parseArgs,
	parsePositiveInteger,
	parseXml,
	pathExists,
	readJson,
	rewriteLegacyProviderLinks,
	stagePaths,
	syncManifestAssets,
	validateStage
} from './lib/podcast-feed.mjs';

const HELP = `Usage:
  node scripts/migrate-podcast-feed.mjs --source URL --slug SLUG [options]
  node scripts/migrate-podcast-feed.mjs --source URL --slug SLUG --source URL --slug SLUG [options]

Downloads podcast media, rewrites a preserve-order RSS feed, and emits resumable
migration artifacts under .podcast-migration/<slug>/.

Options:
  --source URL          Source RSS URL. Repeat with --slug for multiple shows.
  --slug SLUG           Stable show slug. Repeat with --source for multiple shows.
  --staging-root PATH   Output root (default: .podcast-migration).
  --media-base URL      Public R2 media base (default: https://media.swyx.io/).
  --concurrency N       Concurrent media downloads (default: 4).
  --refresh-feed        Fetch source XML again instead of reusing original.xml.
  --refresh-assets      Redownload assets even when local hashes match.
  --help                Show this help.
`;

async function fetchSource(sourceUrl) {
	const response = await fetch(sourceUrl, {
		redirect: 'follow',
		headers: { 'user-agent': 'swyxdotio-podcast-migration/1.0' }
	});
	if (!response.ok) throw new Error(`Feed download failed (${response.status}) for ${sourceUrl}`);
	return response.text();
}

function jobsFromArgs(args) {
	const sources = args.source ?? [];
	const slugs = args.slug ?? [];
	if (sources.length === 0 || sources.length !== slugs.length) {
		throw new Error('Provide matching --source URL and --slug SLUG pairs');
	}
	return sources.map((sourceUrl, index) => ({ sourceUrl: new URL(sourceUrl).href, slug: assertSlug(slugs[index]) }));
}

async function migrate({ sourceUrl, slug }, options) {
	const paths = stagePaths(options.stagingRoot, slug);
	await mkdir(paths.stageDir, { recursive: true });

	const previous = await readJson(paths.manifestJson);
	if (previous && previous.sourceUrl !== sourceUrl) {
		throw new Error(`${slug}: existing manifest source is ${previous.sourceUrl}; use a different slug or staging root`);
	}

	const manifest = previous ?? createManifest({ slug, sourceUrl, mediaBase: options.mediaBase });
	if (manifest.mediaBase !== options.mediaBase) {
		manifest.mediaBase = options.mediaBase;
	}
	const saveManifest = createManifestSaver(paths.manifestJson, manifest);

	if (options.refreshFeed || !(await pathExists(paths.originalXml))) {
		await writeFile(paths.originalXml, await fetchSource(sourceUrl));
	}

	const document = parseXml(await readFile(paths.originalXml, 'utf8'), sourceUrl);
	const feed = collectFeed(document, sourceUrl);
	syncManifestAssets(manifest, feed.references);
	await saveManifest();

	console.log(`${slug}: ${feed.items.length} items, ${feed.enclosureCount} enclosures, ${manifest.assets.length} assets`);
	await mapLimit(manifest.assets, options.concurrency, async (asset) => {
		try {
			const { resumed } = await downloadAsset(asset, {
				slug,
				stageDir: paths.stageDir,
				force: options.refreshAssets
			});
			console.log(`${slug}: ${resumed ? 'resumed' : 'downloaded'} ${asset.kind} ${asset.sourceUrl}`);
		} catch (error) {
			asset.status = 'failed';
			asset.error = error.message;
			throw error;
		} finally {
			await saveManifest();
		}
	});

	applyAssetUrls(feed.references, manifest.assets, options.mediaBase);
	ensureCanonicalFeedLinks(document, slug);
	rewriteLegacyProviderLinks(document, {
		slug,
		references: feed.references,
		assets: manifest.assets,
		mediaBase: options.mediaBase
	});
	await writeFile(paths.replacementXml, buildXml(document));
	await saveManifest();

	const report = await validateStage({ stagingRoot: options.stagingRoot, slug });
	if (!report.valid) throw new Error(`${slug}: validation failed; see ${paths.reportJson}`);
	console.log(`${slug}: wrote ${paths.replacementXml}`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2), {
		boolean: ['help', 'refresh-assets', 'refresh-feed'],
		multiple: ['source', 'slug']
	});
	if (args.help) {
		console.log(HELP);
		return;
	}
	if (args._.length) throw new Error(`Unexpected arguments: ${args._.join(' ')}`);

	const options = {
		stagingRoot: resolve(args['staging-root'] ?? DEFAULT_STAGING_ROOT),
		mediaBase: args['media-base'] ?? DEFAULT_MEDIA_BASE,
		concurrency: parsePositiveInteger(args.concurrency, 4, '--concurrency'),
		refreshAssets: args['refresh-assets'] ?? false,
		refreshFeed: args['refresh-feed'] ?? false
	};
	for (const job of jobsFromArgs(args)) await migrate(job, options);
}

main().catch((error) => {
	console.error(`Migration failed: ${error.message}`);
	process.exitCode = 1;
});
