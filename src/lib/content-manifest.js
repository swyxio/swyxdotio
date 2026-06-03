export const CONTENT_MANIFEST_KEY = 'github-content-manifest:v1';
export const CONTENT_MANIFEST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CONTENT_MANIFEST_WRITE_MAX_ATTEMPTS = 3;

/**
 * @typedef {{
 *   get(key: string): Promise<string | null>;
 *   put(key: string, value: string): Promise<void>;
 * }} ContentManifestStore
 */

/**
 * @typedef {{
 *   generatedAt: Date;
 *   blogposts: import('./types').ContentItem[];
 * }} ContentManifest
 */

/**
 * @param {unknown} err
 * @returns {string}
 */
function errorName(err) {
	return err instanceof Error ? err.name : typeof err;
}

/**
 * @param {unknown} value
 * @returns {Date}
 */
function reviveDate(value) {
	const date = new Date(/** @type {string | number | Date} */ (value));
	if (Number.isNaN(date.valueOf())) throw new Error('Content manifest contains an invalid date');
	return date;
}

/**
 * @param {number} attempt
 * @returns {Promise<void>}
 */
function waitForWriteRetry(attempt) {
	const jitterMs = Math.floor(Math.random() * 250);
	return new Promise((resolve) => setTimeout(resolve, attempt * 250 + jitterMs));
}

/**
 * @param {import('./types').ContentItem[]} blogposts
 * @returns {string}
 */
export function encodeContentManifest(blogposts) {
	return JSON.stringify({
		version: 1,
		generatedAt: new Date().toISOString(),
		blogposts
	});
}

/**
 * @param {string} encoded
 * @returns {ContentManifest}
 */
export function decodeContentManifest(encoded) {
	/** @type {{ version?: unknown, generatedAt?: unknown, blogposts?: unknown }} */
	const manifest = JSON.parse(encoded);
	if (manifest?.version !== 1 || !Array.isArray(manifest.blogposts)) {
		throw new Error('Content manifest has an unexpected shape');
	}
	const blogposts = /** @type {import('./types').ContentItem[]} */ (manifest.blogposts);
	return {
		generatedAt: reviveDate(manifest.generatedAt),
		blogposts: blogposts.map((blogpost) => ({
			...blogpost,
			date: reviveDate(blogpost.date)
		}))
	};
}

/**
 * @param {ContentManifest} manifest
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isContentManifestStale(manifest, now = new Date()) {
	return now.valueOf() - manifest.generatedAt.valueOf() > CONTENT_MANIFEST_MAX_AGE_MS;
}

/**
 * @param {ContentManifestStore | undefined} store
 * @returns {Promise<ContentManifest | null>}
 */
export async function readContentManifest(store) {
	if (!store) return null;
	try {
		const encoded = await store.get(CONTENT_MANIFEST_KEY);
		return encoded ? decodeContentManifest(encoded) : null;
	} catch (err) {
		console.error('Content manifest read failed; refreshing from GitHub', {
			errorName: errorName(err)
		});
		return null;
	}
}

/**
 * @param {ContentManifestStore | undefined} store
 * @param {import('./types').ContentItem[]} blogposts
 * @returns {Promise<boolean>}
 */
export async function writeContentManifest(store, blogposts) {
	if (!store) return false;
	for (let attempt = 1; attempt <= CONTENT_MANIFEST_WRITE_MAX_ATTEMPTS; attempt++) {
		try {
			await store.put(CONTENT_MANIFEST_KEY, encodeContentManifest(blogposts));
			return true;
		} catch (err) {
			if (attempt === CONTENT_MANIFEST_WRITE_MAX_ATTEMPTS) throw err;
			console.error('Content manifest write failed; retrying', {
				attempt,
				maxAttempts: CONTENT_MANIFEST_WRITE_MAX_ATTEMPTS,
				errorName: errorName(err)
			});
			await waitForWriteRetry(attempt);
		}
	}
	return false;
}
