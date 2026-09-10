import { imageSize } from 'image-size';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 2_000_000;
const MAX_IMAGE_EDGE = 2048;
const IMAGE_TIMEOUT_MS = 2500;
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** @param {ArrayBuffer} buffer */
function toBase64(buffer) {
	const bytes = new Uint8Array(buffer);
	const chunkSize = 0x6000; // divisible by 3, so concatenated base64 chunks stay valid
	let encoded = '';
	for (let offset = 0; offset < bytes.length; offset += chunkSize) {
		encoded += btoa(String.fromCharCode(...bytes.subarray(offset, offset + chunkSize)));
	}
	return encoded;
}

/**
 * Fetch a frontmatter image once, under strict limits, so the renderer never
 * performs an unbounded second fetch.
 * @param {string | undefined} source
 * @param {typeof globalThis.fetch} providedFetch
 * @param {number} [timeoutMs]
 * @returns {Promise<string | undefined>}
 */
export async function fetchCardImage(source, providedFetch, timeoutMs = IMAGE_TIMEOUT_MS) {
	if (!source) return undefined;
	let url;
	try {
		url = new URL(source);
	} catch {
		return undefined;
	}
	if (url.protocol !== 'https:') return undefined;

	const controller = new AbortController();
	/** @type {ReadableStreamDefaultReader<Uint8Array> | undefined} */
	let reader;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timeout;
	try {
		return await Promise.race([
			(async () => {
				const response = await providedFetch(url, {
					signal: controller.signal,
					headers: { Accept: 'image/webp,image/png,image/jpeg' }
				});
				if (!response.ok || !response.body) return undefined;
				const contentType = (response.headers.get('content-type') || '')
					.split(';')[0]
					.toLowerCase();
				if (!SUPPORTED_TYPES.has(contentType)) return undefined;
				if (Number(response.headers.get('content-length') || 0) > MAX_IMAGE_BYTES) return undefined;
				reader = response.body.getReader();
				const chunks = [];
				let size = 0;
				while (!controller.signal.aborted) {
					const { done, value } = await reader.read();
					if (done) break;
					size += value.byteLength;
					if (size > MAX_IMAGE_BYTES) return undefined;
					chunks.push(value);
				}
				if (controller.signal.aborted || !size) return undefined;
				const bytes = new Uint8Array(size);
				let offset = 0;
				for (const chunk of chunks) {
					bytes.set(chunk, offset);
					offset += chunk.byteLength;
				}
				// Compressed byte size alone does not bound WASM decode work or memory.
				const dimensions = imageSize(bytes);
				if (
					!['png', 'jpg', 'webp'].includes(dimensions.type ?? '') ||
					!dimensions.width ||
					!dimensions.height ||
					dimensions.width > MAX_IMAGE_EDGE ||
					dimensions.height > MAX_IMAGE_EDGE ||
					dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
				)
					return undefined;
				return `data:${contentType};base64,${toBase64(bytes.buffer)}`;
			})(),
			new Promise((resolve) => {
				timeout = setTimeout(() => {
					controller.abort();
					resolve(undefined);
				}, timeoutMs);
			})
		]);
	} catch {
		return undefined;
	} finally {
		if (timeout) clearTimeout(timeout);
		controller.abort();
		void reader?.cancel().catch(() => {});
	}
}
