/**
 * One native scene snapshot per account/page. Unsynced revision metadata lives
 * in the same atomic localStorage value, never in a second copy of the image.
 * Callers must handle storage errors visibly and only enqueue a persisted save.
 */

const RECOVERY_FIELD = '__swyxDrawingRecovery';

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
	return `${storageKey}:${encodeURIComponent(pageId)}`;
}

/** @param {DrawingPendingScene} scene @returns {DrawingPendingScene} */
function nativeScene(scene) {
	const result = { ...scene };
	delete (/** @type {Record<string, unknown>} */ (result)[RECOVERY_FIELD]);
	return result;
}

/** @param {DrawingPendingScene} scene @returns {DrawingPendingScene} */
function snapshotScene(scene) {
	if (!isScene(scene))
		throw new TypeError('A complete drawing scene is required for local recovery.');
	const snapshot = JSON.parse(JSON.stringify(nativeScene(scene)));
	if (!isScene(snapshot))
		throw new TypeError('The drawing scene could not be serialized for recovery.');
	return snapshot;
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
	return { storageKey, pageId, revision: crypto.randomUUID(), scene: snapshotScene(scene) };
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
	storage.setItem(
		key,
		JSON.stringify({
			...nativeScene(pending.scene),
			[RECOVERY_FIELD]: {
				storageKey: pending.storageKey,
				pageId: pending.pageId,
				revision: pending.revision
			}
		})
	);
}

/**
 * @param {DrawingPendingStorage} storage
 * @param {string} storageKey
 * @param {string} pageId
 * @returns {{ scene: DrawingPendingScene, pending?: DrawingPendingSave } | undefined}
 */
function readDrawingSnapshot(storage, storageKey, pageId) {
	const stored = storage.getItem(drawingPendingSaveKey(storageKey, pageId));
	if (stored === null) return undefined;
	let snapshot;
	try {
		snapshot = JSON.parse(stored);
	} catch {
		throw new Error('The drawing recovery record could not be read.');
	}
	if (!isScene(snapshot)) throw new Error('The drawing recovery record is invalid.');
	const scene = nativeScene(snapshot);
	if (!(RECOVERY_FIELD in snapshot)) return { scene };
	const pending = { ...snapshot[RECOVERY_FIELD], scene };
	assertPendingSave(pending, storageKey, pageId);
	return { scene, pending };
}

/**
 * Read a native scene with internal recovery metadata removed. Clean legacy
 * per-page caches remain usable; corruption never becomes an empty canvas.
 * @param {DrawingPendingStorage} storage
 * @param {string} storageKey
 * @param {string} pageId
 * @returns {DrawingPendingScene | undefined}
 */
export function readDrawingScene(storage, storageKey, pageId) {
	return readDrawingSnapshot(storage, storageKey, pageId)?.scene;
}

/**
 * Cache a known clean cloud scene (or a guest scene) without a pending marker.
 * Do not use this to overwrite a known pending revision during restoration.
 * @param {DrawingPendingStorage} storage
 * @param {string} storageKey
 * @param {string} pageId
 * @param {DrawingPendingScene} scene
 */
export function writeDrawingScene(storage, storageKey, pageId, scene) {
	const key = drawingPendingSaveKey(storageKey, pageId);
	storage.setItem(key, JSON.stringify(snapshotScene(scene)));
}

/**
 * Only revision-marked edits outrank cloud data. A clean old cache is not proof
 * of unsynced edits. Preserve malformed bytes and fail visibly on corruption.
 * @param {DrawingPendingStorage} storage
 * @param {string} storageKey
 * @param {string} pageId
 * @returns {DrawingPendingSave | undefined}
 */
export function readDrawingPendingSave(storage, storageKey, pageId) {
	return readDrawingSnapshot(storage, storageKey, pageId)?.pending;
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
	// Replacing the same key is atomic and needs no second full scene copy.
	// Keep the native scene available offline after clearing only its marker.
	writeDrawingScene(storage, storageKey, pageId, pending.scene);
	return true;
}
