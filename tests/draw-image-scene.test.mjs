import assert from 'node:assert/strict';
import test from 'node:test';
import {
	collectReferencedDrawingFiles,
	estimateDrawingSceneBytes,
	MAX_DRAWING_CLOUD_SCENE_BYTES,
	replaceDrawingImage
} from '../src/lib/draw-image-scene.js';

/** @param {Partial<Record<string, unknown>>} [options] */
function createEditor(options = {}) {
	const image = {
		id: 'selected-image',
		type: 'image',
		fileId: 'original-file',
		x: 48,
		y: 82,
		width: 640,
		height: 360,
		angle: 0.3,
		...options
	};
	const files = {
		'original-file': { id: 'original-file', dataURL: 'data:image/png;base64,b2xk' },
		'unrelated-file': { id: 'unrelated-file', dataURL: 'data:image/png;base64,c3RhbGU=' }
	};
	const calls = { added: [], updated: [] };
	const editor = {
		getSceneElementsIncludingDeleted: () => [image],
		getFiles: () => files,
		getAppState: () => ({ viewBackgroundColor: '#ffffff' }),
		addFiles: (added) => calls.added.push(added),
		updateScene: (scene) => calls.updated.push(scene)
	};
	return { editor, image, files, calls };
}

test('image replacement preserves selection, geometry, and one native undo capture', () => {
	const { editor, image, calls } = createEditor();
	const result = replaceDrawingImage({
		editor,
		imageId: image.id,
		sourceFileId: image.fileId,
		dataURL: 'data:image/png;base64,bmV3',
		mimeType: 'image/png',
		updateElement: (element, changes) => ({ ...element, ...changes }),
		captureUpdate: 'IMMEDIATELY'
	});

	assert.equal(calls.added.length, 1);
	assert.equal(calls.updated.length, 1);
	const scene = calls.updated[0];
	assert.equal(scene.captureUpdate, 'IMMEDIATELY');
	assert.deepEqual(scene.appState.selectedElementIds, { [image.id]: true });
	assert.deepEqual(
		[scene.elements[0].id, scene.elements[0].x, scene.elements[0].y],
		[image.id, image.x, image.y]
	);
	assert.deepEqual(
		[scene.elements[0].width, scene.elements[0].height, scene.elements[0].angle],
		[640, 360, 0.3]
	);
	assert.equal(scene.elements[0].fileId, result.fileId);
	assert.equal(calls.added[0][0].mimeType, 'image/png');
	assert.equal(result.exceedsCloudLimit, false);
});

test('SVG vector images remain editable as selected Excalidraw image assets', () => {
	const { editor, image, calls } = createEditor();
	replaceDrawingImage({
		editor,
		imageId: image.id,
		sourceFileId: image.fileId,
		dataURL: 'data:image/svg+xml;base64,PHN2Zy8+',
		mimeType: 'image/svg+xml',
		updateElement: (element, changes) => ({ ...element, ...changes }),
		captureUpdate: 'IMMEDIATELY'
	});
	assert.equal(calls.added[0][0].mimeType, 'image/svg+xml');
	assert.equal(calls.updated[0].elements[0].width, image.width);
});

test('cloud scene size is checked before introducing an oversized replacement', () => {
	const { editor, image, calls } = createEditor();
	const result = replaceDrawingImage({
		editor,
		imageId: image.id,
		sourceFileId: image.fileId,
		dataURL: `data:image/png;base64,${'a'.repeat(512)}`,
		mimeType: 'image/png',
		updateElement: (element, changes) => ({ ...element, ...changes }),
		captureUpdate: 'IMMEDIATELY',
		cloudAvailable: true,
		maxCloudBytes: 200
	});
	assert.equal(result.exceedsCloudLimit, true);
	assert.equal(calls.updated.length, 1);
	assert.equal(MAX_DRAWING_CLOUD_SCENE_BYTES, 1_800_000);
	assert.ok(estimateDrawingSceneBytes([image], {}, '#fff') > 0);
});

test('stale image selections are rejected without changing the scene', () => {
	const { editor, image, calls } = createEditor();
	assert.throws(
		() =>
			replaceDrawingImage({
				editor,
				imageId: image.id,
				sourceFileId: 'different-file',
				dataURL: 'data:image/png;base64,bmV3',
				mimeType: 'image/png',
				updateElement: (element, changes) => ({ ...element, ...changes }),
				captureUpdate: 'IMMEDIATELY'
			}),
		/selected image changed/
	);
	assert.deepEqual(calls, { added: [], updated: [] });
});

test('persistence excludes deleted and unreferenced image files', () => {
	const { image, files } = createEditor();
	assert.deepEqual(Object.keys(collectReferencedDrawingFiles([image], files)), ['original-file']);
	assert.deepEqual(collectReferencedDrawingFiles([{ ...image, isDeleted: true }], files), {});
});
