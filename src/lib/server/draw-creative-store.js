import { getToolsUser } from './tools-auth.js';
import { privateJson, requireSameOrigin } from '../podcast-admin-route.js';
import {
	CREATIVE_ID,
	CREATIVE_LIMITS,
	readCreativeBody
} from '../../../workers/draw/creative-library.js';

/** @typedef {Pick<import('@sveltejs/kit').RequestEvent, 'cookies'|'platform'|'request'|'url'>} CreativeEvent */
const assetRoles = ['logo', 'portrait', 'reference', 'background', 'font', 'other'];
const imageTypes = ['image/png', 'image/jpeg', 'image/webp'];
const textDecoder = new TextDecoder();
const fail = (/** @type {string} */ error, status = 400) => privateJson({ error }, { status });

/** File sniffing is intentionally conservative. SVG and executable formats are not accepted. Fonts are inert downloads only. @param {Uint8Array} data @param {string} type */
export function validateCreativeAsset(data, type) {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const ascii = (/** @type {number} */ offset, /** @type {number} */ length) =>
		textDecoder.decode(data.subarray(offset, offset + length));
	if (type === 'image/png') {
		if (
			data.length < 33 ||
			![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => data[index] === value) ||
			ascii(12, 4) !== 'IHDR'
		)
			return false;
		const width = view.getUint32(16),
			height = view.getUint32(20);
		return (
			width > 0 && height > 0 && width <= 16000 && height <= 16000 && width * height <= 64_000_000
		);
	}
	if (type === 'image/jpeg')
		return (
			data.length >= 4 &&
			data[0] === 255 &&
			data[1] === 216 &&
			data[2] === 255 &&
			data[data.length - 2] === 255 &&
			data[data.length - 1] === 217
		);
	if (type === 'image/webp')
		return (
			data.length >= 20 &&
			ascii(0, 4) === 'RIFF' &&
			ascii(8, 4) === 'WEBP' &&
			['VP8 ', 'VP8L', 'VP8X'].includes(ascii(12, 4)) &&
			view.getUint32(4, true) + 8 === data.length
		);
	if (type === 'font/woff2')
		return (
			data.length >= 48 &&
			data.length <= CREATIVE_LIMITS.fontBytes &&
			ascii(0, 4) === 'wOF2' &&
			view.getUint32(8) === data.length &&
			view.getUint16(12) > 0 &&
			view.getUint16(12) <= 256 &&
			view.getUint16(14) === 0 &&
			view.getUint32(16) > 0 &&
			view.getUint32(16) <= 32 * 1024 * 1024 &&
			view.getUint32(20) <= data.length - 48
		);
	return false;
}

/** A session-verified namespace for every user, including the configured owner. Never reuse legacy `personal`. @param {CreativeEvent} event */
export async function forwardCreativeRequest(event) {
	const user = await getToolsUser(event);
	if (!user) return fail('Sign in to save your creative library.', 401);
	const mutation = !['GET', 'HEAD'].includes(event.request.method);
	const expected = event.request.headers.get('X-Tools-User');
	if ((mutation || expected !== null) && expected !== user.id)
		return privateJson(
			{ code: 'account_changed', error: 'Your Google account changed. Reload before continuing.' },
			{ status: 409 }
		);
	if (mutation) requireSameOrigin(event.request, event.url);
	const namespace = event.platform?.env?.DRAW_PAGES;
	if (!namespace) return fail('Private creative storage is unavailable.', 503);
	const path = event.url.pathname.replace(/^\/tools\/api\/draw/, '');
	if (
		!/^\/creative\/(library|records\/(kits|briefs|compositions|feedback|channels|saved)(?:\/[0-9a-f-]+(?:\/(?:revisions(?:\/\d+)?|promote))?)?|assets(?:\/[0-9a-f-]+)?)$/i.test(
			path
		)
	)
		return fail('Creative record not found.', 404);
	const workspace = namespace.get(namespace.idFromName(`creative:google:${user.id}`));
	/** @param {string} path @param {string} [method] @param {any} [body] */
	const forward = (path, method = 'GET', body) =>
		workspace.fetch(
			new Request(new URL(path, 'https://drawing.internal'), {
				method,
				...(body === undefined
					? {}
					: { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
			})
		);
	// This binding deliberately differs from the public podcast media bucket.
	const bucket = /** @type {{DRAW_ASSETS?: R2Bucket}|undefined} */ (event.platform?.env)
		?.DRAW_ASSETS;
	if (path.startsWith('/creative/assets'))
		return handleAssets(event, user.id, bucket, forward, path);
	let body;
	if (mutation) {
		try {
			body = JSON.parse(
				textDecoder.decode(await readCreativeBody(event.request, CREATIVE_LIMITS.requestBytes))
			);
		} catch (error) {
			const failure = /** @type {Error & {status?:number}} */ (error);
			return fail(
				failure.status === 413 ? failure.message : 'Invalid JSON request.',
				failure.status === 413 ? 413 : 400
			);
		}
	}
	const response = await forward(path, event.request.method, body);
	const result = await response.json();
	if (path === '/creative/library' && response.ok) result.assetsAvailable = Boolean(bucket);
	return privateJson(result, { status: response.status });
}

/** @param {CreativeEvent} event @param {string} userId @param {R2Bucket|undefined} bucket @param {(path:string,method?:string,body?:any)=>Promise<Response>} forward @param {string} path */
async function handleAssets(event, userId, bucket, forward, path) {
	if (!bucket)
		return fail(
			'Private asset storage is not configured. Your metadata library is still available.',
			503
		);
	const id = path.split('/')[3];
	if (id && !CREATIVE_ID.test(id)) return fail('Asset not found.', 404);
	const objectKey = (/** @type {string} */ assetId) => `creative/google:${userId}/${assetId}`;
	if (event.request.method === 'POST' && !id) {
		const mimeType = event.request.headers.get('content-type')?.split(';')[0].toLowerCase() ?? '';
		const role = event.request.headers.get('X-Asset-Role') ?? 'other';
		if (
			(!imageTypes.includes(mimeType) && mimeType !== 'font/woff2') ||
			!assetRoles.includes(role) ||
			(mimeType === 'font/woff2') !== (role === 'font')
		)
			return fail(
				'Upload PNG, JPEG or WebP images, or WOFF2 originals with the font role. SVG and other formats are unsupported.',
				415
			);
		let name;
		try {
			name = decodeURIComponent(event.request.headers.get('X-Asset-Name') ?? '').trim();
		} catch {
			return fail('Invalid asset name.');
		}
		if (!name || name.length > 200 || /[\x00-\x1f\x7f]/.test(name))
			return fail('Asset names must contain 1–200 characters without control characters.');
		let data;
		try {
			data = await readCreativeBody(
				event.request,
				mimeType === 'font/woff2' ? CREATIVE_LIMITS.fontBytes : CREATIVE_LIMITS.assetBytes
			);
		} catch (error) {
			const failure = /** @type {Error & {status?:number}} */ (error);
			return fail(failure.message, failure.status ?? 400);
		}
		if (!validateCreativeAsset(data, mimeType))
			return fail('The file bytes do not match a supported asset format.', 415);
		const newId = crypto.randomUUID();
		const reserved = await forward('/creative/_assets/reserve', 'POST', {
			id: newId,
			name,
			mimeType,
			role,
			size: data.byteLength
		});
		if (!reserved.ok) return privateJson(await reserved.json(), { status: reserved.status });
		try {
			await bucket.put(objectKey(newId), data.buffer, {
				httpMetadata: { contentType: mimeType, cacheControl: 'private, no-store' }
			});
		} catch {
			// Keep the reservation if cleanup fails: quota remains conservative and the user can retry deletion.
			try {
				await bucket.delete(objectKey(newId));
				await forward(`/creative/_assets/${newId}/release`, 'POST', {});
			} catch {
				/* private metadata remains visible as uploading, never a broken ready asset */
			}
			return fail(
				'Asset upload failed. Check the library for an unfinished upload before retrying.',
				503
			);
		}
		try {
			const ready = await forward(`/creative/_assets/${newId}/ready`, 'POST', {});
			if (ready.ok) return privateJson(await ready.json(), { status: 201 });
		} catch {
			// A lost finalize response may have committed. Never delete bytes after this uncertain boundary.
		}
		return fail(
			'Asset bytes were stored, but confirmation is unavailable. Reload the library before retrying.',
			503
		);
	}
	if (!id) return fail('Method not allowed.', 405);
	const metadata = await forward(`/creative/_assets/${id}`);
	if (!metadata.ok) return privateJson(await metadata.json(), { status: metadata.status });
	const item = await metadata.json();
	if (event.request.method === 'GET') {
		if (item.status !== 'ready')
			return fail(
				'This asset is not available yet. Remove the unfinished upload or try later.',
				409
			);
		const binary = await bucket.get(objectKey(id));
		if (!binary) return fail('The stored asset bytes are unavailable.', 404);
		return new Response(binary.body, {
			headers: {
				'Content-Type': item.mimeType,
				'Content-Length': String(binary.size),
				'Cache-Control': 'private, no-store',
				'X-Content-Type-Options': 'nosniff',
				'Content-Security-Policy': "default-src 'none'; sandbox",
				'Referrer-Policy': 'no-referrer',
				'Content-Disposition': `${item.role === 'font' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(item.name).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)}`
			}
		});
	}
	if (event.request.method === 'DELETE') {
		let body;
		try {
			body = JSON.parse(textDecoder.decode(await readCreativeBody(event.request, 1024)));
		} catch {
			return fail('Provide the current asset revision.');
		}
		const fenced = await forward(`/creative/_assets/${id}/deleting`, 'POST', body);
		if (!fenced.ok) return privateJson(await fenced.json(), { status: fenced.status });
		try {
			await bucket.delete(objectKey(id));
		} catch {
			return fail('Asset deletion failed. Reload and retry the unfinished deletion.', 503);
		}
		const result = await forward(`/creative/_assets/${id}/release`, 'POST', {});
		return privateJson(await result.json(), { status: result.status });
	}
	return fail('Method not allowed.', 405);
}
