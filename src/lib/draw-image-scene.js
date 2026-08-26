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

/** @param {import('./draw-generation-history.js').DrawingImageGeneration} generation @param {AbortSignal} [signal] */
async function generationDimensions(generation, signal) {
	signal?.throwIfAborted();
	if (
		typeof generation.width === 'number' &&
		Number.isFinite(generation.width) &&
		generation.width > 0 &&
		typeof generation.height === 'number' &&
		Number.isFinite(generation.height) &&
		generation.height > 0
	)
		return { width: generation.width, height: generation.height };
	const image = new Image();
	return new Promise((resolve, reject) => {
		const cleanup = () => {
			image.onload = null;
			image.onerror = null;
			signal?.removeEventListener('abort', aborted);
		};
		const aborted = () => {
			cleanup();
			image.src = '';
			reject(signal?.reason ?? new DOMException('Image insertion canceled.', 'AbortError'));
		};
		image.onload = () => {
			cleanup();
			if (!image.naturalWidth || !image.naturalHeight) {
				reject(new Error('Could not read the generated image dimensions.'));
			} else resolve({ width: image.naturalWidth, height: image.naturalHeight });
		};
		image.onerror = () => {
			cleanup();
			reject(new Error('Could not decode the generated image.'));
		};
		signal?.addEventListener('abort', aborted, { once: true });
		image.src = generation.dataURL;
	});
}

/**
 * Explicitly place saved image results on the native canvas. All file work finishes
 * before one history capture; the untouched originals remain in generation history.
 * Videos deliberately never enter the scene or get fetched by this helper.
 * @param {{
 *  editor: DrawingEditor,
 *  generations: import('./draw-generation-history.js').DrawingImageGeneration[],
 *  convertElements: typeof import('@excalidraw/excalidraw').convertToExcalidrawElements,
 *  captureUpdate: typeof import('@excalidraw/excalidraw').CaptureUpdateAction.IMMEDIATELY,
 *  cloudAvailable?: boolean,
 *  board?: boolean,
 *  signal?: AbortSignal,
 *  maxCloudBytes?: number
 * }} options
 * @returns {Promise<{ elementIds: string[], exceedsCloudLimit: boolean }>}
 */
export async function insertDrawingGenerations(options) {
	const {
		editor,
		convertElements,
		captureUpdate,
		signal,
		board = false,
		cloudAvailable = false,
		maxCloudBytes = MAX_DRAWING_CLOUD_SCENE_BYTES
	} = options;
	signal?.throwIfAborted();
	if (!options.generations.length) throw new Error('Choose an image result to add to the canvas.');
	if (!board && options.generations.length !== 1)
		throw new Error('Use a comparison board to add multiple results.');
	// Snapshot mutable recipe fields before decoding/optimization.
	const generations = options.generations.map((generation) => ({ ...generation }));
	if (
		generations.some(
			(generation) =>
				!generation.mimeType.startsWith('image/') ||
				!generation.dataURL.startsWith(`data:${generation.mimeType};base64,`)
		)
	)
		throw new Error(
			'Only downloaded image results can be added to the canvas. Videos stay in previews.'
		);
	const dimensions = await Promise.all(
		generations.map((generation) => generationDimensions(generation, signal))
	);
	signal?.throwIfAborted();
	const state = editor.getAppState();
	const zoom = state.zoom.value;
	const columns = board ? Math.min(3, Math.ceil(Math.sqrt(generations.length))) : 1;
	const rows = Math.ceil(generations.length / columns);
	const gap = board ? 24 : 0;
	const cellWidth = board ? 360 : Math.min(600, dimensions[0].width);
	const cellHeight = board ? 280 : (cellWidth * dimensions[0].height) / dimensions[0].width;
	const labelHeight = board ? 72 : 0;
	const fullWidth = columns * (cellWidth + gap) - gap;
	const fullHeight = rows * (cellHeight + labelHeight + gap) - gap;
	const displayScale = Math.min(
		1,
		(state.width * 0.8) / (zoom * fullWidth),
		(state.height * 0.8) / (zoom * fullHeight)
	);
	const originX = state.width / (2 * zoom) - state.scrollX - (fullWidth * displayScale) / 2;
	const originY = state.height / (2 * zoom) - state.scrollY - (fullHeight * displayScale) / 2;
	const now = Date.now();
	/** @type {Parameters<typeof convertElements>[0]} */
	const skeletons = [];
	const originalFiles = generations.map((generation, index) => {
		const fileId = /** @type {import('@excalidraw/excalidraw/element/types').FileId} */ (
			crypto.randomUUID()
		);
		const size = dimensions[index];
		const imageScale = Math.min(1, cellWidth / size.width, cellHeight / size.height);
		const width = size.width * imageScale;
		const height = size.height * imageScale;
		const x = originX + (index % columns) * (cellWidth + gap) * displayScale;
		const y =
			originY + Math.floor(index / columns) * (cellHeight + labelHeight + gap) * displayScale;
		skeletons.push({
			type: 'image',
			fileId,
			status: 'saved',
			scale: [1, 1],
			crop: null,
			x: x + ((cellWidth - width) * displayScale) / 2,
			y: y + ((cellHeight - height) * displayScale) / 2,
			width: width * displayScale,
			height: height * displayScale
		});
		if (board) {
			const metrics = [
				typeof generation.elapsedMs === 'number'
					? `${(generation.elapsedMs / 1000).toFixed(1)}s end-to-end`
					: '',
				typeof generation.estimatedUsd === 'number' ? `~$${generation.estimatedUsd.toFixed(3)}` : ''
			]
				.filter(Boolean)
				.join(' · ');
			skeletons.push({
				type: 'text',
				x,
				y: y + (cellHeight + 8) * displayScale,
				text: [
					generation.modelLabel.slice(0, 40),
					(generation.adapterId ?? generation.modelProvider ?? '').slice(0, 40),
					metrics
				]
					.filter(Boolean)
					.join('\n'),
				fontSize: 16 * displayScale,
				fontFamily: 2,
				textAlign: 'left',
				width: cellWidth * displayScale,
				autoResize: false
			});
		}
		return /** @type {import('@excalidraw/excalidraw/types').BinaryFileData} */ ({
			id: fileId,
			mimeType: generation.mimeType,
			dataURL: generation.dataURL,
			created: now,
			lastRetrieved: now
		});
	});
	const inserted = convertElements(skeletons, { regenerateIds: true });
	if (inserted.length !== skeletons.length)
		throw new Error('Could not create the image comparison board.');
	/** @param {import('@excalidraw/excalidraw/types').BinaryFileData[]} files */
	const sceneBytes = (files) => {
		const elements = [...editor.getSceneElementsIncludingDeleted(), ...inserted];
		return estimateDrawingSceneBytes(
			elements,
			collectReferencedDrawingFiles(elements, {
				...editor.getFiles(),
				...Object.fromEntries(files.map((file) => [file.id, file]))
			}),
			editor.getAppState().viewBackgroundColor
		);
	};
	let files = originalFiles;
	if (
		cloudAvailable &&
		sceneBytes(files) > maxCloudBytes &&
		typeof createImageBitmap === 'function' &&
		typeof OffscreenCanvas === 'function'
	) {
		/** @type {ImageBitmap[]} */
		const bitmaps = [];
		try {
			/** @type {(OffscreenCanvas | null)[]} */
			const encoders = [];
			for (const file of originalFiles) {
				signal?.throwIfAborted();
				if (file.mimeType === 'image/svg+xml') {
					encoders.push(null);
					continue;
				}
				const source = await fetch(file.dataURL, { signal }).then((response) => response.blob());
				const bitmap = await createImageBitmap(source);
				bitmaps.push(bitmap);
				const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
				const context = canvas.getContext('2d');
				if (!context) throw new Error('Image optimization is unavailable.');
				context.drawImage(bitmap, 0, 0);
				encoders.push(canvas);
			}
			for (const quality of [0.88, 0.76, 0.62, 0.48]) {
				signal?.throwIfAborted();
				const candidates = await Promise.all(
					originalFiles.map(async (file, index) => {
						const canvas = encoders[index];
						if (!canvas) return file;
						const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
						if (blob.type !== 'image/webp') return file;
						const dataURL = await blobAsDataUrl(blob);
						return dataURL.length < file.dataURL.length
							? {
									...file,
									dataURL: /** @type {typeof file.dataURL} */ (dataURL),
									mimeType: /** @type {'image/webp'} */ ('image/webp')
								}
							: file;
					})
				);
				if (sceneBytes(candidates) <= maxCloudBytes - 4096) {
					files = candidates;
					break;
				}
			}
		} catch (error) {
			if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
			// Keep originals intact and report local-only insertion if optimization fails.
		} finally {
			bitmaps.forEach((bitmap) => bitmap.close());
		}
	}
	signal?.throwIfAborted();
	const exceedsCloudLimit = cloudAvailable && sceneBytes(files) > maxCloudBytes;
	const elementIds = inserted.map((element) => element.id);
	editor.addFiles(files);
	editor.updateScene({
		elements: [...editor.getSceneElementsIncludingDeleted(), ...inserted],
		appState: { selectedElementIds: Object.fromEntries(elementIds.map((id) => [id, true])) },
		captureUpdate
	});
	return { elementIds, exceedsCloudLimit };
}
