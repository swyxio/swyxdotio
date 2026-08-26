const DATABASE_NAME = 'swyx-draw-generation-history';
const STORE_NAME = 'drawing-pages';

/** @typedef {{ dataURL: string, mimeType: string, generationId?: string, assetId?: string, role?: 'inspiration'|'keep'|'parent', label?: string }} DrawingGenerationReference */
/**
 * @typedef {{
 *   id: string,
 *   dataURL: string,
 *   mimeType: string,
 *   prompt: string,
 *   modelLabel: string,
 *   createdAt: number,
 *   modelId?: string,
 *   modelEndpoint?: string,
 *   modelProvider?: string,
 *   modelKind?: string,
 *   modelWorkflow?: string,
 *   modelSettings?: Record<string, unknown>,
 *   adapterId?: string,
 *   batchId?: string,
 *   recipeId?: string,
 *   runId?: string,
 *   jobId?: string,
 *   context?: Record<string, unknown>,
 *   elapsedMs?: number,
 *   estimatedUsd?: number,
 *   reportedUsd?: number,
 *   qualityNote?: string,
 *   width?: number,
 *   height?: number,
 *   promptModifiers?: { id?: string, name: string, text: string }[],
 *   referenceImages?: DrawingGenerationReference[],
 *   parentGenerationId?: string
 * }} DrawingImageGeneration
 */

/** @type {Promise<IDBDatabase> | undefined} */
let database;

function openGenerationHistory() {
	if (!database) {
		database = new Promise((resolve, reject) => {
			const request = indexedDB.open(DATABASE_NAME, 1);
			request.onupgradeneeded = () => {
				request.result.createObjectStore(STORE_NAME, { keyPath: 'pageId' });
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error ?? new Error('Image history is unavailable.'));
		}).catch((error) => {
			database = undefined;
			throw error;
		});
	}
	return database;
}

/** @param {string} pageId @returns {Promise<DrawingImageGeneration[]>} */
export async function loadDrawingGenerationHistory(pageId) {
	if (!pageId || typeof indexedDB === 'undefined') return [];
	const storage = await openGenerationHistory();
	return new Promise((resolve, reject) => {
		const request = storage.transaction(STORE_NAME).objectStore(STORE_NAME).get(pageId);
		request.onsuccess = () => {
			const generations = request.result?.generations;
			resolve(Array.isArray(generations) ? generations : []);
		};
		request.onerror = () => reject(request.error ?? new Error('Image history could not load.'));
	});
}

/** @param {string} pageId @param {DrawingImageGeneration[]} generations */
export async function saveDrawingGenerationHistory(pageId, generations) {
	if (!pageId || typeof indexedDB === 'undefined') return;
	const storage = await openGenerationHistory();
	return new Promise((resolve, reject) => {
		const transaction = storage.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const current = store.get(pageId);
		current.onsuccess = () => store.put({ ...current.result, pageId, generations });
		transaction.oncomplete = () => resolve(undefined);
		transaction.onerror = () =>
			reject(transaction.error ?? new Error('Image history could not be saved.'));
		transaction.onabort = () =>
			reject(transaction.error ?? new Error('Image history could not be saved.'));
	});
}

/** Same account/page record as result history; draft updates never replace generations.
 * @param {string} pageId @param {Record<string,unknown>} draft
 */
export async function saveDrawingGenerationDraft(pageId, draft) {
	if (!pageId || typeof indexedDB === 'undefined') return;
	const storage = await openGenerationHistory();
	return new Promise((resolve, reject) => {
		const transaction = storage.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const current = store.get(pageId);
		current.onsuccess = () => store.put({ ...current.result, pageId, draft });
		transaction.oncomplete = () => resolve(undefined);
		transaction.onerror = () =>
			reject(transaction.error ?? new Error('Generation draft could not be saved.'));
		transaction.onabort = () =>
			reject(transaction.error ?? new Error('Generation draft could not be saved.'));
	});
}
/** @param {string} pageId @returns {Promise<Record<string,any>|undefined>} */
export async function loadDrawingGenerationDraft(pageId) {
	if (!pageId || typeof indexedDB === 'undefined') return;
	const storage = await openGenerationHistory();
	return new Promise((resolve, reject) => {
		const request = storage.transaction(STORE_NAME).objectStore(STORE_NAME).get(pageId);
		request.onsuccess = () => resolve(request.result?.draft);
		request.onerror = () =>
			reject(request.error ?? new Error('Generation draft could not be loaded.'));
	});
}
