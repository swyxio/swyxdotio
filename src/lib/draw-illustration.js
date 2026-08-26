/** Original native illustration studies: ink silhouettes, flat color and offset layers.
 * No reference artwork or raster icon files are embedded in these components.
 */
/** @typedef {import('./draw-ui-components.js').UiComponentShape} Shape */
/** @typedef {import('./draw-ui-components.js').DrawUiComponent} Component */
const INK = '#20232b';
const PAPER = '#ffffff';
const LAVENDER = '#d5d1f3';
const TEAL = '#a7dce0';
let sequence = 0;
const id = () => `illustration-${Date.now().toString(36)}-${(++sequence).toString(36)}`;

/** @param {Shape['type']} type @param {number} x @param {number} y @param {Partial<Shape>} [props] @returns {Shape} */
function shape(type, x, y, props = {}) {
	return {
		id: id(),
		type,
		x,
		y,
		strokeColor: INK,
		backgroundColor: 'transparent',
		fillStyle: 'solid',
		strokeWidth: 2.4,
		strokeStyle: 'solid',
		roughness: 0,
		roundness: null,
		...props
	};
}
/** @param {number} x @param {number} y @param {number} width @param {number} height @param {string} [fill] */
function rect(x, y, width, height, fill = PAPER) {
	return shape('rectangle', x, y, { width, height, backgroundColor: fill, roundness: { type: 3 } });
}
/** @param {number} x @param {number} y @param {number} width @param {number} height @param {string} [fill] */
function oval(x, y, width, height, fill = PAPER) {
	return shape('ellipse', x, y, { width, height, backgroundColor: fill });
}
/** @param {Array<[number, number]>} points @param {Partial<Shape>} [props] */
function path(points, props = {}) {
	const [x, y] = points[0];
	return shape('line', x, y, {
		width: Math.max(...points.map((p) => p[0])) - Math.min(...points.map((p) => p[0])),
		height: Math.max(...points.map((p) => p[1])) - Math.min(...points.map((p) => p[1])),
		points: points.map(([px, py]) => [px - x, py - y]),
		startArrowhead: null,
		endArrowhead: null,
		...props
	});
}
/** @param {number} x @param {number} y @param {string} text @param {number} [size] @param {string} [color] */
function label(x, y, text, size = 20, color = INK) {
	return shape('text', x, y, {
		text,
		fontFamily: 2,
		fontSize: size,
		strokeWidth: 1,
		strokeColor: color
	});
}
/** @param {Shape[]} shapes @param {number} x @param {number} y */
function move(shapes, x, y) {
	return shapes.map((s) => ({ ...s, x: s.x + x, y: s.y + y }));
}
/** @param {Shape[]} shapes */
function group(shapes) {
	const groupId = id();
	return shapes.map((s) => ({ ...s, groupIds: [groupId] }));
}

/** @returns {Shape[]} */
function documentIcon() {
	return group([
		rect(14, 17, 68, 83, LAVENDER),
		path(
			[
				[4, 2],
				[51, 2],
				[72, 23],
				[72, 89],
				[4, 89],
				[4, 2]
			],
			{ backgroundColor: PAPER }
		),
		path(
			[
				[51, 2],
				[51, 23],
				[72, 23],
				[51, 2]
			],
			{ backgroundColor: '#eeecfa' }
		),
		path(
			[
				[17, 40],
				[55, 40]
			],
			{ strokeWidth: 1.6 }
		),
		path(
			[
				[17, 51],
				[55, 51]
			],
			{ strokeWidth: 1.6 }
		),
		path(
			[
				[17, 62],
				[44, 62]
			],
			{ strokeWidth: 1.6 }
		),
		path(
			[
				[17, 75],
				[38, 75]
			],
			{ strokeColor: '#6c60ad', strokeWidth: 3 }
		),
		label(2, 115, 'Document')
	]);
}

/** @param {number} y @returns {Array<[number,number]>} */
function lowerArc(y) {
	return Array.from({ length: 25 }, (_, i) => [
		52 + 40 * Math.cos((i * Math.PI) / 24),
		y + 12 * Math.sin((i * Math.PI) / 24)
	]);
}
/** @returns {Shape[]} */
function databaseIcon() {
	return group([
		oval(18, 65, 80, 24, '#eeeaf8'),
		path([[12, 26], [92, 26], ...lowerArc(76), [12, 26]], { backgroundColor: LAVENDER }),
		path(lowerArc(43), { strokeWidth: 1.6 }),
		path(lowerArc(60), { strokeWidth: 1.6 }),
		oval(12, 14, 80, 24),
		path(
			[
				[25, 33],
				[25, 69]
			],
			{ strokeColor: '#f8f7ff', strokeWidth: 4 }
		),
		label(7, 115, 'Database')
	]);
}

/** @returns {Shape[]} */
function queueIcon() {
	return group([
		rect(17, 29, 124, 55, '#e5f1f3'),
		rect(11, 23, 124, 55),
		...[0, 1, 2, 3].map((i) => rect(20 + i * 27, 32, 20, 36, i === 0 ? '#54a9b8' : TEAL)),
		path(
			[
				[-10, 44],
				[1, 44],
				[1, 38],
				[9, 50],
				[1, 62],
				[1, 56],
				[-10, 56],
				[-10, 44]
			],
			{ backgroundColor: TEAL, strokeWidth: 1.8 }
		),
		path(
			[
				[145, 44],
				[154, 44],
				[154, 38],
				[166, 50],
				[154, 62],
				[154, 56],
				[145, 56],
				[145, 44]
			],
			{ backgroundColor: TEAL, strokeWidth: 1.8 }
		),
		label(15, 115, 'Request queue')
	]);
}

/** @returns {Shape[]} */
function callout() {
	return group([
		{ ...rect(6, 8, 258, 124, '#dce5f1'), strokeColor: '#dce5f1' },
		{ ...rect(0, 0, 258, 124, '#f1f5fb'), strokeColor: '#6686ad', strokeWidth: 1.5 },
		{ ...oval(-12, -12, 34, 34, INK), strokeWidth: 1 },
		label(0, -7, '1', 22, PAPER),
		label(30, 23, 'Context builder', 25),
		label(30, 63, 'Documents + data + history', 16, '#566172'),
		path(
			[
				[30, 96],
				[225, 96]
			],
			{ strokeColor: '#a0b5d0', strokeWidth: 1 }
		)
	]);
}

/** @returns {Shape[]} */
function sampler() {
	return [
		{ ...rect(0, 0, 960, 570), strokeColor: '#d7dde6', strokeWidth: 1 },
		{ ...rect(32, 30, 6, 56, '#40968c'), strokeColor: '#40968c' },
		label(55, 30, 'Small pieces, clear ideas', 36),
		label(55, 80, 'Ink outlines · flat pastels · editable native shapes', 19, '#637080'),
		...move(documentIcon(), 94, 153),
		...move(databaseIcon(), 410, 153),
		...move(queueIcon(), 710, 153),
		path(
			[
				[231, 208],
				[334, 208]
			],
			{ type: 'arrow', endArrowhead: 'arrow', strokeWidth: 1.5 }
		),
		path(
			[
				[555, 208],
				[651, 208]
			],
			{ type: 'arrow', endArrowhead: 'arrow', strokeWidth: 1.5 }
		),
		...move(callout(), 54, 355),
		label(374, 351, 'A lighter line for structure', 22),
		path(
			[
				[375, 393],
				[559, 393]
			],
			{ strokeWidth: 1.4 }
		),
		path(
			[
				[375, 430],
				[559, 430]
			],
			{ strokeWidth: 1.4, strokeStyle: 'dashed', type: 'arrow', endArrowhead: 'arrow' }
		),
		label(593, 388, 'Primary path', 17, '#637080'),
		label(593, 425, 'Feedback / secondary path', 17, '#637080'),
		label(
			55,
			519,
			'Original studies inspired by technical explainers. Ungroup any piece to edit its details.',
			16,
			'#637080'
		)
	];
}

/** @param {string} componentId @param {string} title @param {string} description @param {string[]} keywords @param {() => Shape[]} build @returns {Component} */
function component(componentId, title, description, keywords, build) {
	return {
		id: componentId,
		title,
		label: title,
		description,
		category: 'illustration',
		keywords,
		create: (x = 0, y = 0) => move(build(), x, y),
		createShapes: build
	};
}
export const DRAW_ILLUSTRATION_COMPONENTS = [
	component(
		'illustration-document',
		'Layered document',
		'A folded paper silhouette with a lavender offset layer.',
		['illustration', 'paper', 'document', 'ink'],
		documentIcon
	),
	component(
		'illustration-database',
		'Pastel database',
		'A clean cylinder with curved detail strokes and a flat pastel fill.',
		['illustration', 'database', 'storage', 'cylinder'],
		databaseIcon
	),
	component(
		'illustration-queue',
		'Request queue',
		'Editable request tiles in a clean ink-and-teal queue.',
		['illustration', 'fifo', 'queue', 'requests'],
		queueIcon
	),
	component(
		'illustration-callout',
		'Numbered callout',
		'A pale section panel with an ink badge and editable labels.',
		['illustration', 'stage', 'badge', 'callout'],
		callout
	),
	component(
		'illustration-sampler',
		'Illustration sampler',
		'Try the document, database, queue and callout together in one native study.',
		['illustration', 'sampler', 'pastel', 'ink', 'study'],
		sampler
	)
];

export const DRAW_ILLUSTRATION_BRUSHES = /** @type {const} */ ([
	{
		id: 'illustration-ink',
		label: 'Ink pen',
		description: 'Fine dark freehand ink, fully opaque.',
		tool: 'freedraw',
		color: INK,
		fill: 'transparent',
		width: 2,
		opacity: 100
	},
	{
		id: 'illustration-marker',
		label: 'Soft marker',
		description: 'Broad translucent teal strokes for emphasis.',
		tool: 'freedraw',
		color: '#69b6c1',
		fill: 'transparent',
		width: 20,
		opacity: 25
	},
	{
		id: 'illustration-pastel',
		label: 'Pastel shape',
		description: 'Clean dark outline with a flat lavender fill.',
		tool: 'rectangle',
		color: INK,
		fill: LAVENDER,
		width: 2,
		opacity: 100
	},
	{
		id: 'illustration-connector',
		label: 'Fine connector',
		description: 'A light solid arrow for diagram structure.',
		tool: 'arrow',
		color: '#454b55',
		fill: 'transparent',
		width: 1,
		opacity: 100
	}
]);

/** Configure only the next stroke. Never restyle selected artwork.
 * @param {Pick<import('@excalidraw/excalidraw/types').ExcalidrawImperativeAPI, 'updateScene' | 'setActiveTool'>} editor
 * @param {string} brushId
 */
export function applyIllustrationBrush(editor, brushId) {
	const brush = DRAW_ILLUSTRATION_BRUSHES.find((item) => item.id === brushId);
	if (!brush) throw new Error(`Unknown illustration brush: ${brushId}`);
	editor.updateScene({
		appState: {
			selectedElementIds: {},
			selectedGroupIds: {},
			editingGroupId: null,
			currentItemStrokeColor: brush.color,
			currentItemBackgroundColor: brush.fill,
			currentItemFillStyle: 'solid',
			currentItemStrokeWidth: brush.width,
			currentItemStrokeStyle: 'solid',
			currentItemRoughness: 0,
			currentItemOpacity: brush.opacity,
			currentItemFontFamily: 2,
			currentItemFontSize: 24,
			currentItemRoundness: 'round',
			currentItemStartArrowhead: null,
			currentItemEndArrowhead: 'arrow',
			currentItemArrowType: 'sharp'
		}
	});
	editor.setActiveTool({ type: brush.tool });
	return brush;
}
