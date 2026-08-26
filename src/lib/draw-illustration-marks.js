import { rect, oval, path, label, move, group, component } from './draw-illustration.js';
/** @typedef {import('./draw-ui-components.js').UiComponentShape} Shape */
const INK = '#20232b';
const MUTED = '#637080';

/** @returns {Shape[]} */
function markerTitle() {
	return group([
		path(
			[
				[20, 6],
				[95, 9],
				[168, 1],
				[243, 10],
				[343, 4],
				[365, 19],
				[365, 44],
				[347, 59],
				[251, 63],
				[175, 55],
				[91, 62],
				[17, 58],
				[2, 40],
				[3, 21],
				[20, 6]
			],
			{ strokeColor: '#2687ee', backgroundColor: '#2687ee', strokeWidth: 1, roundness: { type: 2 } }
		),
		label(23, 19, 'Show the mechanism', 28, '#ffffff'),
		label(7, 83, 'Opaque color · editable white title', 17, MUTED)
	]);
}

/** @returns {Shape[]} */
function sectionFrame() {
	return group([
		{ ...rect(0, 14, 420, 172, '#f8fafc'), strokeWidth: 1.5 },
		{ ...rect(111, 0, 198, 34, INK), strokeWidth: 1 },
		label(133, 8, 'HOW IT WORKS', 18, '#ffffff'),
		label(25, 60, 'One boundary. One idea.', 24),
		path(
			[
				[25, 107],
				[395, 107]
			],
			{ strokeStyle: 'dashed', strokeWidth: 1, strokeColor: '#9da8b7' }
		),
		label(25, 130, 'A tab, a fine border, and a quiet divider.', 17, MUTED)
	]);
}

/** @returns {Shape[]} */
function feedbackPath() {
	return group([
		{ ...rect(28, 20, 130, 54, '#e8effb'), strokeColor: '#7594bb', strokeWidth: 1.5 },
		label(50, 38, 'Propose', 21),
		{ ...rect(266, 20, 130, 54, '#e2f1e8'), strokeColor: '#65a784', strokeWidth: 1.5 },
		label(294, 38, 'Verify', 21),
		path(
			[
				[167, 47],
				[255, 47]
			],
			{ type: 'arrow', endArrowhead: 'triangle', strokeWidth: 3 }
		),
		path(
			[
				[331, 86],
				[331, 138],
				[93, 138],
				[93, 86]
			],
			{
				type: 'arrow',
				endArrowhead: 'arrow',
				strokeWidth: 1.6,
				strokeStyle: 'dashed',
				strokeColor: '#aa7042',
				roundness: { type: 2 }
			}
		),
		label(157, 154, 'feedback', 17, '#8a5d38')
	]);
}

/** @returns {Shape[]} */
function tokenStrip() {
	const words = ['A', 'clear', 'idea', 'needs', 'a', 'shape'];
	const widths = [32, 65, 57, 75, 31, 80];
	let x = 0;
	/** @type {Shape[]} */ const shapes = [];
	for (let i = 0; i < words.length; i++) {
		shapes.push({
			...rect(x, 16, widths[i], 38, i === 2 ? '#d9f1e2' : '#eaf0f7'),
			strokeColor: i === 2 ? '#52996a' : '#6688b7',
			strokeWidth: 1.5
		});
		shapes.push(label(x + 9, 26, words[i], 18));
		x += widths[i] + 8;
	}
	shapes.push(
		path(
			[
				[0, 77],
				[380, 77]
			],
			{ strokeColor: '#b2bdcb', strokeWidth: 1 }
		)
	);
	shapes.push(label(0, 97, 'A repeated unit, one meaningful accent.', 17, MUTED));
	return group(shapes);
}

/** @returns {Shape[]} */
function outcomeBar() {
	return group([
		...['#efd0d2', '#faedb7', '#c9ead6'].map((color, i) => ({
			...rect(i * 140, 35, 140, 25, color),
			roundness: null,
			strokeWidth: 1.5
		})),
		label(28, 75, 'Blocked', 18),
		label(180, 75, 'Review', 18),
		label(322, 75, 'Ready', 18),
		path(
			[
				[350, 4],
				[350, 34]
			],
			{ strokeStyle: 'dashed', strokeColor: '#47885c', strokeWidth: 1.5 }
		),
		{ ...oval(345, 31, 10, 10, '#47885c'), strokeColor: '#47885c', strokeWidth: 1 },
		label(264, -19, 'Current state', 16, '#47885c')
	]);
}

/** @returns {Shape[]} */
function lineWeights() {
	return group([
		path(
			[
				[0, 12],
				[45, 3],
				[96, 18],
				[153, 6],
				[204, 15]
			],
			{ strokeWidth: 6, roundness: { type: 2 } }
		),
		label(234, 2, 'Broad ink', 18),
		path(
			[
				[0, 65],
				[204, 65]
			],
			{ type: 'arrow', endArrowhead: 'triangle', strokeWidth: 3 }
		),
		label(234, 55, 'Main flow', 18),
		path(
			[
				[0, 112],
				[204, 112]
			],
			{ type: 'arrow', endArrowhead: 'arrow', strokeWidth: 1 }
		),
		label(234, 102, 'Fine connection', 18)
	]);
}

/** @returns {Shape[]} */
function marksSampler() {
	return [
		{ ...rect(0, 0, 1080, 855), strokeColor: '#d7dde6', strokeWidth: 1 },
		{ ...rect(33, 35, 6, 60, '#40968c'), strokeColor: '#40968c' },
		label(58, 34, 'Give the eye a path', 38),
		label(58, 88, 'Broader marks, lighter structure, and reusable explanatory elements', 20, MUTED),
		label(55, 149, 'LINE WEIGHT', 15, MUTED),
		...move(lineWeights(), 55, 191),
		label(589, 149, 'TITLE BAND', 15, MUTED),
		...move(markerTitle(), 589, 190),
		label(55, 367, 'SECTION TAB + BOUNDARY', 15, MUTED),
		...move(sectionFrame(), 55, 404),
		label(589, 367, 'PRIMARY PATH + FEEDBACK', 15, MUTED),
		...move(feedbackPath(), 570, 404),
		label(55, 637, 'TOKEN STRIP', 15, MUTED),
		...move(tokenStrip(), 55, 670),
		label(589, 637, 'QUALITATIVE STATE BAR', 15, MUTED),
		...move(outcomeBar(), 589, 698),
		label(
			55,
			819,
			'Native editable shapes and paths · illustrative labels, not measured data',
			16,
			MUTED
		)
	];
}

export const DRAW_ILLUSTRATION_MARK_COMPONENTS = [
	component(
		'illustration-line-weights',
		'Line weight study',
		'Broad ink, a filled flow arrow, and a fine connector side by side.',
		['illustration', 'line', 'stroke', 'arrow', 'weight'],
		lineWeights
	),
	component(
		'illustration-marker-title',
		'Marker title',
		'A wavy opaque title band with independently editable white text.',
		['illustration', 'marker', 'title', 'highlight', 'band'],
		markerTitle
	),
	component(
		'illustration-section-frame',
		'Section frame',
		'A thin enclosing border with a dark capsule tab and divider.',
		['illustration', 'frame', 'boundary', 'section', 'tab'],
		sectionFrame
	),
	component(
		'illustration-feedback-path',
		'Feedback path',
		'A strong forward arrow and lighter editable curved return path.',
		['illustration', 'feedback', 'loop', 'dashed', 'arrow'],
		feedbackPath
	),
	component(
		'illustration-token-strip',
		'Token strip',
		'Six editable word tiles with a single meaningful color accent.',
		['illustration', 'token', 'chips', 'word', 'sequence'],
		tokenStrip
	),
	component(
		'illustration-outcome-bar',
		'Outcome bar',
		'A broad three-state band with labels and a current-state marker.',
		['illustration', 'bar', 'status', 'outcome', 'legend'],
		outcomeBar
	),
	component(
		'illustration-marks-sampler',
		'Marks and structure sampler',
		'A second native study of broad lines, title bands, sections, paths and tokens.',
		['illustration', 'sampler', 'broad', 'marks', 'structure'],
		marksSampler
	)
];
