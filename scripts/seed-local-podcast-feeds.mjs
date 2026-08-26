import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parsePodcastFeed } from '../src/lib/podcast-catalog.js';
import { PODCAST_SHOWS } from '../src/lib/podcast-shows.js';

// Fresh worktrees have empty local R2 storage. Import public RSS only, never media
// files or studio credentials, and never enable a remote write mode.
if (process.argv.length > 2) {
	throw new Error('Usage: pnpm podcast:seed-local (no options; local storage only)');
}

const cwd = fileURLToPath(new URL('../', import.meta.url));
const feeds = await Promise.all(
	PODCAST_SHOWS.map(async (show) => {
		const response = await fetch(`https://www.swyx.io/podcast/${show.slug}/rss.xml`, {
			signal: AbortSignal.timeout(30_000)
		});
		if (!response.ok) throw new Error(`${show.slug}: HTTP ${response.status}`);
		const xml = await response.text();
		const catalog = parsePodcastFeed(xml, show);
		if (!catalog.episodes.length) throw new Error(`${show.slug}: refusing to seed an empty feed`);
		return { show, xml, episodeCount: catalog.episodes.length };
	})
);

// Fetch and validate every feed before changing any local data.
for (const { show, xml, episodeCount } of feeds) {
	const result = spawnSync(
		'pnpm',
		[
			'exec',
			'wrangler',
			'r2',
			'object',
			'put',
			`swyxdotio-podcast-media/feeds/${show.slug}.xml`,
			'--config',
			'wrangler.toml',
			'--local',
			'--pipe',
			'--content-type',
			'application/rss+xml; charset=utf-8'
		],
		{ cwd, input: xml, stdio: ['pipe', 'inherit', 'inherit'] }
	);
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`${show.slug}: local import failed`);
	console.log(`Seeded ${show.label}: ${episodeCount} episodes (local only).`);
}

console.log('Podcast feeds ready. Reload /podcasts in your local preview.');
