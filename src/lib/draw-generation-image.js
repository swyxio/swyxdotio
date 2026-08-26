import { MAX_DRAW_GENERATION_REQUEST_BYTES } from './draw-generation-models.js';

const REQUEST_HEADROOM_BYTES = 8192;
const SUPPORTED_IMAGE = /^image\/(?:png|jpeg|webp|avif|gif)$/;
const encoder = new TextEncoder();

/**
 * @typedef {typeof import('./draw-generation-models.js').DRAW_GENERATION_MODELS[number]} DrawingGenerationModel
 */

/**
 * @param {{ imageBytes: number, prompt: string, model: string }} request
 */
export function estimateDrawingGenerationUploadBytes(request) {
	return (
		request.imageBytes +
		encoder.encode(request.prompt).byteLength +
		encoder.encode(request.model).byteLength +
		REQUEST_HEADROOM_BYTES
	);
}

/**
 * Fit the model's useful working resolution without cropping, stretching, or
 * inventing detail by upscaling a small source image.
 * @param {number} width
 * @param {number} height
 * @param {Pick<DrawingGenerationModel, 'input'>} model
 */
export function drawingGenerationInputDimensions(width, height, model) {
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

/**
 * Decode locally, preserve the original aspect ratio, and progressively encode
 * until the binary multipart upload fits its authenticated transport limit.
 * @param {{
 *  dataURL: string,
 *  prompt: string,
 *  model: Pick<DrawingGenerationModel, 'input' | 'id' | 'label'>,
 *  signal?: AbortSignal,
 *  onProgress?: (message: string) => void
 *  maxUploadBytes?: number
 * }} options
 */
export async function prepareDrawingGenerationImage(options) {
	const { dataURL, prompt, model, signal, onProgress } = options;
	const maxUploadBytes = Math.min(
		options.maxUploadBytes ?? MAX_DRAW_GENERATION_REQUEST_BYTES,
		MAX_DRAW_GENERATION_REQUEST_BYTES
	);
	if (!Number.isFinite(maxUploadBytes) || maxUploadBytes <= REQUEST_HEADROOM_BYTES)
		throw new Error('The reference upload budget is too small.');
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
		let dimensions = drawingGenerationInputDimensions(bitmap.width, bitmap.height, model);
		const originalRequest = { imageBytes: originalBlob.size, prompt, model: model.id };
		if (
			SUPPORTED_IMAGE.test(originalBlob.type) &&
			originalBlob.type === model.input.mimeType &&
			dimensions.width === bitmap.width &&
			dimensions.height === bitmap.height &&
			estimateDrawingGenerationUploadBytes(originalRequest) <= maxUploadBytes
		) {
			return {
				blob: originalBlob,
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
				if (
					estimateDrawingGenerationUploadBytes({
						imageBytes: blob.size,
						prompt,
						model: model.id
					}) <= maxUploadBytes
				) {
					return {
						blob,
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
