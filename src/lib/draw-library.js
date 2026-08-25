import softwareArchitecture from './draw-libraries/software-architecture.json' with { type: 'json' };
import systemDesignComponents from './draw-libraries/system-design-components.json' with { type: 'json' };
import architectureDiagramComponents from './draw-libraries/architecture-diagram-components.json' with { type: 'json' };

/**
 * @typedef {import('@excalidraw/excalidraw/types').LibraryItem} DrawingLibraryItem
 * @typedef {{
 *   id: string,
 *   name: string,
 *   libraryItems: readonly DrawingLibraryItem[],
 *   source?: string,
 *   attribution?: string
 * }} DrawingLibraryPack
 */

/** @type {readonly DrawingLibraryPack[]} */
export const DEFAULT_DRAWING_LIBRARIES = [
	createDrawingLibraryPack({
		id: 'software-architecture',
		name: 'Software Architecture',
		data: softwareArchitecture,
		attribution: 'Youri Tjang',
		source:
			'https://github.com/excalidraw/excalidraw-libraries/blob/main/libraries/youritjang/software-architecture.excalidrawlib'
	}),
	createDrawingLibraryPack({
		id: 'system-design-components',
		name: 'System Design Components',
		data: systemDesignComponents,
		attribution: 'Rohan Pithadiya',
		source:
			'https://github.com/excalidraw/excalidraw-libraries/blob/main/libraries/rohanp/system-design.excalidrawlib'
	}),
	createDrawingLibraryPack({
		id: 'architecture-diagram-components',
		name: 'Architecture Diagram Components',
		data: architectureDiagramComponents,
		attribution: 'Anna Pastushko',
		source:
			'https://github.com/excalidraw/excalidraw-libraries/blob/main/libraries/anna-pastushko/architecture-diagram-components.excalidrawlib'
	})
];

/**
 * Normalize Excalidraw's legacy v1 arrays and current v2 library items.
 *
 * @param {{
 *   id: string,
 *   name: string,
 *   data: { library?: readonly unknown[], libraryItems?: readonly unknown[] },
 *   source?: string,
 *   attribution?: string
 * }} options
 * @returns {DrawingLibraryPack}
 */
export function createDrawingLibraryPack({ id, name, data, source, attribution }) {
	const importedItems = data.libraryItems ?? data.library ?? [];
	const libraryItems = importedItems.map((importedItem, index) => {
		if (Array.isArray(importedItem)) {
			return /** @type {DrawingLibraryItem} */ ({
				id: `${id}-${index}`,
				status: 'published',
				created: 0,
				elements: importedItem
			});
		}

		const item = /** @type {Partial<DrawingLibraryItem>} */ (importedItem);
		return /** @type {DrawingLibraryItem} */ ({
			...item,
			id: item.id ?? `${id}-${index}`,
			status: 'published',
			created: item.created ?? 0,
			elements: item.elements ?? []
		});
	});

	return { id, name, libraryItems, ...(source && { source }), ...(attribution && { attribution }) };
}

/**
 * Merge newly installed defaults without replacing or resurrecting a user's items.
 *
 * @param {{
 *   savedItems?: readonly DrawingLibraryItem[],
 *   installedDefaultIds?: readonly string[],
 *   packs?: readonly DrawingLibraryPack[]
 * }} options
 */
export function prepareDrawingLibrary({
	savedItems = [],
	installedDefaultIds = [],
	packs = DEFAULT_DRAWING_LIBRARIES
} = {}) {
	const installedIds = new Set(installedDefaultIds);
	const existingIds = new Set(savedItems.map((item) => item.id));
	const libraryItems = [...savedItems];

	for (const pack of packs) {
		for (const item of pack.libraryItems) {
			if (!installedIds.has(item.id) && !existingIds.has(item.id)) {
				libraryItems.push(item);
				existingIds.add(item.id);
			}
			installedIds.add(item.id);
		}
	}

	return { libraryItems, installedDefaultIds: [...installedIds] };
}
