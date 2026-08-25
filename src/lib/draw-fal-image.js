import { MAX_DRAW_FAL_REQUEST_BYTES } from './draw-fal-models.js';

const REQUEST_HEADROOM_BYTES = 8192;
const SUPPORTED_INLINE_IMAGE = /^data:image\/(?:png|jpeg|webp|avif|gif);base64,/;
const encoder = new TextEncoder();

/**
 * @typedef {typeof import('./draw-fal-models.js').DRAW_FAL_MODELS[number]} DrawingFalModel
 */

/**
 * @param {{ image: string, prompt: string, model: string }} request
 */
export function estimateDrawingFalRequestBytes(request) {
	return encoder.encode(JSON.stringify(request)).byteLength;
}

/**
 * Fit the model's useful working resolution without cropping, stretching, or
 * inventing detail by upscaling a small source image.
 * @param {number} width
 * @param {number} height
 * @param {Pick<DrawingFalModel, 'input'>} model
 */
export function drawingFalInputDimensions(width, height, model) {
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		throw new Error('The selected image has invalid dimensions.');
	}
	const scale = Math.min(
		1,
		model.input.maxEdge / Math.max(width, height),
		Math.sqrt(model.input.maxPixels / (width * height))
	);
	return {
		width: Math.max(1, Math.floor(width * scale)),
		height: Math.max(1, Math.floor(height * scale))
	};
}

/** @param {Blob} blob */
function readInlineImage(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(/** @type {string} */ (reader.result));
		reader.onerror = () =>
			reject(reader.error ?? new Error('Could not prepare the selected image.'));
		reader.readAsDataURL(blob);
	});
}

/**
 * Decode locally, preserve the original aspect ratio, and progressively encode
 * until the complete authenticated JSON request fits its real transport limit.
 * @param {{
 *  dataURL: string,
 *  prompt: string,
 *  model: DrawingFalModel,
 *  signal?: AbortSignal,
 *  onProgress?: (message: string) => void
 * }} options
 */
export async function prepareDrawingFalImage(options) {
	const { dataURL, prompt, model, signal, onProgress } = options;
	signal?.throwIfAborted();
	const originalBlob = await fetch(dataURL, { signal }).then((response) => response.blob());
	signal?.throwIfAborted();
	let bitmap;
	try {
		bitmap = await createImageBitmap(originalBlob);
	} catch {
		throw new Error('The selected image could not be prepared for AI editing.');
	}
	try {
		let dimensions = drawingFalInputDimensions(bitmap.width, bitmap.height, model);
		const originalRequest = { image: dataURL, prompt, model: model.id };
		if (
			SUPPORTED_INLINE_IMAGE.test(dataURL) &&
			dimensions.width === bitmap.width &&
			dimensions.height === bitmap.height &&
			estimateDrawingFalRequestBytes(originalRequest) <=
				MAX_DRAW_FAL_REQUEST_BYTES - REQUEST_HEADROOM_BYTES
		) {
			return {
				dataURL,
				width: bitmap.width,
				height: bitmap.height,
				originalWidth: bitmap.width,
				originalHeight: bitmap.height,
				optimized: false
			};
		}

		for (let attempt = 0; attempt < 5; attempt++) {
			signal?.throwIfAborted();
			onProgress?.(
				`Optimizing ${bitmap.width} × ${bitmap.height} image to ${dimensions.width} × ${dimensions.height} for ${model.label}`
			);
			const canvas = new OffscreenCanvas(dimensions.width, dimensions.height);
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Image preparation is unavailable in this browser.');
			if (model.input.mimeType === 'image/jpeg') {
				context.fillStyle = '#ffffff';
				context.fillRect(0, 0, dimensions.width, dimensions.height);
			}
			context.imageSmoothingEnabled = true;
			context.imageSmoothingQuality = 'high';
			context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
			for (const quality of [0.92, 0.82, 0.7, 0.56, 0.42, 0.32]) {
				signal?.throwIfAborted();
				const blob = await canvas.convertToBlob({ type: model.input.mimeType, quality });
				if (blob.type !== model.input.mimeType) continue;
				const prepared = await readInlineImage(blob);
				if (
					estimateDrawingFalRequestBytes({ image: prepared, prompt, model: model.id }) <=
					MAX_DRAW_FAL_REQUEST_BYTES - REQUEST_HEADROOM_BYTES
				) {
					return {
						dataURL: prepared,
						width: dimensions.width,
						height: dimensions.height,
						originalWidth: bitmap.width,
						originalHeight: bitmap.height,
						optimized: true
					};
				}
			}
			dimensions = {
				width: Math.max(1, Math.floor(dimensions.width * 0.8)),
				height: Math.max(1, Math.floor(dimensions.height * 0.8))
			};
		}
		throw new Error('The selected image could not be compressed enough for secure AI editing.');
	} finally {
		bitmap.close();
	}
}
