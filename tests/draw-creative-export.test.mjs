import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCreativeArtboard } from '../src/lib/draw-creative-layout.js';
import {
	prepareCreativeExport,
	exportCreativeSelection,
	originalCreativeAsset,
	bundleCreativeExports
} from '../src/lib/draw-creative-export.js';

const makeArtboard = () =>
	buildCreativeArtboard({
		headline: 'EXACT HOOK',
		people: [{ id: 'guest', name: 'Guest', fileId: 'portrait', width: 800, height: 1000 }],
		measureText: (text, size) => text.length * size * 0.5
	});
const files = {
	portrait: { id: 'portrait', dataURL: 'data:image/png;base64,AAAA', mimeType: 'image/png' },
	private: { id: 'private', dataURL: 'do-not-export' }
};

test('transparent export filters background only in export view and retains exact frame dimensions', () => {
	const artboard = makeArtboard();
	const snapshot = JSON.stringify(artboard.elements);
	const prepared = prepareCreativeExport({
		elements: artboard.elements,
		frameId: artboard.frameId,
		transparent: true
	});
	assert.equal(prepared.elements.length, artboard.elements.length - 1);
	assert.ok(
		!prepared.elements.some((element) => element.customData?.creative?.role === 'background')
	);
	assert.deepEqual(prepared.bounds, { x: 0, y: 0, width: 1280, height: 720 });
	assert.equal(prepared.exportingFrame.children.length, prepared.elements.length - 1);
	prepared.elements[0].customData.creative.role = 'changed-export-only';
	assert.equal(JSON.stringify(artboard.elements), snapshot);
});

test('PNG export calls native exporter with referenced files only and no embedded private scene', async () => {
	const artboard = makeArtboard();
	const result = await exportCreativeSelection({
		...artboard,
		files,
		frameId: artboard.frameId,
		transparent: true,
		scale: 2,
		format: 'png',
		exportToBlob: async (options) => {
			assert.equal(options.appState.exportBackground, false);
			assert.equal(options.appState.exportEmbedScene, false);
			assert.deepEqual(Object.keys(options.files), ['portrait']);
			assert.equal(options.exportPadding, 0);
			assert.deepEqual(options.getDimensions(1280, 720), { width: 2560, height: 1440, scale: 2 });
			return new Blob(['png'], { type: 'image/png' });
		}
	});
	assert.deepEqual([result.width, result.height, result.blob.type], [2560, 1440, 'image/png']);
	assert.match(result.filename, /\.png$/);
	assert.ok(files.private);
});

test('SVG remains scalable; export file byte budget warns without mutating or recompressing', async () => {
	const artboard = makeArtboard();
	const svg = await exportCreativeSelection({
		...artboard,
		files,
		format: 'svg',
		scale: 2,
		exportToSvg: async () => ({
			outerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"/>'
		})
	});
	assert.equal(svg.width, 1280);
	assert.equal(svg.blob.type, 'image/svg+xml');
	assert.match(await svg.blob.text(), /<svg/);
	let calls = 0;
	const jpg = await exportCreativeSelection({
		...artboard,
		files,
		format: 'jpg',
		maxBytes: 2,
		exportToBlob: async () => {
			calls++;
			return new Blob(['larger-than-budget']);
		}
	});
	assert.equal(calls, 1);
	assert.equal(jpg.warnings[0].code, 'export_byte_budget');
});

test('individual image export detaches frame clipping; stored asset keeps exact bytes', () => {
	const artboard = makeArtboard();
	const portrait = artboard.elements.find((element) => element.type === 'image');
	const prepared = prepareCreativeExport({
		elements: artboard.elements,
		elementIds: [portrait.id],
		transparent: true
	});
	assert.equal(prepared.elements.length, 1);
	assert.equal(prepared.elements[0].frameId, null);
	const original = originalCreativeAsset({ element: portrait, files });
	assert.deepEqual(original, files.portrait);
	original.dataURL = 'modified';
	assert.notEqual(original.dataURL, files.portrait.dataURL);
	assert.throws(
		() => originalCreativeAsset({ element: portrait, files: {} }),
		/available stored file/
	);
});

test('standalone native shape exports include bound text without selecting unrelated content', () => {
	const elements = [
		{
			id: 'shape',
			type: 'rectangle',
			x: 0,
			y: 0,
			width: 100,
			height: 50,
			boundElements: [
				{ id: 'label', type: 'text' },
				{ id: 'arrow', type: 'arrow' }
			]
		},
		{ id: 'label', type: 'text', x: 5, y: 5, width: 80, height: 30, containerId: 'shape' },
		{ id: 'arrow', type: 'arrow', x: 100, y: 50, width: 500, height: 50 }
	];
	const prepared = prepareCreativeExport({ elements, elementIds: ['shape'] });
	assert.deepEqual(
		prepared.elements.map((element) => element.id),
		['shape', 'label']
	);
	assert.equal(prepared.elements[0].boundElements.length, 1);
});

test('export rejects transparent JPG, stale selection, missing images, invalid scale, and empty exporter', async () => {
	const artboard = makeArtboard();
	await assert.rejects(
		() => exportCreativeSelection({ ...artboard, files, format: 'jpg', transparent: true }),
		/cannot preserve transparency/
	);
	await assert.rejects(
		() => exportCreativeSelection({ ...artboard, files: {}, format: 'png' }),
		/image file is missing/
	);
	await assert.rejects(
		() => exportCreativeSelection({ ...artboard, files, format: 'png', scale: 4 }),
		/1× or 2×/
	);
	await assert.rejects(
		() =>
			exportCreativeSelection({
				...artboard,
				files,
				format: 'png',
				exportToBlob: async () => new Blob()
			}),
		/no image/
	);
	assert.throws(
		() => prepareCreativeExport({ elements: artboard.elements, frameId: 'deleted' }),
		/live artboard/
	);
	assert.throws(
		() => prepareCreativeExport({ elements: artboard.elements, elementIds: ['deleted'] }),
		/empty or was deleted/
	);
});

test('campaign bundle contains only explicit output files with safe, unique names and bounded size', async () => {
	const zipSync = (files) => {
		assert.deepEqual(Object.keys(files), ['thumbnail.png', 'story.svg']);
		assert.equal(new TextDecoder().decode(files['thumbnail.png']), 'pixels');
		return new Uint8Array([80, 75, 3, 4]);
	};
	const zip = await bundleCreativeExports({
		entries: [
			{ filename: 'thumbnail.png', blob: new Blob(['pixels']) },
			{ filename: 'story.svg', blob: new Blob(['svg']) }
		],
		zipSync
	});
	assert.equal(zip.type, 'application/zip');
	await assert.rejects(
		() =>
			bundleCreativeExports({
				entries: [
					{ filename: 'a', blob: new Blob(['a']) },
					{ filename: 'a', blob: new Blob(['b']) }
				],
				zipSync
			}),
		/unique/
	);
	await assert.rejects(
		() =>
			bundleCreativeExports({
				entries: [{ filename: 'a', blob: new Blob(['abc']) }],
				zipSync,
				maxBytes: 2
			}),
		/export limit/
	);
});
