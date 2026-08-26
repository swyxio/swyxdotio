import assert from 'node:assert/strict';
import test from 'node:test';

import {
	createDrawingDesign,
	DRAW_AGENT_WORKFLOWS,
	DRAW_DESIGN_FORMATS,
	DRAW_DESIGN_DEMO_PHOTO,
	DRAW_DESIGN_TEMPLATES,
	getDrawingDesignFormat
} from '../src/lib/draw-designs.js';

test('design templates cover observed Canva thumbnail, speaker, banner, and slide workflows', () => {
	assert.deepEqual(
		DRAW_DESIGN_TEMPLATES.map((design) => design.id),
		[
			'ls-podcast',
			'fde-decision',
			'thumbnail-evidence',
			'aie-speaker',
			'blog-launch',
			'keynote-slide'
		]
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
	for (const id of ['ls-podcast', 'fde-decision', 'thumbnail-evidence']) {
		const result = createDrawingDesign(id, {
			logoFileId: 'official-logo',
			headline: 'REAL EDITABLE HOOK',
			companies: 'ACME   ·   EXAMPLE'
		});
		const logo = result.elements.find((element) => element.fileId === 'official-logo');
		assert.equal(logo?.fileId, 'official-logo');
		assert.equal(logo?.width, logo?.height);
		assert.ok(
			result.elements.some((element) => element.text?.replace(/\n/g, ' ') === 'REAL EDITABLE HOOK')
		);
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

test('custom thumbnail hooks fit their headline regions without changing the guest photo', () => {
	for (const id of ['ls-podcast', 'fde-decision', 'thumbnail-evidence']) {
		const result = createDrawingDesign(id, { headline: 'HARNESS ENGINEERING' });
		const headline = result.elements.find((e) => e.customData?.designRole === 'headline');
		assert.equal(headline.text.replaceAll('\n', ' '), 'HARNESS ENGINEERING');
		assert.ok(headline.fontSize > 25);
		const portrait = result.elements.find((e) => e.customData?.designRole === 'guest-photo');
		assert.equal(portrait.fileId, DRAW_DESIGN_DEMO_PHOTO.id);
	}
	const lengthy = createDrawingDesign('ls-podcast', {
		headline: 'BUILDING RELIABLE PRODUCTION AGENT ENGINEERING WORKFLOWS'
	});
	const headline = lengthy.elements.find((e) => e.customData?.designRole === 'headline');
	assert.ok(headline.text.split('\n').length * headline.fontSize * 1.05 <= 435);
});

test('designs reject unknown templates without inventing people, identities, or companies', () => {
	assert.throws(() => createDrawingDesign('invented'), /available design templates/);
	const speaker = createDrawingDesign('aie-speaker');
	assert.ok(speaker.elements.some((element) => element.text === 'SPEAKER\nNAME'));
	assert.ok(speaker.elements.some((element) => element.text === 'The talk title goes here'));
});

test('photo-led starters preserve actual photo bytes and editable crop geometry, with no invented guests or companies', () => {
	for (const id of ['ls-podcast', 'fde-decision', 'thumbnail-evidence']) {
		const result = createDrawingDesign(id, {
			photo: { fileId: 'my-real-guest', width: 800, height: 1200 }
		});
		const photos = result.elements.filter((e) => e.customData?.designRole === 'guest-photo');
		assert.equal(photos.length, 1);
		assert.equal(photos[0].fileId, 'my-real-guest');
		assert.equal(photos[0].crop.naturalWidth, 800);
		assert.equal(photos[0].crop.naturalHeight, 1200);
		assert.ok(
			Math.abs(photos[0].width / photos[0].height - photos[0].crop.width / photos[0].crop.height) <
				0.00001
		);
		assert.ok(photos[0].crop.x >= 0 && photos[0].crop.y >= 0);
		assert.equal(
			result.elements.some((e) =>
				/COMPANY ONE|YOUR SHARPEST|DROP GUEST|CONTEXT STACK/.test(e.text ?? '')
			),
			false
		);
		assert.equal(
			result.elements.some((e) => e.strokeStyle === 'dashed'),
			false
		);
	}
	assert.throws(
		() => createDrawingDesign('ls-podcast', { photo: { fileId: 'bad', width: 0, height: 300 } }),
		/valid dimensions/
	);
});
