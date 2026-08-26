import assert from 'node:assert/strict';
import test from 'node:test';

import { DRAW_PRESETS } from '../src/lib/draw-presets.js';

const SUPPORTED_ELEMENT_TYPES = new Set(['arrow', 'ellipse', 'rectangle', 'text']);
const HAND_DRAWN_FONT = 5;

test('drawing presets expose the complete named visual-thinking catalog', () => {
	assert.deepEqual(
		DRAW_PRESETS.map(({ id }) => id),
		[
			'architecture-comparison',
			'agent-tool-loop',
			'argument-map',
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

test('essay starters encode comparisons, feedback and evidence with editable bound relationships', () => {
	const diagrams = Object.fromEntries(
		DRAW_PRESETS.slice(0, 3).map((preset) => [preset.id, preset.createShapes()])
	);
	for (const shapes of Object.values(diagrams)) {
		const ids = new Set(shapes.map((shape) => shape.id));
		for (const edge of shapes.filter((shape) => shape.type === 'arrow')) {
			assert.ok(ids.has(edge.start?.id));
			assert.ok(ids.has(edge.end?.id));
			assert.ok(edge.label?.text);
		}
		assert.ok(shapes.every((shape) => shape.roughness === 1));
	}
	const labels = (id) =>
		diagrams[id].map((shape) => shape.text ?? shape.label?.text ?? '').join('\n');
	assert.equal(
		diagrams['architecture-comparison'].filter((shape) => shape.label?.text === 'Question').length,
		2
	);
	assert.match(labels('architecture-comparison'), /not a benchmark/);
	assert.match(labels('agent-tool-loop'), /feedback/);
	assert.match(labels('agent-tool-loop'), /done \/ budget \/ error/);
	assert.match(labels('argument-map'), /unknown/);
	assert.ok(
		diagrams['argument-map'].some(
			(shape) => shape.label?.text === 'qualifies' && shape.strokeStyle === 'dashed'
		)
	);
});

test('every preset generates independently editable native Excalidraw element skeletons', () => {
	for (const preset of DRAW_PRESETS) {
		const shapes = preset.createShapes();
		const identifiers = new Set();

		assert.ok(shapes.length >= 6, `${preset.id} must contain a complete editable diagram`);

		for (const shape of shapes) {
			assert.match(shape.id, /^visual-[a-z0-9]+-[a-z0-9]+$/, `${preset.id} has an invalid ID`);
			assert.equal(identifiers.has(shape.id), false, `${preset.id} reuses ${shape.id}`);
			identifiers.add(shape.id);
			assert.ok(Number.isFinite(shape.x) && shape.x >= 0, `${preset.id} has an invalid x`);
			assert.ok(Number.isFinite(shape.y) && shape.y >= 0, `${preset.id} has an invalid y`);
			assert.ok(
				SUPPORTED_ELEMENT_TYPES.has(shape.type),
				`${preset.id} has unsupported ${shape.type}`
			);
			assert.match(shape.strokeColor, /^#[a-f\d]{6}$/i, `${preset.id} has an invalid color`);
			assert.ok(shape.strokeWidth > 0, `${preset.id} has an invisible ${shape.type}`);
			assert.ok(shape.roughness >= 1, `${preset.id} is missing its hand-drawn aesthetic`);
			assert.ok(['solid', 'dashed'].includes(shape.strokeStyle));

			if (shape.type === 'rectangle' || shape.type === 'ellipse') {
				assert.ok(shape.width > 0 && shape.height > 0, `${preset.id} has an empty shape`);
				assert.ok(['hachure', 'solid'].includes(shape.fillStyle));
				assert.ok(shape.backgroundColor.length > 0);
				if (shape.label) {
					assert.ok(shape.label.text.length > 0, `${preset.id} has an empty bound label`);
					assert.equal(shape.label.fontFamily, HAND_DRAWN_FONT);
				}
			}
			if (shape.type === 'arrow') {
				assert.ok(shape.points.length >= 2, `${preset.id} has an empty arrow`);
				assert.deepEqual(shape.points[0], [0, 0]);
				const endpoint = shape.points.at(-1);
				assert.ok(endpoint[0] !== 0 || endpoint[1] !== 0, `${preset.id} has an empty arrow`);
				assert.ok(shape.endArrowhead === null || shape.endArrowhead === 'arrow');
			}
			if (shape.type === 'text') {
				assert.ok(shape.text.length > 0, `${preset.id} has an empty text label`);
				assert.equal(shape.fontFamily, HAND_DRAWN_FONT);
				assert.ok(shape.fontSize >= 16, `${preset.id} has unreadable text`);
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
		assert.ok(textShapes.every(({ text }) => text.length > 0));
	}
});

test('priority quadrants and strategy scatterplot retain their meaningful placeholder labels', () => {
	const matrix = DRAW_PRESETS.find(({ id }) => id === 'decision-matrix');
	const scatterplot = DRAW_PRESETS.find(({ id }) => id === 'axis-chart');
	assert.ok(matrix);
	assert.ok(scatterplot);

	const matrixLabels = matrix.createShapes().map((shape) => shape.text ?? shape.label?.text ?? '');
	const chartLabels = scatterplot.createShapes().map((shape) => shape.text ?? '');

	assert.ok(matrixLabels.some((label) => label.startsWith('Act now')));
	assert.ok(matrixLabels.some((label) => label.startsWith('Plan')));
	assert.ok(chartLabels.includes('Strategic fit'));
	assert.ok(chartLabels.includes('Effort'));
});
