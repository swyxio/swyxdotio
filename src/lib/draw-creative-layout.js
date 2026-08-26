import { DRAW_DESIGN_FORMATS } from './draw-designs.js';

export const CREATIVE_FORMATS = DRAW_DESIGN_FORMATS;
export const CREATIVE_DIRECTIONS = Object.freeze([
	{ id: 'editorial', label: 'Editorial', description: 'A large hook beside the complete cast.' },
	{
		id: 'portrait-led',
		label: 'Portrait led',
		description: 'Lead with a real portrait, then the hook.'
	},
	{
		id: 'split',
		label: 'Decision split',
		description: 'A central hook between opposing portrait groups.'
	},
	{
		id: 'headline-led',
		label: 'Headline led',
		description: 'An oversized hook above a compact cast strip.'
	}
]);

/** @typedef {{ x: number, y: number, width: number, height: number }} Box */
/** @typedef {{ id: string, name: string, fileId?: string, width?: number, height?: number, role?: 'brand' | 'company' }} CreativeAsset */
/** @typedef {{ brand?: 'generic' | 'aie' | 'ls' | 'fde', background?: string, foreground?: string, accent?: string, fontFamily?: number }} CreativeKit */
/** @typedef {{ code: string, message: string, elementId?: string }} CreativeWarning */
/** @typedef {(text: string, fontSize: number, fontFamily: number) => number} TextMeasurer */
/** @typedef {{ format?: string, direction?: string, headline?: string, people?: CreativeAsset[], logos?: CreativeAsset[], kit?: CreativeKit, name?: string, x?: number, y?: number, measureText?: TextMeasurer }} CreativeOptions */
/** @typedef {{ elements: any[], frameId: string, format: typeof DRAW_DESIGN_FORMATS[number], direction: string | null, warnings: CreativeWarning[] }} CreativeArtboard */

const NATIVE_FONTS = new Set([1, 2, 3, 5, 6, 7, 8, 9]);
const uid = () => `creative-${crypto.randomUUID()}`;

/**
 * Actual browser measurement is optional, not claimed when using the estimate.
 * Await document.fonts.ready before using downloaded native fonts. Uploaded font
 * files are NOT registered by this module; Excalidraw only supports its font IDs.
 * @param {CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D} context
 * @returns {TextMeasurer}
 */
export function createCanvasTextMeasurer(context) {
	/** @type {Record<number, string>} */
	const families = {
		1: 'Virgil',
		2: 'Helvetica, Arial',
		3: 'Cascadia',
		5: 'Excalifont',
		6: 'Nunito',
		7: '"Lilita One"',
		8: '"Comic Shanns"',
		9: '"Liberation Sans"'
	};
	return (text, fontSize, fontFamily) => {
		context.font = `${fontSize}px ${families[fontFamily] ?? 'Helvetica, Arial'}, sans-serif`;
		return context.measureText(text).width;
	};
}

/** @type {TextMeasurer} */
const estimateText = (text, size) =>
	[...text].reduce(
		(width, character) =>
			width +
			(/\s/u.test(character)
				? 0.32
				: /[MW@#%]/.test(character)
					? 0.9
					: /[ilI.,'!]/.test(character)
						? 0.3
						: /[^\u0000-\u00ff]/u.test(character)
							? 1
							: 0.6) *
				size,
		0
	);

/**
 * Word wraps without deleting words, preserves verbatim originalText, and never
 * shrinks below the readable floor. Unfit content is returned WITH warnings so
 * callers can ask for a shorter hook, not silently clip it or invent new copy.
 * @param {{text: string, width: number, height: number, maxFontSize?: number, minFontSize?: number, fontFamily?: number, lineHeight?: number, measureText?: TextMeasurer}} options
 */
export function fitCreativeText(options) {
	const {
		text,
		width,
		height,
		maxFontSize = 88,
		minFontSize = 28,
		fontFamily = 2,
		lineHeight = 1.2,
		measureText
	} = options;
	if (
		![width, height, maxFontSize, minFontSize, lineHeight].every(
			(value) => Number.isFinite(value) && value > 0
		) ||
		minFontSize > maxFontSize
	)
		throw new Error('Text fitting needs positive bounds and an ordered font-size range.');
	const measure = measureText ?? estimateText;
	/** @param {number} size */
	const wrap = (size) =>
		text.split('\n').flatMap((paragraph) => {
			if (!paragraph) return [''];
			/** @type {string[]} */
			const lines = [];
			let line = '';
			for (const token of paragraph.match(/\S+[^\S\n]*|[^\S\n]+/gu) ?? []) {
				const candidate = line + token;
				if (line && measure(candidate.trimEnd(), size, fontFamily) > width) {
					lines.push(line.trimEnd());
					line = token;
				} else line = candidate;
			}
			lines.push(line.trimEnd());
			return lines;
		});
	let fontSize = Math.max(minFontSize, Math.floor(maxFontSize));
	let lines = wrap(fontSize);
	const measuredWidth = () =>
		Math.max(0, ...lines.map((line) => measure(line, fontSize, fontFamily)));
	while (
		fontSize > minFontSize &&
		(measuredWidth() > width || lines.length * fontSize * lineHeight > height)
	) {
		fontSize = Math.max(minFontSize, fontSize - 1);
		lines = wrap(fontSize);
	}
	const actualWidth = measuredWidth();
	const actualHeight = lines.length * fontSize * lineHeight;
	if (!Number.isFinite(actualWidth) || actualWidth < 0)
		throw new Error('The text measurement function returned an invalid width.');
	const overflow = actualWidth > width + 0.01 || actualHeight > height + 0.01;
	return {
		text: lines.join('\n'),
		originalText: text,
		fontSize,
		width: actualWidth,
		height: actualHeight,
		lineHeight,
		overflow,
		measurement: measureText ? 'measured' : 'estimated',
		warnings: overflow
			? [
					{
						code: 'text_overflow',
						message:
							'Text does not fit at the readable minimum. Shorten it or enlarge its region; no words were removed.'
					}
				]
			: []
	};
}

/** @param {string} format */
function getFormat(format) {
	const result = CREATIVE_FORMATS.find((item) => item.id === format);
	if (!result) throw new Error('Choose an available artboard format.');
	return result;
}

/** @param {CreativeKit} kit @param {CreativeWarning[]} warnings */
function resolveKit(kit, warnings) {
	const brand = kit.brand ?? 'generic';
	if (!['generic', 'aie', 'ls', 'fde'].includes(brand))
		throw new Error('Choose a supported brand-kit type.');
	const ls = brand === 'ls' || brand === 'fde';
	if (brand === 'aie')
		warnings.push({
			code: 'aie_unapproved',
			message:
				'This is a neutral/user-supplied AIE composition, not an approved conference-video template.'
		});
	const fontFamily = kit.fontFamily ?? 2;
	if (!NATIVE_FONTS.has(fontFamily))
		throw new Error(
			'This font is not supported as editable Excalidraw text. Choose a native font; uploaded fonts are stored assets only.'
		);
	return {
		brand,
		background: kit.background ?? (ls ? '#111019' : '#ffffff'),
		foreground: kit.foreground ?? (ls ? '#ffffff' : '#171717'),
		accent: kit.accent ?? (ls ? '#c8ff47' : '#555555'),
		fontFamily
	};
}

/** @param {CreativeAsset[]} assets @param {string} type */
function validateAssets(assets, type) {
	if (assets.length > 24)
		throw new Error(
			`A single composition supports up to 24 ${type}. Split the brief into multiple artboards; no assets were dropped.`
		);
	const ids = new Set();
	for (const asset of assets) {
		if (!asset.id || ids.has(asset.id))
			throw new Error(`Each requested ${type} entry needs a unique asset ID.`);
		if (!asset.fileId && !asset.name)
			throw new Error(`Supply a real file or exact name for each ${type} entry.`);
		if (
			asset.fileId &&
			![asset.width, asset.height].every(
				(value) => typeof value === 'number' && Number.isFinite(value) && value > 0
			)
		)
			throw new Error('Real images need their original width and height to preserve aspect ratio.');
		ids.add(asset.id);
	}
}

/** @param {Box} box @param {string} color @param {string} role */
function rect(box, color, role) {
	return {
		id: uid(),
		type: 'rectangle',
		...box,
		strokeColor: color,
		backgroundColor: color,
		fillStyle: 'solid',
		roughness: 0,
		strokeWidth: 0,
		roundness: null,
		customData: { creative: { role } }
	};
}

/** @param {Box} area @param {number} count @param {number} gap @param {number} [columns] @returns {Box[]} */
function cells(
	area,
	count,
	gap,
	columns = Math.ceil(Math.sqrt((count * area.width) / area.height))
) {
	if (!count) return [];
	columns = Math.max(1, Math.min(count, columns));
	const rows = Math.ceil(count / columns);
	const width = Math.max(1, (area.width - gap * (columns - 1)) / columns);
	const height = Math.max(1, (area.height - gap * (rows - 1)) / rows);
	return Array.from({ length: count }, (_, index) => ({
		x: area.x + (index % columns) * (width + gap),
		y: area.y + Math.floor(index / columns) * (height + gap),
		width,
		height
	}));
}

/** @param {Box} area @param {CreativeAsset} asset */
function contain(area, asset) {
	const ratio = Math.min(
		area.width / /** @type {number} */ (asset.width),
		area.height / /** @type {number} */ (asset.height)
	);
	const width = /** @type {number} */ (asset.width) * ratio;
	const height = /** @type {number} */ (asset.height) * ratio;
	return {
		x: area.x + (area.width - width) / 2,
		y: area.y + (area.height - height) / 2,
		width,
		height
	};
}

/** @param {Box} box @param {CreativeAsset} asset @param {string} role */
function realImage(box, asset, role) {
	return {
		id: uid(),
		type: 'image',
		...contain(box, asset),
		fileId: asset.fileId,
		status: 'saved',
		scale: [1, 1],
		customData: {
			creative: {
				role,
				assetId: asset.id,
				name: asset.name,
				sourceFileId: asset.fileId,
				sourceWidth: asset.width,
				sourceHeight: asset.height
			}
		}
	};
}

/** @param {string} content @param {Box} box @param {number} maxSize @param {number} minSize @param {ReturnType<typeof resolveKit>} kit @param {string} role @param {CreativeWarning[]} warnings @param {TextMeasurer | undefined} measureText @param {string | undefined} [assetId] */
function nativeText(content, box, maxSize, minSize, kit, role, warnings, measureText, assetId) {
	const fitted = fitCreativeText({
		text: content,
		width: box.width,
		height: box.height,
		maxFontSize: maxSize,
		minFontSize: minSize,
		fontFamily: kit.fontFamily,
		measureText
	});
	const id = uid();
	warnings.push(...fitted.warnings.map((warning) => ({ ...warning, elementId: id })));
	return {
		id,
		type: 'text',
		x: box.x,
		y: box.y,
		text: fitted.text,
		originalText: content,
		width: fitted.width,
		height: fitted.height,
		fontSize: fitted.fontSize,
		fontFamily: kit.fontFamily,
		lineHeight: fitted.lineHeight,
		strokeColor: kit.foreground,
		roughness: 0,
		textAlign: 'left',
		autoResize: true,
		customData: {
			creative: {
				role,
				...(assetId ? { assetId } : {}),
				renderedText: fitted.text,
				sourceText: content,
				bounds: { ...box }
			}
		}
	};
}

/** @param {CreativeOptions} [options] @returns {CreativeArtboard} */
export function buildCreativeArtboard(options = {}) {
	const {
		format: formatId = 'youtube',
		direction = 'editorial',
		headline = '',
		people = [],
		logos = [],
		x = 0,
		y = 0,
		measureText
	} = options;
	const format = getFormat(formatId);
	if (!CREATIVE_DIRECTIONS.some((item) => item.id === direction))
		throw new Error('Choose an available art direction.');
	if (!Number.isFinite(x) || !Number.isFinite(y))
		throw new Error('Artboard position must be finite.');
	validateAssets(people, 'people');
	validateAssets(logos, 'logos');
	/** @type {CreativeWarning[]} */
	const warnings = [];
	const kit = resolveKit(options.kit ?? {}, warnings);
	if (!measureText)
		warnings.push({
			code: 'estimated_typography',
			message:
				'Text fit uses estimated metrics. Check the rendered native font and the 320px preview before export.'
		});
	const { width, height } = format;
	const scale = Math.min(width / 1280, height / 720);
	const padding = 48 * scale;
	const gap = 24 * scale;
	const top = y + padding + height * 0.12;
	const bottom = y + height * 0.81;
	const area = { x: x + padding, y: top, width: width - padding * 2, height: bottom - top };
	const tall = width / height < 1.15;
	/** @type {Box} */
	let hook;
	/** @type {Box[]} */
	let portraits;
	if (!people.length) {
		// A missing portrait is not permission to invent one. Preserve distinct
		// editorial hierarchy using only the supplied headline and negative space.
		if (direction === 'editorial') {
			hook = {
				...area,
				y: area.y + area.height * 0.12,
				width: area.width * 0.76,
				height: area.height * 0.76
			};
		} else if (direction === 'portrait-led') {
			hook = {
				x: area.x + area.width * 0.38,
				y: area.y + area.height * 0.27,
				width: area.width * 0.62,
				height: area.height * 0.65
			};
		} else if (direction === 'split') {
			hook = {
				x: area.x + area.width * 0.24,
				y: area.y + area.height * 0.02,
				width: area.width * 0.52,
				height: area.height * 0.94
			};
		} else hook = area;
		portraits = [];
	} else if (tall || direction === 'headline-led') {
		const topIsPortrait = direction === 'portrait-led';
		const fraction = topIsPortrait ? 0.6 : direction === 'headline-led' ? 0.65 : 0.43;
		const upper = { ...area, height: (area.height - gap) * fraction };
		const lower = {
			...area,
			y: area.y + upper.height + gap,
			height: area.height - upper.height - gap
		};
		hook = topIsPortrait ? lower : upper;
		const portraitArea = topIsPortrait ? upper : lower;
		portraits = cells(
			portraitArea,
			people.length,
			gap,
			direction === 'headline-led' ? people.length : direction === 'split' ? 2 : undefined
		);
	} else if (direction === 'split') {
		const side = (area.width - gap * 2) * 0.255;
		hook = {
			x: area.x + side + gap,
			y: area.y,
			width: area.width - side * 2 - gap * 2,
			height: area.height
		};
		const leftCount = Math.ceil(people.length / 2);
		portraits = [
			...cells({ ...area, width: side }, leftCount, gap, 1),
			...cells(
				{ ...area, x: hook.x + hook.width + gap, width: side },
				people.length - leftCount,
				gap,
				1
			)
		];
	} else {
		const portraitLed = direction === 'portrait-led';
		const textWidth = (area.width - gap) * (portraitLed ? 0.39 : 0.55);
		const portraitWidth = area.width - gap - textWidth;
		hook = { ...area, x: portraitLed ? area.x + portraitWidth + gap : area.x, width: textWidth };
		const portraitArea = {
			...area,
			x: portraitLed ? area.x : area.x + textWidth + gap,
			width: portraitWidth
		};
		if (portraitLed && people.length > 1) {
			const hero = { ...portraitArea, height: (portraitArea.height - gap) * 0.68 };
			portraits = [
				hero,
				...cells(
					{
						...portraitArea,
						y: hero.y + hero.height + gap,
						height: portraitArea.height - hero.height - gap
					},
					people.length - 1,
					gap,
					people.length - 1
				)
			];
		} else portraits = cells(portraitArea, people.length, gap);
	}
	/** @type {any[]} */
	const children = [rect({ x, y, width, height }, kit.background, 'background')];
	if (headline) {
		const maxSize = (direction === 'headline-led' ? 118 : 96) * scale;
		children.push(
			nativeText(headline, hook, maxSize, 36 * scale, kit, 'headline', warnings, measureText)
		);
		children.push(
			rect(
				{
					x: hook.x,
					y: hook.y - 16 * scale,
					width: Math.min(100 * scale, hook.width),
					height: 5 * scale
				},
				kit.accent,
				'decoration'
			)
		);
	} else
		warnings.push({
			code: 'missing_headline',
			message: 'No headline was supplied. Add an exact, source-backed hook; none was invented.'
		});
	people.forEach((person, index) => {
		const box = portraits[index];
		const groupId = uid();
		const nameHeight = person.name ? Math.min(box.height * 0.27, 64 * scale) : 0;
		if (person.fileId) {
			const image = realImage(
				{ ...box, height: Math.max(1, box.height - nameHeight - (nameHeight ? 8 * scale : 0)) },
				person,
				'portrait'
			);
			children.push({ ...image, groupIds: [groupId] });
			if (image.width < 120 * scale || image.height < 120 * scale)
				warnings.push({
					code: 'small_portrait',
					message: `${person.name || person.id} is small. Review cast coverage at mobile size.`,
					elementId: image.id
				});
		} else
			warnings.push({
				code: 'missing_portrait',
				message: `No real photo supplied for ${person.name || person.id}; only the exact name is placed.`
			});
		if (person.name)
			children.push({
				...nativeText(
					person.name,
					{
						...box,
						y: person.fileId ? box.y + box.height - nameHeight : box.y,
						height: person.fileId ? nameHeight : box.height
					},
					32 * scale,
					26 * scale,
					kit,
					'person-name',
					warnings,
					measureText,
					person.id
				),
				groupIds: [groupId]
			});
	});
	const brandLogos = logos.filter((logo) => logo.role === 'brand');
	const companyLogos = logos.filter((logo) => logo.role !== 'brand');
	const brandArea = {
		x: x + width * 0.57,
		y: y + padding,
		width: width * 0.43 - padding,
		height: height * 0.09
	};
	const brandCells = cells(brandArea, brandLogos.length, gap, brandLogos.length);
	brandLogos.forEach((logo, index) => {
		const box = brandCells[index];
		if (logo.fileId) {
			const image = realImage(box, logo, 'brand-logo');
			// Brand marks are right-aligned, never stretched or redrawn.
			image.x = box.x + box.width - image.width;
			children.push(image);
		} else
			children.push(
				nativeText(
					logo.name,
					box,
					32 * scale,
					26 * scale,
					kit,
					'brand-name',
					warnings,
					measureText,
					logo.id
				)
			);
	});
	if ((kit.brand === 'ls' || kit.brand === 'fde') && !brandLogos.some((logo) => logo.fileId))
		warnings.push({
			code: 'missing_brand_logo',
			message:
				'Attach the official Latent Space logo as a brand asset. No replacement mark was invented.'
		});
	if (kit.brand === 'fde')
		children.push(
			nativeText(
				'FDE',
				{ x: x + width * 0.43, y: y + padding, width: width * 0.12, height: height * 0.09 },
				36 * scale,
				28 * scale,
				kit,
				'series-label',
				warnings,
				measureText
			)
		);
	const rail = {
		x: x + padding,
		y: y + height * 0.86,
		width: (formatId === 'youtube' ? width * 0.8 : width - padding) - padding,
		height: height * 0.09
	};
	const logoCells = cells(rail, companyLogos.length, gap, companyLogos.length);
	companyLogos.forEach((logo, index) => {
		const box = logoCells[index];
		if (logo.fileId) {
			const image = realImage(box, logo, 'company-logo');
			children.push(image);
			if (image.height < 24 * scale || image.width < 60 * scale)
				warnings.push({
					code: 'small_logo',
					message: `${logo.name || logo.id} needs mobile-size review.`,
					elementId: image.id
				});
		} else
			children.push(
				nativeText(
					logo.name,
					box,
					32 * scale,
					26 * scale,
					kit,
					'company-name',
					warnings,
					measureText,
					logo.id
				)
			);
	});
	const frameId = uid();
	const frame = {
		id: frameId,
		type: 'frame',
		x,
		y,
		width,
		height,
		name:
			options.name ||
			`${CREATIVE_DIRECTIONS.find((item) => item.id === direction)?.label} · ${format.label}`,
		children: children.map((child) => child.id),
		customData: { creative: { version: 1, role: 'artboard', direction, format: formatId, kit } }
	};
	for (const child of children) child.frameId = frameId;
	const result = { elements: [...children, frame], frameId, format, direction, warnings };
	warnings.push(...inspectCreativeArtboard(result.elements, frameId));
	return result;
}

/** @param {{format?: string, x?: number, y?: number, background?: string, name?: string}} [options] @returns {CreativeArtboard} */
export function buildBlankArtboard(options = {}) {
	const format = getFormat(options.format ?? 'youtube');
	const x = options.x ?? 0;
	const y = options.y ?? 0;
	if (!Number.isFinite(x) || !Number.isFinite(y))
		throw new Error('Artboard position must be finite.');
	const frameId = uid();
	const background = {
		...rect(
			{ x, y, width: format.width, height: format.height },
			options.background ?? '#ffffff',
			'background'
		),
		frameId
	};
	return {
		elements: [
			background,
			{
				id: frameId,
				type: 'frame',
				x,
				y,
				width: format.width,
				height: format.height,
				children: [background.id],
				name: options.name || format.label,
				customData: { creative: { version: 1, role: 'blank', format: format.id } }
			}
		],
		frameId,
		format,
		direction: null,
		warnings: []
	};
}

/**
 * Excalidraw 0.18 uses `frame.x || computedX` internally: explicitly restore zero
 * coordinates after conversion. IDs, frame membership and grouping remain native.
 * @param {CreativeArtboard} artboard @param {(elements: any[], options: {regenerateIds: boolean}) => any[]} convertElements
 */
export function convertCreativeArtboard(artboard, convertElements) {
	const sourceFrame = artboard.elements.find((element) => element.id === artboard.frameId);
	return convertElements(artboard.elements, { regenerateIds: false }).map((element) =>
		element.id === artboard.frameId
			? {
					...element,
					x: sourceFrame.x,
					y: sourceFrame.y,
					width: sourceFrame.width,
					height: sourceFrame.height
				}
			: element
	);
}

/** @param {any[]} elements @param {string} frameId @returns {CreativeWarning[]} */
export function inspectCreativeArtboard(elements, frameId) {
	const frame = elements.find(
		(element) => element.id === frameId && element.type === 'frame' && !element.isDeleted
	);
	if (!frame) throw new Error('Choose a live creative artboard.');
	/** @type {CreativeWarning[]} */
	const warnings = [];
	const safe = {
		x: frame.x + (frame.width * 1050) / 1280,
		y: frame.y + (frame.height * 620) / 720,
		width: (frame.width * 230) / 1280,
		height: (frame.height * 100) / 720
	};
	for (const element of elements.filter(
		(item) => !item.isDeleted && item.frameId === frameId && ['text', 'image'].includes(item.type)
	)) {
		const plannedBounds = element.customData?.creative?.bounds;
		if (
			element.type === 'text' &&
			plannedBounds &&
			(element.width > plannedBounds.width + 0.01 || element.height > plannedBounds.height + 0.01)
		)
			warnings.push({
				code: 'text_region_overflow',
				message:
					'Native text is larger than its planned region. Shorten the copy or enlarge the region before export.',
				elementId: element.id
			});
		if (
			element.x < frame.x ||
			element.y < frame.y ||
			element.x + element.width > frame.x + frame.width + 0.01 ||
			element.y + element.height > frame.y + frame.height + 0.01
		)
			warnings.push({
				code: 'outside_artboard',
				message: 'An essential layer extends outside the artboard. Review before export.',
				elementId: element.id
			});
		if (frame.customData?.creative?.format === 'youtube' && intersects(element, safe))
			warnings.push({
				code: 'timestamp_overlap',
				message: 'An essential layer overlaps the lower-right timestamp exclusion zone.',
				elementId: element.id
			});
	}
	return warnings;
}

/** @param {Box} a @param {Box} b */
function intersects(a, b) {
	return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** @param {any} element */
function currentText(element) {
	const metadata = element.customData?.creative;
	if (element.originalText && element.originalText !== metadata?.sourceText)
		return element.originalText;
	if (element.text !== metadata?.renderedText) return element.text ?? '';
	return element.originalText ?? element.text ?? '';
}

/**
 * Reflows semantic native layers into a NEW artboard, reading current edited text
 * and image files. Unrecognized additions fail visibly rather than disappearing.
 * This is not a magic arbitrary-Excalidraw redesign or a destructive resize.
 * @param {{elements: any[], frameId: string, format: string, direction?: string, x?: number, y?: number, measureText?: TextMeasurer}} options
 */
export function adaptCreativeArtboard(options) {
	const frame = options.elements.find(
		(element) => element.id === options.frameId && element.type === 'frame' && !element.isDeleted
	);
	const metadata = frame?.customData?.creative;
	if (!frame || metadata?.role !== 'artboard')
		throw new Error(
			'Intelligent adaptation needs a generated native thumbnail artboard. Use Duplicate/Resize for other artwork.'
		);
	const children = options.elements.filter(
		(element) => !element.isDeleted && element.frameId === frame.id
	);
	const roles = new Set([
		'background',
		'decoration',
		'headline',
		'portrait',
		'person-name',
		'brand-logo',
		'brand-name',
		'company-logo',
		'company-name',
		'series-label'
	]);
	if (children.some((element) => !roles.has(element.customData?.creative?.role)))
		throw new Error(
			'This artboard includes manually added layers. Use Duplicate/Resize to preserve them, or move them out before intelligent adaptation.'
		);
	const semanticKeys = children.map(
		(element) => `${element.customData.creative.role}:${element.customData.creative.assetId ?? ''}`
	);
	if (new Set(semanticKeys).size !== semanticKeys.length)
		throw new Error(
			'Duplicated semantic layers need manual Duplicate/Resize; none will be dropped.'
		);
	/** @type {Map<string, CreativeAsset>} */
	const people = new Map();
	/** @type {CreativeAsset[]} */
	const logos = [];
	for (const child of children) {
		const data = child.customData?.creative;
		if (data.role === 'portrait' || data.role === 'person-name') {
			const person = people.get(data.assetId) ?? { id: data.assetId, name: '' };
			if (data.role === 'portrait')
				Object.assign(person, {
					fileId: child.fileId,
					width: child.fileId === data.sourceFileId ? data.sourceWidth : child.width,
					height: child.fileId === data.sourceFileId ? data.sourceHeight : child.height
				});
			else person.name = currentText(child);
			people.set(person.id, person);
		} else if (['brand-logo', 'brand-name', 'company-logo', 'company-name'].includes(data.role)) {
			logos.push({
				id: data.assetId,
				name: child.type === 'text' ? currentText(child) : (data.name ?? ''),
				role: data.role.startsWith('brand') ? 'brand' : 'company',
				...(child.type === 'image'
					? {
							fileId: child.fileId,
							width: child.fileId === data.sourceFileId ? data.sourceWidth : child.width,
							height: child.fileId === data.sourceFileId ? data.sourceHeight : child.height
						}
					: {})
			});
		}
	}
	const headline = children.find((element) => element.customData?.creative?.role === 'headline');
	const background = children.find(
		(element) => element.customData?.creative?.role === 'background'
	);
	const result = buildCreativeArtboard({
		format: options.format,
		direction: options.direction ?? metadata.direction,
		headline: headline ? currentText(headline) : '',
		people: [...people.values()],
		logos,
		kit: {
			...metadata.kit,
			...(background ? { background: background.backgroundColor } : {}),
			...(headline ? { foreground: headline.strokeColor, fontFamily: headline.fontFamily } : {})
		},
		x: options.x ?? frame.x + frame.width + 100,
		y: options.y ?? frame.y,
		measureText: options.measureText
	});
	if (
		children.some(
			(child) =>
				child.type === 'image' &&
				(child.crop ||
					child.angle ||
					child.scale?.some((/** @type {number} */ value) => value !== 1))
		)
	)
		result.warnings.push({
			code: 'image_framing_reset',
			message:
				'The new composition shows complete, unrotated assets; manual crops/flips/rotations remain in the preserved original only.'
		});
	if (
		children.some(
			(child) => child.type === 'image' && child.fileId !== child.customData.creative.sourceFileId
		)
	)
		result.warnings.push({
			code: 'replacement_aspect_check',
			message:
				'A replacement image uses its current displayed aspect ratio. Verify its framing against the real asset before export.'
		});
	return result;
}

/**
 * Arrange selected independent assets without resizing or mutating the originals.
 * Bound/grouped/rotated shapes need native Excalidraw layout tools instead.
 * @param {{elements: any[], elementIds: string[], columns?: number, gap?: number}} options
 */
export function gridCreativeSelection({ elements, elementIds, columns = 2, gap = 32 }) {
	if (!Number.isInteger(columns) || columns < 1 || !Number.isFinite(gap) || gap < 0)
		throw new Error('Grid columns and gap must be positive.');
	const selectedIds = new Set(elementIds);
	const selected = elements.filter((element) => selectedIds.has(element.id) && !element.isDeleted);
	if (!selected.length) throw new Error('Select assets to arrange.');
	if (
		selected.some(
			(element) =>
				element.type === 'frame' ||
				element.frameId ||
				element.containerId ||
				element.groupIds?.length ||
				element.boundElements?.length ||
				element.startBinding ||
				element.endBinding ||
				element.angle
		)
	)
		throw new Error(
			'Grid currently supports independent, unrotated assets outside artboards. Use native alignment for grouped or bound artwork.'
		);
	const originX = Math.min(...selected.map((element) => element.x));
	const originY = Math.min(...selected.map((element) => element.y));
	const width = Math.max(...selected.map((element) => element.width));
	const height = Math.max(...selected.map((element) => element.height));
	const positions = new Map(
		selected.map((element, index) => [
			element.id,
			{
				x: originX + (index % columns) * (width + gap),
				y: originY + Math.floor(index / columns) * (height + gap)
			}
		])
	);
	return elements.map((element) =>
		positions.has(element.id) ? { ...element, ...positions.get(element.id) } : element
	);
}
