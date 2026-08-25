import { DRAW_FAL_MODELS } from './draw-fal-models.js';

export const MAX_DRAW_AGENT_ROUNDS = 6;
export const MAX_DRAW_AGENT_TOOL_CALLS = 30;
export const DEFAULT_DRAW_AGENT_BUDGET_USD = 1;

const MAX_ELEMENTS = 120;
const MAX_MUTATION_ELEMENTS = 30;
const MAX_COORDINATE = 100_000;
const SHAPE_TYPES = new Set(['rectangle', 'ellipse', 'diamond', 'arrow', 'line', 'text', 'frame']);
const MUTABLE_PROPERTIES = new Set([
	'x',
	'y',
	'width',
	'height',
	'angle',
	'strokeColor',
	'backgroundColor',
	'fillStyle',
	'strokeWidth',
	'strokeStyle',
	'roughness',
	'opacity',
	'text',
	'originalText',
	'fontSize',
	'fontFamily',
	'textAlign',
	'verticalAlign'
]);

export const DRAW_AGENT_HELP = `draw inspect                              Canvas, selection, viewport, and current page
draw list [--selected] [--visible]         Compact element JSON
draw add '<JSON object or array>'          Add up to 30 Excalidraw shapes with native undo
draw update ELEMENT_ID '<JSON object>'    Update safe geometry, color, or text properties
draw delete ELEMENT_ID [ELEMENT_ID...]     Delete elements with native undo
draw select ELEMENT_ID [ELEMENT_ID...]     Select existing elements
draw viewport [fit|ELEMENT_ID...]          Inspect or focus the visible viewport
draw presets [insert PRESET_ID]            List or insert drawing presets
draw components [insert COMPONENT_ID]      List or insert UI wireframe components
draw commands [run COMMAND_ID]             List or run workspace commands
draw pages [create|switch ID|rename ID NAME] List or manage drawing pages
draw image ACTION [--id ID] [--prompt TEXT] [--model ID] [--x 0.5] [--y 0.5]
Actions: background, magic-select, magic-eraser, depth-blur, vectorize, fal`;

/** @param {any} element @param {any} appState */
function isVisible(element, appState) {
	const zoom = appState.zoom?.value ?? 1;
	const left = -appState.scrollX;
	const top = -appState.scrollY;
	const right = left + appState.width / zoom;
	const bottom = top + appState.height / zoom;
	return (
		element.x + Math.max(element.width ?? 0, 1) >= left &&
		element.x <= right &&
		element.y + Math.max(element.height ?? 0, 1) >= top &&
		element.y <= bottom
	);
}

/** @param {any} element @param {any} appState */
function summarizeElement(element, appState) {
	/** @type {Record<string, unknown>} */
	const summary = {
		id: element.id,
		type: element.type,
		x: Math.round(element.x),
		y: Math.round(element.y),
		width: Math.round(element.width),
		height: Math.round(element.height),
		visible: isVisible(element, appState),
		selected: Boolean(appState.selectedElementIds?.[element.id])
	};
	if (typeof element.text === 'string') summary.text = element.text.slice(0, 300);
	if (element.strokeColor) summary.strokeColor = element.strokeColor;
	if (element.backgroundColor && element.backgroundColor !== 'transparent') {
		summary.backgroundColor = element.backgroundColor;
	}
	if (element.type === 'image') summary.hasImage = Boolean(element.fileId);
	return summary;
}

/** @param {string | undefined} value @param {string} label */
function parseJson(value, label) {
	if (!value || value.length > 24_000) throw new Error(`${label} must be valid, bounded JSON.`);
	try {
		return JSON.parse(value);
	} catch {
		throw new Error(`${label} must be valid JSON.`);
	}
}

/** @param {Record<string, unknown>} shape */
function validateShape(shape) {
	if (!shape || typeof shape !== 'object' || Array.isArray(shape)) {
		throw new Error('Each drawing shape must be a JSON object.');
	}
	if (!SHAPE_TYPES.has(/** @type {string} */ (shape.type))) {
		throw new Error('Use rectangle, ellipse, diamond, arrow, line, text, or frame shapes.');
	}
	for (const property of ['x', 'y', 'width', 'height', 'angle', 'fontSize', 'strokeWidth']) {
		if (
			property in shape &&
			(typeof shape[property] !== 'number' ||
				!Number.isFinite(shape[property]) ||
				Math.abs(/** @type {number} */ (shape[property])) > MAX_COORDINATE)
		) {
			throw new Error(`Shape ${property} must be a finite, reasonable number.`);
		}
	}
	if (shape.type === 'text' && (typeof shape.text !== 'string' || shape.text.length > 2_000)) {
		throw new Error('Text shapes require bounded text.');
	}
	if ('fileId' in shape || 'customData' in shape || 'link' in shape) {
		throw new Error('Drawing shapes cannot inject files, custom data, or external links.');
	}
}

/** @param {string[]} args */
function imageOptions(args) {
	/** @type {Record<string, string | number>} */
	const options = {};
	for (let index = 0; index < args.length; index += 2) {
		const key = args[index];
		const value = args[index + 1];
		if (!key?.startsWith('--') || value === undefined) {
			throw new Error('Image options must use --name value pairs.');
		}
		const name = key.slice(2);
		if (!['id', 'prompt', 'model', 'x', 'y', 'radius', 'blur', 'focus'].includes(name)) {
			throw new Error(`Unsupported image option: ${key}`);
		}
		if (['x', 'y', 'radius', 'blur', 'focus'].includes(name)) {
			const numeric = Number(value);
			if (!Number.isFinite(numeric) || numeric < 0 || numeric > (name === 'blur' ? 80 : 1)) {
				throw new Error(`Invalid value for ${key}.`);
			}
			options[name] = numeric;
		} else {
			if (value.length > (name === 'prompt' ? 1_000 : 128)) {
				throw new Error(`The ${key} value is too long.`);
			}
			options[name] = value;
		}
	}
	return options;
}

/**
 * The browser worker can call only this explicit capability boundary. It never
 * receives the editor, screenshot bytes, localStorage, cookies, or credentials.
 * @param {string[]} args
 * @param {{
 *  editor: any,
 *  convertElements: any,
 *  updateElement: any,
 *  captureUpdate: any,
 *  pageId: string,
 *  pages: any[],
 *  presets: any[],
 *  components: any[],
 *  commands: any[],
 *  createPage: () => Promise<void>,
 *  switchPage: (page: any) => Promise<void>,
 *  renamePage: (id: string, name: string) => Promise<void>,
 *  insertPreset: (preset: any) => void,
 *  insertComponent: (id: string) => void,
 *  image: (action: string, options: Record<string, string | number>) => Promise<unknown>
 * }} context
 */
export async function executeDrawingAgentCommand(args, context) {
	if (!Array.isArray(args) || args.length > 40 || args.some((arg) => typeof arg !== 'string')) {
		throw new Error('The drawing command is invalid.');
	}
	const { editor } = context;
	if (!editor) throw new Error('The drawing canvas is not ready.');
	const [command = 'help', action, ...rest] = args;
	const state = editor.getAppState();
	const elements = editor.getSceneElements();
	if (command === 'help') return { help: DRAW_AGENT_HELP };
	if (command === 'inspect') {
		return {
			page: context.pages.find((page) => page.id === context.pageId),
			elementCount: elements.length,
			selectedIds: Object.keys(state.selectedElementIds ?? {}).filter(
				(id) => state.selectedElementIds[id]
			),
			viewport: {
				width: state.width,
				height: state.height,
				scrollX: Math.round(state.scrollX),
				scrollY: Math.round(state.scrollY),
				zoom: state.zoom.value
			},
			visibleElements: elements
				.filter((/** @type {any} */ element) => isVisible(element, state))
				.slice(0, MAX_ELEMENTS)
				.map((/** @type {any} */ element) => summarizeElement(element, state)),
			imageModels: DRAW_FAL_MODELS.map((model) => ({
				id: model.id,
				label: model.label,
				kind: model.kind,
				estimatedUsd: model.priceUsd
			}))
		};
	}
	if (command === 'list') {
		const flags = [action, ...rest].filter(Boolean);
		if (flags.some((flag) => flag !== '--selected' && flag !== '--visible')) {
			throw new Error('Supported list filters are --selected and --visible.');
		}
		return elements
			.filter(
				(/** @type {any} */ element) =>
					(!flags.includes('--selected') || state.selectedElementIds?.[element.id]) &&
					(!flags.includes('--visible') || isVisible(element, state))
			)
			.slice(0, MAX_ELEMENTS)
			.map((/** @type {any} */ element) => summarizeElement(element, state));
	}
	if (command === 'add') {
		const parsed = parseJson(action, 'Drawing shapes');
		const shapes = Array.isArray(parsed) ? parsed : [parsed];
		if (!shapes.length || shapes.length > MAX_MUTATION_ELEMENTS) {
			throw new Error('Add between one and 30 drawing shapes per command.');
		}
		for (const shape of shapes) validateShape(shape);
		const created = context.convertElements(shapes, { regenerateIds: true });
		editor.updateScene({
			elements: [...editor.getSceneElementsIncludingDeleted(), ...created],
			appState: {
				selectedElementIds: Object.fromEntries(
					created.map((/** @type {any} */ item) => [item.id, true])
				)
			},
			captureUpdate: context.captureUpdate
		});
		return { added: created.map((/** @type {any} */ item) => summarizeElement(item, state)) };
	}
	if (command === 'update') {
		if (!action) throw new Error('Choose an existing element to update.');
		const changes = parseJson(rest[0], 'Element properties');
		if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
			throw new Error('Element properties must be a JSON object.');
		}
		for (const key of Object.keys(changes)) {
			if (!MUTABLE_PROPERTIES.has(key)) throw new Error(`Element property ${key} is not editable.`);
			if (
				typeof changes[key] === 'number' &&
				(!Number.isFinite(changes[key]) || Math.abs(changes[key]) > MAX_COORDINATE)
			) {
				throw new Error(`Element property ${key} is out of range.`);
			}
		}
		const current = elements.find((/** @type {any} */ element) => element.id === action);
		if (!current) throw new Error('The requested element does not exist.');
		if (
			current.type === 'text' &&
			typeof changes.text === 'string' &&
			!('originalText' in changes)
		) {
			changes.originalText = changes.text;
		}
		const updated = context.updateElement(current, changes);
		editor.updateScene({
			elements: editor
				.getSceneElementsIncludingDeleted()
				.map((/** @type {any} */ item) => (item.id === current.id ? updated : item)),
			captureUpdate: context.captureUpdate
		});
		return { updated: summarizeElement(updated, state) };
	}
	if (command === 'delete') {
		const ids = [action, ...rest].filter(Boolean);
		if (!ids.length || ids.length > MAX_MUTATION_ELEMENTS) {
			throw new Error('Choose between one and 30 elements to delete.');
		}
		const available = new Set(elements.map((/** @type {any} */ element) => element.id));
		if (ids.some((id) => !available.has(id)))
			throw new Error('An element to delete was not found.');
		editor.updateScene({
			elements: editor
				.getSceneElementsIncludingDeleted()
				.map((/** @type {any} */ item) =>
					ids.includes(item.id) ? context.updateElement(item, { isDeleted: true }) : item
				),
			appState: { selectedElementIds: {} },
			captureUpdate: context.captureUpdate
		});
		return { deleted: ids };
	}
	if (command === 'select') {
		const ids = [action, ...rest].filter(Boolean);
		const available = new Set(elements.map((/** @type {any} */ element) => element.id));
		if (ids.some((id) => !available.has(id))) throw new Error('A requested element was not found.');
		editor.updateScene({
			appState: { selectedElementIds: Object.fromEntries(ids.map((id) => [id, true])) }
		});
		return { selected: ids };
	}
	if (command === 'viewport') {
		if (action) {
			const target =
				action === 'fit'
					? elements
					: elements.filter((/** @type {any} */ element) => [action, ...rest].includes(element.id));
			if (!target.length) throw new Error('There are no matching elements to show.');
			editor.scrollToContent(target, { fitToContent: true, animate: false });
		}
		return { width: state.width, height: state.height, zoom: state.zoom.value };
	}
	if (command === 'presets') {
		if (!action)
			return context.presets.map((preset) => ({
				id: preset.id,
				label: preset.label,
				description: preset.description
			}));
		if (action !== 'insert' || !rest[0]) throw new Error('Use draw presets insert PRESET_ID.');
		const preset = context.presets.find((entry) => entry.id === rest[0]);
		if (!preset) throw new Error('The requested drawing preset does not exist.');
		context.insertPreset(preset);
		return { inserted: preset.id, label: preset.label };
	}
	if (command === 'components') {
		if (!action)
			return context.components.map((component) => ({
				id: component.id,
				label: component.title,
				category: component.category
			}));
		if (action !== 'insert' || !rest[0])
			throw new Error('Use draw components insert COMPONENT_ID.');
		const component = context.components.find((entry) => entry.id === rest[0]);
		if (!component) throw new Error('The requested UI component does not exist.');
		context.insertComponent(component.id);
		return { inserted: component.id, label: component.title };
	}
	if (command === 'commands') {
		if (!action)
			return context.commands
				.slice(0, MAX_ELEMENTS)
				.map((entry) => ({ id: entry.id, label: entry.label, category: entry.category }));
		if (action !== 'run' || !rest[0]) throw new Error('Use draw commands run COMMAND_ID.');
		const workspaceCommand = context.commands.find((entry) => entry.id === rest[0]);
		if (!workspaceCommand) throw new Error('The requested workspace command does not exist.');
		await workspaceCommand.run();
		return { ran: workspaceCommand.id, label: workspaceCommand.label };
	}
	if (command === 'pages') {
		if (!action)
			return context.pages.map((page) => ({ ...page, active: page.id === context.pageId }));
		if (action === 'create') {
			await context.createPage();
			return { created: true };
		}
		const page = context.pages.find((entry) => entry.id === rest[0]);
		if (!page) throw new Error('The requested drawing page does not exist.');
		if (action === 'switch') {
			await context.switchPage(page);
			return { switched: page.id, name: page.name };
		}
		if (action === 'rename') {
			const name = rest.slice(1).join(' ').trim();
			if (!name || name.length > 120)
				throw new Error('Choose a drawing name under 120 characters.');
			await context.renamePage(page.id, name);
			return { renamed: page.id, name };
		}
		throw new Error('Use draw pages create, switch PAGE_ID, or rename PAGE_ID NAME.');
	}
	if (command === 'image') {
		if (
			!action ||
			!['background', 'magic-select', 'magic-eraser', 'depth-blur', 'vectorize', 'fal'].includes(
				action
			)
		) {
			throw new Error('Choose a supported local image action or fal editing.');
		}
		return context.image(action, imageOptions(rest));
	}
	throw new Error(`Unknown drawing command: ${command}. Run draw help.`);
}

/**
 * Capture only Excalidraw's already-rendered visible canvas. The assistant UI,
 * offscreen scene, surrounding page, browser chrome, and other tabs are excluded.
 * @param {HTMLElement} container
 */
export async function captureVisibleDrawingViewport(container) {
	const source = container.querySelector('canvas.excalidraw__canvas.static');
	if (!(source instanceof HTMLCanvasElement) || !source.width || !source.height) {
		return undefined;
	}
	const scale = Math.min(1, 1_024 / Math.max(source.width, source.height));
	const target = document.createElement('canvas');
	target.width = Math.max(1, Math.round(source.width * scale));
	target.height = Math.max(1, Math.round(source.height * scale));
	const drawing = target.getContext('2d');
	if (!drawing) return undefined;
	drawing.fillStyle = '#ffffff';
	drawing.fillRect(0, 0, target.width, target.height);
	drawing.drawImage(source, 0, 0, target.width, target.height);
	return target.toDataURL('image/webp', 0.72);
}
