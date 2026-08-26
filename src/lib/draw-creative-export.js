/** @typedef {{x: number, y: number, width: number, height: number}} ExportBounds */
/** @typedef {{elements: any[], frameId?: string, elementIds?: string[], transparent?: boolean, backgroundElementIds?: string[]}} ExportSelection */

/** @param {any} element @returns {ExportBounds} */
function elementBounds(element) {
	const angle = element.angle ?? 0;
	const width =
		Math.abs(element.width * Math.cos(angle)) + Math.abs(element.height * Math.sin(angle));
	const height =
		Math.abs(element.height * Math.cos(angle)) + Math.abs(element.width * Math.sin(angle));
	return {
		x: element.x + element.width / 2 - width / 2,
		y: element.y + element.height / 2 - height / 2,
		width,
		height
	};
}

/**
 * A deep-cloned export view, never a mutation of the live drawing. Transparent
 * artboard export removes only tagged creative backgrounds and explicitly named
 * background IDs; it must not guess which other shapes are unwanted artwork.
 * Bound labels accompany their shapes; a standalone asset loses frame clipping.
 * @param {ExportSelection} options
 */
export function prepareCreativeExport(options) {
	const { elements, frameId, elementIds, transparent = false, backgroundElementIds = [] } = options;
	const live = elements.filter((element) => !element.isDeleted);
	const frame = frameId
		? live.find((element) => element.id === frameId && element.type === 'frame')
		: undefined;
	if (frameId && !frame) throw new Error('Choose a live artboard to export.');
	if (!frameId && !elementIds?.length) throw new Error('Select an artboard or assets to export.');
	const ids = new Set(
		frame
			? live
					.filter((element) => element.id === frame.id || element.frameId === frame.id)
					.map((element) => element.id)
			: elementIds
	);
	// Expand selected frames and native bound labels, without adding unrelated assets.
	for (const element of live) {
		if (
			element.frameId &&
			ids.has(element.frameId) &&
			live.some((item) => item.id === element.frameId && item.type === 'frame')
		)
			ids.add(element.id);
	}
	for (const element of live.filter((item) => ids.has(item.id))) {
		for (const bound of element.boundElements ?? []) if (bound.type === 'text') ids.add(bound.id);
	}
	let selected = live.filter((element) => ids.has(element.id));
	if (!selected.length) throw new Error('The export selection is empty or was deleted.');
	/** @type {{code: string, message: string}[]} */
	const warnings = [];
	if (transparent) {
		const explicit = new Set(backgroundElementIds);
		const backgrounds = selected.filter(
			(element) => element.customData?.creative?.role === 'background' || explicit.has(element.id)
		);
		const backgroundIds = new Set(backgrounds.map((element) => element.id));
		selected = selected.filter((element) => !backgroundIds.has(element.id));
		if (frame && !backgrounds.length)
			warnings.push({
				code: 'untagged_background',
				message:
					'Canvas transparency is enabled; untagged background shapes are preserved. Select their IDs explicitly to omit them.'
			});
	}
	const retainedIds = new Set(selected.map((element) => element.id));
	const clones = structuredClone(selected).map((element) => ({
		...element,
		...(element.frameId && !retainedIds.has(element.frameId) ? { frameId: null } : {}),
		...(element.containerId && !retainedIds.has(element.containerId) ? { containerId: null } : {}),
		...(element.children
			? { children: element.children.filter((/** @type {string} */ id) => retainedIds.has(id)) }
			: {}),
		...(element.boundElements
			? {
					boundElements: element.boundElements.filter((/** @type {{id:string}} */ bound) =>
						retainedIds.has(bound.id)
					)
				}
			: {})
	}));
	const boxes = (frame ? [frame] : selected).map(elementBounds);
	if (!boxes.length) throw new Error('No visible assets remain in this export.');
	const x = Math.min(...boxes.map((box) => box.x));
	const y = Math.min(...boxes.map((box) => box.y));
	const bounds = {
		x,
		y,
		width: Math.max(...boxes.map((box) => box.x + box.width)) - x,
		height: Math.max(...boxes.map((box) => box.y + box.height)) - y
	};
	return {
		elements: clones,
		exportingFrame: frame ? clones.find((element) => element.id === frame.id) : undefined,
		bounds,
		warnings
	};
}

/** @param {string} name */
function safeName(name) {
	return (
		name
			.replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, '-')
			.replace(/^\.+/, '')
			.trim()
			.slice(0, 150) || 'design'
	);
}

/**
 * Use the existing Excalidraw exporters, injected after lazy loading. A scene
 * file is NOT embedded in outputs. Only referenced image files are passed along.
 * A large JPEG/PNG produces a warning, never hidden lossy re-encoding.
 * @param {ExportSelection & {
 * files: Record<string, any>, appState?: Record<string, any>, format?: 'png' | 'jpg' | 'svg',
 * scale?: number, name?: string, maxBytes?: number,
 * exportToBlob?: (options: any) => Promise<Blob>,
 * exportToSvg?: (options: any) => Promise<{outerHTML: string}>
 * }} options
 */
export async function exportCreativeSelection(options) {
	const { format = 'png', scale = 1, maxBytes = 2_000_000 } = options;
	if (!['png', 'jpg', 'svg'].includes(format)) throw new Error('Choose PNG, JPG, or SVG.');
	if (![1, 2].includes(scale)) throw new Error('Choose 1× or 2× export.');
	if (format === 'jpg' && options.transparent)
		throw new Error('JPG cannot preserve transparency. Choose PNG or SVG.');
	const prepared = prepareCreativeExport(options);
	const referenced = new Set(
		prepared.elements.filter((element) => element.type === 'image').map((element) => element.fileId)
	);
	for (const fileId of referenced)
		if (!fileId || !options.files[fileId])
			throw new Error('An image file is missing. Restore it before exporting this composition.');
	const files = Object.fromEntries(
		Object.entries(options.files).filter(([id]) => referenced.has(id))
	);
	const exportOptions = {
		elements: prepared.elements,
		files,
		exportingFrame: prepared.exportingFrame,
		exportPadding: 0,
		appState: {
			...options.appState,
			exportBackground: !options.transparent,
			exportEmbedScene: false,
			exportWithDarkMode: false
		}
	};
	let width = Math.round(prepared.bounds.width * scale);
	let height = Math.round(prepared.bounds.height * scale);
	let blob;
	if (format === 'svg') {
		if (!options.exportToSvg) throw new Error('The SVG exporter is not ready.');
		const svg = await options.exportToSvg(exportOptions);
		// SVG is intrinsically scalable; do not mislabel a 1× viewBox as a 2× raster.
		width = Math.round(prepared.bounds.width);
		height = Math.round(prepared.bounds.height);
		blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
	} else {
		if (!options.exportToBlob) throw new Error('The image exporter is not ready.');
		blob = await options.exportToBlob({
			...exportOptions,
			mimeType: format === 'jpg' ? 'image/jpeg' : 'image/png',
			quality: 0.92,
			getDimensions: (
				/** @type {number} */ measuredWidth,
				/** @type {number} */ measuredHeight
			) => {
				width = Math.round(measuredWidth * scale);
				height = Math.round(measuredHeight * scale);
				return { width, height, scale };
			}
		});
	}
	if (!(blob instanceof Blob) || !blob.size) throw new Error('The exporter returned no image.');
	const warnings = [...prepared.warnings];
	if (format !== 'svg' && blob.size > maxBytes)
		warnings.push({
			code: 'export_byte_budget',
			message: `The file is ${blob.size.toLocaleString()} bytes, above the ${maxBytes.toLocaleString()}-byte handoff budget. It was not automatically compressed.`
		});
	return {
		blob,
		filename: `${safeName(options.name || prepared.exportingFrame?.name || 'asset')}.${format}`,
		width,
		height,
		warnings
	};
}

/**
 * The current stored image bytes, not a canvas render (no crop/scale/background).
 * Does not claim to recover a pre-edit original after destructive replacement.
 * @param {{element: any, files: Record<string, any>}} options
 */
export function originalCreativeAsset({ element, files }) {
	if (element?.type !== 'image' || element.isDeleted || !element.fileId || !files[element.fileId])
		throw new Error('Select an image with an available stored file.');
	return structuredClone(files[element.fileId]);
}

/**
 * Export-only ZIP composition with an injected established archive encoder (e.g.
 * fflate.zipSync). The caller owns downloads and any explicit metadata manifest.
 * No scene data, source transcripts, private prompts or asset library is inferred.
 * @param {{entries: {filename: string, blob: Blob}[], zipSync: (files: Record<string, Uint8Array>) => Uint8Array, maxBytes?: number}} options
 */
export async function bundleCreativeExports({ entries, zipSync, maxBytes = 50_000_000 }) {
	if (!entries.length || entries.length > 32)
		throw new Error('Choose between 1 and 32 files for a campaign bundle.');
	if (entries.reduce((total, entry) => total + entry.blob.size, 0) > maxBytes)
		throw new Error(
			'This bundle exceeds the 50 MB in-memory export limit. Export fewer files at a time.'
		);
	/** @type {Record<string, Uint8Array>} */
	const files = Object.create(null);
	for (const entry of entries) {
		const filename = safeName(entry.filename);
		if (Object.hasOwn(files, filename))
			throw new Error('Bundle filenames must be unique. Rename the duplicate export.');
		files[filename] = new Uint8Array(await entry.blob.arrayBuffer());
	}
	const archive = zipSync(files);
	return new Blob([new Uint8Array(archive)], { type: 'application/zip' });
}
