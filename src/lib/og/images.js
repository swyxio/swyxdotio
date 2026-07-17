const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
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
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timeout;
	try {
		const response = await Promise.race([
			providedFetch(url, {
				signal: controller.signal,
				headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg' }
			}),
			new Promise((resolve) => {
				timeout = setTimeout(() => {
					controller.abort();
					resolve(null);
				}, timeoutMs);
			})
		]);
		if (!response) return undefined;
		if (!response.ok) return undefined;
		const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
		if (!SUPPORTED_TYPES.has(contentType)) return undefined;
		const declaredSize = Number(response.headers.get('content-length') || 0);
		if (declaredSize > MAX_IMAGE_BYTES) return undefined;
		const bytes = await response.arrayBuffer();
		if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) return undefined;
		return `data:${contentType};base64,${toBase64(bytes)}`;
	} catch {
		return undefined;
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}
