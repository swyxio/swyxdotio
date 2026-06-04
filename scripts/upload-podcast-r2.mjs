#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { open, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
	DEFAULT_MEDIA_BASE,
	DEFAULT_STAGING_ROOT,
	assertSlug,
	createManifestSaver,
	hashFile,
	joinUrl,
	localAssetPath,
	mapLimit,
	parseArgs,
	parsePositiveInteger,
	readJson,
	stagePaths
} from './lib/podcast-feed.mjs';

const HELP = `Usage:
  node scripts/upload-podcast-r2.mjs --bucket BUCKET --slug SLUG [--slug SLUG] [options]

Uploads staged artwork, images, enclosures, and replacement feeds to R2 through:
  wrangler r2 object put bucket/key --file path --content-type type

Options:
  --bucket BUCKET       Destination R2 bucket name.
  --slug SLUG           Staged show slug. Repeat to upload multiple shows.
  --staging-root PATH   Migration root (default: .podcast-migration).
  --concurrency N       Concurrent Wrangler uploads (default: 3).
  --media-base URL      Public R2 custom-domain base used for remote verification.
  --config PATH         Optional Wrangler config path.
  --local               Upload to Wrangler local storage instead of remote R2.
  --help                Show this help.
`;

const MULTIPART_THRESHOLD_BYTES = 250 * 1024 * 1024;
const STUDIO_CREDENTIALS_PATH = resolve('.dev.vars');

function runWranglerOnce({
	bucket,
	objectKey,
	filePath,
	contentType,
	cacheControl,
	config,
	local
}) {
	const args = [
		'wrangler',
		'r2',
		'object',
		'put',
		`${bucket}/${objectKey}`,
		'--file',
		filePath,
		'--content-type',
		contentType
	];
	if (cacheControl) args.push('--cache-control', cacheControl);
	args.push('--force');
	if (config) args.push('--config', config);
	if (local) args.push('--local');
	else args.push('--remote');

	return new Promise((resolvePromise, reject) => {
		const child = spawn('npx', args, {
			stdio: 'inherit',
			env: {
				...process.env,
				// The repo-local legacy token does not have R2 permissions.
				// Empty values keep Wrangler on the OAuth session from `wrangler login`.
				CF_API_TOKEN: '',
				CLOUDFLARE_API_TOKEN: ''
			}
		});
		child.on('error', reject);
		child.on('exit', (code, signal) => {
			if (code === 0) resolvePromise();
			else
				reject(new Error(`wrangler upload failed for ${objectKey} (${signal ?? `exit ${code}`})`));
		});
	});
}

async function runWrangler(options, attempts = 3) {
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		try {
			await runWranglerOnce(options);
			return;
		} catch (error) {
			if (attempt === attempts) throw error;
			console.warn(`${options.objectKey}: Wrangler upload attempt ${attempt} failed; retrying`);
			await sleep(1000 * attempt);
		}
	}
}

async function readStudioCredentials() {
	const entries = (await readFile(STUDIO_CREDENTIALS_PATH, 'utf8'))
		.trim()
		.split('\n')
		.map((line) => {
			const separator = line.indexOf('=');
			return [line.slice(0, separator), line.slice(separator + 1)];
		});
	return Object.fromEntries(entries);
}

async function createStudioSession() {
	const credentials = await readStudioCredentials();
	const studioBase = 'https://swyx.io/tools/podcast';
	const origin = new URL(studioBase).origin;
	const response = await fetch('https://swyx.io/tools/api/session', {
		method: 'POST',
		headers: { origin, 'content-type': 'application/json' },
		body: JSON.stringify({ password: credentials.PODCAST_ADMIN_PASSWORD })
	});
	const cookie = response.headers.get('set-cookie')?.split(';')[0];
	if (!response.ok || !cookie)
		throw new Error('Podcast studio login failed for multipart archive upload');
	return { apiBase: `${studioBase}/api/archive-uploads`, cookie, origin };
}

async function studioRequest(session, path, init) {
	const response = await fetch(`${session.apiBase}${path}`, {
		...init,
		headers: { ...init.headers, cookie: session.cookie, origin: session.origin }
	});
	if (!response.ok)
		throw new Error(
			`podcast studio multipart request failed (${response.status}): ${await response.text()}`
		);
	return response.json();
}

async function runWorkerMultipart(candidate) {
	const session = await createStudioSession();
	const started = await studioRequest(session, '', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ objectKey: candidate.objectKey, contentType: candidate.contentType })
	});
	const file = await open(candidate.filePath, 'r');
	const parts = [];
	try {
		for (
			let offset = 0, partNumber = 1;
			offset < candidate.size;
			offset += started.partBytes, partNumber += 1
		) {
			const buffer = Buffer.alloc(Math.min(started.partBytes, candidate.size - offset));
			const { bytesRead } = await file.read(buffer, 0, buffer.byteLength, offset);
			if (bytesRead !== buffer.byteLength)
				throw new Error(`short read while uploading ${candidate.objectKey}`);
			const params = new URLSearchParams({
				objectKey: started.objectKey,
				uploadId: started.uploadId,
				partNumber: String(partNumber)
			});
			parts.push(
				await studioRequest(session, `/part?${params}`, {
					method: 'PUT',
					headers: { 'content-type': 'application/octet-stream' },
					body: buffer
				})
			);
		}
		await studioRequest(session, '/complete', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ objectKey: started.objectKey, uploadId: started.uploadId, parts })
		});
	} catch (error) {
		await studioRequest(session, '/abort', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(started)
		}).catch(() => {});
		throw error;
	} finally {
		await file.close();
	}
}

function uploadId({ bucket, objectKey, local }) {
	return `${local ? 'local' : 'remote'}:${bucket}:${objectKey}`;
}

function sleep(milliseconds) {
	return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function remoteObjectMatches(candidate, options, attempts = 1) {
	if (options.local) return true;
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		const objectUrl = new URL(joinUrl(options.mediaBase, candidate.objectKey));
		objectUrl.searchParams.set(
			'podcastMigrationVerify',
			`${candidate.sha256}-${attempt}-${Date.now()}`
		);
		const response = await fetch(objectUrl, {
			headers: {
				range: 'bytes=0-0',
				'user-agent': 'swyxdotio-podcast-migration/1.0'
			}
		});
		const remoteSize = Number(response.headers.get('content-range')?.match(/\/(\d+)$/)?.[1]);
		await response.arrayBuffer();
		if (response.status === 206 && remoteSize === candidate.size) return true;
		if (![200, 206, 404].includes(response.status)) {
			throw new Error(`remote verification failed for ${candidate.objectKey} (${response.status})`);
		}
		if (attempt < attempts) await sleep(Math.min(5000, 1000 * attempt));
	}
	return false;
}

async function uploadShow(slug, options) {
	const paths = stagePaths(options.stagingRoot, slug);
	const manifest = await readJson(paths.manifestJson);
	if (!manifest) throw new Error(`${slug}: missing ${paths.manifestJson}`);
	const saveManifest = createManifestSaver(paths.manifestJson, manifest);
	manifest.uploads ??= [];

	const replacement = await hashFile(paths.replacementXml);
	const assets = manifest.assets.map((asset) => {
		if (asset.status !== 'downloaded')
			throw new Error(`${slug}: asset ${asset.id} has not downloaded successfully`);
		return {
			objectKey: asset.objectKey,
			filePath: localAssetPath(paths.stageDir, asset.localPath),
			contentType: asset.contentType,
			cacheControl: 'public, max-age=31536000, immutable',
			size: asset.size,
			sha256: asset.sha256
		};
	});
	const feed = {
		objectKey: `feeds/${slug}.xml`,
		filePath: paths.replacementXml,
		contentType: 'application/rss+xml',
		cacheControl: 'public, max-age=300',
		size: replacement.size,
		sha256: replacement.sha256
	};

	const uploadCandidate = async (candidate) => {
		const id = uploadId({
			bucket: options.bucket,
			objectKey: candidate.objectKey,
			local: options.local
		});
		let upload = manifest.uploads.find((entry) => entry.id === id);
		if (!upload) {
			upload = { id, objectKey: candidate.objectKey };
			manifest.uploads.push(upload);
		}

		const checkpointMatches =
			upload.status === 'uploaded' &&
			upload.sha256 === candidate.sha256 &&
			upload.size === candidate.size;
		const uploadedObjectMatches = options.local
			? checkpointMatches
			: await remoteObjectMatches(candidate, options);
		if (uploadedObjectMatches) {
			Object.assign(upload, {
				status: 'uploaded',
				contentType: candidate.contentType,
				size: candidate.size,
				sha256: candidate.sha256,
				verifiedAt: new Date().toISOString()
			});
			await saveManifest();
			console.log(`${slug}: resumed upload ${candidate.objectKey}`);
			return;
		}

		const actual = await hashFile(candidate.filePath);
		if (actual.size !== candidate.size || actual.sha256 !== candidate.sha256) {
			throw new Error(`${slug}: staged file changed after validation: ${candidate.filePath}`);
		}

		Object.assign(upload, {
			status: 'uploading',
			contentType: candidate.contentType,
			size: candidate.size,
			sha256: candidate.sha256
		});
		await saveManifest();

		try {
			if (!options.local && candidate.size > MULTIPART_THRESHOLD_BYTES) {
				await runWorkerMultipart(candidate);
			} else {
				await runWrangler({ ...candidate, ...options });
			}
			if (!(await remoteObjectMatches(candidate, options, 12))) {
				throw new Error(`remote size verification failed for ${candidate.objectKey}`);
			}
			Object.assign(upload, { status: 'uploaded', uploadedAt: new Date().toISOString() });
			delete upload.error;
			console.log(`${slug}: uploaded ${candidate.objectKey}`);
		} catch (error) {
			Object.assign(upload, { status: 'failed', error: error.message });
			throw error;
		} finally {
			await saveManifest();
		}
	};

	await mapLimit(assets, options.concurrency, uploadCandidate);
	await uploadCandidate(feed);
}

async function main() {
	const args = parseArgs(process.argv.slice(2), {
		boolean: ['help', 'local'],
		multiple: ['slug']
	});
	if (args.help) {
		console.log(HELP);
		return;
	}
	if (args._.length) throw new Error(`Unexpected arguments: ${args._.join(' ')}`);
	if (!args.bucket) throw new Error('Provide --bucket BUCKET');
	if (!args.slug?.length) throw new Error('Provide at least one --slug SLUG');

	const options = {
		bucket: args.bucket,
		stagingRoot: resolve(args['staging-root'] ?? DEFAULT_STAGING_ROOT),
		mediaBase: args['media-base'] ?? DEFAULT_MEDIA_BASE,
		concurrency: parsePositiveInteger(args.concurrency, 3, '--concurrency'),
		config: args.config ? resolve(args.config) : undefined,
		local: args.local ?? false
	};
	for (const slug of args.slug.map(assertSlug)) await uploadShow(slug, options);
}

main().catch((error) => {
	console.error(`Upload failed: ${error.message}`);
	process.exitCode = 1;
});
