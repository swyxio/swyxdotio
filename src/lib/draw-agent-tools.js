import { DRAW_GENERATION_MODELS } from './draw-generation-models.js';
import { DRAW_DESIGN_FORMATS, DRAW_DESIGN_TEMPLATES } from './draw-designs.js';

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
draw duplicate [ID...] [--dx 24 --dy 24]   Duplicate selected or named elements
draw align EDGE [ID...]                    left, center, right, top, middle, bottom
draw distribute AXIS [ID...]               Space elements along horizontal or vertical
draw group [ID...]                         Group selected or named elements
draw ungroup [ID...]                       Ungroup selected or named elements
draw layer POSITION [ID...]                front, back, forward, or backward
draw connect FROM_ID TO_ID [--label TEXT]   Add a bound, optionally labeled arrow
draw designs                               List branded artboard templates and sizes
draw design insert TEMPLATE [--headline TEXT] [--subtitle TEXT] [--companies TEXT]
draw design duplicate FRAME_ID [--name TEXT] Copy an editable artboard for a variant
draw design resize FRAME_ID FORMAT          Refit to youtube, social, square, portrait, story, slide
draw export FRAME_ID png|jpg|svg [--scale 2] Download the exact artboard
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

/** @param {string[]} args @param {string[]} allowed */
function designOptions(args, allowed) {
	/** @type {Record<string, string>} */
	const options = {};
	for (let index = 0; index < args.length; index += 2) {
		const key = args[index];
		const value = args[index + 1];
		if (!key?.startsWith('--') || value === undefined || !allowed.includes(key.slice(2))) {
			throw new Error('Design options must use supported --name value pairs.');
		}
		if (value.length > 200) throw new Error('Design option values must stay under 200 characters.');
		options[key.slice(2)] = value;
	}
	return options;
}

/** @param {string[]} requested @param {any[]} elements @param {any} state @param {number} minimum */
function chosenElements(requested, elements, state, minimum = 1) {
	const ids = requested.length
		? requested
		: Object.keys(state.selectedElementIds ?? {}).filter((id) => state.selectedElementIds[id]);
	if (
		ids.length < minimum ||
		ids.length > MAX_MUTATION_ELEMENTS ||
		new Set(ids).size !== ids.length
	) {
		throw new Error(
			`Choose between ${minimum} and ${MAX_MUTATION_ELEMENTS} distinct drawing elements.`
		);
	}
	const matches = ids.map((id) => elements.find((element) => element.id === id));
	if (matches.some((element) => !element))
		throw new Error('A requested drawing element was not found.');
	return /** @type {any[]} */ (matches);
}

/** @param {any} context @param {Map<string, any>} changes @param {Record<string, unknown>} [appState] */
function commitChanges(context, changes, appState) {
	context.editor.updateScene({
		elements: context.editor
			.getSceneElementsIncludingDeleted()
			.map((/** @type {any} */ element) => changes.get(element.id) ?? element),
		...(appState ? { appState } : {}),
		captureUpdate: context.captureUpdate
	});
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
 *  insertDesign?: (id: string, options: Record<string, string>) => Promise<unknown>,
 *  duplicateDesign?: (frameId: string, name?: string) => unknown,
 *  resizeDesign?: (frameId: string, formatId: string) => unknown,
 *  exportDesign?: (frameId: string, format: 'png' | 'jpg' | 'svg', scale: number) => Promise<unknown>,
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
			artboards: elements
				.filter((/** @type {any} */ element) => element.type === 'frame')
				.slice(0, 20)
				.map((/** @type {any} */ frame) => ({
					id: frame.id,
					name: frame.name,
					width: frame.width,
					height: frame.height
				})),
			imageModels: DRAW_GENERATION_MODELS.map((model) => ({
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
	if (command === 'designs') {
		return {
			templates: DRAW_DESIGN_TEMPLATES.map(({ id, label, description, format, brand }) => ({
				id,
				label,
				description,
				format,
				brand
			})),
			formats: DRAW_DESIGN_FORMATS
		};
	}
	if (command === 'design') {
		if (action === 'insert' && rest[0] && context.insertDesign) {
			return context.insertDesign(
				rest[0],
				designOptions(rest.slice(1), ['headline', 'subtitle', 'companies', 'name'])
			);
		}
		if (action === 'duplicate' && rest[0] && context.duplicateDesign) {
			const options = designOptions(rest.slice(1), ['name']);
			return context.duplicateDesign(rest[0], options.name);
		}
		if (action === 'resize' && rest.length === 2 && context.resizeDesign) {
			return context.resizeDesign(rest[0], rest[1]);
		}
		throw new Error(
			'Use draw design insert TEMPLATE, duplicate FRAME_ID, or resize FRAME_ID FORMAT.'
		);
	}
	if (command === 'export') {
		if (!action || !['png', 'jpg', 'svg'].includes(rest[0]) || !context.exportDesign) {
			throw new Error('Use draw export FRAME_ID png, jpg, or svg.');
		}
		const options = designOptions(rest.slice(1), ['scale']);
		const scale = Number(options.scale ?? 1);
		if (![1, 2].includes(scale)) throw new Error('Choose an export scale of 1 or 2.');
		return context.exportDesign(action, /** @type {'png' | 'jpg' | 'svg'} */ (rest[0]), scale);
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
	if (command === 'duplicate') {
		const tokens = [action, ...rest].filter(Boolean);
		/** @type {string[]} */
		const ids = [];
		let dx = 24;
		let dy = 24;
		for (let index = 0; index < tokens.length; index++) {
			const token = tokens[index];
			if (token === '--dx' || token === '--dy') {
				const offset = Number(tokens[++index]);
				if (!Number.isFinite(offset) || Math.abs(offset) > MAX_COORDINATE) {
					throw new Error('Duplication offsets must be finite, reasonable numbers.');
				}
				if (token === '--dx') dx = offset;
				else dy = offset;
			} else if (token.startsWith('--'))
				throw new Error(`Unsupported duplication option: ${token}`);
			else ids.push(token);
		}
		const originals = chosenElements(ids, elements, state, 1);
		const copies = context.convertElements(
			originals.map(({ id, index, version, versionNonce, seed, ...element }) => ({
				...element,
				x: element.x + dx,
				y: element.y + dy,
				groupIds: [],
				boundElements: null,
				...(element.type === 'text' ? { containerId: null } : {}),
				...(['arrow', 'line'].includes(element.type)
					? { startBinding: null, endBinding: null }
					: {})
			})),
			{ regenerateIds: true }
		);
		editor.updateScene({
			elements: [...editor.getSceneElementsIncludingDeleted(), ...copies],
			appState: {
				selectedElementIds: Object.fromEntries(
					copies.map((/** @type {any} */ item) => [item.id, true])
				)
			},
			captureUpdate: context.captureUpdate
		});
		return { duplicated: copies.map((/** @type {any} */ item) => summarizeElement(item, state)) };
	}
	if (command === 'align') {
		if (!['left', 'center', 'right', 'top', 'middle', 'bottom'].includes(action)) {
			throw new Error('Choose left, center, right, top, middle, or bottom alignment.');
		}
		const chosen = chosenElements(rest, elements, state, 2);
		const left = Math.min(...chosen.map((element) => element.x));
		const right = Math.max(...chosen.map((element) => element.x + element.width));
		const top = Math.min(...chosen.map((element) => element.y));
		const bottom = Math.max(...chosen.map((element) => element.y + element.height));
		const changes = new Map(
			chosen.map((element) => {
				let x = element.x;
				let y = element.y;
				if (action === 'left') x = left;
				if (action === 'center') x = (left + right - element.width) / 2;
				if (action === 'right') x = right - element.width;
				if (action === 'top') y = top;
				if (action === 'middle') y = (top + bottom - element.height) / 2;
				if (action === 'bottom') y = bottom - element.height;
				return [element.id, context.updateElement(element, { x, y })];
			})
		);
		commitChanges(context, changes);
		return { aligned: action, ids: chosen.map((element) => element.id) };
	}
	if (command === 'distribute') {
		if (!['horizontal', 'vertical'].includes(action))
			throw new Error('Choose horizontal or vertical distribution.');
		const chosen = chosenElements(rest, elements, state, 3);
		const coordinate = action === 'horizontal' ? 'x' : 'y';
		const size = action === 'horizontal' ? 'width' : 'height';
		const ordered = [...chosen].sort((first, second) => first[coordinate] - second[coordinate]);
		const start = ordered[0][coordinate];
		const end = ordered.at(-1)[coordinate] + ordered.at(-1)[size];
		const occupied = ordered.reduce((total, element) => total + element[size], 0);
		const gap = (end - start - occupied) / (ordered.length - 1);
		let cursor = start;
		const changes = new Map(
			ordered.map((element) => {
				const updated = context.updateElement(element, { [coordinate]: cursor });
				cursor += element[size] + gap;
				return [element.id, updated];
			})
		);
		commitChanges(context, changes);
		return {
			distributed: action,
			gap: Math.round(gap * 100) / 100,
			ids: ordered.map((element) => element.id)
		};
	}
	if (command === 'group' || command === 'ungroup') {
		const chosen = chosenElements(
			[action, ...rest].filter(Boolean),
			elements,
			state,
			command === 'group' ? 2 : 1
		);
		const groupId = command === 'group' ? crypto.randomUUID() : chosen[0].groupIds?.[0];
		if (!groupId) throw new Error('The selected drawing elements are not grouped.');
		/** @type {any[]} */
		const affected =
			command === 'group'
				? chosen
				: elements.filter((/** @type {any} */ element) => element.groupIds?.includes(groupId));
		const changes = new Map(
			affected.map((element) => [
				element.id,
				context.updateElement(element, {
					groupIds:
						command === 'group'
							? [groupId, ...(element.groupIds ?? [])]
							: element.groupIds.filter((/** @type {string} */ id) => id !== groupId)
				})
			])
		);
		commitChanges(context, changes, {
			selectedElementIds: Object.fromEntries(affected.map((element) => [element.id, true])),
			selectedGroupIds: command === 'group' ? { [groupId]: true } : {}
		});
		return {
			[command === 'group' ? 'grouped' : 'ungrouped']: groupId,
			ids: affected.map((element) => element.id)
		};
	}
	if (command === 'layer') {
		if (!['front', 'back', 'forward', 'backward'].includes(action)) {
			throw new Error('Choose front, back, forward, or backward layering.');
		}
		const chosen = chosenElements(rest, elements, state, 1);
		const ids = new Set(chosen.map((element) => element.id));
		const ordered = [...editor.getSceneElementsIncludingDeleted()];
		if (action === 'front' || action === 'back') {
			const moved = ordered.filter((element) => ids.has(element.id));
			const remaining = ordered.filter((element) => !ids.has(element.id));
			ordered.splice(
				0,
				ordered.length,
				...(action === 'front' ? [...remaining, ...moved] : [...moved, ...remaining])
			);
		} else if (action === 'forward') {
			for (let index = ordered.length - 2; index >= 0; index--) {
				if (ids.has(ordered[index].id) && !ids.has(ordered[index + 1].id)) {
					[ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]];
				}
			}
		} else {
			for (let index = 1; index < ordered.length; index++) {
				if (ids.has(ordered[index].id) && !ids.has(ordered[index - 1].id)) {
					[ordered[index], ordered[index - 1]] = [ordered[index - 1], ordered[index]];
				}
			}
		}
		editor.updateScene({ elements: ordered, captureUpdate: context.captureUpdate });
		return { layered: action, ids: chosen.map((element) => element.id) };
	}
	if (command === 'connect') {
		if (!action || !rest[0] || action === rest[0])
			throw new Error('Choose two different drawing elements to connect.');
		const [from, to] = chosenElements([action, rest[0]], elements, state, 2);
		if (
			!['rectangle', 'ellipse', 'diamond', 'image', 'text'].includes(from.type) ||
			!['rectangle', 'ellipse', 'diamond', 'image', 'text'].includes(to.type)
		) {
			throw new Error('Connect rectangles, ellipses, diamonds, images, or text.');
		}
		if (
			rest.length > 1 &&
			(rest[1] !== '--label' ||
				typeof rest[2] !== 'string' ||
				rest.length !== 3 ||
				rest[2].length > 300)
		) {
			throw new Error('Connector labels must use --label TEXT and stay under 300 characters.');
		}
		const dx = to.x + to.width / 2 - (from.x + from.width / 2);
		const dy = to.y + to.height / 2 - (from.y + from.height / 2);
		const horizontal = Math.abs(dx) >= Math.abs(dy);
		const startX =
			from.x + from.width / 2 + (horizontal ? Math.sign(dx) * (from.width / 2 + 8) : 0);
		const startY =
			from.y + from.height / 2 + (horizontal ? 0 : Math.sign(dy) * (from.height / 2 + 8));
		const endX = to.x + to.width / 2 - (horizontal ? Math.sign(dx) * (to.width / 2 + 8) : 0);
		const endY = to.y + to.height / 2 - (horizontal ? 0 : Math.sign(dy) * (to.height / 2 + 8));
		const arrow = {
			type: 'arrow',
			x: startX,
			y: startY,
			points: [
				[0, 0],
				[endX - startX, endY - startY]
			],
			startBinding: { elementId: from.id, focus: 0, gap: 8 },
			endBinding: { elementId: to.id, focus: 0, gap: 8 },
			...(rest[2] ? { label: { text: rest[2] } } : {})
		};
		const converted = context.convertElements([arrow], { regenerateIds: true });
		const generatedArrow = converted.find((/** @type {any} */ element) => element.type === 'arrow');
		const connector = context.updateElement(generatedArrow, {
			startBinding: arrow.startBinding,
			endBinding: arrow.endBinding
		});
		const created = converted.map((/** @type {any} */ element) =>
			element.id === connector.id ? connector : element
		);
		const changes = new Map(
			[from, to].map((element) => [
				element.id,
				context.updateElement(element, {
					boundElements: [...(element.boundElements ?? []), { id: connector.id, type: 'arrow' }]
				})
			])
		);
		editor.updateScene({
			elements: [
				...editor
					.getSceneElementsIncludingDeleted()
					.map((/** @type {any} */ element) => changes.get(element.id) ?? element),
				...created
			],
			appState: { selectedElementIds: { [connector.id]: true } },
			captureUpdate: context.captureUpdate
		});
		return {
			connected: connector.id,
			from: from.id,
			to: to.id,
			...(rest[2] ? { label: rest[2] } : {})
		};
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
