import assert from 'node:assert/strict';
import test from 'node:test';
import {
	createDrawingGenerationRun,
	runDrawingGenerationBatch
} from '../src/lib/draw-generation-batch.js';

const image = 'data:image/png;base64,c291cmNl';
const recipe = (id = 'recipe') => ({
	id,
	prompt: 'A ceramic cup',
	modelId: 'flux-klein-9b-generate',
	adapterId: 'fal',
	modelSettings: {},
	referenceImages: []
});
const run = (recipes = [recipe()], limitUsd = 1) =>
	createDrawingGenerationRun({ pageKey: 'account:page', recipes, limitUsd });

test('run snapshots recipes and rejects an incompatible or over-budget batch before submission', () => {
	const source = recipe();
	const batch = run([source]);
	source.prompt = 'changed';
	assert.equal(batch.jobs[0].recipe.prompt, 'A ceramic cup');
	assert.throws(() => run([recipe()], 0.001), /above your/);
	assert.throws(
		() => run([{ ...recipe(), referenceImages: [{ dataURL: image, mimeType: 'image/png' }] }]),
		/does not send/
	);
	assert.throws(() => run([{ ...recipe(), modelId: 'nano-banana-2' }]), /Attach one/);
});

test('owner runs omit the client budget while preserving recipe validation', () => {
	const batch = run(
		Array.from({ length: 25 }, (_, index) => recipe(`recipe-${index}`)),
		null
	);
	assert.equal(batch.limitUsd, null);
	assert.equal(batch.jobs.length, 25);
	assert.throws(() => run([{ ...recipe(), prompt: '' }], null), /Enter a prompt/);
});

test('comparison runs at bounded concurrency and keeps normalized results tied to recipes and run budget', async () => {
	const batch = run([recipe('a'), recipe('b'), recipe('c')]);
	let active = 0,
		max = 0;
	const calls = [],
		results = [];
	await runDrawingGenerationBatch({
		run: batch,
		userId: 'user',
		signal: new AbortController().signal,
		onJob() {},
		onResult(g) {
			results.push(g);
		},
		generate: async (options) => {
			calls.push(options);
			active++;
			max = Math.max(active, max);
			await new Promise((resolve) => setTimeout(resolve, 5));
			active--;
			return { image };
		}
	});
	assert.equal(max, 2);
	assert.equal(results.length, 3);
	assert.ok(results.every((result) => result.runId === batch.id && result.adapterId === 'fal'));
	assert.deepEqual(
		calls.map((call) => call.clientJobId),
		batch.jobs.map((job) => job.id)
	);
	assert.ok(calls.every((call) => call.runLimitUsd === 1 && !call.image));
	assert.deepEqual(
		batch.jobs.map((job) => job.status),
		['completed', 'completed', 'completed']
	);
});

test('policy rejection stops unsent jobs; an explicit retry keeps the same run identity with a fresh job id', async () => {
	const batch = run([recipe('a'), recipe('b')]);
	let calls = 0;
	await runDrawingGenerationBatch({
		run: batch,
		signal: new AbortController().signal,
		concurrency: 1,
		onJob() {},
		onResult() {},
		generate: async () => {
			calls++;
			throw Object.assign(new Error('Rejected'), { code: 'content_policy_violation' });
		}
	});
	assert.equal(calls, 1);
	assert.deepEqual(
		batch.jobs.map((job) => job.status),
		['failed', 'stopped']
	);
	const retry = createDrawingGenerationRun({
		id: batch.id,
		pageKey: batch.pageKey,
		limitUsd: batch.limitUsd,
		recipes: [batch.jobs[0].recipe]
	});
	assert.equal(retry.id, batch.id);
	assert.notEqual(retry.jobs[0].id, batch.jobs[0].id);
});

test('result survives failed rendering and cancel does not submit remaining items', async () => {
	const batch = run();
	await runDrawingGenerationBatch({
		run: batch,
		signal: new AbortController().signal,
		onJob() {},
		onResult() {
			throw new Error('canvas gone');
		},
		generate: async () => ({ image })
	});
	assert.equal(batch.jobs[0].status, 'completed');
	assert.equal(batch.jobs[0].generation.dataURL, image);
	const cancelled = run([recipe('a'), recipe('b')]);
	const abort = new AbortController();
	abort.abort();
	let calls = 0;
	await runDrawingGenerationBatch({
		run: cancelled,
		signal: abort.signal,
		onJob() {},
		onResult() {},
		generate: async () => {
			calls++;
			return { image };
		}
	});
	assert.equal(calls, 0);
	assert.ok(cancelled.jobs.every((job) => job.status === 'stopped'));
});
