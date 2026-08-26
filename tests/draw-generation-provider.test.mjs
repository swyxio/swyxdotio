import assert from 'node:assert/strict';
import test from 'node:test';
import {
	DRAW_GENERATION_MODELS,
	DEFAULT_DRAW_TEXT_TO_IMAGE_MODEL,
	getDrawGenerationModel,
	getDrawGenerationModelParameters,
	getDrawGenerationModelOverrides,
	resolveDrawGenerationModelSettings,
	estimateDrawGenerationModelCost
} from '../src/lib/draw-generation-models.js';
import { getDrawingGenerationAdapter } from '../src/lib/server/draw-generation-provider.js';
import { drawingFalAdapter } from '../src/lib/server/draw-fal-adapter.js';
import { runDrawingGeneration } from '../src/lib/draw-generation-client.js';
import { GenerationRuns } from '../workers/draw/generation-runs.js';
import { createTestAiLedger } from './helpers/tools-ai-ledger.mjs';

test('UI catalog keeps model-maker and hosting adapter separate and preserves supported settings', () => {
	assert.equal(DEFAULT_DRAW_TEXT_TO_IMAGE_MODEL.kind, 'text-to-image');
	assert.equal(DEFAULT_DRAW_TEXT_TO_IMAGE_MODEL.referenceImages, 0);
	for (const descriptor of DRAW_GENERATION_MODELS) {
		assert.equal(descriptor.adapter, 'fal');
		assert.equal(descriptor.transportLabel, 'fal');
		assert.equal('model' in descriptor, false);
		assert.equal('imageInput' in descriptor, false);
		assert.equal('enable_safety_checker' in descriptor.settings, false);
		assert.equal('safety_tolerance' in descriptor.settings, false);
		assert.ok(getDrawGenerationModelParameters(descriptor).length);
	}
	const model = getDrawGenerationModel('veo-3-1-video');
	assert.equal(model.provider, 'Google');
	assert.deepEqual(getDrawGenerationModelOverrides(model, { duration: 4, resolution: '720P' }), {
		duration: '4s',
		resolution: '720p'
	});
	const settings = resolveDrawGenerationModelSettings(model, {
		duration: '4s',
		generate_audio: false
	});
	assert.equal(estimateDrawGenerationModelCost(model, settings), 0.8);
});

test('a fake second adapter uses the same submit/status/cancel contract without fal transport or credentials', async () => {
	const calls = [];
	const fake = {
		configured: (env) => env.FAKE_KEY === 'fake',
		async submit(input) {
			calls.push(['submit', input]);
			return { requestId: 'fake-job' };
		},
		async status(job) {
			calls.push(['status', job]);
			return { status: 'COMPLETED', image: 'data:image/png;base64,YQ==' };
		},
		async cancel(job) {
			calls.push(['cancel', job]);
			return { status: 'CANCEL_REQUESTED', cancellation: 'unsupported' };
		}
	};
	const model = { id: 'fake-image', adapter: 'fake' };
	const adapter = getDrawingGenerationAdapter(model, { fake });
	const context = {
		env: { FAKE_KEY: 'fake' },
		fetcher: async () => {
			throw new Error('No network expected');
		}
	};
	assert.equal(adapter.configured(context.env), true);
	const submitted = await adapter.submit({ model, prompt: 'A tree', settings: {} }, context);
	const job = { model, requestId: submitted.requestId };
	assert.equal((await adapter.status(job, context)).status, 'COMPLETED');
	assert.equal((await adapter.cancel(job, context)).cancellation, 'unsupported');
	assert.deepEqual(
		calls.map(([operation]) => operation),
		['submit', 'status', 'cancel']
	);
	assert.throws(() => getDrawingGenerationAdapter({ adapter: 'constructor' }), /unavailable/);
});

test('fal does not expose arbitrary progress payloads or claim that accepted cancellation stopped work', async () => {
	const model = { id: 'flux-2', adapter: 'fal' };
	const job = { model, requestId: 'job' };
	const context = {
		env: { FAL_KEY: 'SECRET' },
		fetcher: async () =>
			Response.json({ status: 'IN_PROGRESS', logs: [{ message: 'PRIVATE PROMPT SECRET' }] })
	};
	assert.deepEqual(await drawingFalAdapter.status(job, context), {
		status: 'IN_PROGRESS',
		message: 'The model is generating.'
	});
	assert.deepEqual(await drawingFalAdapter.cancel(job, context), {
		status: 'CANCEL_REQUESTED',
		cancellation: 'requested'
	});
	await assert.rejects(
		drawingFalAdapter.submit(
			{ model, prompt: 'x', settings: {} },
			{ ...context, fetcher: async () => Response.json({ error: 'PRIVATE' }, { status: 422 }) }
		),
		{ code: 'input_rejected', status: 422 }
	);
});

test('neutral client submits the explicit run authorization once and preserves structured app errors', async () => {
	let submits = 0;
	await assert.rejects(
		runDrawingGeneration({
			prompt: 'An illustration',
			model: 'flux-klein-9b-generate',
			runId: 'run-1',
			runLimitUsd: 0.25,
			clientJobId: 'job-1',
			signal: new AbortController().signal,
			onProgress() {},
			async fetcher(_url, init) {
				submits++;
				assert.equal(init.body.get('runId'), 'run-1');
				assert.equal(init.body.get('runLimitUsd'), '0.25');
				assert.equal(init.body.get('clientJobId'), 'job-1');
				assert.equal(init.body.has('image'), false);
				return Response.json(
					{ code: 'run_budget_exceeded', error: 'The run budget was reached.' },
					{ status: 402 }
				);
			}
		}),
		{ code: 'run_budget_exceeded', status: 402 }
	);
	assert.equal(submits, 1);
});

test('run reservations retain limits and replay claims across helper reconstruction and provider binding changes', async () => {
	const fixture = createTestAiLedger();
	let runs = new GenerationRuns(fixture.sql);
	const run = { id: 'run', clientJobId: 'one', limitUsd: 0.2 };
	const prepared = runs.prepare('alice', run, 125_000);
	assert.ok(!(prepared instanceof Response));
	runs.reserve(prepared, 'reservation-one', Date.now());
	runs = new GenerationRuns(fixture.sql);
	const repeated = runs.prepare('alice', run, 125_000);
	assert.equal(repeated.status, 409);
	assert.equal((await repeated.json()).code, 'job_already_submitted');
	const over = runs.prepare('alice', { ...run, clientJobId: 'two' }, 125_000);
	assert.equal(over.status, 402);
	assert.equal((await over.json()).code, 'run_budget_exceeded');
	assert.equal(runs.prepare('alice', { ...run, limitUsd: 1 }, 125_000).status, 409);
	assert.ok(!(runs.prepare('bob', run, 125_000) instanceof Response));
	assert.equal(runs.bindAdapter('alice', 'reservation-one', 'fake'), undefined);
	assert.equal(runs.adapterFor('reservation-one'), 'fake');
	assert.equal(runs.bindAdapter('alice', 'reservation-one', 'fal').status, 409);
});
