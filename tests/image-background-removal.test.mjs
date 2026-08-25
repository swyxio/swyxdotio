import assert from 'node:assert/strict';
import test from 'node:test';

import {
	BACKGROUND_REMOVAL_MODELS,
	describeBackgroundRemovalProgress,
	removeImageBackground
} from '../src/lib/image-background-removal.js';

test('general background-removal modes select their exact IMG.LY models', () => {
	assert.deepEqual(BACKGROUND_REMOVAL_MODELS, {
		'general-fast': 'isnet_quint8',
		'general-balanced': 'isnet_fp16',
		'general-maximum': 'isnet'
	});
});

test('IMG.LY download and inference progress become useful normalized updates', () => {
	const download = describeBackgroundRemovalProgress('fetch:/models/isnet_quint8', 25, 100);
	assert.equal(download.phase, 'download');
	assert.equal(download.percent, 25);
	assert.equal(download.progress, 0.25);
	assert.equal(download.loaded, 25);
	assert.equal(download.total, 100);
	assert.match(download.message, /downloading/i);

	const inference = describeBackgroundRemovalProgress('compute:inference', 1, 4);
	assert.equal(inference.phase, 'processing');
	assert.equal(inference.percent, 25);
	assert.match(inference.message, /foreground/i);

	const unknown = describeBackgroundRemovalProgress('compute:custom', 8, 0);
	assert.equal(unknown.phase, 'processing');
	assert.equal(unknown.percent, undefined);
});

test('background removal rejects empty images and unsupported modes before model downloads', async () => {
	await assert.rejects(
		removeImageBackground(new Blob([], { type: 'image/png' })),
		/image is empty/i
	);
	await assert.rejects(
		removeImageBackground(new Blob(['image'], { type: 'image/png' }), {
			mode: /** @type {any} */ ('unsupported')
		}),
		/unknown background-removal mode/i
	);
});

test('an already-aborted background removal never loads a model', async () => {
	const controller = new AbortController();
	controller.abort();

	await assert.rejects(
		removeImageBackground(new Blob(['image'], { type: 'image/png' }), {
			mode: 'general-fast',
			signal: controller.signal
		}),
		{ name: 'AbortError' }
	);
});
