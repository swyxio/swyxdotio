import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/deploy-main.mjs', import.meta.url));

function fixture(t) {
	const dir = mkdtempSync(join(tmpdir(), 'deploy-main-test-'));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	const repo = join(dir, 'repo');
	const bin = join(dir, 'bin');
	mkdirSync(repo);
	mkdirSync(bin);
	const git = (...args) =>
		execFileSync('git', args, { cwd: repo, stdio: 'pipe', encoding: 'utf8' });
	git('init', '-q');
	writeFileSync(join(repo, 'tracked.txt'), 'clean\n');
	git('add', 'tracked.txt');
	git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'fixture');
	writeFileSync(
		join(bin, 'npm'),
		`#!/bin/sh
printf '%s\\n' "$*" >> "$DEPLOY_TEST_LOG"
if [ "$1" = run ] && [ "$DEPLOY_TEST_DIRTY" = 1 ]; then echo changed >> tracked.txt; fi
`,
		{ mode: 0o755 }
	);
	const log = join(dir, 'calls.log');
	const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, DEPLOY_TEST_LOG: log };
	const run = (extraEnv = {}) =>
		spawnSync(process.execPath, [script, '--dry-run'], {
			cwd: repo,
			env: { ...env, ...extraEnv },
			encoding: 'utf8'
		});
	return { repo, git, log, run };
}

test('deploy builds a clean checkout and tags it with its commit', (t) => {
	const { git, log, run } = fixture(t);
	const result = run();
	assert.equal(result.status, 0, result.stderr);
	const commit = git('rev-parse', 'HEAD').trim();
	assert.equal(
		readFileSync(log, 'utf8'),
		`run build\nexec -- wrangler deploy --tag ${commit} --message ${commit} --dry-run\n`
	);
});

test('deploy refuses uncommitted changes before building', (t) => {
	const { repo, run } = fixture(t);
	writeFileSync(join(repo, 'untracked.txt'), 'draft');
	const result = run();
	assert.equal(result.status, 1);
	assert.match(result.stderr, /clean Git working tree/);
});

test('deploy refuses to tag a tree changed by the build', (t) => {
	const { log, run } = fixture(t);
	const result = run({ DEPLOY_TEST_DIRTY: '1' });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /clean Git working tree/);
	assert.equal(readFileSync(log, 'utf8'), 'run build\n');
});
