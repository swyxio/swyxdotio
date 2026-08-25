const MAX_MEME_DISPLAY_SIZE = 600;

/**
 * @typedef {{ id?: string, name: string, url: string, width?: number, height?: number }} MemeTemplate
 * @typedef {import('@excalidraw/excalidraw/types').ExcalidrawImperativeAPI} ExcalidrawEditor
 */

/**
 * @param {Blob} image
 * @param {MemeTemplate} template
 */
async function readImageDimensions(image, template) {
	if (typeof createImageBitmap === 'function') {
		try {
			const bitmap = await createImageBitmap(image);
			const dimensions = { width: bitmap.width, height: bitmap.height };
			bitmap.close();
			return dimensions;
		} catch {
			// Imgflip supplies reliable dimensions when a browser cannot decode an image bitmap.
		}
	}

	if (
		typeof template.width === 'number' &&
		Number.isFinite(template.width) &&
		template.width > 0 &&
		typeof template.height === 'number' &&
		Number.isFinite(template.height) &&
		template.height > 0
	) {
		return { width: template.width, height: template.height };
	}

	if (typeof Image === 'undefined' || typeof URL.createObjectURL !== 'function') {
		throw new Error('Could not determine the meme image dimensions.');
	}

	const objectUrl = URL.createObjectURL(image);
	try {
		const element = new Image();
		element.src = objectUrl;
		await element.decode();
		return { width: element.naturalWidth, height: element.naturalHeight };
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

/** @param {Blob} image */
async function readImageDataUrl(image) {
	const bytes = new Uint8Array(await image.arrayBuffer());
	let binary = '';
	for (let offset = 0; offset < bytes.length; offset += 8192) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
	}
	return /** @type {import('@excalidraw/excalidraw/types').DataURL} */ (
		`data:${image.type};base64,${btoa(binary)}`
	);
}

/**
 * Fetch an Imgflip template directly in the browser and insert it as one
 * undoable, selected Excalidraw image without modifying the original image.
 *
 * @param {ExcalidrawEditor} editor
 * @param {MemeTemplate} template
 * @param {{
 *   convertElements: typeof import('@excalidraw/excalidraw').convertToExcalidrawElements,
 *   captureImmediately: typeof import('@excalidraw/excalidraw').CaptureUpdateAction.IMMEDIATELY,
 *   fetchImpl?: typeof fetch
 * }} options
 */
export async function insertMemeImage(editor, template, options) {
	if (!template?.url || !template.name) {
		throw new Error('Choose a meme template before adding it to your drawing.');
	}

	const fetchImage = options.fetchImpl ?? fetch;
	const response = await fetchImage(template.url, {
		mode: 'cors',
		credentials: 'omit',
		referrerPolicy: 'no-referrer'
	});
	if (!response.ok) {
		throw new Error(`Could not download “${template.name}” (${response.status}).`);
	}

	const image = await response.blob();
	if (!image.size || !image.type.startsWith('image/')) {
		throw new Error(`“${template.name}” is not a valid image.`);
	}

	const dimensions = await readImageDimensions(image, template);
	const state = editor.getAppState();
	const zoom = state.zoom.value;
	const displayScale = Math.min(
		1,
		MAX_MEME_DISPLAY_SIZE / dimensions.width,
		MAX_MEME_DISPLAY_SIZE / dimensions.height,
		(state.width * 0.8) / (zoom * dimensions.width),
		(state.height * 0.8) / (zoom * dimensions.height)
	);
	const width = dimensions.width * displayScale;
	const height = dimensions.height * displayScale;
	const centerX = state.width / (2 * zoom) - state.scrollX;
	const centerY = state.height / (2 * zoom) - state.scrollY;
	const fileId = /** @type {import('@excalidraw/excalidraw/element/types').FileId} */ (
		crypto.randomUUID()
	);
	const timestamp = Date.now();
	/** @type {import('@excalidraw/excalidraw/types').BinaryFileData} */
	const file = {
		id: fileId,
		mimeType: /** @type {import('@excalidraw/excalidraw/types').BinaryFileData['mimeType']} */ (
			image.type
		),
		dataURL: await readImageDataUrl(image),
		created: timestamp,
		lastRetrieved: timestamp
	};
	const [element] = options.convertElements(
		[
			{
				type: 'image',
				x: centerX - width / 2,
				y: centerY - height / 2,
				width,
				height,
				fileId,
				status: 'saved',
				scale: [1, 1],
				crop: null
			}
		],
		{ regenerateIds: true }
	);
	if (!element) throw new Error('Could not create a drawing element for the meme.');

	editor.addFiles([file]);
	editor.updateScene({
		elements: [...editor.getSceneElementsIncludingDeleted(), element],
		appState: { selectedElementIds: { [element.id]: true } },
		captureUpdate: options.captureImmediately
	});

	return { element, file };
}
