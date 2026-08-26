import assert from 'node:assert/strict';
import test from 'node:test';
import {
	acknowledgeDrawingPendingSave,
	createDrawingPendingSave,
	drawingPendingSaveKey,
	readDrawingPendingSave,
	writeDrawingPendingSave
} from '../src/lib/draw-pending-save.js';

const ACCOUNT = 'swyx-excalidraw:google:111111111111111111111';
const PAGE = 'page-a';

function memoryStorage() {
	const entries = new Map();
	return {
		getItem: (key) => entries.get(key) ?? null,
		setItem: (key, value) => entries.set(key, value),
		removeItem: (key) => entries.delete(key),
		entries
	};
}

function scene(text = 'New local edit') {
	return {
		elements: [
			{
				id: 'image-1',
				type: 'image',
				fileId: 'file-1',
				x: 12,
				y: 34,
				width: 1280,
				height: 720,
				angle: 0.25,
				scale: [-1, 1],
				version: 3,
				isDeleted: false,
				groupIds: ['group-1']
			},
			{ id: 'text-1', type: 'text', text, containerId: 'box-1' },
			{ id: 'box-1', type: 'rectangle', boundElements: [{ id: 'text-1', type: 'text' }] },
			{ id: 'deleted-1', type: 'ellipse', isDeleted: true }
		],
		appState: { viewBackgroundColor: '#fff9ea', scrollX: 15, scrollY: -20, zoom: { value: 0.8 } },
		files: {
			'file-1': {
				id: 'file-1',
				mimeType: 'image/png',
				dataURL: 'data:image/png;base64,eA==',
				created: 1
			}
		}
	};
}

test('a reload restores the complete native pending scene without mutating editor objects', () => {
	const storage = memoryStorage();
	const input = scene();
	const expected = structuredClone(input);
	const pending = createDrawingPendingSave(ACCOUNT, PAGE, input);
	writeDrawingPendingSave(storage, pending);

	input.elements[0].width = 12;
	input.appState.zoom.value = 2;
	input.files['file-1'].dataURL = 'changed';
	assert.deepEqual(pending.scene, expected);
	const restored = readDrawingPendingSave(storage, ACCOUNT, PAGE);
	assert.deepEqual(restored, pending);
	assert.notEqual(restored.scene, pending.scene);
	assert.deepEqual(Object.keys(restored.scene).sort(), ['appState', 'elements', 'files']);
});

test('a cloud failure or reload does not discard a journaled edit', () => {
	const storage = memoryStorage();
	const pending = createDrawingPendingSave(ACCOUNT, PAGE, scene());
	writeDrawingPendingSave(storage, pending);
	const oldCloudScene = scene('Previous cloud edit');
	assert.deepEqual(
		readDrawingPendingSave(storage, ACCOUNT, PAGE)?.scene ?? oldCloudScene,
		pending.scene
	);
	assert.deepEqual(readDrawingPendingSave(storage, ACCOUNT, PAGE), pending);
});

test('only the exact acknowledged revision is cleared; a late response preserves newer edits', () => {
	const storage = memoryStorage();
	const first = createDrawingPendingSave(ACCOUNT, PAGE, scene('First'));
	const next = createDrawingPendingSave(ACCOUNT, PAGE, scene('Next'));
	writeDrawingPendingSave(storage, first);
	writeDrawingPendingSave(storage, next);
	assert.equal(acknowledgeDrawingPendingSave(storage, first), false);
	assert.deepEqual(readDrawingPendingSave(storage, ACCOUNT, PAGE), next);
	assert.equal(acknowledgeDrawingPendingSave(storage, next), true);
	assert.equal(readDrawingPendingSave(storage, ACCOUNT, PAGE), undefined);
	assert.equal(acknowledgeDrawingPendingSave(storage, first), false);
	assert.equal(acknowledgeDrawingPendingSave(storage, next), false);
});

test('a later revision remains distinct even when its scene happens to be identical', () => {
	const storage = memoryStorage();
	const first = createDrawingPendingSave(ACCOUNT, PAGE, scene());
	const next = createDrawingPendingSave(ACCOUNT, PAGE, scene());
	assert.notEqual(first.revision, next.revision);
	writeDrawingPendingSave(storage, first);
	writeDrawingPendingSave(storage, next);
	assert.equal(acknowledgeDrawingPendingSave(storage, first), false);
	assert.equal(readDrawingPendingSave(storage, ACCOUNT, PAGE).revision, next.revision);
});

test('recovery and acknowledgements stay scoped to both account and page', () => {
	const storage = memoryStorage();
	const otherAccount = 'swyx-excalidraw:google:222222222222222222222';
	const records = [
		createDrawingPendingSave(ACCOUNT, PAGE, scene('Alice first')),
		createDrawingPendingSave(ACCOUNT, 'page-b', scene('Alice second')),
		createDrawingPendingSave(otherAccount, PAGE, scene('Bob first')),
		createDrawingPendingSave('swyx-excalidraw:guest', PAGE, scene('Guest'))
	];
	for (const record of records) writeDrawingPendingSave(storage, record);
	for (const record of records) {
		assert.deepEqual(readDrawingPendingSave(storage, record.storageKey, record.pageId), record);
	}
	assert.equal(acknowledgeDrawingPendingSave(storage, records[0]), true);
	for (const record of records.slice(1)) {
		assert.deepEqual(readDrawingPendingSave(storage, record.storageKey, record.pageId), record);
	}
	assert.equal(readDrawingPendingSave(storage, ACCOUNT, 'unknown-page'), undefined);
	assert.notEqual(drawingPendingSaveKey('account:a', 'b'), drawingPendingSaveKey('account', 'a:b'));
});

test('malformed or mis-scoped stored records fail visibly without deleting recoverable bytes', () => {
	const storage = memoryStorage();
	const valid = createDrawingPendingSave(ACCOUNT, PAGE, scene());
	const malformed = [
		'{broken',
		'',
		'null',
		'[]',
		'{}',
		JSON.stringify({ ...valid, revision: '' }),
		JSON.stringify({ ...valid, revision: 42 }),
		JSON.stringify({ ...valid, storageKey: 'another-account' }),
		JSON.stringify({ ...valid, pageId: 'another-page' }),
		JSON.stringify({ ...valid, scene: null }),
		JSON.stringify({ ...valid, scene: {} }),
		JSON.stringify({ ...valid, scene: { elements: 'not-an-array' } }),
		JSON.stringify({ ...valid, scene: { elements: [null] } }),
		JSON.stringify({ ...valid, scene: { elements: [], files: [] } }),
		JSON.stringify({ ...valid, scene: { elements: [], appState: [] } })
	];
	const key = drawingPendingSaveKey(ACCOUNT, PAGE);
	for (const value of malformed) {
		storage.setItem(key, value);
		assert.throws(() => readDrawingPendingSave(storage, ACCOUNT, PAGE), /recovery record/);
		assert.throws(() => acknowledgeDrawingPendingSave(storage, valid), /recovery record/);
		assert.equal(storage.getItem(key), value);
	}
});

test('full storage leaves the previous pending revision intact and rejects the new write', () => {
	const storage = memoryStorage();
	const first = createDrawingPendingSave(ACCOUNT, PAGE, scene('Saved locally'));
	const next = createDrawingPendingSave(ACCOUNT, PAGE, scene('Not durable yet'));
	writeDrawingPendingSave(storage, first);
	const full = {
		...storage,
		setItem() {
			throw new DOMException('Storage is full', 'QuotaExceededError');
		}
	};
	assert.throws(() => writeDrawingPendingSave(full, next), { name: 'QuotaExceededError' });
	assert.deepEqual(readDrawingPendingSave(storage, ACCOUNT, PAGE), first);
	assert.equal(acknowledgeDrawingPendingSave(storage, next), false);
	assert.deepEqual(readDrawingPendingSave(storage, ACCOUNT, PAGE), first);
});

test('unavailable storage and failed acknowledgement do not claim a durable save', () => {
	const storage = memoryStorage();
	const pending = createDrawingPendingSave(ACCOUNT, PAGE, scene());
	writeDrawingPendingSave(storage, pending);
	const unavailable = {
		...storage,
		getItem() {
			throw new DOMException('Unavailable', 'SecurityError');
		}
	};
	assert.throws(() => readDrawingPendingSave(unavailable, ACCOUNT, PAGE), {
		name: 'SecurityError'
	});
	assert.throws(() => acknowledgeDrawingPendingSave(unavailable, pending), {
		name: 'SecurityError'
	});
	const cannotRemove = {
		...storage,
		removeItem() {
			throw new Error('Could not remove pending save');
		}
	};
	assert.throws(() => acknowledgeDrawingPendingSave(cannotRemove, pending), /Could not remove/);
	assert.deepEqual(readDrawingPendingSave(storage, ACCOUNT, PAGE), pending);
});

test('invalid new scenes and missing account/page scopes never overwrite an existing record', () => {
	const storage = memoryStorage();
	const pending = createDrawingPendingSave(ACCOUNT, PAGE, scene());
	writeDrawingPendingSave(storage, pending);
	for (const invalid of [
		null,
		[],
		{},
		{ elements: null },
		{ elements: [null] },
		{ elements: [], files: [] }
	]) {
		assert.throws(() => createDrawingPendingSave(ACCOUNT, PAGE, invalid), /complete drawing scene/);
	}
	for (const [account, pageId] of [
		['', PAGE],
		[ACCOUNT, ''],
		[null, PAGE],
		[ACCOUNT, undefined]
	]) {
		assert.throws(
			() => createDrawingPendingSave(account, pageId, scene()),
			/storage key and page ID/
		);
	}
	assert.throws(
		() => writeDrawingPendingSave(storage, { ...pending, scene: {} }),
		/recovery record/
	);
	assert.deepEqual(readDrawingPendingSave(storage, ACCOUNT, PAGE), pending);
});

test('empty native scenes and oversized local recovery are preserved without changing the cloud limit', () => {
	const storage = memoryStorage();
	const empty = createDrawingPendingSave(ACCOUNT, PAGE, { elements: [], files: {} });
	writeDrawingPendingSave(storage, empty);
	assert.deepEqual(readDrawingPendingSave(storage, ACCOUNT, PAGE).scene, {
		elements: [],
		files: {}
	});
	const large = createDrawingPendingSave(ACCOUNT, PAGE, scene('x'.repeat(1_800_001)));
	writeDrawingPendingSave(storage, large);
	assert.equal(
		readDrawingPendingSave(storage, ACCOUNT, PAGE).scene.elements[1].text.length,
		1_800_001
	);
	// The caller checks the cloud limit before enqueueing; recovery does not truncate local work.
	assert.ok(new TextEncoder().encode(JSON.stringify(large.scene)).byteLength > 1_800_000);
});
