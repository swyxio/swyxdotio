import assert from 'node:assert/strict';
import test from 'node:test';

import { insertMemeImage } from '../src/lib/draw-meme-image.js';

/** @param {Partial<{ width: number, height: number, scrollX: number, scrollY: number, zoom: { value: number } }>} [overrides] */
function createEditor(overrides = {}) {
	const existing = { id: 'existing-shape', type: 'rectangle' };
	/** @type {any[]} */
	const addedFiles = [];
	/** @type {any[]} */
	const scenes = [];
	return {
		addedFiles,
		scenes,
		editor: /** @type {any} */ ({
			getAppState: () => ({
				width: 1200,
				height: 900,
				scrollX: 20,
				scrollY: -30,
				zoom: { value: 1 },
				...overrides
			}),
			getSceneElementsIncludingDeleted: () => [existing],
			addFiles: (/** @type {any[]} */ files) => addedFiles.push(...files),
			updateScene: (/** @type {any} */ scene) => scenes.push(scene)
		})
	};
}

const convertElements = /** @type {any} */ (
	(/** @type {any[]} */ skeletons) =>
		skeletons.map((skeleton) => ({ id: 'inserted-meme', ...skeleton }))
);
const captureImmediately = /** @type {any} */ ('immediately');

test('inserts a centered meme image with its original bytes, aspect ratio, and one undo entry', async () => {
	const { editor, addedFiles, scenes } = createEditor();
	const template = {
		id: '181913649',
		name: 'Drake Hotline Bling',
		url: 'https://i.imgflip.com/30b1gx.jpg',
		width: 1200,
		height: 800
	};
	/** @type {Array<{ url: RequestInfo | URL, init?: RequestInit }>} */
	const requests = [];
	const fetchImpl = /** @type {typeof fetch} */ (
		async (url, init) => {
			requests.push({ url, init });
			return new Response(new Uint8Array([1, 2, 3, 4]), {
				status: 200,
				headers: { 'Content-Type': 'image/jpeg' }
			});
		}
	);

	const { element, file } = await insertMemeImage(editor, template, {
		convertElements,
		captureImmediately,
		fetchImpl
	});

	assert.equal(requests.length, 1);
	assert.equal(requests[0].url, template.url);
	assert.deepEqual(requests[0].init, {
		mode: 'cors',
		credentials: 'omit',
		referrerPolicy: 'no-referrer'
	});
	assert.equal(element.type, 'image');
	assert.equal(element.width, 600);
	assert.equal(element.height, 400);
	assert.equal(element.x, 280);
	assert.equal(element.y, 280);
	assert.equal(element.fileId, file.id);
	assert.equal(element.status, 'saved');
	assert.equal(file.mimeType, 'image/jpeg');
	assert.equal(file.dataURL, 'data:image/jpeg;base64,AQIDBA==');
	assert.deepEqual(addedFiles, [file]);
	assert.equal(scenes.length, 1);
	assert.deepEqual(
		scenes[0].elements.map((/** @type {any} */ item) => item.id),
		['existing-shape', 'inserted-meme']
	);
	assert.deepEqual(scenes[0].appState.selectedElementIds, { 'inserted-meme': true });
	assert.equal(scenes[0].captureUpdate, captureImmediately);
});

test('fits oversized portrait memes inside a zoomed viewport without stretching them', async () => {
	const { editor } = createEditor({ width: 800, height: 500, zoom: { value: 2 } });
	const { element } = await insertMemeImage(
		editor,
		{
			name: 'Gru’s Plan',
			url: 'https://i.imgflip.com/26jxvz.jpg',
			width: 700,
			height: 1000
		},
		{
			convertElements,
			captureImmediately,
			fetchImpl: async () =>
				new Response(new Uint8Array([137, 80, 78, 71]), {
					headers: { 'Content-Type': 'image/png' }
				})
		}
	);

	assert.equal(element.width, 140);
	assert.equal(element.height, 200);
	assert.equal(element.x, 110);
	assert.equal(element.y, 55);
});

test('reports image download failures without adding a broken canvas element', async () => {
	const { editor, addedFiles, scenes } = createEditor();
	await assert.rejects(
		insertMemeImage(
			editor,
			{ name: 'Distracted Boyfriend', url: 'https://i.imgflip.com/1ur9b0.jpg' },
			{
				convertElements,
				captureImmediately,
				fetchImpl: async () => new Response(null, { status: 404 })
			}
		),
		/Distracted Boyfriend.*404/
	);
	assert.deepEqual(addedFiles, []);
	assert.deepEqual(scenes, []);
});

test('rejects unexpected non-image responses before touching the scene', async () => {
	const { editor, addedFiles, scenes } = createEditor();
	await assert.rejects(
		insertMemeImage(
			editor,
			{
				name: 'Unexpected response',
				url: 'https://i.imgflip.com/1bij.jpg',
				width: 100,
				height: 100
			},
			{
				convertElements,
				captureImmediately,
				fetchImpl: async () =>
					new Response('<html>no image</html>', {
						headers: { 'Content-Type': 'text/html' }
					})
			}
		),
		/not a valid image/
	);
	assert.deepEqual(addedFiles, []);
	assert.deepEqual(scenes, []);
});
