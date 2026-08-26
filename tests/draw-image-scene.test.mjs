import assert from 'node:assert/strict';
import test from 'node:test';
import {
	collectReferencedDrawingFiles,
	estimateDrawingImageReplacementBytes,
	estimateDrawingSceneBytes,
	MAX_DRAWING_CLOUD_SCENE_BYTES,
	insertDrawingGenerations,
	optimizeDrawingImageForCloud,
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

test('replacement estimates include the selected replacement and exclude unreferenced originals', () => {
	const { editor, image } = createEditor();
	const compact = estimateDrawingImageReplacementBytes({
		editor,
		imageId: image.id,
		sourceFileId: image.fileId,
		dataURL: 'data:image/webp;base64,YQ==',
		mimeType: 'image/webp'
	});
	const expanded = estimateDrawingImageReplacementBytes({
		editor,
		imageId: image.id,
		sourceFileId: image.fileId,
		dataURL: `data:image/png;base64,${'a'.repeat(1_000)}`,
		mimeType: 'image/png'
	});
	assert.ok(expanded > compact + 900);
});

test('oversized raster edits are optimized to the first WebP quality fitting the entire scene', async () => {
	const { editor, image } = createEditor();
	const qualities = [];
	let progress = 0;
	const result = await optimizeDrawingImageForCloud({
		editor,
		imageId: image.id,
		sourceFileId: image.fileId,
		dataURL: `data:image/png;base64,${'a'.repeat(10_000)}`,
		mimeType: 'image/png',
		maxCloudBytes: 8_000,
		onOptimize: () => progress++,
		encodeCandidate: async (quality) => {
			qualities.push(quality);
			return {
				dataURL: `data:image/webp;base64,${'a'.repeat(quality > 0.76 ? 9_000 : 500)}`,
				mimeType: 'image/webp'
			};
		}
	});
	assert.equal(result.optimized, true);
	assert.equal(result.mimeType, 'image/webp');
	assert.deepEqual(qualities, [0.88, 0.76]);
	assert.equal(progress, 1);
});

test('small raster and oversized vector outputs remain unchanged without encoding', async () => {
	const { editor, image } = createEditor();
	for (const fixture of [
		{ dataURL: 'data:image/png;base64,YQ==', mimeType: 'image/png' },
		{ dataURL: `data:image/svg+xml;base64,${'a'.repeat(10_000)}`, mimeType: 'image/svg+xml' }
	]) {
		const result = await optimizeDrawingImageForCloud({
			editor,
			imageId: image.id,
			sourceFileId: image.fileId,
			...fixture,
			maxCloudBytes: 5_000,
			encodeCandidate: async () => {
				throw new Error('Encoding must not run for this image.');
			}
		});
		assert.deepEqual(result, { ...fixture, optimized: false });
	}
});

test('oversized edits stay intact when no WebP candidate fits the cloud budget', async () => {
	const { editor, image } = createEditor();
	const original = {
		dataURL: `data:image/png;base64,${'a'.repeat(10_000)}`,
		mimeType: 'image/png'
	};
	const result = await optimizeDrawingImageForCloud({
		editor,
		imageId: image.id,
		sourceFileId: image.fileId,
		...original,
		maxCloudBytes: 5_000,
		encodeCandidate: async () => ({
			dataURL: `data:image/webp;base64,${'a'.repeat(8_000)}`,
			mimeType: 'image/webp'
		})
	});
	assert.deepEqual(result, { ...original, optimized: false });
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

function insertionFixture() {
	const fixture = createEditor();
	const existing = [fixture.image, { id: 'deleted-shape', type: 'rectangle', isDeleted: true }];
	fixture.editor.getSceneElementsIncludingDeleted = () => existing;
	fixture.editor.getAppState = () => ({
		viewBackgroundColor: '#ffffff',
		width: 1200,
		height: 900,
		zoom: { value: 1 },
		scrollX: 20,
		scrollY: -30
	});
	const generation = {
		id: 'generation-1',
		dataURL: 'data:image/png;base64,bmV3',
		mimeType: 'image/png',
		prompt: 'An editorial illustration',
		modelLabel: 'Example image model',
		createdAt: 123,
		width: 1200,
		height: 600,
		adapterId: 'example',
		elapsedMs: 12500,
		estimatedUsd: 0.04
	};
	return {
		...fixture,
		existing,
		generation,
		options: {
			editor: fixture.editor,
			generations: [generation],
			captureUpdate: 'IMMEDIATELY',
			convertElements: (elements) =>
				elements.map((element, index) => ({ ...element, id: `inserted-${index}` }))
		}
	};
}

test('empty-canvas output insertion preserves aspect ratio, viewport placement and a single undo capture', async () => {
	const { options, existing, generation, calls } = insertionFixture();
	existing.splice(0);
	const result = await insertDrawingGenerations(options);
	assert.equal(calls.added.length, 1);
	assert.equal(calls.updated.length, 1);
	const scene = calls.updated[0];
	const inserted = scene.elements[0];
	assert.equal(scene.captureUpdate, 'IMMEDIATELY');
	assert.deepEqual([inserted.width, inserted.height, inserted.x, inserted.y], [600, 300, 280, 330]);
	assert.deepEqual(scene.appState.selectedElementIds, { 'inserted-0': true });
	assert.deepEqual(result, { elementIds: ['inserted-0'], exceedsCloudLimit: false });
	assert.equal(calls.added[0][0].dataURL, generation.dataURL);
	assert.equal(calls.added[0][0].id, inserted.fileId);
});

test('comparison board inserts native images and labels together while preserving existing and deleted elements', async () => {
	const { options, generation, existing, files, calls } = insertionFixture();
	const originalFiles = structuredClone(files);
	const result = await insertDrawingGenerations({
		...options,
		board: true,
		generations: [
			generation,
			{ ...generation, id: 'generation-2', modelLabel: 'Portrait model', width: 400, height: 800 }
		]
	});
	assert.equal(calls.updated.length, 1);
	assert.equal(calls.added[0].length, 2);
	const scene = calls.updated[0];
	assert.equal(scene.elements[0], existing[0]);
	assert.equal(scene.elements[1], existing[1]);
	assert.deepEqual(files, originalFiles);
	assert.equal(scene.captureUpdate, 'IMMEDIATELY');
	const inserted = scene.elements.slice(2);
	assert.deepEqual(
		inserted.map((element) => element.type),
		['image', 'text', 'image', 'text']
	);
	assert.equal(inserted[0].width / inserted[0].height, 2);
	assert.equal(inserted[2].width / inserted[2].height, 0.5);
	assert.ok(inserted[2].x > inserted[0].x + inserted[0].width);
	assert.match(inserted[1].text, /Example image model\nexample\n12\.5s end-to-end · ~\$0\.040/);
	assert.deepEqual(Object.keys(scene.appState.selectedElementIds), result.elementIds);
	assert.equal(result.elementIds.length, 4);
});

test('generated portraits fit a zoomed mobile viewport without changing existing zoom or scroll', async () => {
	const { options, editor, generation, calls } = insertionFixture();
	editor.getAppState = () => ({
		viewBackgroundColor: '#fff',
		width: 390,
		height: 600,
		zoom: { value: 2 },
		scrollX: -100,
		scrollY: 40
	});
	await insertDrawingGenerations({
		...options,
		generations: [{ ...generation, width: 400, height: 800 }]
	});
	const scene = calls.updated[0];
	const inserted = scene.elements.at(-1);
	assert.equal(inserted.width, 120);
	assert.equal(inserted.height, 240);
	assert.equal(inserted.x + inserted.width / 2, 197.5);
	assert.equal(inserted.y + inserted.height / 2, 110);
	assert.deepEqual(Object.keys(scene.appState), ['selectedElementIds']);
});

test('video, remote image, empty selection and accidental multiple insertion never mutate the scene', async () => {
	const { options, generation, calls } = insertionFixture();
	for (const generations of [
		[],
		[generation, generation],
		[{ ...generation, mimeType: 'video/mp4', dataURL: 'https://media.example/video.mp4' }],
		[{ ...generation, dataURL: 'https://media.example/image.png' }]
	]) {
		await assert.rejects(insertDrawingGenerations({ ...options, generations }));
	}
	assert.deepEqual(calls, { added: [], updated: [] });
});

test('canceled insertion does not add files or create a native undo entry', async () => {
	const { options, calls } = insertionFixture();
	const controller = new AbortController();
	const inserting = insertDrawingGenerations({ ...options, signal: controller.signal });
	controller.abort();
	await assert.rejects(inserting, { name: 'AbortError' });
	assert.deepEqual(calls, { added: [], updated: [] });
});

test('results without provider dimensions decode locally and cancellation clears a pending decoder', async (t) => {
	const { options, generation, calls } = insertionFixture();
	const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Image');
	t.after(() => {
		if (descriptor) Object.defineProperty(globalThis, 'Image', descriptor);
		else delete globalThis.Image;
	});
	const images = [];
	globalThis.Image = class {
		constructor() {
			this.naturalWidth = 600;
			this.naturalHeight = 300;
			images.push(this);
		}
	};
	const unknownDimensions = { ...generation, width: undefined, height: undefined };
	const pending = insertDrawingGenerations({ ...options, generations: [unknownDimensions] });
	assert.equal(images[0].src, generation.dataURL);
	images[0].onload();
	await pending;
	assert.equal(calls.updated[0].elements.at(-1).width, 600);
	assert.equal(calls.updated[0].elements.at(-1).height, 300);
	const controller = new AbortController();
	const canceled = insertDrawingGenerations({
		...options,
		generations: [unknownDimensions],
		signal: controller.signal
	});
	controller.abort();
	await assert.rejects(canceled, { name: 'AbortError' });
	assert.equal(images[1].src, '');
	assert.equal(images[1].onload, null);
	assert.equal(calls.updated.length, 1);
});

test('insertion reads the latest scene after asynchronous preparation instead of dropping concurrent edits', async () => {
	const { options, existing, calls } = insertionFixture();
	const pending = insertDrawingGenerations(options);
	const concurrent = { id: 'drawn-while-preparing', type: 'rectangle' };
	existing.push(concurrent);
	await pending;
	assert.equal(calls.updated[0].elements[2], concurrent);
});

test('oversized inserted outputs report local-only status while leaving history originals unchanged', async () => {
	const { options, generation, calls } = insertionFixture();
	const original = {
		...generation,
		mimeType: 'image/svg+xml',
		dataURL: `data:image/svg+xml;base64,${'a'.repeat(10000)}`
	};
	const result = await insertDrawingGenerations({
		...options,
		generations: [original],
		cloudAvailable: true,
		maxCloudBytes: 8000
	});
	assert.equal(result.exceedsCloudLimit, true);
	assert.equal(calls.added[0][0].dataURL, original.dataURL);
	assert.equal(calls.added[0][0].mimeType, 'image/svg+xml');
});

test('cloud insertion optimizes rasters before one undo capture without rewriting original output bytes', async (t) => {
	const { options, generation, calls } = insertionFixture();
	const original = { ...generation, dataURL: `data:image/png;base64,${'a'.repeat(10000)}` };
	const descriptors = ['createImageBitmap', 'OffscreenCanvas', 'FileReader'].map((name) => [
		name,
		Object.getOwnPropertyDescriptor(globalThis, name)
	]);
	t.after(() => {
		for (const [name, descriptor] of descriptors) {
			if (descriptor) Object.defineProperty(globalThis, name, descriptor);
			else delete globalThis[name];
		}
	});
	let closed = 0;
	globalThis.createImageBitmap = async () => ({ width: 1200, height: 600, close: () => closed++ });
	globalThis.OffscreenCanvas = class {
		getContext() {
			return { drawImage() {} };
		}
		async convertToBlob() {
			return new Blob(['compressed'], { type: 'image/webp' });
		}
	};
	globalThis.FileReader = class {
		readAsDataURL() {
			this.result = 'data:image/webp;base64,YQ==';
			queueMicrotask(() => this.onload());
		}
	};
	const result = await insertDrawingGenerations({
		...options,
		generations: [original],
		cloudAvailable: true,
		maxCloudBytes: 8000
	});
	assert.equal(result.exceedsCloudLimit, false);
	assert.equal(closed, 1);
	assert.equal(calls.updated.length, 1);
	assert.equal(calls.added[0][0].mimeType, 'image/webp');
	assert.equal(original.mimeType, 'image/png');
	assert.equal(original.dataURL.length, 10022);
});
