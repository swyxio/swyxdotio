/**
 * A recovery journal for edits that have not been acknowledged by cloud sync.
 * Each write is one localStorage operation; there is no separate dirty flag
 * which could survive without its scene (or point at another page's cache).
 * Callers must handle storage errors visibly and only enqueue a journaled save.
 */

/**
 * @typedef {{
 *   elements?: readonly import('@excalidraw/excalidraw/element/types').ExcalidrawElement[],
 *   appState?: Record<string, any>,
 *   files?: import('@excalidraw/excalidraw/types').BinaryFiles
 * }} DrawingPendingScene
 * @typedef {{
 *   readonly storageKey: string,
 *   readonly pageId: string,
 *   readonly revision: string,
 *   readonly scene: DrawingPendingScene
 * }} DrawingPendingSave
 * @typedef {Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>} DrawingPendingStorage
 */

/** @param {unknown} value */
function isRecord(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @param {unknown} value */
function isScene(value) {
	if (!isRecord(value)) return false;
	const scene = /** @type {Record<string, unknown>} */ (value);
	return (
		Array.isArray(scene.elements) &&
		scene.elements.every(isRecord) &&
		(scene.appState === undefined || isRecord(scene.appState)) &&
		(scene.files === undefined || isRecord(scene.files))
	);
}

/** @param {string} storageKey @param {string} pageId */
export function drawingPendingSaveKey(storageKey, pageId) {
	if (
		typeof storageKey !== 'string' ||
		!storageKey.trim() ||
		typeof pageId !== 'string' ||
		!pageId.trim()
	) {
		throw new TypeError('An account-bound drawing storage key and page ID are required.');
	}
	return `${encodeURIComponent(storageKey)}:pending-scene:${encodeURIComponent(pageId)}`;
}

/**
 * Detach the payload from live editor objects. The same snapshot must be used
 * for the journal and the PUT; changing editor objects must not change an
 * already-issued revision. This does not modify native Excalidraw scene data.
 *
 * @param {string} storageKey
 * @param {string} pageId
 * @param {DrawingPendingScene} scene
 * @returns {DrawingPendingSave}
 */
export function createDrawingPendingSave(storageKey, pageId, scene) {
	drawingPendingSaveKey(storageKey, pageId);
	if (!isScene(scene))
		throw new TypeError('A complete drawing scene is required for local recovery.');
	const snapshot = JSON.parse(JSON.stringify(scene));
	if (!isScene(snapshot))
		throw new TypeError('The drawing scene could not be serialized for recovery.');
	return { storageKey, pageId, revision: crypto.randomUUID(), scene: snapshot };
}

/**
 * @param {unknown} value
 * @param {string} storageKey
 * @param {string} pageId
 * @returns {asserts value is DrawingPendingSave}
 */
function assertPendingSave(value, storageKey, pageId) {
	const record = /** @type {DrawingPendingSave | null | undefined} */ (value);
	if (
		!isRecord(record) ||
		record?.storageKey !== storageKey ||
		record?.pageId !== pageId ||
		typeof record?.revision !== 'string' ||
		!record.revision ||
		!isScene(record.scene)
	) {
		throw new Error('The unsynced drawing recovery record is invalid.');
	}
}

/**
 * A quota or unavailable-storage error is deliberately not swallowed. Failed
 * replacement leaves the previous recovery record intact; callers must not
 * represent the new revision as durable or cloud-saved in that case.
 *
 * @param {DrawingPendingStorage} storage
 * @param {DrawingPendingSave} pending
 */
export function writeDrawingPendingSave(storage, pending) {
	const key = drawingPendingSaveKey(pending.storageKey, pending.pageId);
	assertPendingSave(pending, pending.storageKey, pending.pageId);
	storage.setItem(key, JSON.stringify(pending));
}

/**
 * Prefer this scene to a cloud scene until its exact revision is acknowledged.
 * Corruption is an error, not an empty drawing. Preserve corrupt bytes so a
 * failed restore does not destructively replace potentially recoverable data.
 *
 * @param {DrawingPendingStorage} storage
 * @param {string} storageKey
 * @param {string} pageId
 * @returns {DrawingPendingSave | undefined}
 */
export function readDrawingPendingSave(storage, storageKey, pageId) {
	const stored = storage.getItem(drawingPendingSaveKey(storageKey, pageId));
	if (stored === null) return undefined;
	let pending;
	try {
		pending = JSON.parse(stored);
	} catch {
		throw new Error('The unsynced drawing recovery record could not be read.');
	}
	assertPendingSave(pending, storageKey, pageId);
	return pending;
}

/**
 * Call only after a successful PUT of this snapshot. An older response must
 * not remove edits made while its request was in flight. Failures and account
 * changes must not call this function. PUTs still need to be serialized by the
 * caller so the server cannot accept an older scene after a newer one.
 *
 * @param {DrawingPendingStorage} storage
 * @param {DrawingPendingSave} acknowledged
 * @returns {boolean} Whether this was still the current pending revision.
 */
export function acknowledgeDrawingPendingSave(storage, acknowledged) {
	const { storageKey, pageId, revision } = acknowledged;
	assertPendingSave(acknowledged, storageKey, pageId);
	const pending = readDrawingPendingSave(storage, storageKey, pageId);
	if (pending?.revision !== revision) return false;
	storage.removeItem(drawingPendingSaveKey(storageKey, pageId));
	return true;
}
