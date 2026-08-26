// Existing assistant callers use the shared descriptor-driven image preparation.
export {
	prepareDrawingGenerationImage as prepareDrawingFalImage,
	drawingGenerationInputDimensions as drawingFalInputDimensions,
	estimateDrawingGenerationUploadBytes as estimateDrawingFalUploadBytes
} from './draw-generation-image.js';
