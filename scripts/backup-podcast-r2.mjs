#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, stat, statfs, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';

export function backupPath(root, key) {
	if (!key || key.split('/').some((part) => !part || part === '.' || part === '..')) {
		throw new Error('Invalid object key');
	}
	const path = resolve(root, key);
	if (!path.startsWith(`${resolve(root)}${sep}`)) throw new Error('Object key escapes backup');
	return path;
}

export function verifyObject(object, actual) {
	if (actual.size !== object.size) throw new Error(`Size mismatch: ${object.key}`);
	const etag = object.etag.replaceAll('"', '');
	if (/^[a-f0-9]{32}$/i.test(etag) && actual.md5 !== etag) {
		throw new Error(`ETag/MD5 mismatch: ${object.key}`);
	}
	const prefix = object.key
		.split('/')
		.at(-1)
		.match(/^([a-f0-9]{64}|[a-f0-9]{16})-/)?.[1];
	if (prefix && !actual.sha256.startsWith(prefix)) {
		throw new Error(`SHA-256 mismatch: ${object.key}`);
	}
}

async function hashFile(path) {
	const sha = createHash('sha256');
	const md5 = createHash('md5');
	let size = 0;
	for await (const chunk of createReadStream(path)) {
		size += chunk.length;
		sha.update(chunk);
		md5.update(chunk);
	}
	return { size, sha256: sha.digest('hex'), md5: md5.digest('hex') };
}

async function main() {
	const [inventoryPath, outputPath] = process.argv.slice(2);
	if (!inventoryPath || !outputPath) {
		throw new Error('Usage: node scripts/backup-podcast-r2.mjs INVENTORY.json OUTPUT_DIRECTORY');
	}
	const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
	if (!inventory.success || !Array.isArray(inventory.result))
		throw new Error('Invalid R2 inventory');
	const objects = inventory.result;
	const root = resolve(outputPath);
	await mkdir(root, { recursive: true, mode: 0o700 });
	const disk = await statfs(root);
	let remainingBytes = 0;
	for (const object of objects) {
		const path = backupPath(`${root}/objects`, object.key);
		const existing = await stat(path).catch(() => null);
		if (existing?.size !== object.size) remainingBytes += object.size;
	}
	if (disk.bavail * disk.bsize < remainingBytes + 2 * 1024 ** 3) {
		throw new Error(
			`Insufficient free space for ${remainingBytes} remaining bytes plus 2 GiB reserve`
		);
	}
	await writeFile(`${root}/inventory.json`, JSON.stringify(inventory, null, 2), { mode: 0o600 });
	const completed = [];
	let cursor = 0;
	let bytes = 0;
	let save = Promise.resolve();
	const checkpoint = () => {
		const data = JSON.stringify(
			{
				checkedAt: new Date().toISOString(),
				complete: completed.length === objects.length,
				objects: [...completed]
			},
			null,
			2
		);
		save = save.then(async () => {
			await writeFile(`${root}/manifest.json.tmp`, data, { mode: 0o600 });
			await rename(`${root}/manifest.json.tmp`, `${root}/manifest.json`);
		});
		return save;
	};
	async function worker() {
		while (cursor < objects.length) {
			const object = objects[cursor++];
			const path = backupPath(`${root}/objects`, object.key);
			let actual;
			if ((await stat(path).catch(() => null))?.size === object.size) {
				actual = await hashFile(path);
				verifyObject(object, actual);
			} else {
				await mkdir(dirname(path), { recursive: true, mode: 0o700 });
				const url = `https://media.swyx.io/${object.key.split('/').map(encodeURIComponent).join('/')}`;
				let lastError;
				for (let attempt = 0; attempt < 3; attempt++) {
					try {
						const response = await fetch(url, {
							headers: {
								'If-Match': `"${object.etag.replaceAll('"', '')}"`,
								'Accept-Encoding': 'identity'
							},
							signal: AbortSignal.timeout(600_000)
						});
						if (!response.ok) throw new Error(`HTTP ${response.status}: ${object.key}`);
						const sha = createHash('sha256');
						const md5 = createHash('md5');
						let size = 0;
						const hashing = new Transform({
							transform(chunk, _encoding, next) {
								size += chunk.length;
								sha.update(chunk);
								md5.update(chunk);
								next(null, chunk);
							}
						});
						await pipeline(
							Readable.fromWeb(response.body),
							hashing,
							createWriteStream(`${path}.part`, { mode: 0o600 })
						);
						actual = { size, sha256: sha.digest('hex'), md5: md5.digest('hex') };
						verifyObject(object, actual);
						await rename(`${path}.part`, path);
						lastError = null;
						break;
					} catch (error) {
						lastError = error;
					}
				}
				if (lastError) throw lastError;
			}
			completed.push({ ...object, ...actual });
			bytes += actual.size;
			await checkpoint();
			if (completed.length % 25 === 0 || completed.length === objects.length) {
				console.log(
					`${completed.length}/${objects.length} objects; ${(bytes / 1e9).toFixed(2)} GB verified`
				);
			}
		}
	}
	console.log(`Backing up ${objects.length} objects to ${root}; streamed downloads, 3 concurrent`);
	await Promise.all([worker(), worker(), worker()]);
	await save;
	await writeFile(
		`${root}/SHA256SUMS`,
		completed
			.sort((a, b) => a.key.localeCompare(b.key))
			.map((o) => `${o.sha256}  objects/${o.key}`)
			.join('\n') + '\n',
		{ mode: 0o600 }
	);
	console.log(`Complete: ${completed.length} objects, ${bytes} bytes; SHA256SUMS written`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	main().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
