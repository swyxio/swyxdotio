import assert from 'node:assert/strict';
import test from 'node:test';

import {
	DEFAULT_DRAWING_LIBRARIES,
	createDrawingLibraryPack,
	prepareDrawingLibrary
} from '../src/lib/draw-library.js';

test('default drawing libraries contain all three attributed software architecture packs', () => {
	assert.deepEqual(
		DEFAULT_DRAWING_LIBRARIES.map(({ name, attribution, libraryItems }) => ({
			name,
			attribution,
			count: libraryItems.length
		})),
		[
			{ name: 'Software Architecture', attribution: 'Youri Tjang', count: 7 },
			{ name: 'System Design Components', attribution: 'Rohan Pithadiya', count: 24 },
			{ name: 'Architecture Diagram Components', attribution: 'Anna Pastushko', count: 11 }
		]
	);

	const items = DEFAULT_DRAWING_LIBRARIES.flatMap(({ libraryItems }) => libraryItems);
	assert.equal(items.length, 42);
	assert.equal(new Set(items.map(({ id }) => id)).size, 42);
	assert.ok(items.every(({ status, elements }) => status === 'published' && elements.length > 0));
});

test('legacy and modern Excalidraw library formats receive stable usable item identities', () => {
	const legacyPack = createDrawingLibraryPack({
		id: 'legacy',
		name: 'Legacy',
		data: { library: [[{ id: 'old-shape', type: 'rectangle' }]] }
	});
	assert.equal(legacyPack.libraryItems[0].id, 'legacy-0');
	assert.equal(legacyPack.libraryItems[0].status, 'published');

	const modernPack = createDrawingLibraryPack({
		id: 'modern',
		name: 'Modern',
		data: {
			libraryItems: [
				{ id: 'author-original-id', status: 'unpublished', elements: [{ id: 'new-shape' }] }
			]
		}
	});
	assert.equal(modernPack.libraryItems[0].id, 'author-original-id');
	assert.equal(modernPack.libraryItems[0].status, 'published');
});

test('default library seeding preserves personal components and intentional removals', () => {
	const firstInstall = prepareDrawingLibrary();
	assert.equal(firstInstall.libraryItems.length, 42);

	const removedDefault = firstInstall.libraryItems[0];
	const personalItem = { ...firstInstall.libraryItems[1], id: 'my-personal-component' };
	const restored = prepareDrawingLibrary({
		savedItems: [...firstInstall.libraryItems.slice(1), personalItem],
		installedDefaultIds: firstInstall.installedDefaultIds
	});
	assert.equal(restored.libraryItems.length, 42);
	assert.ok(restored.libraryItems.some(({ id }) => id === personalItem.id));
	assert.ok(!restored.libraryItems.some(({ id }) => id === removedDefault.id));

	const futurePack = createDrawingLibraryPack({
		id: 'future',
		name: 'Future',
		data: { library: [[{ id: 'future-shape' }]] }
	});
	const upgraded = prepareDrawingLibrary({
		savedItems: restored.libraryItems,
		installedDefaultIds: restored.installedDefaultIds,
		packs: [...DEFAULT_DRAWING_LIBRARIES, futurePack]
	});
	assert.equal(upgraded.libraryItems.length, 43);
	assert.ok(upgraded.libraryItems.some(({ id }) => id === 'future-0'));
	assert.ok(!upgraded.libraryItems.some(({ id }) => id === removedDefault.id));
});
