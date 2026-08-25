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
			shapes.map((shape, index) => ({ id: `new-${index}`, width: 100, height: 40, ...shape })),
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
