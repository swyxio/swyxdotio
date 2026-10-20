import { execFileSync, spawnSync } from 'node:child_process';

function cleanCommit() {
	const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
		encoding: 'utf8'
	});
	if (status.trim()) throw new Error('Deploy requires a clean Git working tree.');
	return execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { encoding: 'utf8' }).trim();
}

function run(command, args) {
	const result = spawnSync(command, args, { stdio: 'inherit' });
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

try {
	const commit = cleanCommit();
	run('npm', ['run', 'build']);
	if (cleanCommit() !== commit) throw new Error('Git HEAD changed during the build.');
	run('npm', [
		'exec',
		'--',
		'wrangler',
		'deploy',
		'--tag',
		commit,
		'--message',
		commit,
		...process.argv.slice(2)
	]);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
}
