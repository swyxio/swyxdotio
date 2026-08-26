import assert from 'node:assert/strict';
import test from 'node:test';

import {
	DEFAULT_DRAW_AGENT_BUDGET_USD,
	MAX_DRAW_AGENT_ROUNDS,
	MAX_DRAW_AGENT_TOOL_CALLS,
	executeDrawingAgentCommand
} from '../src/lib/draw-agent-tools.js';

function drawingContext() {
	/** @type {any[]} */
	let elements = [
		{ id: 'visible', type: 'rectangle', x: 20, y: 30, width: 100, height: 80 },
		{ id: 'distant', type: 'text', text: 'Offscreen', x: 8_000, y: 9_000, width: 80, height: 20 }
	];
	/** @type {any[]} */
	const scenes = [];
	let nextElementId = 0;
	const state = {
		width: 800,
		height: 600,
		scrollX: 0,
		scrollY: 0,
		zoom: { value: 1 },
		selectedElementIds: { visible: true }
	};
	const editor = {
		getSceneElements: () => elements.filter((element) => !element.isDeleted),
		getSceneElementsIncludingDeleted: () => elements,
		getAppState: () => state,
		updateScene: (/** @type {any} */ scene) => {
			scenes.push(scene);
			if (scene.elements) elements = scene.elements;
			if (scene.appState?.selectedElementIds)
				state.selectedElementIds = scene.appState.selectedElementIds;
		},
		scrollToContent: () => {}
	};
	const context = {
		editor,
		convertElements: (/** @type {any[]} */ shapes) =>
			shapes.map((shape) => ({ id: `new-${nextElementId++}`, width: 100, height: 40, ...shape })),
		updateElement: (/** @type {any} */ element, /** @type {any} */ changes) => ({
			...element,
			...changes
		}),
		captureUpdate: 'immediately',
		pageId: 'page-1',
		pages: [{ id: 'page-1', name: 'Page 1' }],
		presets: [{ id: 'quadrants', label: 'Quadrants' }],
		components: [{ id: 'button', title: 'Button', category: 'Inputs' }],
		commands: [{ id: 'command-1', label: 'Example', category: 'Actions', run: async () => {} }],
		createPage: async () => {},
		switchPage: async () => {},
		renamePage: async () => {},
		insertPreset: () => {},
		insertComponent: () => {},
		image: async (
			/** @type {string} */ action,
			/** @type {Record<string, unknown>} */ options
		) => ({ action, options })
	};
	return { context, scenes };
}

test('drawing assistant inspects the visible viewport separately from distant canvas elements', async () => {
	const { context } = drawingContext();
	const inspection = /** @type {any} */ (await executeDrawingAgentCommand(['inspect'], context));
	assert.equal(inspection.elementCount, 2);
	assert.deepEqual(inspection.selectedIds, ['visible']);
	assert.deepEqual(
		inspection.visibleElements.map((/** @type {any} */ item) => item.id),
		['visible']
	);
	const filtered = /** @type {any[]} */ (
		await executeDrawingAgentCommand(['list', '--visible'], context)
	);
	assert.deepEqual(
		filtered.map((item) => item.id),
		['visible']
	);
});

test('drawing assistant adds, updates, and deletes shapes with native undo captures', async () => {
	const { context, scenes } = drawingContext();
	await executeDrawingAgentCommand(
		[
			'add',
			JSON.stringify([
				{ type: 'rectangle', x: 120, y: 150 },
				{ type: 'text', text: 'Hello', x: 140, y: 160 }
			])
		],
		context
	);
	assert.equal(scenes[0].captureUpdate, 'immediately');
	assert.deepEqual(Object.keys(scenes[0].appState.selectedElementIds), ['new-0', 'new-1']);
	await executeDrawingAgentCommand(
		['update', 'new-1', JSON.stringify({ text: 'Updated', x: 155 })],
		context
	);
	assert.equal(scenes[1].captureUpdate, 'immediately');
	assert.equal(
		context.editor.getSceneElements().find((element) => element.id === 'new-1').originalText,
		'Updated'
	);
	await executeDrawingAgentCommand(['delete', 'new-0'], context);
	assert.equal(scenes[2].captureUpdate, 'immediately');
	assert.equal(
		context.editor.getSceneElements().some((element) => element.id === 'new-0'),
		false
	);
});

test('drawing assistant rejects file injection, unsafe element mutations, and unbounded commands', async () => {
	const { context } = drawingContext();
	await assert.rejects(
		() =>
			executeDrawingAgentCommand(
				['add', JSON.stringify({ type: 'image', fileId: 'private', x: 0, y: 0 })],
				context
			),
		/rectangle, ellipse/
	);
	await assert.rejects(
		() =>
			executeDrawingAgentCommand(
				['update', 'visible', JSON.stringify({ fileId: 'private' })],
				context
			),
		/not editable/
	);
	await assert.rejects(
		() => executeDrawingAgentCommand(['image', 'fal', '--url', 'https://evil.example'], context),
		/Unsupported image option/
	);
	assert.equal(MAX_DRAW_AGENT_ROUNDS, 6);
	assert.equal(MAX_DRAW_AGENT_TOOL_CALLS, 30);
	assert.equal(DEFAULT_DRAW_AGENT_BUDGET_USD, 1);
});

test('drawing assistant exposes bounded workspace, page, image, and existing command capabilities', async () => {
	const { context } = drawingContext();
	assert.equal(
		/** @type {any[]} */ (await executeDrawingAgentCommand(['presets'], context))[0].id,
		'quadrants'
	);
	assert.equal(
		/** @type {any[]} */ (await executeDrawingAgentCommand(['components'], context))[0].id,
		'button'
	);
	assert.equal(
		/** @type {any[]} */ (await executeDrawingAgentCommand(['commands'], context))[0].id,
		'command-1'
	);
	assert.equal(
		/** @type {any[]} */ (await executeDrawingAgentCommand(['pages'], context))[0].active,
		true
	);
	assert.deepEqual(
		await executeDrawingAgentCommand(
			['image', 'depth-blur', '--id', 'visible', '--blur', '18'],
			context
		),
		{ action: 'depth-blur', options: { id: 'visible', blur: 18 } }
	);
});

test('drawing assistant duplicates and aligns shapes with one native undo capture per command', async () => {
	const { context, scenes } = drawingContext();
	const duplicated = /** @type {any} */ (
		await executeDrawingAgentCommand(['duplicate', 'visible', '--dx', '160', '--dy', '5'], context)
	);
	assert.equal(duplicated.duplicated[0].x, 180);
	assert.equal(duplicated.duplicated[0].y, 35);
	assert.equal(scenes[0].captureUpdate, 'immediately');
	await executeDrawingAgentCommand(['align', 'top', 'visible', 'new-0'], context);
	assert.equal(scenes.length, 2);
	assert.equal(scenes[1].captureUpdate, 'immediately');
	assert.equal(context.editor.getSceneElements().find((element) => element.id === 'new-0').y, 30);
	await assert.rejects(
		() => executeDrawingAgentCommand(['align', 'diagonal', 'visible'], context),
		/alignment/
	);
});

test('essay-ready duplication preserves bound labels and internal arrows without touching originals', async () => {
	const { context, scenes } = drawingContext();
	const originals = [
		{
			id: 'a',
			type: 'rectangle',
			x: 0,
			y: 0,
			width: 120,
			height: 80,
			groupIds: ['group'],
			boundElements: [
				{ id: 'label', type: 'text' },
				{ id: 'edge', type: 'arrow' }
			]
		},
		{
			id: 'label',
			type: 'text',
			text: 'A claim',
			x: 10,
			y: 20,
			width: 100,
			height: 25,
			containerId: 'a',
			groupIds: ['group']
		},
		{
			id: 'b',
			type: 'rectangle',
			x: 300,
			y: 0,
			width: 120,
			height: 80,
			groupIds: ['group'],
			boundElements: [{ id: 'edge', type: 'arrow' }]
		},
		{
			id: 'edge',
			type: 'arrow',
			x: 120,
			y: 40,
			width: 180,
			height: 0,
			points: [
				[0, 0],
				[180, 0]
			],
			startBinding: { elementId: 'a', focus: 0, gap: 1 },
			endBinding: { elementId: 'b', focus: 0, gap: 1 }
		}
	];
	context.editor.updateScene({
		elements: originals,
		appState: { selectedElementIds: { a: true, b: true, edge: true } }
	});
	const before = structuredClone(originals);
	const result = await executeDrawingAgentCommand(['duplicate', '--dx', '600'], context);
	const all = context.editor.getSceneElements();
	assert.deepEqual(all.slice(0, 4), before);
	const [a, label, b, edge] = all.slice(4);
	assert.equal(result.duplicated.length, 4);
	assert.equal(label.containerId, a.id);
	assert.equal(edge.startBinding.elementId, a.id);
	assert.equal(edge.endBinding.elementId, b.id);
	assert.ok(a.boundElements.some((bound) => bound.id === label.id));
	assert.equal(a.groupIds[0], b.groupIds[0]);
	assert.notEqual(a.groupIds[0], 'group');
	assert.equal(a.x, 600);
	assert.equal(scenes.at(-1).captureUpdate, 'immediately');
});

test('drawing assistant evenly distributes elements, groups them, and reverses grouping', async () => {
	const { context, scenes } = drawingContext();
	await executeDrawingAgentCommand(
		[
			'add',
			JSON.stringify([
				{ type: 'rectangle', x: 200, y: 30, width: 40, height: 30 },
				{ type: 'rectangle', x: 500, y: 30, width: 40, height: 30 }
			])
		],
		context
	);
	const result = /** @type {any} */ (
		await executeDrawingAgentCommand(
			['distribute', 'horizontal', 'visible', 'new-0', 'new-1'],
			context
		)
	);
	assert.equal(result.gap, 170);
	assert.equal(context.editor.getSceneElements().find((element) => element.id === 'new-0').x, 290);
	const grouped = /** @type {any} */ (
		await executeDrawingAgentCommand(['group', 'visible', 'new-0'], context)
	);
	assert.equal(
		context.editor.getSceneElements().find((element) => element.id === 'visible').groupIds[0],
		grouped.grouped
	);
	await executeDrawingAgentCommand(['ungroup', 'visible'], context);
	assert.deepEqual(
		context.editor.getSceneElements().find((element) => element.id === 'visible').groupIds,
		[]
	);
	assert.equal(
		scenes.every((scene) => scene.captureUpdate === 'immediately'),
		true
	);
});

test('drawing assistant reorders layers and creates genuinely bound labeled connectors', async () => {
	const { context, scenes } = drawingContext();
	await executeDrawingAgentCommand(
		['add', JSON.stringify({ type: 'rectangle', x: 250, y: 30 })],
		context
	);
	await executeDrawingAgentCommand(['layer', 'front', 'visible'], context);
	assert.equal(context.editor.getSceneElements().at(-1).id, 'visible');
	await executeDrawingAgentCommand(['layer', 'back', 'visible'], context);
	assert.equal(context.editor.getSceneElements()[0].id, 'visible');
	const linked = /** @type {any} */ (
		await executeDrawingAgentCommand(['connect', 'visible', 'new-0', '--label', 'next'], context)
	);
	const arrow = context.editor.getSceneElements().find((element) => element.type === 'arrow');
	assert.equal(linked.label, 'next');
	assert.equal(arrow.startBinding.elementId, 'visible');
	assert.equal(arrow.endBinding.elementId, 'new-0');
	assert.ok(
		context.editor
			.getSceneElements()
			.find((element) => element.id === 'visible')
			.boundElements.some((entry) => entry.id === arrow.id)
	);
	assert.equal(scenes.at(-1).captureUpdate, 'immediately');
	await assert.rejects(
		() => executeDrawingAgentCommand(['connect', 'visible', 'visible'], context),
		/different/
	);
});

test('drawing assistant discovers branded templates and executes bounded design, resize, and export tools', async () => {
	const { context } = drawingContext();
	/** @type {any[]} */
	const calls = [];
	const designContext = {
		...context,
		insertDesign: async (
			/** @type {string} */ id,
			/** @type {Record<string, string>} */ options
		) => {
			calls.push(['insert', id, options]);
			return { frameId: 'frame-one' };
		},
		duplicateDesign: (/** @type {string} */ id, /** @type {string | undefined} */ name) => {
			calls.push(['duplicate', id, name]);
			return { frameId: 'frame-two' };
		},
		resizeDesign: (/** @type {string} */ id, /** @type {string} */ format) => {
			calls.push(['resize', id, format]);
			return { width: 1080, height: 1080 };
		},
		exportDesign: async (
			/** @type {string} */ id,
			/** @type {'png' | 'jpg' | 'svg'} */ format,
			/** @type {number} */ scale
		) => {
			calls.push(['export', id, format, scale]);
			return { exported: true };
		}
	};
	const catalog = /** @type {any} */ (await executeDrawingAgentCommand(['designs'], designContext));
	assert.equal(catalog.templates.length, 5);
	assert.equal(catalog.formats.length, 6);
	await executeDrawingAgentCommand(
		['design', 'insert', 'ls-podcast', '--headline', 'USEFUL HOOK'],
		designContext
	);
	await executeDrawingAgentCommand(
		['design', 'duplicate', 'frame-one', '--name', 'Version B'],
		designContext
	);
	await executeDrawingAgentCommand(['design', 'resize', 'frame-two', 'square'], designContext);
	await executeDrawingAgentCommand(['export', 'frame-two', 'png', '--scale', '2'], designContext);
	assert.deepEqual(calls, [
		['insert', 'ls-podcast', { headline: 'USEFUL HOOK' }],
		['duplicate', 'frame-one', 'Version B'],
		['resize', 'frame-two', 'square'],
		['export', 'frame-two', 'png', 2]
	]);
	await assert.rejects(
		() => executeDrawingAgentCommand(['export', 'frame-two', 'pdf'], designContext),
		/png, jpg, or svg/
	);
	await assert.rejects(
		() => executeDrawingAgentCommand(['export', 'frame-two', 'png', '--scale', '9'], designContext),
		/scale/
	);
	await assert.rejects(
		() =>
			executeDrawingAgentCommand(
				['design', 'insert', 'ls-podcast', '--url', 'https://example.com'],
				designContext
			),
		/supported/
	);
});
