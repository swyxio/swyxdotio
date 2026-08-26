import assert from 'node:assert/strict';
import test from 'node:test';
import {
	DRAW_STARTING_MODES,
	drawingStartingModeKey,
	getDrawingStartingMode,
	isNewBlankDrawing,
	shouldShowDrawingStart
} from '../src/lib/draw-starting-modes.js';
import { drawingStorageKey } from '../src/lib/draw-account.js';

test('starting modes define presentation and shared commands, never permissions or scene content', () => {
	assert.deepEqual(
		DRAW_STARTING_MODES.map((mode) => mode.id),
		['thinking', 'thumbnails', 'experiment']
	);
	for (const mode of DRAW_STARTING_MODES) {
		assert.equal(mode.starters.length, 3);
		assert.equal(typeof mode.secondary.command, 'string');
		assert.deepEqual(
			Object.keys(mode).sort(),
			['id', 'label', 'description', 'heading', 'detail', 'section', 'starters', 'secondary'].sort()
		);
		for (const starter of mode.starters)
			assert.match(starter.command, /^(preset|design|workflow|action)-/);
	}
});

test('unknown or corrupted mode preferences safely default to Thinking', () => {
	for (const value of [undefined, null, {}, '', 'studio', 'admin', '__proto__']) {
		assert.equal(getDrawingStartingMode(value).id, 'thinking');
	}
	assert.equal(getDrawingStartingMode('experiment').id, 'experiment');
});

test('mode preferences use the same verified-account namespace as the drawing', () => {
	const keys = [null, { id: 'account-a' }, { id: 'account-b' }].map((user) =>
		drawingStartingModeKey(drawingStorageKey(user))
	);
	assert.equal(new Set(keys).size, 3);
	assert.equal(keys[1], 'swyx-excalidraw:google:account-a:starting-mode');
});

test('untouched blank drawings are distinct from deleted, offscreen, or malformed drawings', () => {
	for (const scene of [undefined, null, { elements: [] }])
		assert.equal(isNewBlankDrawing(scene), true);
	for (const scene of [
		{ elements: [{ isDeleted: true }] },
		{ elements: [{ x: 1e8 }] },
		{},
		[],
		{ elements: null },
		'invalid'
	]) {
		assert.equal(isNewBlankDrawing(scene), false);
	}
});

test('starting points wait for verified restoration and yield to active work', () => {
	const ready = {
		ready: true,
		restoreFailed: false,
		blank: true,
		dismissed: false,
		surfaceOpen: false
	};
	assert.equal(shouldShowDrawingStart(ready), true);
	for (const change of [
		{ ready: false },
		{ restoreFailed: true },
		{ blank: false },
		{ dismissed: true },
		{ surfaceOpen: true }
	]) {
		assert.equal(shouldShowDrawingStart({ ...ready, ...change }), false);
	}
});
