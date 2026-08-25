/** @typedef {'black' | 'grey' | 'blue' | 'light-blue' | 'green' | 'light-green' | 'orange' | 'light-red' | 'yellow' | 'violet'} PresetColor */
/** @typedef {'s' | 'm' | 'l' | 'xl'} PresetSize */

/**
 * @typedef {{
 *   id: string,
 *   type: 'rectangle' | 'ellipse' | 'text' | 'arrow',
 *   x: number,
 *   y: number,
 *   width?: number,
 *   height?: number,
 *   strokeColor: string,
 *   backgroundColor?: string,
 *   fillStyle?: 'hachure' | 'solid',
 *   strokeWidth: number,
 *   strokeStyle: 'solid' | 'dashed',
 *   roughness: number,
 *   text?: string,
 *   fontFamily?: number,
 *   fontSize?: number,
 *   textAlign?: 'left' | 'center',
 *   label?: { text: string, fontFamily: number, fontSize: number },
 *   points?: Array<[number, number]>,
 *   startArrowhead?: null,
 *   endArrowhead?: 'arrow' | null,
 *   roundness?: { type: number } | null
 * }} PresetShape
 */

/** @type {Record<PresetColor, { stroke: string, background: string }>} */
const PALETTE = {
	black: { stroke: '#10243b', background: '#e8ecf0' },
	grey: { stroke: '#74808d', background: '#eef0f2' },
	blue: { stroke: '#155f9b', background: '#dbeafa' },
	'light-blue': { stroke: '#5292c8', background: '#e3f0fb' },
	green: { stroke: '#346b4e', background: '#ddf0e3' },
	'light-green': { stroke: '#6e9d77', background: '#e9f3e5' },
	orange: { stroke: '#e14d2a', background: '#ffeadf' },
	'light-red': { stroke: '#cf6258', background: '#fce7e3' },
	yellow: { stroke: '#bd900c', background: '#fff2bb' },
	violet: { stroke: '#7650a0', background: '#eee4fa' }
};

/** @type {Record<PresetSize, number>} */
const FONT_SIZES = { s: 17, m: 23, l: 30, xl: 38 };

/** @type {Record<PresetSize, number>} */
const STROKE_WIDTHS = { s: 1, m: 2, l: 3, xl: 4 };

const HAND_DRAWN_FONT = 5;
let shapeSequence = 0;

function createShapeId() {
	shapeSequence += 1;
	return `visual-${Date.now().toString(36)}-${shapeSequence.toString(36)}`;
}

/**
 * @typedef {{
 *   color?: PresetColor,
 *   fill?: 'none' | 'semi' | 'solid',
 *   geo?: 'rectangle' | 'ellipse',
 *   size?: PresetSize
 * }} GeoOptions
 */

/**
 * @typedef {{
 *   color?: PresetColor,
 *   size?: PresetSize,
 *   width?: number,
 *   align?: 'start' | 'middle'
 * }} TextOptions
 */

/**
 * @typedef {{
 *   color?: PresetColor,
 *   size?: PresetSize,
 *   bend?: number,
 *   dash?: 'solid' | 'dashed',
 *   head?: boolean
 * }} ArrowOptions
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   description: string,
 *   createShapes: () => PresetShape[]
 * }} DrawPreset
 */

/**
 * @param {number} x
 * @param {number} y
 * @param {string} content
 * @param {TextOptions} [options]
 * @returns {PresetShape}
 */
function text(x, y, content, options = {}) {
	const { color = 'black', size = 'm', width = 420, align = 'start' } = options;
	return {
		id: createShapeId(),
		type: 'text',
		x,
		y,
		width,
		text: content,
		fontFamily: HAND_DRAWN_FONT,
		fontSize: FONT_SIZES[size],
		textAlign: align === 'middle' ? 'center' : 'left',
		strokeColor: PALETTE[color].stroke,
		strokeWidth: STROKE_WIDTHS[size],
		strokeStyle: 'solid',
		roughness: 1
	};
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {string} label
 * @param {GeoOptions} [options]
 * @returns {PresetShape}
 */
function card(x, y, width, height, label, options = {}) {
	const { color = 'blue', fill = 'semi', geo = 'rectangle', size = 'm' } = options;
	return {
		id: createShapeId(),
		type: geo,
		x,
		y,
		width,
		height,
		strokeColor: PALETTE[color].stroke,
		backgroundColor:
			fill === 'none'
				? 'transparent'
				: fill === 'solid'
					? PALETTE[color].stroke
					: PALETTE[color].background,
		fillStyle: fill === 'solid' ? 'solid' : 'hachure',
		strokeWidth: STROKE_WIDTHS[size],
		strokeStyle: 'solid',
		roughness: 2,
		...(label
			? { label: { text: label, fontFamily: HAND_DRAWN_FONT, fontSize: FONT_SIZES[size] } }
			: {})
	};
}

/**
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 * @param {ArrowOptions} [options]
 * @returns {PresetShape}
 */
function arrow(startX, startY, endX, endY, options = {}) {
	const { color = 'black', size = 'm', bend = 0, dash = 'solid', head = true } = options;
	const deltaX = endX - startX;
	const deltaY = endY - startY;
	const length = Math.hypot(deltaX, deltaY);
	/** @type {Array<[number, number]>} */
	const points = bend
		? [
				[0, 0],
				[deltaX / 2 - (deltaY / length) * bend, deltaY / 2 + (deltaX / length) * bend],
				[deltaX, deltaY]
			]
		: [
				[0, 0],
				[deltaX, deltaY]
			];
	return {
		id: createShapeId(),
		type: 'arrow',
		x: startX,
		y: startY,
		strokeColor: PALETTE[color].stroke,
		strokeWidth: STROKE_WIDTHS[size],
		strokeStyle: dash,
		roughness: 2,
		points,
		startArrowhead: null,
		endArrowhead: head ? 'arrow' : null,
		roundness: bend ? { type: 2 } : null
	};
}

/**
 * @param {string} title
 * @param {string} subtitle
 * @returns {PresetShape[]}
 */
function heading(title, subtitle) {
	return [
		text(40, 0, title, { size: 'xl', width: 760 }),
		text(42, 68, subtitle, { size: 's', color: 'grey', width: 760 })
	];
}

/** @returns {PresetShape[]} */
function createDecisionMatrix() {
	return [
		...heading('What deserves your attention?', 'Sort decisions by effort and expected impact'),
		card(130, 140, 320, 210, 'Plan\nHigh impact · higher effort', {
			color: 'blue'
		}),
		card(470, 140, 320, 210, 'Act now\nHigh impact · lower effort', {
			color: 'green'
		}),
		card(130, 370, 320, 210, 'Reconsider\nLow impact · higher effort', {
			color: 'light-red'
		}),
		card(470, 370, 320, 210, 'Keep simple\nLow impact · lower effort', {
			color: 'yellow'
		}),
		arrow(105, 595, 105, 140, { color: 'grey', size: 's' }),
		arrow(130, 620, 790, 620, { color: 'grey', size: 's' }),
		text(10, 98, 'Strategic fit', { size: 's', color: 'grey', width: 190 }),
		text(630, 633, 'Effort', { size: 's', color: 'grey', width: 180 })
	];
}

/** @returns {PresetShape[]} */
function createAxisChart() {
	/** @type {Array<{ x: number, y: number, label: string, color: PresetColor }>} */
	const points = [
		{ x: 215, y: 420, label: 'Option A', color: 'blue' },
		{ x: 375, y: 315, label: 'Option B', color: 'green' },
		{ x: 540, y: 385, label: 'Option C', color: 'orange' },
		{ x: 660, y: 200, label: 'Option D', color: 'violet' }
	];

	/** @type {PresetShape[]} */
	const shapes = [
		...heading('Where should we focus?', 'Compare opportunities across two useful dimensions'),
		arrow(115, 555, 115, 155, { size: 'm' }),
		arrow(115, 555, 785, 555, { size: 'm' }),
		arrow(130, 510, 735, 205, { color: 'grey', size: 's', dash: 'dashed', head: false }),
		text(25, 108, 'Strategic fit', { size: 's', color: 'grey', width: 190 }),
		text(550, 575, 'Effort', { size: 's', color: 'grey', width: 260 })
	];

	for (const point of points) {
		shapes.push(
			card(point.x, point.y, 34, 34, '', {
				geo: 'ellipse',
				color: point.color,
				fill: 'solid',
				size: 's'
			}),
			text(point.x + 46, point.y + 3, point.label, { size: 's', width: 150 })
		);
	}
	return shapes;
}

/** @returns {PresetShape[]} */
function createGrowthCurves() {
	/** @type {Array<{ label: string, color: PresetColor, points: Array<[number, number]> }>} */
	const curves = [
		{
			label: 'Baseline',
			color: 'grey',
			points: [
				[130, 535],
				[290, 535],
				[465, 535],
				[690, 535]
			]
		},
		{
			label: 'Steady',
			color: 'blue',
			points: [
				[130, 535],
				[290, 465],
				[465, 385],
				[690, 295]
			]
		},
		{
			label: 'Connected',
			color: 'green',
			points: [
				[130, 535],
				[290, 490],
				[465, 355],
				[690, 200]
			]
		},
		{
			label: 'Compounding',
			color: 'orange',
			points: [
				[130, 535],
				[290, 515],
				[465, 435],
				[690, 125]
			]
		}
	];

	/** @type {PresetShape[]} */
	const shapes = [
		...heading('Growth is not one curve', 'Different systems compound at different rates'),
		arrow(115, 575, 115, 120, { color: 'grey' }),
		arrow(115, 575, 805, 575, { color: 'grey' }),
		text(20, 98, 'VALUE', { color: 'grey', size: 's', width: 140 }),
		text(690, 594, 'TIME →', { color: 'grey', size: 's', width: 150 })
	];

	for (const curve of curves) {
		for (let index = 0; index < curve.points.length - 1; index += 1) {
			const [startX, startY] = curve.points[index];
			const [endX, endY] = curve.points[index + 1];
			shapes.push(
				arrow(startX, startY, endX, endY, {
					color: curve.color,
					size: 'm',
					bend: curve.label === 'Compounding' ? -14 : 0,
					head: index === curve.points.length - 2
				})
			);
		}
		const [, lastY] = curve.points[curve.points.length - 1];
		shapes.push(text(705, lastY - 12, curve.label, { color: curve.color, size: 's', width: 175 }));
	}
	return shapes;
}

/** @returns {PresetShape[]} */
function createAdoptionCurve() {
	return [
		...heading('Every idea has an adoption curve', 'A useful way to spot the next transition'),
		card(140, 150, 190, 400, '', { color: 'yellow', fill: 'semi', size: 's' }),
		card(350, 150, 215, 400, '', { color: 'light-blue', fill: 'semi', size: 's' }),
		card(585, 150, 185, 400, '', { color: 'light-green', fill: 'semi', size: 's' }),
		arrow(125, 570, 125, 125, { color: 'grey' }),
		arrow(125, 570, 790, 570, { color: 'grey' }),
		arrow(145, 505, 315, 455, { color: 'blue', size: 'l', bend: -18, head: false }),
		arrow(315, 455, 470, 270, { color: 'blue', size: 'l', bend: 20, head: false }),
		arrow(470, 270, 740, 190, { color: 'blue', size: 'l', bend: 38 }),
		text(160, 595, 'EMERGENCE', { size: 's', color: 'grey', width: 195 }),
		text(367, 595, 'ACCELERATION', { size: 's', color: 'grey', width: 215 }),
		text(620, 595, 'MATURITY', { size: 's', color: 'grey', width: 160 }),
		text(25, 98, 'ADOPTION', { size: 's', color: 'grey', width: 175 })
	];
}

/** @returns {PresetShape[]} */
function createCareerLadder() {
	/** @type {Array<{ title: string, subtitle: string, color: PresetColor }>} */
	const steps = [
		{ title: '01\nEXPLORE', subtitle: 'Find the problem', color: 'light-blue' },
		{ title: '02\nPRACTICE', subtitle: 'Build your skills', color: 'blue' },
		{ title: '03\nCONTRIBUTE', subtitle: 'Create useful work', color: 'violet' },
		{ title: '04\nCONNECT', subtitle: 'Help other people', color: 'green' },
		{ title: '05\nLEAD', subtitle: 'Multiply your impact', color: 'orange' }
	];

	/** @type {PresetShape[]} */
	const shapes = [
		...heading('Build your own career staircase', 'Progress is a sequence, not a title')
	];

	steps.forEach((step, index) => {
		const x = 55 + index * 170;
		const y = 515 - index * 83;
		shapes.push(
			card(x, y, 155, 105, step.title, {
				color: step.color,
				fill: 'semi',
				size: 's'
			}),
			text(x, y + 119, step.subtitle, { size: 's', color: 'grey', width: 160 })
		);
		if (index < steps.length - 1) {
			shapes.push(arrow(x + 145, y + 10, x + 174, y - 18, { color: 'grey', size: 's' }));
		}
	});
	return shapes;
}

/** @returns {PresetShape[]} */
function createFunnel() {
	/** @type {Array<{ label: string, detail: string, width: number, color: PresetColor }>} */
	const layers = [
		{
			label: 'AWARENESS',
			detail: 'Everyone who discovers the idea',
			width: 670,
			color: 'light-blue'
		},
		{ label: 'INTEREST', detail: 'People who want to learn more', width: 535, color: 'blue' },
		{
			label: 'COMMITMENT',
			detail: 'People ready to take a first step',
			width: 395,
			color: 'violet'
		},
		{ label: 'OUTCOME', detail: 'People who reach the goal', width: 260, color: 'green' }
	];

	/** @type {PresetShape[]} */
	const shapes = [
		...heading('Make every stage intentional', 'A simple way to see where momentum changes')
	];

	layers.forEach((layer, index) => {
		const x = 80 + (670 - layer.width) / 2;
		const y = 145 + index * 122;
		shapes.push(
			card(x, y, layer.width, 103, `${layer.label}\n${layer.detail}`, {
				color: layer.color,
				size: 's'
			})
		);
	});

	shapes.push(arrow(793, 165, 793, 580, { color: 'grey', size: 's' }));
	shapes.push(text(738, 603, 'FOCUS', { size: 's', color: 'grey', width: 130 }));
	return shapes;
}

/** @returns {PresetShape[]} */
function createVennDiagram() {
	return [
		...heading('Find the overlap', 'The most promising work sits between three good questions'),
		card(115, 170, 345, 345, '', { geo: 'ellipse', color: 'blue', fill: 'semi' }),
		card(390, 170, 345, 345, '', { geo: 'ellipse', color: 'orange', fill: 'semi' }),
		card(255, 340, 345, 345, '', { geo: 'ellipse', color: 'green', fill: 'semi' }),
		text(135, 275, 'SKILLS', { color: 'blue', size: 'm', width: 180 }),
		text(590, 275, 'INTERESTS', { color: 'orange', size: 'm', width: 190 }),
		text(330, 570, 'NEEDS', { color: 'green', size: 'm', width: 180, align: 'middle' }),
		card(334, 364, 190, 68, 'OPPORTUNITY', { color: 'yellow', fill: 'solid', size: 's' })
	];
}

/** @returns {PresetShape[]} */
function createFlywheel() {
	return [
		...heading('Learning gets better in public', 'A small loop you can run again and again'),
		card(328, 118, 180, 120, 'EXPLORE\nFind a question', {
			geo: 'ellipse',
			color: 'blue',
			size: 's'
		}),
		card(600, 325, 180, 120, 'PRACTICE\nMake something', {
			geo: 'ellipse',
			color: 'orange',
			size: 's'
		}),
		card(328, 532, 180, 120, 'SHARE\nShow your work', {
			geo: 'ellipse',
			color: 'green',
			size: 's'
		}),
		card(56, 325, 180, 120, 'IMPROVE\nCollect feedback', {
			geo: 'ellipse',
			color: 'violet',
			size: 's'
		}),
		card(333, 315, 170, 145, 'BETTER\nEACH TIME', {
			geo: 'ellipse',
			color: 'yellow',
			fill: 'semi',
			size: 's'
		}),
		arrow(515, 185, 616, 318, { color: 'blue', bend: -38 }),
		arrow(653, 455, 503, 560, { color: 'orange', bend: -38 }),
		arrow(319, 595, 165, 454, { color: 'green', bend: -38 }),
		arrow(140, 317, 319, 174, { color: 'violet', bend: -38 })
	];
}

/** @returns {PresetShape[]} */
function createComparisonCards() {
	/** @type {Array<{ name: string, color: PresetColor }>} */
	const columns = [
		{ name: 'OPTION A', color: 'blue' },
		{ name: 'OPTION B', color: 'green' },
		{ name: 'OPTION C', color: 'orange' }
	];
	/** @type {PresetShape[]} */
	const shapes = [
		...heading('Compare the choices that matter', 'Make strengths and trade-offs visible')
	];

	columns.forEach((column, index) => {
		const x = 55 + index * 267;
		const color = column.color;
		shapes.push(
			card(x, 150, 245, 410, '', { color, fill: 'none', size: 's' }),
			card(x, 150, 245, 84, column.name, { color, fill: 'semi', size: 's' }),
			text(x + 19, 260, 'STRENGTHS', { color, size: 's', width: 210 }),
			text(x + 19, 297, 'What works well?', { color: 'grey', size: 's', width: 210 }),
			text(x + 19, 361, 'TRADE-OFFS', { color, size: 's', width: 210 }),
			text(x + 19, 398, 'What gets harder?', { color: 'grey', size: 's', width: 210 }),
			text(x + 19, 469, 'BEST FOR', { color, size: 's', width: 210 }),
			text(x + 19, 506, 'Who benefits most?', { color: 'grey', size: 's', width: 210 })
		);
	});
	return shapes;
}

/** @type {DrawPreset[]} */
export const DRAW_PRESETS = [
	{
		id: 'decision-matrix',
		label: 'Priority quadrants',
		description: 'A colorful 2×2 matrix for weighing impact against effort.',
		createShapes: createDecisionMatrix
	},
	{
		id: 'axis-chart',
		label: 'Strategy scatterplot',
		description: 'An editable X–Y chart for comparing ideas across two dimensions.',
		createShapes: createAxisChart
	},
	{
		id: 'growth-curves',
		label: 'Growth curves',
		description: 'Four contrasting trajectories from baseline to compounding.',
		createShapes: createGrowthCurves
	},
	{
		id: 'adoption-curve',
		label: 'Adoption S-curve',
		description: 'Three stages of adoption: emergence, acceleration, and maturity.',
		createShapes: createAdoptionCurve
	},
	{
		id: 'career-ladder',
		label: 'Career staircase',
		description: 'Five practical steps for building skills and multiplying impact.',
		createShapes: createCareerLadder
	},
	{
		id: 'funnel',
		label: 'Layered funnel',
		description: 'Four editable stages from first awareness to a meaningful outcome.',
		createShapes: createFunnel
	},
	{
		id: 'venn-diagram',
		label: 'Opportunity Venn',
		description: 'Find the overlap between skills, interests, and real needs.',
		createShapes: createVennDiagram
	},
	{
		id: 'flywheel',
		label: 'Learning flywheel',
		description: 'A four-step cycle for exploring, practicing, sharing, and improving.',
		createShapes: createFlywheel
	},
	{
		id: 'comparison-cards',
		label: 'Comparison cards',
		description: 'Three side-by-side options with strengths, trade-offs, and fit.',
		createShapes: createComparisonCards
	}
];
