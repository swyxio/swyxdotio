#!/usr/bin/env node
import { resolve } from 'node:path';
import {
	DEFAULT_STAGING_ROOT,
	assertSlug,
	parseArgs,
	validateStage
} from './lib/podcast-feed.mjs';

const HELP = `Usage:
  node scripts/validate-podcast-feed.mjs --slug SLUG [--slug SLUG] [options]

Validates source/replacement GUID and item parity, enclosure count, and every
downloaded asset's non-zero size and SHA-256 hash. Rewrites report.json.

Options:
  --slug SLUG           Staged show slug. Repeat to validate multiple shows.
  --staging-root PATH   Migration root (default: .podcast-migration).
  --help                Show this help.
`;

async function main() {
	const args = parseArgs(process.argv.slice(2), {
		boolean: ['help'],
		multiple: ['slug']
	});
	if (args.help) {
		console.log(HELP);
		return;
	}
	if (args._.length) throw new Error(`Unexpected arguments: ${args._.join(' ')}`);
	if (!args.slug?.length) throw new Error('Provide at least one --slug SLUG');

	const stagingRoot = resolve(args['staging-root'] ?? DEFAULT_STAGING_ROOT);
	let invalid = false;
	for (const slug of args.slug.map(assertSlug)) {
		const report = await validateStage({ stagingRoot, slug });
		console.log(`${slug}: ${report.valid ? 'valid' : 'invalid'} (${report.counts.items} items, ${report.counts.assets} assets)`);
		for (const error of report.errors) console.error(`  - ${error}`);
		invalid ||= !report.valid;
	}
	if (invalid) process.exitCode = 1;
}

main().catch((error) => {
	console.error(`Validation failed: ${error.message}`);
	process.exitCode = 1;
});
