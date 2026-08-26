import assert from 'node:assert/strict';
import test from 'node:test';
import {
	createThumbnailRecipes,
	restoreThumbnailRecipe,
	validateThumbnailInput,
	getThumbnailModelSettings,
	DEFAULT_THUMBNAIL_MODEL_ID,
	MAX_THUMBNAIL_REFERENCES,
	MAX_THUMBNAIL_CONTEXT_LENGTH,
	MAX_THUMBNAIL_FEEDBACK_LENGTH
} from '../src/lib/draw-thumbnail-workflow.js';
import {
	getDrawGenerationModel,
	MAX_DRAW_GENERATION_PROMPT_LENGTH
} from '../src/lib/draw-generation-models.js';

const image = (label, role = 'inspiration', content = 'YQ==') => ({
	dataURL: `data:image/png;base64,${content}`,
	mimeType: 'image/png',
	label,
	role,
	assetId: `asset-${label}`
});
const parent = {
	id: 'parent-generation',
	dataURL: 'data:image/png;base64,Yg==',
	mimeType: 'image/png',
	prompt: 'original prompt',
	modelLabel: 'GPT Image 2',
	createdAt: 1
};
const input = (overrides = {}) => ({
	contextText: 'A conversation about reliable agents. Include Alice at Acme and Bob at Beta.',
	references: [
		image('A composition I like'),
		image('Alice · Acme', 'keep'),
		image('Bob · Beta', 'keep')
	],
	...overrides
});

test('four actual shared recipes explore distinct visual concepts and retain full source context', () => {
	let id = 0;
	const source = input({
		contextText:
			'Keep the exact hook “BUILD RELIABLE AGENTS”.\nReference notes: https://youtu.be/dQw4w9WgXcQ\nDo not imply this link was watched.',
		idFactory: () => `recipe-${++id}`
	});
	const before = structuredClone({ ...source, idFactory: undefined });
	const recipes = createThumbnailRecipes(source);
	assert.equal(recipes.length, 4);
	assert.deepEqual(
		recipes.map((recipe) => recipe.id),
		['recipe-1', 'recipe-2', 'recipe-3', 'recipe-4']
	);
	assert.equal(new Set(recipes.map((recipe) => recipe.prompt)).size, 4);
	assert.deepEqual(
		recipes.map((recipe) => recipe.context.thumbnail.directionId),
		['editorial', 'visual-idea', 'contrast', 'type-led']
	);
	for (const recipe of recipes) {
		assert.equal(recipe.modelId, DEFAULT_THUMBNAIL_MODEL_ID);
		assert.equal(recipe.adapterId, 'fal');
		assert.deepEqual(recipe.modelSettings.image_size, { width: 1280, height: 720 });
		assert.deepEqual(recipe.referenceImages, source.references);
		assert.equal(recipe.parentGenerationId, undefined);
		assert.equal(recipe.context.thumbnail.sourceContext, source.contextText);
		assert.equal(recipe.context.thumbnail.linkCoverage, 'unread');
		assert.equal(recipe.context.thumbnail.sourceReferenceCount, 3);
		assert.deepEqual(recipe.context.thumbnail.keep, [
			{ referenceIndex: 2, label: 'Alice · Acme' },
			{ referenceIndex: 3, label: 'Bob · Beta' }
		]);
		assert.ok(recipe.prompt.includes(JSON.stringify(source.contextText)));
		assert.match(recipe.prompt, /never claim to have read or watched a URL/);
		assert.match(recipe.prompt, /lower-right duration badge/);
		assert.ok(recipe.prompt.length <= MAX_DRAW_GENERATION_PROMPT_LENGTH);
	}
	assert.deepEqual({ ...source, idFactory: undefined }, before);
	// A shared job or subsequent draft edit cannot rewrite siblings or caller-owned inputs.
	recipes[0].referenceImages[1].label = 'Changed';
	recipes[0].modelSettings.image_size.width = 1;
	assert.equal(recipes[1].referenceImages[1].label, 'Alice · Acme');
	assert.equal(source.references[1].label, 'Alice · Acme');
	assert.equal(recipes[1].modelSettings.image_size.width, 1280);
});

test('feedback always makes four new parent-linked recipes with the ordered originals and complete keep-list', () => {
	const source = input({
		parentGeneration: parent,
		feedbackText: 'Less busy. Keep both people, both companies and the exact hook.'
	});
	const recipes = createThumbnailRecipes(source);
	assert.equal(recipes.length, 4);
	assert.equal(new Set(recipes.map((recipe) => recipe.context.thumbnail.directionId)).size, 4);
	for (const recipe of recipes) {
		assert.equal(recipe.parentGenerationId, parent.id);
		assert.deepEqual(recipe.referenceImages.slice(0, 3), source.references);
		assert.deepEqual(recipe.referenceImages[3], {
			dataURL: parent.dataURL,
			mimeType: parent.mimeType,
			generationId: parent.id,
			role: 'parent',
			label: 'Selected thumbnail to refine'
		});
		assert.equal(recipe.context.thumbnail.feedback, source.feedbackText);
		assert.equal(recipe.context.thumbnail.keep.length, 2);
		assert.match(recipe.prompt, /image 4 is the selected parent thumbnail/);
		assert.match(recipe.prompt, /unless the user's feedback explicitly requests a change/);
		assert.ok(recipe.prompt.includes(JSON.stringify(source.feedbackText)));
	}
	assert.equal(parent.prompt, 'original prompt');
});

test('fifteen original references plus one parent fit GPT Image 2; the sixteenth original is never sliced away', () => {
	const references = Array.from({ length: MAX_THUMBNAIL_REFERENCES }, (_, index) =>
		image(`Guest ${index + 1}`, 'keep')
	);
	const recipes = createThumbnailRecipes(input({ references, parentGeneration: parent }));
	assert.equal(recipes[0].referenceImages.length, 16);
	assert.equal(recipes[0].referenceImages[14].label, 'Guest 15');
	assert.equal(recipes[0].referenceImages[15].role, 'parent');
	assert.equal(recipes[0].context.thumbnail.keep.length, 15);
	assert.throws(
		() =>
			createThumbnailRecipes(
				input({ references: [...references, image('Guest 16')], parentGeneration: parent })
			),
		/at most 15/
	);
});

test('model transport capabilities reject unsupported references before any job can be built', () => {
	assert.throws(
		() => createThumbnailRecipes(input({ modelId: 'reve-2-1' })),
		/accepts 1 reference image; 3 are attached/
	);
	assert.throws(
		() => createThumbnailRecipes(input({ modelId: 'grok-imagine-2', parentGeneration: parent })),
		/accepts 3 reference images; 4 are attached/
	);
	assert.throws(
		() => createThumbnailRecipes(input({ references: [] })),
		/Attach an image for GPT Image 2/
	);
	assert.throws(
		() => createThumbnailRecipes(input({ modelId: 'veo-3-1-video' })),
		/image-generation model/
	);
	assert.throws(
		() => createThumbnailRecipes(input({ modelId: 'not-a-model' })),
		/image-generation model/
	);
	const textModel = getDrawGenerationModel('grok-imagine-2-generate');
	assert.ok(textModel);
	assert.throws(
		() => createThumbnailRecipes(input({ modelId: textModel.id })),
		/accepts 0 reference images/
	);
	const textOnly = createThumbnailRecipes(input({ modelId: textModel.id, references: [] }));
	assert.equal(textOnly.length, 4);
	assert.deepEqual(textOnly[0].referenceImages, []);
	assert.equal(textOnly[0].modelSettings.aspect_ratio, '16:9');
});

test('context, feedback, label and final compiled-prompt bounds reject rather than truncate', () => {
	const contextText = 'x'.repeat(MAX_THUMBNAIL_CONTEXT_LENGTH);
	const recipes = createThumbnailRecipes(input({ contextText }));
	assert.equal(recipes[0].context.thumbnail.sourceContext.length, MAX_THUMBNAIL_CONTEXT_LENGTH);
	assert.throws(() => createThumbnailRecipes(input({ contextText: `${contextText}x` })), /20,000/);
	assert.throws(
		() =>
			createThumbnailRecipes(
				input({
					parentGeneration: parent,
					feedbackText: 'x'.repeat(MAX_THUMBNAIL_FEEDBACK_LENGTH + 1)
				})
			),
		/4,000/
	);
	assert.throws(
		() => createThumbnailRecipes(input({ references: [image('x'.repeat(161))] })),
		/160/
	);
	// Escaping source-control characters expands the full JSON-encoded prompt beyond the compiled cap.
	assert.throws(
		() => createThumbnailRecipes(input({ contextText: `notes${'\u0001'.repeat(6000)}` })),
		/complete prompt exceeds 32,000/
	);
});

test('references are local explicit images, roles are validated and unattached feedback is rejected', () => {
	assert.throws(
		() => validateThumbnailInput(input({ contextText: '   ' })),
		/Add a little context/
	);
	assert.throws(
		() => validateThumbnailInput(input({ feedbackText: 'Remove the background' })),
		/Select a thumbnail/
	);
	assert.throws(
		() =>
			validateThumbnailInput(
				input({ references: [{ ...image('Logo'), dataURL: 'https://private.example/logo.png' }] })
			),
		/local PNG/
	);
	assert.throws(
		() => validateThumbnailInput(input({ references: [image('Parent', 'parent')] })),
		/Select the parent from your results/
	);
	assert.throws(
		() => validateThumbnailInput(input({ references: [image('Logo', 'secret')] })),
		/unsupported role/
	);
	const source = input({
		references: [{ dataURL: 'data:image/png;base64,YQ==', mimeType: 'image/png' }]
	});
	assert.equal(validateThumbnailInput(source).referenceImages[0].role, 'inspiration');
	assert.equal(source.references[0].role, undefined);
});

test('the parent estimate and recipe use identical bounded model settings', () => {
	const model = getDrawGenerationModel(DEFAULT_THUMBNAIL_MODEL_ID);
	assert.ok(model);
	const settings = getThumbnailModelSettings(model, { quality: 'medium', image_size: 'square' });
	assert.equal(settings.quality, 'medium');
	assert.deepEqual(settings.image_size, { width: 1280, height: 720 });
	assert.deepEqual(
		createThumbnailRecipes(input({ modelSettings: { quality: 'medium' } }))[0].modelSettings,
		settings
	);
});

test('saved thumbnail replay restores source brief, settings and ordered parent without its output bytes', () => {
	const recipes = createThumbnailRecipes(
		input({
			parentGeneration: parent,
			feedbackText: 'Keep the geometry; quieter background.',
			modelSettings: { quality: 'high' }
		})
	);
	const saved = {
		...recipes[0],
		id: 'saved-result',
		dataURL: '',
		mimeType: 'image/png',
		modelLabel: 'GPT Image 2',
		createdAt: 2
	};
	const restored = restoreThumbnailRecipe(saved);
	assert.equal(restored.contextText, input().contextText);
	assert.equal(restored.feedbackText, 'Keep the geometry; quieter background.');
	assert.equal(restored.modelSettings.quality, 'high');
	assert.equal(restored.parentGeneration.id, parent.id);
	assert.equal(restored.parentGeneration.dataURL, parent.dataURL);
	assert.equal(restored.references.length, 3);
	const next = createThumbnailRecipes(restored);
	assert.equal(next.length, 4);
	for (const recipe of next) {
		assert.equal(recipe.parentGenerationId, parent.id);
		assert.deepEqual(recipe.referenceImages, recipes[0].referenceImages);
		assert.equal(recipe.modelSettings.quality, 'high');
	}
	assert.throws(
		() => restoreThumbnailRecipe({ ...saved, referenceImages: saved.referenceImages.slice(0, -1) }),
		/missing its parent/
	);
	const initial = createThumbnailRecipes(input())[0];
	assert.equal(
		restoreThumbnailRecipe({ ...saved, ...initial, parentGenerationId: undefined })
			.parentGeneration,
		null
	);
});
