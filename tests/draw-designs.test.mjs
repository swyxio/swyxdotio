import assert from 'node:assert/strict';
import test from 'node:test';

import {
	createDrawingDesign,
	DRAW_AGENT_WORKFLOWS,
	DRAW_DESIGN_FORMATS,
	DRAW_DESIGN_TEMPLATES,
	getDrawingDesignFormat
} from '../src/lib/draw-designs.js';

test('design templates cover observed Canva thumbnail, speaker, banner, and slide workflows', () => {
	assert.deepEqual(
		DRAW_DESIGN_TEMPLATES.map((design) => design.id),
		['ls-podcast', 'fde-decision', 'aie-speaker', 'blog-launch', 'keynote-slide']
	);
	assert.deepEqual(
		DRAW_DESIGN_FORMATS.map(({ id, width, height }) => [id, width, height]),
		[
			['youtube', 1280, 720],
			['social', 1200, 630],
			['square', 1080, 1080],
			['portrait', 1080, 1350],
			['story', 1080, 1920],
			['slide', 1920, 1080]
		]
	);
	assert.equal(new Set(DRAW_AGENT_WORKFLOWS.map((task) => task.id)).size, 6);
	assert.ok(DRAW_AGENT_WORKFLOWS.every((task) => task.prompt.length > 100));
});

test('each design creates one exact-size native frame with independently editable unique children', () => {
	for (const template of DRAW_DESIGN_TEMPLATES) {
		const result = createDrawingDesign(template.id, { x: 200, y: 40 });
		const frame = result.elements.at(-1);
		const format = getDrawingDesignFormat(template.format);
		assert.equal(frame.type, 'frame');
		assert.equal(frame.width, format?.width);
		assert.equal(frame.height, format?.height);
		assert.equal(frame.x, 200);
		assert.equal(frame.y, 40);
		assert.equal(frame.children.length, result.elements.length - 1);
		assert.equal(
			new Set(result.elements.map((element) => element.id)).size,
			result.elements.length
		);
		assert.ok(result.elements.some((element) => element.type === 'text'));
		assert.ok(result.elements.some((element) => element.type === 'rectangle'));
	}
});

test('Latent Space thumbnails use the official supplied logo and preserve YouTube timestamp clearance', () => {
	for (const id of ['ls-podcast', 'fde-decision']) {
		const result = createDrawingDesign(id, {
			logoFileId: 'official-logo',
			headline: 'REAL EDITABLE HOOK',
			companies: 'ACME   ·   EXAMPLE'
		});
		const logo = result.elements.find((element) => element.type === 'image');
		assert.equal(logo?.fileId, 'official-logo');
		assert.equal(logo?.width, logo?.height);
		assert.ok(result.elements.some((element) => element.text === 'REAL EDITABLE HOOK'));
		assert.ok(result.elements.some((element) => element.text === 'ACME   ·   EXAMPLE'));
		const unsafeEssential = result.elements.filter(
			(element) =>
				(element.type === 'text' || element.type === 'image') &&
				element.x >= 1050 &&
				element.y >= 620
		);
		assert.deepEqual(unsafeEssential, []);
	}
});

test('designs reject unknown templates without inventing people, identities, or companies', () => {
	assert.throws(() => createDrawingDesign('invented'), /available design templates/);
	const speaker = createDrawingDesign('aie-speaker');
	assert.ok(speaker.elements.some((element) => element.text === 'SPEAKER\nNAME'));
	assert.ok(speaker.elements.some((element) => element.text === 'The talk title goes here'));
});
