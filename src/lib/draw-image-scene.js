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
 * Estimate the actual replacement scene rather than measuring an image in isolation:
 * the other canvas elements and their referenced files consume the same cloud budget.
 * @param {{ editor: DrawingEditor, imageId: string, sourceFileId: string, dataURL: string, mimeType: string }} options
 */
export function estimateDrawingImageReplacementBytes(options) {
	const { editor, imageId, sourceFileId, dataURL, mimeType } = options;
	const elements = editor.getSceneElementsIncludingDeleted();
	const current = elements.find((element) => element.id === imageId);
	if (!current || current.type !== 'image' || current.fileId !== sourceFileId) {
		throw new Error('The selected image changed before processing finished.');
	}
	const fileId = /** @type {import('@excalidraw/excalidraw/element/types').FileId} */ (
		'00000000-0000-4000-8000-000000000000'
	);
	const now = Date.now();
	const nextElements = elements.map((element) =>
		element.id === imageId && element.type === 'image'
			? { ...element, fileId, status: /** @type {'saved'} */ ('saved') }
			: element
	);
	const nextFiles = collectReferencedDrawingFiles(nextElements, {
		...editor.getFiles(),
		[fileId]: /** @type {import('@excalidraw/excalidraw/types').BinaryFileData} */ ({
			id: fileId,
			mimeType,
			dataURL,
			created: now,
			lastRetrieved: now
		})
	});
	return estimateDrawingSceneBytes(
		nextElements,
		nextFiles,
		editor.getAppState().viewBackgroundColor
	);
}

/** @param {Blob} blob */
function blobAsDataUrl(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(/** @type {string} */ (reader.result));
		reader.onerror = () =>
			reject(reader.error ?? new Error('Could not optimize the edited image.'));
		reader.readAsDataURL(blob);
	});
}

/**
 * Keep oversized raster edits cloud-syncable without changing their dimensions or
 * discarding transparency. SVG remains genuine vector output and is never rasterized.
 * @param {{
 *  editor: DrawingEditor,
 *  imageId: string,
 *  sourceFileId: string,
 *  dataURL: string,
 *  mimeType: string,
 *  maxCloudBytes?: number,
 *  signal?: AbortSignal,
 *  onOptimize?: () => void,
 *  encodeCandidate?: (quality: number) => Promise<{ dataURL: string, mimeType: string }>
 * }} options
 */
export async function optimizeDrawingImageForCloud(options) {
	const {
		editor,
		imageId,
		sourceFileId,
		dataURL,
		mimeType,
		maxCloudBytes = MAX_DRAWING_CLOUD_SCENE_BYTES,
		signal,
		onOptimize,
		encodeCandidate
	} = options;
	const original = { dataURL, mimeType, optimized: false };
	if (!mimeType.startsWith('image/') || mimeType === 'image/svg+xml') return original;
	if (
		estimateDrawingImageReplacementBytes({ editor, imageId, sourceFileId, dataURL, mimeType }) <=
		maxCloudBytes
	) {
		return original;
	}
	onOptimize?.();
	/** @type {ImageBitmap | undefined} */
	let bitmap;
	try {
		/** @type {((quality: number) => Promise<{ dataURL: string, mimeType: string }>) | undefined} */
		let encode = encodeCandidate;
		if (!encode) {
			const source = await fetch(dataURL).then((response) => response.blob());
			signal?.throwIfAborted();
			bitmap = await createImageBitmap(source);
			const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
			const context = canvas.getContext('2d');
			if (!context) return original;
			context.drawImage(bitmap, 0, 0);
			encode = async (quality) => {
				const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
				return { dataURL: await blobAsDataUrl(blob), mimeType: blob.type };
			};
		}
		for (const quality of [0.88, 0.76, 0.62, 0.48]) {
			signal?.throwIfAborted();
			const candidate = await encode(quality);
			if (candidate.mimeType !== 'image/webp') continue;
			if (
				estimateDrawingImageReplacementBytes({ editor, imageId, sourceFileId, ...candidate }) <=
				maxCloudBytes - 4096
			) {
				return { ...candidate, optimized: true };
			}
		}
		return original;
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') throw error;
		return original;
	} finally {
		bitmap?.close();
	}
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
