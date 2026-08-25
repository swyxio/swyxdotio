const DATABASE_NAME = 'swyx-draw-generation-history';
const STORE_NAME = 'drawing-pages';

/** @typedef {{ dataURL: string, mimeType: string, generationId?: string }} DrawingGenerationReference */
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
		transaction.objectStore(STORE_NAME).put({ pageId, generations });
		transaction.oncomplete = () => resolve(undefined);
		transaction.onerror = () =>
			reject(transaction.error ?? new Error('Image history could not be saved.'));
		transaction.onabort = () =>
			reject(transaction.error ?? new Error('Image history could not be saved.'));
	});
}
