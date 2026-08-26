import test from 'node:test';
import assert from 'node:assert/strict';
import {
	getDrawingProvider,
	listDrawingProviders,
	callDrawingProvider,
	drawingProviderReservation,
	drawingProviderCost
} from '../src/lib/server/draw-agent-providers.js';
import { DRAW_AGENT_TOOLS } from '../src/lib/server/draw-agent.js';

const env = {
	OPENAI_API_KEY: 'openai-test-secret',
	DEEPSEEK_API_KEY: 'deepseek-test-secret',
	FEATHERLESS_API_KEY: 'feather-test-secret',
	FEATHERLESS_MODEL: 'Qwen/Test-Model'
};
const metadata = {
	id: env.FEATHERLESS_MODEL,
	status: 'active',
	available_on_current_plan: true,
	features: { tool_use: true },
	vision_supported: true,
	context_length: 32768,
	max_completion_tokens: 4096,
	pricing: { prompt: '0.0000005', completion: '0.000002', request: '0.001', image: '0.002' }
};
const image = 'data:image/webp;base64,aW1hZ2U=';
const messages = [
	{ role: 'system', content: 'Draw a useful diagram.' },
	{ role: 'user', content: 'Draw a loop.' },
	{
		role: 'assistant',
		content: null,
		tool_calls: [
			{
				id: 'tool_1',
				type: 'function',
				function: { name: 'canvas_bash', arguments: '{"command":"draw inspect"}' }
			}
		]
	},
	{ role: 'tool', tool_call_id: 'tool_1', content: '{"exitCode":0}' },
	{
		role: 'user',
		content: [
			{ type: 'text', text: 'Viewport' },
			{ type: 'image_url', image_url: { url: image } }
		]
	}
];

test('provider discovery exposes capabilities and model identity, never credentials', async () => {
	let calls = 0;
	const providers = await listDrawingProviders(env, async (url, /** @type {any} */ options) => {
		calls++;
		assert.equal(url, 'https://api.featherless.ai/v1/models/Qwen/Test-Model');
		assert.equal(options.headers.Authorization, `Bearer ${env.FEATHERLESS_API_KEY}`);
		return Response.json(metadata);
	});
	assert.equal(calls, 1);
	assert.deepEqual(
		providers.map((p) => [p.id, p.configured, p.vision]),
		[
			['cloudflare', false, true],
			['openai', true, true],
			['deepseek', true, false],
			['featherless', true, true]
		]
	);
	assert.doesNotMatch(JSON.stringify(providers), /test-secret/);
	assert.equal(
		(await listDrawingProviders({})).every((p) => !p.configured),
		true
	);
});

test('Featherless fails closed on unavailable models, missing native tools or unknown prices', async () => {
	for (const detail of [
		{ ...metadata, available_on_current_plan: false },
		{ ...metadata, status: 'pending_deploy' },
		{ ...metadata, features: {} },
		{ ...metadata, pricing: {} },
		{ ...metadata, context_length: 2048 },
		{ ...metadata, id: 'Other/Model' }
	]) {
		const provider = await getDrawingProvider(env, 'featherless', async () =>
			Response.json(detail)
		);
		assert.equal(provider.configured, false);
	}
	const denied = await getDrawingProvider(
		env,
		'featherless',
		async () => new Response(env.FEATHERLESS_API_KEY, { status: 403 })
	);
	assert.equal(denied.configured, false);
	assert.doesNotMatch(JSON.stringify(denied), /test-secret/);
	await assert.rejects(
		getDrawingProvider(env, 'https://evil.example'),
		/supported drawing provider/
	);
});

test('OpenAI Responses maps tool history and viewport vision to strict native tools without storage', async () => {
	const provider = await getDrawingProvider(env, 'openai');
	const result = await callDrawingProvider(
		provider,
		env,
		messages,
		DRAW_AGENT_TOOLS,
		new AbortController().signal,
		async (url, /** @type {any} */ options) => {
			assert.equal(url, 'https://api.openai.com/v1/responses');
			assert.equal(options.redirect, 'error');
			assert.equal(options.headers.Authorization, `Bearer ${env.OPENAI_API_KEY}`);
			const body = JSON.parse(options.body);
			assert.equal(body.store, false);
			assert.equal(body.reasoning.effort, 'none');
			assert.equal(body.tools[0].strict, true);
			assert.equal(
				body.input.find((item) => item.type === 'function_call_output').call_id,
				'tool_1'
			);
			assert.equal(body.input.at(-1).content[1].image_url, image);
			assert.equal(body.max_output_tokens, 2000);
			return Response.json({
				status: 'completed',
				output: [
					{
						type: 'function_call',
						call_id: 'next',
						name: 'canvas_bash',
						arguments: '{"command":"draw viewport fit"}'
					}
				],
				usage: { input_tokens: 100, output_tokens: 30 }
			});
		}
	);
	assert.equal(result.choices[0].message.tool_calls[0].id, 'next');
	assert.deepEqual(result.usage, { prompt_tokens: 100, completion_tokens: 30 });
});

test('DeepSeek uses its documented strict endpoint and disables thinking for bounded tool turns', async () => {
	const provider = await getDrawingProvider(env, 'deepseek');
	await callDrawingProvider(
		provider,
		env,
		messages.slice(0, 4),
		DRAW_AGENT_TOOLS,
		new AbortController().signal,
		async (url, /** @type {any} */ options) => {
			assert.equal(url, 'https://api.deepseek.com/beta/chat/completions');
			const body = JSON.parse(options.body);
			assert.deepEqual(body.thinking, { type: 'disabled' });
			assert.equal(body.tools[0].function.strict, true);
			assert.equal(body.max_tokens, 2000);
			assert.equal(body.max_completion_tokens, undefined);
			return Response.json({ choices: [{ message: { content: 'Done' } }] });
		}
	);
});

test('Featherless native chat tools preserve bindings and use catalog prices, including fixed charges', async () => {
	const provider = await getDrawingProvider(env, 'featherless', async () =>
		Response.json(metadata)
	);
	assert.equal(drawingProviderCost(provider, 1000, 100, true), 0.0037);
	assert.ok(
		drawingProviderReservation(provider, messages.slice(0, 4), DRAW_AGENT_TOOLS, true) >= 0.02
	);
	assert.throws(
		() =>
			drawingProviderReservation(
				provider,
				[{ content: 'x'.repeat(50000) }],
				DRAW_AGENT_TOOLS,
				false
			),
		/context limit/
	);
	await callDrawingProvider(
		provider,
		env,
		messages,
		DRAW_AGENT_TOOLS,
		new AbortController().signal,
		async (url, /** @type {any} */ options) => {
			assert.equal(url, 'https://api.featherless.ai/v1/chat/completions');
			const body = JSON.parse(options.body);
			assert.equal(body.messages[3].tool_call_id, 'tool_1');
			assert.equal(body.tools[0].function.name, 'canvas_bash');
			assert.equal(body.thinking, undefined);
			return Response.json({ choices: [{ message: { content: 'Done' } }] });
		}
	);
});

test('provider transport rejects redirects, oversized replies and errors without leaking provider secrets', async () => {
	const provider = await getDrawingProvider(env, 'openai');
	for (const status of [401, 403, 429, 500]) {
		await assert.rejects(
			callDrawingProvider(
				provider,
				env,
				messages,
				DRAW_AGENT_TOOLS,
				new AbortController().signal,
				async () => new Response('private upstream secret ' + env.OPENAI_API_KEY, { status })
			),
			(error) => {
				assert.doesNotMatch(error.message, /private upstream|test-secret/);
				assert.equal(error.status, status === 429 ? 429 : status === 500 ? 502 : 503);
				return true;
			}
		);
	}
	await assert.rejects(
		callDrawingProvider(
			provider,
			env,
			messages,
			DRAW_AGENT_TOOLS,
			new AbortController().signal,
			async () => new Response('x'.repeat(250001))
		),
		/too large/
	);
	const incomplete = await callDrawingProvider(
		provider,
		env,
		messages,
		DRAW_AGENT_TOOLS,
		new AbortController().signal,
		async () => Response.json({ status: 'incomplete', output: [] })
	);
	assert.equal(incomplete.choices[0].finish_reason, 'length');
});
