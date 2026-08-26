import { DRAW_ILLUSTRATION_COMPONENTS } from './draw-illustration.js';

/**
 * @typedef {{
 *   id: string,
 *   type: 'rectangle' | 'ellipse' | 'text' | 'arrow' | 'line',
 *   x: number,
 *   y: number,
 *   width?: number,
 *   height?: number,
 *   strokeColor: string,
 *   backgroundColor?: string,
 *   fillStyle?: 'solid' | 'hachure',
 *   strokeWidth: number,
 *   strokeStyle: 'solid' | 'dashed',
 *   roughness: number,
 *   roundness?: { type: number } | null,
 *   text?: string,
 *   fontFamily?: number,
 *   fontSize?: number,
 *   textAlign?: 'left' | 'center',
 *   points?: Array<[number, number]>,
 *   startArrowhead?: null,
 *   endArrowhead?: 'arrow' | null,
 *   groupIds?: string[]
 * }} UiComponentShape
 */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   label: string,
 *   description: string,
 *   category: string,
 *   keywords: string[],
 *   create: (x?: number, y?: number) => UiComponentShape[],
 *   createShapes: () => UiComponentShape[]
 * }} DrawUiComponent
 */

const INK = '#27344a';
const MUTED = '#78869a';
const BLUE = '#4263eb';
const GREEN = '#2f9e70';
const BORDER = '#aab5c3';
const HAND_DRAWN_FONT = 5;
let shapeSequence = 0;

function createShapeId() {
	shapeSequence += 1;
	return `ui-${Date.now().toString(36)}-${shapeSequence.toString(36)}`;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {{ color?: string, fill?: string, dashed?: boolean }} [options]
 * @returns {UiComponentShape}
 */
function box(x, y, width, height, options = {}) {
	return {
		id: createShapeId(),
		type: 'rectangle',
		x,
		y,
		width,
		height,
		strokeColor: options.color ?? INK,
		backgroundColor: options.fill ?? 'transparent',
		fillStyle: 'solid',
		strokeWidth: 2,
		strokeStyle: options.dashed ? 'dashed' : 'solid',
		roughness: 2,
		roundness: { type: 3 }
	};
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @param {{ color?: string, fill?: string }} [options]
 * @returns {UiComponentShape}
 */
function circle(x, y, size, options = {}) {
	return {
		...box(x, y, size, size, options),
		type: 'ellipse',
		roundness: null
	};
}

/**
 * @param {number} x
 * @param {number} y
 * @param {string} content
 * @param {{ color?: string, size?: number, width?: number, center?: boolean }} [options]
 * @returns {UiComponentShape}
 */
function text(x, y, content, options = {}) {
	return {
		id: createShapeId(),
		type: 'text',
		x,
		y,
		width: options.width ?? Math.max(100, content.length * 11),
		text: content,
		fontFamily: HAND_DRAWN_FONT,
		fontSize: options.size ?? 17,
		textAlign: options.center ? 'center' : 'left',
		strokeColor: options.color ?? INK,
		strokeWidth: 1,
		strokeStyle: 'solid',
		roughness: 1
	};
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} endX
 * @param {number} endY
 * @param {{ color?: string, dashed?: boolean }} [options]
 * @returns {UiComponentShape}
 */
function line(x, y, endX, endY, options = {}) {
	return {
		id: createShapeId(),
		type: 'arrow',
		x,
		y,
		strokeColor: options.color ?? BORDER,
		strokeWidth: 2,
		strokeStyle: options.dashed ? 'dashed' : 'solid',
		roughness: 2,
		points: [
			[0, 0],
			[endX - x, endY - y]
		],
		startArrowhead: null,
		endArrowhead: null,
		roundness: null
	};
}

/** @returns {UiComponentShape[]} */
function primaryButton() {
	return [box(0, 0, 170, 50, { color: BLUE }), text(30, 14, 'Get started', { color: BLUE })];
}

/** @returns {UiComponentShape[]} */
function secondaryButton() {
	return [box(0, 0, 154, 50), text(26, 14, 'Learn more')];
}

/** @returns {UiComponentShape[]} */
function textInput() {
	return [
		text(0, 0, 'Email address'),
		box(0, 31, 320, 49, { color: BORDER }),
		text(14, 45, 'you@example.com', { color: MUTED })
	];
}

/** @returns {UiComponentShape[]} */
function searchInput() {
	return [
		box(0, 0, 320, 48, { color: BORDER }),
		circle(15, 14, 16, { color: MUTED }),
		line(29, 28, 36, 35, { color: MUTED }),
		text(49, 13, 'Search anything...', { color: MUTED })
	];
}

/** @returns {UiComponentShape[]} */
function selectInput() {
	return [
		text(0, 0, 'Choose a category'),
		box(0, 31, 300, 48, { color: BORDER }),
		text(14, 45, 'Select an option', { color: MUTED }),
		line(263, 50, 273, 60),
		line(273, 60, 283, 50)
	];
}

/** @returns {UiComponentShape[]} */
function textarea() {
	return [
		text(0, 0, 'Message'),
		box(0, 31, 340, 125, { color: BORDER }),
		text(14, 46, 'Tell us what you have in mind...', { color: MUTED, width: 310 })
	];
}

/** @returns {UiComponentShape[]} */
function checkbox() {
	return [
		box(0, 2, 23, 23, { color: BLUE }),
		line(5, 13, 10, 19, { color: BLUE }),
		line(10, 19, 19, 7, { color: BLUE }),
		text(36, 3, 'Remember my choice')
	];
}

/** @returns {UiComponentShape[]} */
function toggleSwitch() {
	return [
		box(0, 0, 56, 30, { color: GREEN }),
		circle(30, 4, 22, { color: GREEN }),
		text(70, 5, 'Enable notifications')
	];
}

/** @returns {UiComponentShape[]} */
function radioOptions() {
	return [
		circle(0, 2, 22, { color: BLUE }),
		circle(6, 8, 10, { color: BLUE, fill: BLUE }),
		text(35, 3, 'Recommended option'),
		circle(0, 39, 22, { color: BORDER }),
		text(35, 40, 'Another option')
	];
}

/** @returns {UiComponentShape[]} */
function contentCard() {
	return [
		box(0, 0, 350, 205),
		text(22, 22, 'Your card title', { size: 22 }),
		text(22, 60, 'A short description that explains', { color: MUTED, width: 310 }),
		text(22, 87, 'why this section matters.', { color: MUTED, width: 310 }),
		line(22, 133, 328, 133),
		box(22, 150, 125, 37, { color: BLUE }),
		text(41, 159, 'View details', { size: 15, color: BLUE })
	];
}

/** @returns {UiComponentShape[]} */
function alertBanner() {
	return [
		box(0, 0, 410, 82, { color: BLUE }),
		circle(16, 18, 27, { color: BLUE }),
		text(25, 20, 'i', { color: BLUE, size: 19, width: 15 }),
		text(58, 16, 'Heads up!'),
		text(58, 43, 'Here is some helpful information.', { color: MUTED, size: 15 })
	];
}

/** @returns {UiComponentShape[]} */
function dialog() {
	return [
		box(0, 0, 420, 235),
		text(24, 22, 'Are you absolutely sure?', { size: 21 }),
		text(25, 70, 'This action will update your project.', { color: MUTED, width: 375 }),
		text(25, 98, 'You can always change it later.', { color: MUTED, width: 375 }),
		line(24, 151, 396, 151),
		box(174, 171, 96, 42, { color: BORDER }),
		text(192, 183, 'Cancel', { size: 15 }),
		box(284, 171, 111, 42, { color: BLUE }),
		text(300, 183, 'Continue', { size: 15, color: BLUE })
	];
}

/** @returns {UiComponentShape[]} */
function toast() {
	return [
		box(0, 0, 340, 78, { color: GREEN }),
		text(17, 14, 'Changes saved', { color: GREEN }),
		text(17, 43, 'Your project is up to date.', { size: 15, color: MUTED }),
		text(308, 13, '×', { size: 22, color: MUTED, width: 20 })
	];
}

/** @returns {UiComponentShape[]} */
function avatarProfile() {
	return [
		circle(0, 0, 54, { color: BLUE }),
		text(14, 17, 'JD', { color: BLUE, width: 34 }),
		text(69, 5, 'Jordan Doe'),
		text(69, 32, 'Product designer', { color: MUTED, size: 15 })
	];
}

/** @returns {UiComponentShape[]} */
function badge() {
	return [
		box(0, 0, 96, 34, { color: GREEN }),
		text(14, 9, 'Published', { size: 14, color: GREEN })
	];
}

/** @returns {UiComponentShape[]} */
function dataTable() {
	/** @type {UiComponentShape[]} */
	const shapes = [
		box(0, 0, 600, 210),
		line(0, 50, 600, 50),
		line(0, 103, 600, 103),
		line(0, 156, 600, 156),
		line(255, 0, 255, 210),
		line(425, 0, 425, 210),
		text(16, 16, 'Name'),
		text(271, 16, 'Status'),
		text(441, 16, 'Updated')
	];
	for (const [index, [name, status, updated]] of [
		['Marketing site', 'Published', 'Today'],
		['Dashboard refresh', 'In progress', 'Yesterday'],
		['Onboarding flow', 'Draft', 'Aug 12']
	].entries()) {
		const y = 67 + index * 53;
		shapes.push(text(16, y, name), text(271, y, status), text(441, y, updated));
	}
	return shapes;
}

/** @returns {UiComponentShape[]} */
function metricCard() {
	return [
		box(0, 0, 255, 145),
		text(18, 19, 'Monthly revenue', { color: MUTED }),
		text(18, 57, '$48,350', { size: 24 }),
		text(18, 105, '+12.4% from last month', { color: GREEN, size: 14 })
	];
}

/** @returns {UiComponentShape[]} */
function progressBar() {
	return [
		text(0, 0, 'Project completion'),
		text(286, 0, '72%', { color: BLUE, width: 50 }),
		box(0, 35, 330, 17, { color: BORDER }),
		box(3, 38, 231, 11, { color: BLUE, fill: BLUE })
	];
}

/** @returns {UiComponentShape[]} */
function navbar() {
	return [
		box(0, 0, 750, 72),
		text(22, 24, 'ACME', { color: BLUE, size: 20 }),
		text(215, 27, 'Product'),
		text(330, 27, 'Solutions'),
		text(460, 27, 'Pricing'),
		box(600, 14, 125, 44, { color: BLUE }),
		text(619, 27, 'Get started', { color: BLUE, size: 15 })
	];
}

/** @returns {UiComponentShape[]} */
function sidebar() {
	return [
		box(0, 0, 230, 420),
		text(20, 21, 'Workspace', { size: 20 }),
		line(15, 62, 215, 62),
		box(12, 82, 206, 41, { color: BLUE }),
		text(27, 95, 'Dashboard', { color: BLUE, size: 15 }),
		text(27, 143, 'Projects', { size: 15 }),
		text(27, 186, 'Team members', { size: 15 }),
		text(27, 229, 'Analytics', { size: 15 }),
		line(15, 348, 215, 348),
		text(27, 370, 'Settings', { size: 15, color: MUTED })
	];
}

/** @returns {UiComponentShape[]} */
function tabs() {
	return [
		text(16, 10, 'Overview', { color: BLUE }),
		text(140, 10, 'Activity', { color: MUTED }),
		text(263, 10, 'Settings', { color: MUTED }),
		line(0, 42, 365, 42),
		line(10, 42, 109, 42, { color: BLUE })
	];
}

/** @returns {UiComponentShape[]} */
function breadcrumbs() {
	return [
		text(0, 0, 'Projects', { color: MUTED }),
		text(104, 0, '/', { color: MUTED, width: 20 }),
		text(131, 0, 'Website redesign', { color: MUTED }),
		text(321, 0, '/', { color: MUTED, width: 20 }),
		text(348, 0, 'Settings')
	];
}

/** @returns {UiComponentShape[]} */
function pagination() {
	return [
		box(0, 0, 100, 42, { color: BORDER }),
		text(16, 12, 'Previous', { size: 14 }),
		box(116, 0, 42, 42, { color: BLUE }),
		text(130, 12, '1', { size: 15, color: BLUE, width: 18 }),
		text(179, 12, '2', { size: 15, width: 18 }),
		text(224, 12, '3', { size: 15, width: 18 }),
		box(257, 0, 78, 42, { color: BORDER }),
		text(278, 12, 'Next', { size: 14 })
	];
}

/** @returns {UiComponentShape[]} */
function heroSection() {
	return [
		box(0, 0, 780, 330, { color: BORDER, dashed: true }),
		text(42, 47, 'Build something people love', { size: 24, width: 480 }),
		text(43, 94, 'A clear promise about what your product does', { color: MUTED, width: 510 }),
		text(43, 124, 'and why your customers should care.', { color: MUTED, width: 470 }),
		box(43, 180, 160, 49, { color: BLUE }),
		text(70, 194, 'Start for free', { color: BLUE }),
		box(222, 180, 144, 49, { color: BORDER }),
		text(246, 194, 'View demo'),
		box(529, 58, 205, 210, { color: BORDER, dashed: true }),
		line(529, 58, 734, 268),
		line(734, 58, 529, 268)
	];
}

/** @returns {UiComponentShape[]} */
function pricingCard() {
	return [
		box(0, 0, 315, 350, { color: BLUE }),
		text(22, 22, 'Pro plan', { size: 21 }),
		text(22, 63, '$29 / month', { size: 24, color: BLUE }),
		text(22, 111, 'For teams ready to grow', { color: MUTED }),
		line(20, 146, 293, 146),
		text(23, 168, '✓ Unlimited projects', { size: 16 }),
		text(23, 204, '✓ Advanced analytics', { size: 16 }),
		text(23, 240, '✓ Priority support', { size: 16 }),
		box(22, 284, 271, 45, { color: BLUE }),
		text(102, 297, 'Choose Pro', { color: BLUE })
	];
}

/** @returns {UiComponentShape[]} */
function chatPanel() {
	return [
		box(0, 0, 380, 390),
		text(20, 18, 'Conversation', { size: 20 }),
		line(0, 57, 380, 57),
		box(17, 78, 255, 69, { color: BORDER }),
		text(29, 96, 'Hey! How can I help today?', { size: 15 }),
		box(101, 165, 261, 68, { color: BLUE }),
		text(113, 184, 'I have a question about pricing.', { size: 14, color: BLUE }),
		box(15, 327, 284, 45, { color: BORDER }),
		text(27, 341, 'Type a message...', { size: 15, color: MUTED }),
		box(309, 327, 57, 45, { color: BLUE }),
		text(320, 342, 'Send', { size: 14, color: BLUE })
	];
}

/** @returns {UiComponentShape[]} */
function kanbanBoard() {
	/** @type {UiComponentShape[]} */
	const shapes = [];
	for (const [index, [heading, first, second]] of [
		['To do', 'Draft proposal', 'Review research'],
		['In progress', 'Build prototype', 'Interview users'],
		['Done', 'Define goals', 'Map the journey']
	].entries()) {
		const x = index * 230;
		shapes.push(
			box(x, 0, 215, 275, { color: BORDER }),
			text(x + 14, 15, heading),
			line(x + 10, 49, x + 205, 49),
			box(x + 11, 64, 193, 75, { color: index === 1 ? BLUE : BORDER }),
			text(x + 21, 87, first, { size: 15 }),
			box(x + 11, 150, 193, 75, { color: BORDER }),
			text(x + 21, 173, second, { size: 15 })
		);
	}
	return shapes;
}

/** @returns {UiComponentShape[]} */
function loginForm() {
	return [
		box(0, 0, 370, 365),
		text(23, 21, 'Welcome back', { size: 23 }),
		text(23, 58, 'Sign in to your account', { color: MUTED }),
		text(23, 104, 'Email address'),
		box(23, 131, 324, 44, { color: BORDER }),
		text(35, 144, 'you@example.com', { size: 15, color: MUTED }),
		text(23, 193, 'Password'),
		box(23, 219, 324, 44, { color: BORDER }),
		text(36, 232, '••••••••••••', { size: 15, color: MUTED }),
		box(23, 290, 324, 47, { color: BLUE }),
		text(150, 304, 'Sign in', { color: BLUE })
	];
}

/** @returns {UiComponentShape[]} */
function faqAccordion() {
	return [
		box(0, 0, 490, 196),
		text(18, 17, 'How does the free trial work?'),
		text(452, 16, '−', { size: 21, width: 22 }),
		text(19, 51, 'Try every feature free for 14 days.', { size: 15, color: MUTED }),
		text(19, 75, 'No credit card required.', { size: 15, color: MUTED }),
		line(0, 111, 490, 111),
		text(18, 125, 'Can I change plans later?'),
		text(452, 123, '+', { size: 21, width: 22 }),
		line(0, 160, 490, 160),
		text(18, 172, 'What happens to my data?', { size: 15 }),
		text(453, 168, '+', { size: 19, width: 22 })
	];
}

export const DRAW_UI_COMPONENT_CATEGORIES = [
	{ id: 'illustration', label: 'Technical illustration' },
	{ id: 'forms', label: 'Forms & controls' },
	{ id: 'content', label: 'Content & feedback' },
	{ id: 'data', label: 'Data & metrics' },
	{ id: 'navigation', label: 'Navigation' },
	{ id: 'layouts', label: 'Layouts & screens' }
];

/**
 * @param {Omit<DrawUiComponent, 'create' | 'createShapes'> & { build: () => UiComponentShape[] }} entry
 * @returns {DrawUiComponent}
 */
function component({ build, ...entry }) {
	return {
		...entry,
		create(x = 0, y = 0) {
			return build().map((shape) => ({ ...shape, x: shape.x + x, y: shape.y + y }));
		},
		createShapes: build
	};
}

/** @type {DrawUiComponent[]} */
export const DRAW_UI_COMPONENTS = [
	...DRAW_ILLUSTRATION_COMPONENTS,
	component({
		id: 'primary-button',
		title: 'Primary button',
		label: 'Primary button',
		description: 'A hand-drawn call-to-action button.',
		category: 'forms',
		keywords: ['cta', 'submit', 'action'],
		build: primaryButton
	}),
	component({
		id: 'secondary-button',
		title: 'Secondary button',
		label: 'Secondary button',
		description: 'A subtle outlined alternative action.',
		category: 'forms',
		keywords: ['outline', 'cancel', 'action'],
		build: secondaryButton
	}),
	component({
		id: 'text-input',
		title: 'Text input',
		label: 'Text input',
		description: 'A labeled email or text entry field.',
		category: 'forms',
		keywords: ['email', 'field', 'form'],
		build: textInput
	}),
	component({
		id: 'search-input',
		title: 'Search field',
		label: 'Search field',
		description: 'Search input with a sketchy magnifier.',
		category: 'forms',
		keywords: ['find', 'filter', 'query'],
		build: searchInput
	}),
	component({
		id: 'select-input',
		title: 'Select dropdown',
		label: 'Select dropdown',
		description: 'A labeled dropdown selection control.',
		category: 'forms',
		keywords: ['picker', 'combobox', 'options'],
		build: selectInput
	}),
	component({
		id: 'textarea',
		title: 'Text area',
		label: 'Text area',
		description: 'A multiline message entry field.',
		category: 'forms',
		keywords: ['message', 'multiline', 'form'],
		build: textarea
	}),
	component({
		id: 'checkbox',
		title: 'Checkbox',
		label: 'Checkbox',
		description: 'A checked option with an editable label.',
		category: 'forms',
		keywords: ['check', 'agree', 'option'],
		build: checkbox
	}),
	component({
		id: 'toggle-switch',
		title: 'Toggle switch',
		label: 'Toggle switch',
		description: 'An enabled on/off preference switch.',
		category: 'forms',
		keywords: ['toggle', 'switch', 'setting'],
		build: toggleSwitch
	}),
	component({
		id: 'radio-options',
		title: 'Radio options',
		label: 'Radio options',
		description: 'Two mutually exclusive selection options.',
		category: 'forms',
		keywords: ['radio', 'choice', 'option'],
		build: radioOptions
	}),
	component({
		id: 'content-card',
		title: 'Content card',
		label: 'Content card',
		description: 'A titled content card with action button.',
		category: 'content',
		keywords: ['panel', 'tile', 'article'],
		build: contentCard
	}),
	component({
		id: 'alert-banner',
		title: 'Alert banner',
		label: 'Alert banner',
		description: 'An informational inline message banner.',
		category: 'content',
		keywords: ['notice', 'message', 'info'],
		build: alertBanner
	}),
	component({
		id: 'dialog',
		title: 'Modal dialog',
		label: 'Modal dialog',
		description: 'A confirmation modal with two actions.',
		category: 'content',
		keywords: ['modal', 'confirm', 'popup'],
		build: dialog
	}),
	component({
		id: 'toast',
		title: 'Toast notification',
		label: 'Toast notification',
		description: 'A compact success notification.',
		category: 'content',
		keywords: ['snackbar', 'success', 'notification'],
		build: toast
	}),
	component({
		id: 'avatar-profile',
		title: 'Avatar profile',
		label: 'Avatar profile',
		description: 'A user avatar with name and subtitle.',
		category: 'content',
		keywords: ['user', 'person', 'profile'],
		build: avatarProfile
	}),
	component({
		id: 'badge',
		title: 'Status badge',
		label: 'Status badge',
		description: 'A compact published status badge.',
		category: 'content',
		keywords: ['tag', 'label', 'chip'],
		build: badge
	}),
	component({
		id: 'data-table',
		title: 'Data table',
		label: 'Data table',
		description: 'An editable three-column project table.',
		category: 'data',
		keywords: ['grid', 'rows', 'spreadsheet'],
		build: dataTable
	}),
	component({
		id: 'metric-card',
		title: 'Metric card',
		label: 'Metric card',
		description: 'A revenue metric with growth comparison.',
		category: 'data',
		keywords: ['kpi', 'stat', 'dashboard'],
		build: metricCard
	}),
	component({
		id: 'progress-bar',
		title: 'Progress bar',
		label: 'Progress bar',
		description: 'A labeled project completion indicator.',
		category: 'data',
		keywords: ['loading', 'completion', 'percentage'],
		build: progressBar
	}),
	component({
		id: 'navbar',
		title: 'Navigation bar',
		label: 'Navigation bar',
		description: 'A full-width marketing navigation header.',
		category: 'navigation',
		keywords: ['header', 'menu', 'topbar'],
		build: navbar
	}),
	component({
		id: 'sidebar',
		title: 'App sidebar',
		label: 'App sidebar',
		description: 'A workspace navigation sidebar.',
		category: 'navigation',
		keywords: ['drawer', 'menu', 'dashboard'],
		build: sidebar
	}),
	component({
		id: 'tabs',
		title: 'Tabs',
		label: 'Tabs',
		description: 'Three tabs with an active underline.',
		category: 'navigation',
		keywords: ['tab', 'switcher', 'navigation'],
		build: tabs
	}),
	component({
		id: 'breadcrumbs',
		title: 'Breadcrumbs',
		label: 'Breadcrumbs',
		description: 'A three-level page navigation trail.',
		category: 'navigation',
		keywords: ['path', 'hierarchy', 'navigation'],
		build: breadcrumbs
	}),
	component({
		id: 'pagination',
		title: 'Pagination',
		label: 'Pagination',
		description: 'Previous, next, and numbered page controls.',
		category: 'navigation',
		keywords: ['pages', 'next', 'previous'],
		build: pagination
	}),
	component({
		id: 'hero-section',
		title: 'Hero section',
		label: 'Hero section',
		description: 'A complete marketing hero with CTA and image.',
		category: 'layouts',
		keywords: ['landing', 'marketing', 'headline'],
		build: heroSection
	}),
	component({
		id: 'pricing-card',
		title: 'Pricing card',
		label: 'Pricing card',
		description: 'A complete subscription pricing tier.',
		category: 'layouts',
		keywords: ['plan', 'subscription', 'checkout'],
		build: pricingCard
	}),
	component({
		id: 'chat-panel',
		title: 'Chat panel',
		label: 'Chat panel',
		description: 'A messaging thread and composer.',
		category: 'layouts',
		keywords: ['ai', 'messages', 'conversation'],
		build: chatPanel
	}),
	component({
		id: 'kanban-board',
		title: 'Kanban board',
		label: 'Kanban board',
		description: 'A complete three-column project board.',
		category: 'layouts',
		keywords: ['tasks', 'project', 'trello'],
		build: kanbanBoard
	}),
	component({
		id: 'login-form',
		title: 'Login form',
		label: 'Login form',
		description: 'A complete sign-in form with credentials.',
		category: 'layouts',
		keywords: ['signin', 'authentication', 'password'],
		build: loginForm
	}),
	component({
		id: 'faq-accordion',
		title: 'FAQ accordion',
		label: 'FAQ accordion',
		description: 'A three-question expandable help section.',
		category: 'layouts',
		keywords: ['questions', 'help', 'collapse'],
		build: faqAccordion
	})
];

/**
 * @param {string} id
 * @param {number} [x]
 * @param {number} [y]
 * @returns {UiComponentShape[]}
 */
export function createDrawUiComponent(id, x = 0, y = 0) {
	const entry = DRAW_UI_COMPONENTS.find((item) => item.id === id);
	if (!entry) {
		throw new Error(`Unknown drawing UI component: ${id}`);
	}
	return entry.create(x, y);
}
