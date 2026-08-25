import assert from 'node:assert/strict';
import test from 'node:test';

import {
	createDrawUiComponent,
	DRAW_UI_COMPONENT_CATEGORIES,
	DRAW_UI_COMPONENTS
} from '../src/lib/draw-ui-components.js';

const SUPPORTED_ELEMENT_TYPES = new Set(['arrow', 'ellipse', 'rectangle', 'text']);

test('UI component catalog includes complete searchable wireframing categories', () => {
	assert.deepEqual(
		DRAW_UI_COMPONENT_CATEGORIES.map(({ id }) => id),
		['forms', 'content', 'data', 'navigation', 'layouts']
	);
	assert.ok(DRAW_UI_COMPONENTS.length >= 25);
	assert.equal(new Set(DRAW_UI_COMPONENTS.map(({ id }) => id)).size, DRAW_UI_COMPONENTS.length);

	for (const component of DRAW_UI_COMPONENTS) {
		assert.ok(component.title.length > 2, `${component.id} needs a searchable title`);
		assert.equal(component.label, component.title);
		assert.ok(component.description.length > 15, `${component.id} needs a helpful description`);
		assert.ok(component.keywords.length >= 2, `${component.id} needs searchable aliases`);
		assert.ok(DRAW_UI_COMPONENT_CATEGORIES.some(({ id }) => id === component.category));
		assert.equal(typeof component.create, 'function');
		assert.equal(typeof component.createShapes, 'function');
	}
});

test('every wireframe component creates editable hand-drawn native Excalidraw skeletons', () => {
	for (const component of DRAW_UI_COMPONENTS) {
		const shapes = component.createShapes();
		const identities = new Set();
		assert.ok(shapes.length >= 2, `${component.id} needs visible editable parts`);
		assert.ok(
			shapes.some(({ type }) => type === 'text'),
			`${component.id} needs editable labels`
		);

		for (const shape of shapes) {
			assert.match(shape.id, /^ui-[a-z0-9]+-[a-z0-9]+$/);
			assert.equal(identities.has(shape.id), false, `${component.id} has duplicate shape IDs`);
			identities.add(shape.id);
			assert.ok(SUPPORTED_ELEMENT_TYPES.has(shape.type));
			assert.ok(Number.isFinite(shape.x) && Number.isFinite(shape.y));
			assert.match(shape.strokeColor, /^#[a-f\d]{6}$/i);
			assert.ok(shape.roughness >= 1, `${component.id} must have a hand-drawn aesthetic`);
			assert.ok(shape.strokeWidth >= 1);

			if (shape.type === 'rectangle' || shape.type === 'ellipse') {
				assert.ok(shape.width > 0 && shape.height > 0);
				assert.equal(shape.fillStyle, 'solid');
				assert.ok(shape.backgroundColor);
			}
			if (shape.type === 'arrow') {
				assert.deepEqual(shape.points[0], [0, 0]);
				assert.equal(shape.endArrowhead, null);
			}
			if (shape.type === 'text') {
				assert.ok(shape.text.length > 0);
				assert.equal(shape.fontFamily, 5);
				assert.ok(shape.fontSize >= 14 && shape.fontSize <= 24);
			}
		}
	}
});

test('components insert at requested coordinates and always generate fresh identities', () => {
	for (const component of DRAW_UI_COMPONENTS) {
		const origin = component.create(0, 0);
		const positioned = createDrawUiComponent(component.id, 320, -90);
		assert.equal(positioned.length, origin.length);

		for (let index = 0; index < positioned.length; index += 1) {
			assert.equal(positioned[index].x, origin[index].x + 320);
			assert.equal(positioned[index].y, origin[index].y - 90);
			assert.notEqual(positioned[index].id, origin[index].id);
		}
	}
	assert.throws(() => createDrawUiComponent('missing-component'), /Unknown drawing UI component/);
});

test('larger screen blocks preserve meaningful editable placeholder content', () => {
	const labelsFor = (id) => createDrawUiComponent(id).map(({ text }) => text ?? '');

	assert.ok(labelsFor('hero-section').includes('Build something people love'));
	assert.ok(labelsFor('pricing-card').includes('$29 / month'));
	assert.ok(labelsFor('chat-panel').includes('I have a question about pricing.'));
	assert.ok(labelsFor('kanban-board').includes('Build prototype'));
	assert.ok(labelsFor('login-form').includes('you@example.com'));
	assert.ok(labelsFor('data-table').includes('Dashboard refresh'));
});
