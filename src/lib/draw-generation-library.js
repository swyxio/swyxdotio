const DATABASE_NAME = 'swyx-draw-generation-library';
const STORE_NAME = 'accounts';

// Saved assets are explicit pins, not a rolling history. Never evict them silently.
export const MAX_DRAWING_LIBRARY_ENTRIES = 128;
export const MAX_DRAWING_LIBRARY_ITEM_BYTES = 16_000_000;
export const MAX_DRAWING_LIBRARY_BYTES = 64_000_000;

/** @typedef {{ id: string, name: string, createdAt: number }} LibraryIdentity */
/** @typedef {LibraryIdentity & { kind: 'modifier', text: string }} DrawingModifierEntry */
/** @typedef {LibraryIdentity & { kind: 'reference', dataURL: string, mimeType: string }} DrawingReferenceEntry */
/** @typedef {LibraryIdentity & { kind: 'generation', generation: import('./draw-generation-history.js').DrawingImageGeneration }} DrawingGenerationEntry */
/** @typedef {DrawingModifierEntry | DrawingReferenceEntry | DrawingGenerationEntry} DrawingLibraryEntry */
/** @typedef {DrawingLibraryEntry} DrawingGenerationLibraryEntry */

/** @type {Promise<IDBDatabase> | undefined} */
let database;

/** @param {string} storageKey */
function requireStorageKey(storageKey) {
	if (typeof storageKey !== 'string' || !storageKey.trim()) {
		throw new Error('Choose an account before opening the saved library.');
	}
}

/** @param {unknown} dataURL @param {unknown} mimeType */
function validReference(dataURL, mimeType) {
	return (
		typeof dataURL === 'string' &&
		typeof mimeType === 'string' &&
		/^image\/(png|jpeg|webp|gif|avif|svg\+xml)$/.test(mimeType) &&
		dataURL.startsWith(`data:${mimeType};base64,`) &&
		dataURL.length > `data:${mimeType};base64,`.length
	);
}

/** @param {import('./draw-generation-history.js').DrawingImageGeneration} generation */
function validateGeneration(generation) {
	if (
		!generation ||
		typeof generation.id !== 'string' ||
		!generation.id ||
		typeof generation.prompt !== 'string' ||
		typeof generation.modelLabel !== 'string' ||
		!Number.isFinite(generation.createdAt)
	) {
		throw new Error('This saved recipe is incomplete.');
	}
	if (generation.mimeType?.startsWith('video/')) {
		// Only pin the provider URL and recipe. Do not fetch or persist video bytes.
		let url;
		try {
			url = new URL(generation.dataURL);
		} catch {
			throw new Error('Save videos as HTTPS links; video bytes are not stored in the library.');
		}
		if (url.protocol !== 'https:' || url.username || url.password) {
			throw new Error('Save videos as HTTPS links; video bytes are not stored in the library.');
		}
	} else if (!validReference(generation.dataURL, generation.mimeType)) {
		throw new Error('A saved image recipe needs its local image bytes.');
	}
	if (
		generation.referenceImages &&
		(!Array.isArray(generation.referenceImages) ||
			generation.referenceImages.some((reference) =>
				!validReference(reference?.dataURL, reference?.mimeType)
			))
	) {
		throw new Error('Saved recipe references must contain local image bytes.');
	}
}

/**
 * Clone before the first asynchronous operation so edits to a live draft cannot
 * rewrite a pinned recipe, its references, modifier text, or lineage.
 * @param {DrawingLibraryEntry[]} entries
 * @returns {DrawingLibraryEntry[]}
 */
function snapshotLibrary(entries) {
	if (!Array.isArray(entries)) throw new Error('The saved library is invalid.');
	if (entries.length > MAX_DRAWING_LIBRARY_ENTRIES) {
		throw new Error(`The saved library holds up to ${MAX_DRAWING_LIBRARY_ENTRIES} items. Remove an item before saving another.`);
	}
	const ids = new Set();
	const encoder = new TextEncoder();
	for (const entry of entries) {
		if (
			!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) ||
			typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 120 ||
			!Number.isFinite(entry.createdAt)
		) {
			throw new Error('Saved items need a unique ID, a name of up to 120 characters, and a creation date.');
		}
		ids.add(entry.id);
		if (entry.kind === 'modifier') {
			if (typeof entry.text !== 'string' || !entry.text.trim()) {
				throw new Error('Add some text before saving a prompt modifier.');
			}
		} else if (entry.kind === 'reference') {
			if (!validReference(entry.dataURL, entry.mimeType)) {
				throw new Error('A saved reference must contain local image bytes.');
			}
		} else if (entry.kind === 'generation') {
			validateGeneration(entry.generation);
		} else {
			throw new Error('This saved item type is not supported.');
		}
		if (encoder.encode(JSON.stringify(entry)).byteLength > MAX_DRAWING_LIBRARY_ITEM_BYTES) {
			throw new Error('This item exceeds the 16 MB saved-item limit. Use a smaller image or fewer references.');
		}
	}
	const serialized = JSON.stringify(entries);
	if (encoder.encode(serialized).byteLength > MAX_DRAWING_LIBRARY_BYTES) {
		throw new Error('The saved library exceeds its 64 MB limit. Remove items before saving more.');
	}
	return JSON.parse(serialized);
}

function openLibrary() {
	if (typeof indexedDB === 'undefined') {
		throw new Error('The saved library needs browser storage, which is unavailable on this device.');
	}
	if (!database) {
		database = new Promise((resolve, reject) => {
			const request = indexedDB.open(DATABASE_NAME, 1);
			request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'storageKey' });
			request.onsuccess = () => {
				request.result.onversionchange = () => {
					request.result.close();
					database = undefined;
				};
				resolve(request.result);
			};
			request.onerror = () => reject(request.error ?? new Error('The saved library could not be opened.'));
		}).catch((error) => {
			database = undefined;
			throw error;
		});
	}
	return database;
}

/** @param {string} storageKey @returns {Promise<DrawingLibraryEntry[]>} */
export async function loadDrawingGenerationLibrary(storageKey) {
	requireStorageKey(storageKey);
	const storage = await openLibrary();
	return new Promise((resolve, reject) => {
		const transaction = storage.transaction(STORE_NAME);
		const request = transaction.objectStore(STORE_NAME).get(storageKey);
		request.onsuccess = () => {
			try {
				resolve(snapshotLibrary(request.result?.entries ?? []));
			} catch (error) {
				reject(error);
			}
		};
		request.onerror = () => reject(request.error ?? new Error('The saved library could not load.'));
		transaction.onabort = () => reject(transaction.error ?? new Error('The saved library could not load.'));
	});
}

/** @param {string} storageKey @param {DrawingLibraryEntry[]} entries */
export async function saveDrawingGenerationLibrary(storageKey, entries) {
	requireStorageKey(storageKey);
	const snapshot = snapshotLibrary(entries);
	const storage = await openLibrary();
	return new Promise((resolve, reject) => {
		const transaction = storage.transaction(STORE_NAME, 'readwrite');
		transaction.objectStore(STORE_NAME).put({ storageKey, entries: snapshot });
		transaction.oncomplete = () => resolve(undefined);
		const failed = () => reject(new Error(
			transaction.error?.name === 'QuotaExceededError'
				? 'Browser storage is full. This item was not saved; free space and try again.'
				: 'The saved library could not be stored on this device. Your previous saved items are unchanged.',
			{ cause: transaction.error }
		));
		transaction.onerror = failed;
		transaction.onabort = failed;
	});
}
