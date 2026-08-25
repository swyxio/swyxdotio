import assert from 'node:assert/strict';
import test from 'node:test';

import { arrowShapeProps, geoShapeProps, textShapeProps } from '@tldraw/tlschema';

import { DRAW_PRESETS } from '../src/lib/draw-presets.js';

const validators = {
	arrow: arrowShapeProps,
	geo: geoShapeProps,
	text: textShapeProps
};

test('drawing presets expose the complete named visual-thinking catalog', () => {
	assert.deepEqual(
		DRAW_PRESETS.map(({ id }) => id),
		[
			'decision-matrix',
			'axis-chart',
			'growth-curves',
			'adoption-curve',
			'career-ladder',
			'funnel',
			'venn-diagram',
			'flywheel',
			'comparison-cards'
		]
	);

	for (const preset of DRAW_PRESETS) {
		assert.ok(preset.label.length > 3, `${preset.id} needs a descriptive label`);
		assert.ok(preset.description.length > 20, `${preset.id} needs helpful preview text`);
		assert.equal(typeof preset.createShapes, 'function');
	}
});

test('every preset generates independently editable valid native tldraw shapes', () => {
	for (const preset of DRAW_PRESETS) {
		const shapes = preset.createShapes();
		const identifiers = new Set();

		assert.ok(shapes.length >= 6, `${preset.id} must contain a complete editable diagram`);

		for (const shape of shapes) {
			assert.match(shape.id, /^shape:[a-zA-Z0-9_-]+$/, `${preset.id} has an invalid shape ID`);
			assert.equal(identifiers.has(shape.id), false, `${preset.id} reuses ${shape.id}`);
			identifiers.add(shape.id);
			assert.ok(Number.isFinite(shape.x) && shape.x >= 0, `${preset.id} has an invalid x`);
			assert.ok(Number.isFinite(shape.y) && shape.y >= 0, `${preset.id} has an invalid y`);
			assert.ok(
				Object.hasOwn(validators, shape.type),
				`${preset.id} has unsupported ${shape.type}`
			);

			const shapeValidators = validators[shape.type];
			for (const [property, value] of Object.entries(shape.props)) {
				assert.ok(
					Object.hasOwn(shapeValidators, property),
					`${preset.id} uses unsupported ${shape.type}.${property}`
				);
				assert.doesNotThrow(
					() => shapeValidators[property].validate(value),
					`${preset.id} has invalid ${shape.type}.${property}`
				);
			}

			if (shape.type === 'geo') {
				assert.ok(shape.props.w > 0 && shape.props.h > 0, `${preset.id} has an empty shape`);
			}
			if (shape.type === 'arrow') {
				assert.ok(
					shape.props.end.x !== shape.props.start.x || shape.props.end.y !== shape.props.start.y,
					`${preset.id} has an empty arrow`
				);
			}
		}
	}
});

test('preset insertions always receive fresh shape identities', () => {
	for (const preset of DRAW_PRESETS) {
		const first = new Set(preset.createShapes().map(({ id }) => id));
		const second = preset.createShapes().map(({ id }) => id);
		assert.ok(
			second.every((id) => !first.has(id)),
			`${preset.id} cannot be safely inserted more than once`
		);
	}
});

test('preset diagrams contain editable readable labels and structure', () => {
	for (const preset of DRAW_PRESETS) {
		const shapes = preset.createShapes();
		const textShapes = shapes.filter(({ type }) => type === 'text');
		const diagramShapes = shapes.filter(({ type }) => type !== 'text');

		assert.ok(textShapes.length >= 2, `${preset.id} is missing its heading and caption`);
		assert.ok(diagramShapes.length >= 3, `${preset.id} is missing its visual structure`);
		assert.ok(
			textShapes.every(({ props }) => props.richText?.type === 'doc'),
			`${preset.id} does not use editable rich-text labels`
		);
	}
});
