/**
 * @typedef {import('@excalidraw/excalidraw/element/types').ExcalidrawElement} DrawingElement
 * @typedef {import('@excalidraw/excalidraw/types').BinaryFiles} DrawingFiles
 * @typedef {import('@excalidraw/excalidraw/types').ExcalidrawImperativeAPI} DrawingEditor
 */

export const MAX_DRAWING_CLOUD_SCENE_BYTES = 1_800_000;

/**
 * Include only live image assets so replacement does not duplicate the source image
 * in cloud or local persistence. Excalidraw keeps its own undo-file cache intact.
 * @param {readonly DrawingElement[]} elements
 * @param {DrawingFiles} files
 */
export function collectReferencedDrawingFiles(elements, files) {
	const references = new Set(
		/** @type {string[]} */ (
			elements.flatMap((element) =>
				element.type === 'image' && !element.isDeleted && element.fileId ? [element.fileId] : []
			)
		)
	);
	return /** @type {DrawingFiles} */ (
		Object.fromEntries(Object.entries(files).filter(([fileId]) => references.has(fileId)))
	);
}

/**
 * @param {readonly DrawingElement[]} elements
 * @param {DrawingFiles} files
 * @param {string} viewBackgroundColor
 */
export function estimateDrawingSceneBytes(elements, files, viewBackgroundColor) {
	return new TextEncoder().encode(
		JSON.stringify({ elements, appState: { viewBackgroundColor }, files })
	).byteLength;
}

/**
 * Replace one selected Excalidraw image as one native undo history entry while
 * preserving its id, geometry, transform, ordering, and selection.
 * @param {{
 *  editor: DrawingEditor,
 *  imageId: string,
 *  sourceFileId: string,
 *  dataURL: string,
 *  mimeType: string,
 *  updateElement: typeof import('@excalidraw/excalidraw').newElementWith,
 *  captureUpdate: typeof import('@excalidraw/excalidraw').CaptureUpdateAction.IMMEDIATELY,
 *  cloudAvailable?: boolean,
 *  maxCloudBytes?: number
 * }} options
 */
export function replaceDrawingImage(options) {
	const {
		editor,
		imageId,
		sourceFileId,
		dataURL,
		mimeType,
		updateElement,
		captureUpdate,
		cloudAvailable = false,
		maxCloudBytes = MAX_DRAWING_CLOUD_SCENE_BYTES
	} = options;
	const elements = editor.getSceneElementsIncludingDeleted();
	const current = elements.find((element) => element.id === imageId);
	if (!current || current.type !== 'image' || current.fileId !== sourceFileId) {
		throw new Error('The selected image changed before processing finished.');
	}

	const fileId = /** @type {import('@excalidraw/excalidraw/element/types').FileId} */ (
		crypto.randomUUID()
	);
	/** @type {import('@excalidraw/excalidraw/types').BinaryFileData} */
	const processedFile = {
		id: fileId,
		mimeType: /** @type {import('@excalidraw/excalidraw/types').BinaryFileData['mimeType']} */ (
			mimeType
		),
		dataURL: /** @type {import('@excalidraw/excalidraw/types').DataURL} */ (dataURL),
		created: Date.now(),
		lastRetrieved: Date.now()
	};
	const replacement = updateElement(current, { fileId, status: 'saved' });
	const nextElements = elements.map((element) =>
		element.id === current.id ? replacement : element
	);
	const nextFiles = collectReferencedDrawingFiles(nextElements, {
		...editor.getFiles(),
		[fileId]: processedFile
	});
	const exceedsCloudLimit =
		cloudAvailable &&
		estimateDrawingSceneBytes(nextElements, nextFiles, editor.getAppState().viewBackgroundColor) >
			maxCloudBytes;

	editor.addFiles([processedFile]);
	editor.updateScene({
		elements: nextElements,
		appState: { selectedElementIds: { [replacement.id]: true } },
		captureUpdate
	});

	return { fileId, dataURL, mimeType, exceedsCloudLimit };
}
