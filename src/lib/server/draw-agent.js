import { isPodcastStudioSessionValid, podcastStudioCookieName } from '../podcast-admin-auth.js';
import { privateJson, requireSameOrigin } from '../podcast-admin-route.js';
import {
	chargeDrawingAgentBudget,
	createDrawingAgentBudget,
	drawingAgentModelCostUsd,
	DRAW_AGENT_MODEL_STEP_RESERVE_USD
} from './draw-agent-budget.js';

export const DRAW_AGENT_MODEL = '@cf/qwen/qwen3.8-27b';
export const MAX_DRAW_AGENT_REQUEST_BYTES = 1_500_000;
export const MAX_DRAW_AGENT_MESSAGES = 40;
export const MAX_DRAW_AGENT_COMMAND_LENGTH = 4_000;

const SCREENSHOT = /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;
const TOOL_ID = /^[A-Za-z0-9_-]{1,128}$/;
const encoder = new TextEncoder();

const DRAW_AGENT_SYSTEM_PROMPT = `You are the authenticated visual drawing assistant inside swyx.io/draw. Help the user by inspecting and editing their real Excalidraw canvas. The attached screenshot shows only their currently visible drawing viewport; prioritize what is visible rather than distant offscreen elements.

You have exactly one native function: canvas_bash. It runs in an isolated browser worker with an in-memory filesystem, harmless text-processing commands, and no network, browser storage, credentials, host shell, JavaScript, or Python. The custom draw command is the only bridge to the canvas. Start with draw help or draw inspect whenever needed. Commands:
draw inspect
draw list [--selected] [--visible]
draw add '<JSON Excalidraw skeleton or array>'
draw update ELEMENT_ID '<JSON properties>'
draw delete ELEMENT_ID [ELEMENT_ID...]
draw select ELEMENT_ID [ELEMENT_ID...]
draw duplicate [ELEMENT_ID...] [--dx 24] [--dy 24]
draw align left|center|right|top|middle|bottom [ELEMENT_ID...]
draw distribute horizontal|vertical [ELEMENT_ID...]
draw group [ELEMENT_ID...]
draw ungroup [ELEMENT_ID...]
draw layer front|back|forward|backward [ELEMENT_ID...]
draw connect FROM_ID TO_ID [--label TEXT]
draw viewport [fit|ELEMENT_ID...]
draw presets [insert PRESET_ID]
draw components [insert COMPONENT_ID]
draw commands [run COMMAND_ID]
draw pages [create|switch PAGE_ID|rename PAGE_ID NAME]
draw image ACTION [--id ELEMENT_ID] [--prompt TEXT] [--model MODEL_ID] [--x 0.5] [--y 0.5] [--radius 0.12] [--blur 14] [--focus 0.55]
Image actions: background, magic-select, magic-eraser, depth-blur, vectorize, fal. On-device image tools remain local; fal uploads the selected image or prompt and consumes the visible per-run spending cap.

Use valid JSON, realistic coordinates and dimensions, clear typography, intentional spacing, and native Excalidraw shape/text/arrow skeletons. Prefer a small number of purposeful changes. Inspect visible results after meaningful edits and improve them. Never claim a command succeeded without its tool result. Never seek secrets, arbitrary network access, or a host shell. If a request cannot be done within the allowed tools or budget, say so plainly. Respond concisely when the task is complete.`;

export const DRAW_AGENT_TOOLS = Object.freeze([
	Object.freeze({
		type: 'function',
		function: Object.freeze({
			name: 'canvas_bash',
			description:
				'Run a bounded shell script inside the browser-only, no-network drawing sandbox. Use the draw command to inspect or change the canvas.',
			parameters: Object.freeze({
				type: 'object',
				properties: Object.freeze({
					command: Object.freeze({
						type: 'string',
						description: 'Shell script using the allowlisted draw canvas command.'
					})
				}),
				required: Object.freeze(['command']),
				additionalProperties: false
			})
		})
	})
]);

/** @param {unknown} value */
function validScreenshot(value) {
	return (
		typeof value === 'string' &&
		value.length <= 1_250_000 &&
		SCREENSHOT.test(value) &&
		value.slice(value.indexOf(',') + 1).length % 4 === 0
	);
}

/** @param {unknown} value */
function normalizeMessages(value) {
	if (!Array.isArray(value) || value.length < 1 || value.length > MAX_DRAW_AGENT_MESSAGES) {
		return undefined;
	}
	/** @type {Record<string, unknown>[]} */
	const messages = [];
	for (const input of value) {
		if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
		const candidate = /** @type {Record<string, unknown>} */ (input);
		if (!['user', 'assistant', 'tool'].includes(/** @type {string} */ (candidate.role))) {
			return undefined;
		}
		if (
			candidate.content !== null &&
			(typeof candidate.content !== 'string' || candidate.content.length > 12_000)
		) {
			return undefined;
		}
		/** @type {Record<string, unknown>} */
		const message = { role: candidate.role, content: candidate.content };
		if (candidate.role === 'tool') {
			if (typeof candidate.tool_call_id !== 'string' || !TOOL_ID.test(candidate.tool_call_id)) {
				return undefined;
			}
			message.tool_call_id = candidate.tool_call_id;
		}
		if (candidate.role === 'assistant' && candidate.tool_calls !== undefined) {
			const calls = normalizeToolCalls(candidate.tool_calls);
			if (!calls?.length) return undefined;
			message.tool_calls = calls;
		}
		messages.push(message);
	}
	return messages;
}

/** @param {unknown} value */
function normalizeToolCalls(value) {
	if (!Array.isArray(value) || value.length > 5) return undefined;
	/** @type {Array<{ id: string, type: 'function', function: { name: 'canvas_bash', arguments: string } }>} */
	const calls = [];
	for (const input of value) {
		if (!input || typeof input !== 'object') return undefined;
		const call = /** @type {Record<string, any>} */ (input);
		const name = call.function?.name ?? call.name;
		if (name !== 'canvas_bash') return undefined;
		let args = call.function?.arguments ?? call.arguments;
		if (typeof args === 'object' && args !== null) args = JSON.stringify(args);
		if (typeof args !== 'string' || args.length > MAX_DRAW_AGENT_COMMAND_LENGTH + 100) {
			return undefined;
		}
		/** @type {any} */
		let parsed;
		try {
			parsed = JSON.parse(args);
		} catch {
			return undefined;
		}
		if (
			!parsed ||
			typeof parsed.command !== 'string' ||
			!parsed.command.trim() ||
			parsed.command.length > MAX_DRAW_AGENT_COMMAND_LENGTH ||
			Object.keys(parsed).some((key) => key !== 'command')
		) {
			return undefined;
		}
		const id = typeof call.id === 'string' ? call.id : crypto.randomUUID();
		if (!TOOL_ID.test(id)) return undefined;
		calls.push({ id, type: 'function', function: { name, arguments: args } });
	}
	return calls;
}

/**
 * One bounded model turn. Browser-side tools remain outside the Worker and its
 * secrets; only an authenticated owner can invoke the server-owned AI binding.
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'request' | 'url'>} event
 */
export async function runDrawingAgent(event) {
	const sessionSecret = event.platform?.env?.PODCAST_ADMIN_SESSION_SECRET;
	if (
		!sessionSecret ||
		!(await isPodcastStudioSessionValid(
			event.cookies.get(podcastStudioCookieName()),
			sessionSecret
		))
	) {
		return privateJson({ error: 'Sign in to use the drawing assistant.' }, { status: 401 });
	}
	requireSameOrigin(event.request, event.url);
	const ai = event.platform?.env?.AI;
	if (!ai) {
		return privateJson(
			{ error: 'The drawing assistant has not been configured.' },
			{ status: 503 }
		);
	}
	if (!event.request.headers.get('content-type')?.startsWith('application/json')) {
		return privateJson({ error: 'Send a JSON assistant request.' }, { status: 415 });
	}
	const contentLength = event.request.headers.get('content-length');
	if (
		contentLength !== null &&
		(!Number.isSafeInteger(Number(contentLength)) ||
			Number(contentLength) < 0 ||
			Number(contentLength) > MAX_DRAW_AGENT_REQUEST_BYTES)
	) {
		return privateJson({ error: 'The assistant request is too large.' }, { status: 413 });
	}
	let raw;
	try {
		raw = await event.request.text();
	} catch {
		return privateJson({ error: 'The assistant request is invalid.' }, { status: 400 });
	}
	if (encoder.encode(raw).byteLength > MAX_DRAW_AGENT_REQUEST_BYTES) {
		return privateJson({ error: 'The assistant request is too large.' }, { status: 413 });
	}
	/** @type {any} */
	let body;
	try {
		body = JSON.parse(raw);
	} catch {
		return privateJson({ error: 'The assistant request is invalid.' }, { status: 400 });
	}
	const messages = normalizeMessages(body?.messages);
	if (!messages || (body.screenshot !== undefined && !validScreenshot(body.screenshot))) {
		return privateJson({ error: 'The assistant conversation is invalid.' }, { status: 422 });
	}
	if (messages[0]?.role !== 'user') {
		return privateJson({ error: 'Begin with a drawing request.' }, { status: 422 });
	}
	/** @type {string} */
	let budget;
	try {
		budget = body.budget
			? body.budget
			: await createDrawingAgentBudget(body.budgetCap ?? 1, sessionSecret);
		await chargeDrawingAgentBudget(budget, DRAW_AGENT_MODEL_STEP_RESERVE_USD, sessionSecret);
	} catch (error) {
		return privateJson(
			{
				error: error instanceof Error ? error.message : 'The assistant spending limit was reached.'
			},
			{ status: 402 }
		);
	}
	if (body.screenshot) {
		messages.push({
			role: 'user',
			content: [
				{ type: 'text', text: 'This is the drawing viewport currently visible on screen.' },
				{ type: 'image_url', image_url: { url: body.screenshot } }
			]
		});
	}
	/** @type {any} */
	let result;
	try {
		result = await ai.run(DRAW_AGENT_MODEL, {
			messages: [{ role: 'system', content: DRAW_AGENT_SYSTEM_PROMPT }, ...messages],
			tools: DRAW_AGENT_TOOLS,
			tool_choice: 'auto',
			parallel_tool_calls: false,
			max_completion_tokens: 1_200,
			stream: false
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : '';
		if (/rate.?limit|429/i.test(message)) {
			return privateJson(
				{ error: 'The drawing assistant is busy. Try again shortly.' },
				{ status: 429 }
			);
		}
		return privateJson(
			{ error: 'The drawing assistant could not complete this step.' },
			{ status: 502 }
		);
	}
	const output = result?.choices?.[0]?.message ?? result;
	const content =
		typeof output?.content === 'string'
			? output.content
			: typeof output?.response === 'string'
				? output.response
				: '';
	const toolCalls = output?.tool_calls === undefined ? [] : normalizeToolCalls(output.tool_calls);
	if (!toolCalls || (!content.trim() && !toolCalls.length)) {
		return privateJson(
			{ error: 'The drawing assistant returned an invalid response.' },
			{ status: 502 }
		);
	}
	/** @type {Record<string, unknown>} */
	const response = { content: content.slice(0, 12_000), toolCalls };
	let modelCostUsd = DRAW_AGENT_MODEL_STEP_RESERVE_USD;
	if (result?.usage && typeof result.usage === 'object') {
		const inputTokens = result.usage.prompt_tokens;
		const outputTokens = result.usage.completion_tokens;
		if (
			Number.isSafeInteger(inputTokens) &&
			inputTokens >= 0 &&
			Number.isSafeInteger(outputTokens) &&
			outputTokens >= 0
		) {
			response.usage = { inputTokens, outputTokens };
			modelCostUsd = drawingAgentModelCostUsd(inputTokens, outputTokens);
		}
	}
	try {
		const charged = await chargeDrawingAgentBudget(budget, modelCostUsd, sessionSecret);
		response.budget = charged.token;
		response.spendingUsd = charged.spendingUsd;
		response.modelCostUsd = modelCostUsd;
	} catch (error) {
		return privateJson(
			{
				error: error instanceof Error ? error.message : 'The assistant spending limit was reached.'
			},
			{ status: 402 }
		);
	}
	return privateJson(response);
}
