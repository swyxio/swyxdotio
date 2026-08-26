import assert from 'node:assert/strict';
import test from 'node:test';
import {
	CREATIVE_DIRECTIONS,
	CREATIVE_FORMATS,
	buildCreativeArtboard,
	buildBlankArtboard,
	convertCreativeArtboard,
	fitCreativeText,
	adaptCreativeArtboard,
	gridCreativeSelection,
	createCanvasTextMeasurer
} from '../src/lib/draw-creative-layout.js';

const measureText = (text, size) => text.length * size * 0.55;
const people = [
	{ id: 'guest-a', name: 'Ada Li', fileId: 'ada-photo', width: 800, height: 1200 },
	{ id: 'guest-b', name: 'Sam Wu', fileId: 'sam-photo', width: 1200, height: 800 }
];
const logos = [
	{ id: 'ls', name: 'Latent Space', role: 'brand', fileId: 'official-ls', width: 144, height: 144 },
	{ id: 'acme', name: 'Exact Co.', fileId: 'official-acme', width: 600, height: 120 }
];
const recipe = { headline: 'A REAL BET', people, logos, kit: { brand: 'ls' }, measureText };
const role = (element) => element.customData?.creative?.role;

test('all directions and formats preserve exact frames, editable identities and real image proportions', () => {
	for (const format of CREATIVE_FORMATS) {
		for (const direction of CREATIVE_DIRECTIONS) {
			const result = buildCreativeArtboard({
				...recipe,
				format: format.id,
				direction: direction.id,
				x: 48,
				y: 80
			});
			const frame = result.elements.at(-1);
			assert.deepEqual(
				[frame.width, frame.height, frame.x, frame.y],
				[format.width, format.height, 48, 80]
			);
			assert.equal(
				new Set(result.elements.map((element) => element.id)).size,
				result.elements.length
			);
			assert.equal(frame.children.length, result.elements.length - 1);
			assert.ok(result.elements.slice(0, -1).every((element) => element.frameId === frame.id));
			assert.equal(result.elements.filter((element) => element.type === 'frame').length, 1);
			assert.equal(
				result.elements.find((element) => role(element) === 'headline').originalText,
				recipe.headline
			);
			assert.deepEqual(
				result.elements
					.filter((element) => role(element) === 'person-name')
					.map((element) => element.originalText),
				['Ada Li', 'Sam Wu']
			);
			const images = result.elements.filter((element) => element.type === 'image');
			assert.deepEqual(
				images.map((element) => element.fileId).sort(),
				['ada-photo', 'sam-photo', 'official-ls', 'official-acme'].sort()
			);
			for (const image of images) {
				const asset = [...people, ...logos].find((asset) => asset.fileId === image.fileId);
				assert.ok(Math.abs(image.width / image.height - asset.width / asset.height) < 0.000001);
			}
			assert.ok(!result.warnings.some((warning) => warning.code === 'outside_artboard'));
			assert.ok(!result.warnings.some((warning) => warning.code === 'timestamp_overlap'));
		}
	}
});

test('directions have distinct spatial hierarchy rather than palette swaps', () => {
	for (const format of CREATIVE_FORMATS) {
		for (const cast of format.id === 'youtube' ? [people, []] : [[]]) {
			const placements = CREATIVE_DIRECTIONS.map(({ id }) => {
				const result = buildCreativeArtboard({
					...recipe,
					people: cast,
					format: format.id,
					direction: id
				});
				const hook = result.elements.find((element) => role(element) === 'headline');
				assert.equal(hook.originalText, recipe.headline);
				assert.equal(
					result.elements.filter((element) => role(element) === 'portrait').length,
					cast.length
				);
				assert.deepEqual(
					result.elements
						.filter((element) => ['brand-logo', 'company-logo'].includes(role(element)))
						.map((element) => element.fileId),
					logos.map((logo) => logo.fileId)
				);
				assert.ok(
					!result.warnings.some((warning) =>
						['outside_artboard', 'timestamp_overlap', 'text_overflow'].includes(warning.code)
					)
				);
				return result.elements
					.filter((element) => ['headline', 'portrait'].includes(role(element)))
					.map(({ x, y, width, height, fontSize }) => [x, y, width, height, fontSize]);
			});
			assert.equal(
				new Set(placements.map((placement) => JSON.stringify(placement))).size,
				4,
				`${format.id}, ${cast.length} portraits`
			);
		}
	}
});

test('neutral AIE composition does not import the portrait-card style or episode facts', () => {
	const result = buildCreativeArtboard({ kit: { brand: 'aie' }, measureText });
	assert.equal(result.elements[0].backgroundColor, '#ffffff');
	assert.equal(
		result.elements.filter((element) => element.type === 'image' || element.type === 'text').length,
		0
	);
	assert.ok(result.warnings.some((warning) => warning.code === 'aie_unapproved'));
	const blank = buildBlankArtboard({ x: 0, y: 0 });
	assert.equal(blank.elements.length, 2);
	assert.equal(blank.elements[0].customData.creative.role, 'background');
	assert.deepEqual([blank.format.width, blank.format.height], [1280, 720]);
});

test('LS logo stays intact in the upper right; FDE label is opt-in', () => {
	const ls = buildCreativeArtboard(recipe);
	const logo = ls.elements.find((element) => role(element) === 'brand-logo');
	assert.ok(logo.x > 1050 && logo.y < 120);
	assert.equal(logo.width, logo.height);
	assert.ok(!ls.elements.some((element) => element.text === 'FDE'));
	const fde = buildCreativeArtboard({ ...recipe, kit: { brand: 'fde' } });
	assert.ok(fde.elements.some((element) => element.text === 'FDE'));
	const missing = buildCreativeArtboard({ ...recipe, logos: [] });
	assert.ok(missing.warnings.some((warning) => warning.code === 'missing_brand_logo'));
	assert.ok(!missing.elements.some((element) => role(element) === 'brand-logo'));
});

test('missing photos/logos use exact supplied names, never fake people or marks', () => {
	const result = buildCreativeArtboard({
		headline: 'EXACT HOOK',
		people: [{ id: 'a', name: 'Zoë / 李' }],
		logos: [{ id: 'company', name: 'Exact Company' }],
		measureText
	});
	assert.equal(result.elements.filter((element) => element.type === 'image').length, 0);
	assert.ok(result.elements.some((element) => element.originalText === 'Zoë / 李'));
	assert.ok(result.elements.some((element) => element.originalText === 'Exact Company'));
	assert.ok(result.warnings.some((warning) => warning.code === 'missing_portrait'));
});

test('text fitting uses injected measured widths and preserves all copy at a readable minimum', () => {
	const fitted = fitCreativeText({
		text: 'LONG WORDS FIT',
		width: 200,
		height: 120,
		minFontSize: 24,
		maxFontSize: 50,
		measureText
	});
	assert.ok(!fitted.overflow);
	assert.equal(fitted.originalText, 'LONG WORDS FIT');
	assert.equal(fitted.text.replaceAll('\n', ' '), 'LONG WORDS FIT');
	assert.equal(fitted.measurement, 'measured');
	const long = 'SUPERCALIFRAGILISTICEXPIALIDOCIOUS '.repeat(12).trim();
	const overflow = fitCreativeText({
		text: long,
		width: 160,
		height: 90,
		minFontSize: 28,
		maxFontSize: 90,
		measureText
	});
	assert.equal(overflow.fontSize, 28);
	assert.equal(overflow.originalText, long);
	assert.equal(overflow.text.replaceAll('\n', ' '), long);
	assert.ok(overflow.overflow);
	assert.equal(overflow.warnings[0].code, 'text_overflow');
	const native = { font: '', measureText: () => ({ width: 123 }) };
	assert.equal(createCanvasTextMeasurer(native)('hello', 32, 7), 123);
	assert.match(native.font, /Lilita One/);
	assert.throws(() => buildCreativeArtboard({ kit: { fontFamily: 100 } }), /not supported/);
});

test('large casts retain every requested asset and visibly warn about density', () => {
	const cast = Array.from({ length: 12 }, (_, i) => ({
		id: `p-${i}`,
		name: `Guest ${i}`,
		fileId: `photo-${i}`,
		width: 100,
		height: 150
	}));
	const result = buildCreativeArtboard({ ...recipe, people: cast, direction: 'portrait-led' });
	assert.equal(
		result.elements.filter((element) => role(element) === 'portrait').length,
		cast.length
	);
	assert.equal(
		result.elements.filter((element) => role(element) === 'person-name').length,
		cast.length
	);
	assert.ok(
		result.warnings.some(
			(warning) => warning.code === 'small_portrait' || warning.code === 'text_overflow'
		)
	);
	assert.throws(
		() => buildCreativeArtboard({ ...recipe, people: [people[0], people[0]] }),
		/unique asset ID/
	);
	assert.throws(
		() => buildCreativeArtboard({ ...recipe, people: [{ ...people[0], width: undefined }] }),
		/original width/
	);
});

test('conversion repairs Excalidraw zero-origin frame bounds without losing native membership', () => {
	const artboard = buildBlankArtboard({ x: 0, y: 0 });
	const converted = convertCreativeArtboard(artboard, (elements, options) => {
		assert.equal(options.regenerateIds, false);
		return elements.map((element) =>
			element.type === 'frame' ? { ...element, x: -10, y: -10 } : element
		);
	});
	assert.equal(converted.at(-1).x, 0);
	assert.equal(converted.at(-1).y, 0);
	assert.equal(converted[0].frameId, converted.at(-1).id);
});

test('intelligent adaptation reflows live text and assets into a new frame, preserving the original', () => {
	const original = buildCreativeArtboard(recipe);
	const text = original.elements.find((element) => role(element) === 'headline');
	text.text = 'EDITED LIVE HOOK';
	text.originalText = 'EDITED LIVE HOOK';
	const photo = original.elements.find((element) => role(element) === 'portrait');
	photo.fileId = 'replacement-photo';
	const snapshot = JSON.stringify(original.elements);
	const square = adaptCreativeArtboard({
		elements: original.elements,
		frameId: original.frameId,
		format: 'square',
		measureText
	});
	assert.equal(JSON.stringify(original.elements), snapshot);
	assert.notEqual(square.frameId, original.frameId);
	assert.equal(square.format.width, 1080);
	assert.ok(square.elements.some((element) => element.originalText === 'EDITED LIVE HOOK'));
	assert.ok(square.elements.some((element) => element.fileId === 'replacement-photo'));
	assert.deepEqual(
		square.elements
			.filter((element) => element.type === 'image')
			.map((element) => element.fileId)
			.sort(),
		original.elements
			.filter((element) => element.type === 'image')
			.map((element) => element.fileId)
			.sort()
	);
	const newText = square.elements.find((element) => role(element) === 'headline');
	const newPhoto = square.elements.find((element) => role(element) === 'portrait');
	assert.ok(newPhoto.y > newText.y, 'square stacks portrait below hook');
	assert.ok(photo.x > text.x, 'landscape puts portrait beside hook');
	const extra = { id: 'manual', type: 'text', text: 'Do not drop me', frameId: original.frameId };
	assert.throws(
		() =>
			adaptCreativeArtboard({
				elements: [...original.elements, extra],
				frameId: original.frameId,
				format: 'story'
			}),
		/manually added layers/
	);
	assert.throws(
		() =>
			adaptCreativeArtboard({
				elements: [...original.elements, { ...photo, id: 'duplicate-photo' }],
				frameId: original.frameId,
				format: 'story'
			}),
		/Duplicated semantic layers/
	);
	assert.ok(square.warnings.some((warning) => warning.code === 'replacement_aspect_check'));
});

test('grid removes selected independent overlaps without changing assets or other artwork', () => {
	const elements = Array.from({ length: 4 }, (_, index) => ({
		id: `${index}`,
		type: 'image',
		fileId: `file-${index}`,
		x: 10,
		y: 20,
		width: 200,
		height: 100
	}));
	const result = gridCreativeSelection({
		elements,
		elementIds: ['0', '1', '2'],
		columns: 2,
		gap: 24
	});
	assert.deepEqual(
		result.slice(0, 3).map(({ x, y }) => [x, y]),
		[
			[10, 20],
			[234, 20],
			[10, 144]
		]
	);
	assert.equal(elements[1].x, 10);
	assert.equal(result[3], elements[3]);
	assert.throws(
		() =>
			gridCreativeSelection({
				elements: [{ ...elements[0], groupIds: ['group'] }],
				elementIds: ['0']
			}),
		/independent/
	);
});
