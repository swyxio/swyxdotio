// Server-only: URLs, credentials and model policy never come from the request body.
export const DRAW_AGENT_MODEL = '@cf/qwen/qwen3.8-27b';
const OUTPUT_TOKENS = 2_000;
const MAX_RESPONSE_BYTES = 250_000;
const encoder = new TextEncoder();

/** @typedef {{ id: string, label: string, model: string, vision: boolean, configured: boolean, reason?: string, inputRate: number, outputRate: number, requestRate: number, imageRate: number, maxInputTokens: number }} AgentProvider */
/** @typedef {NonNullable<App.Platform['env']>} ProviderEnv */

export class DrawingProviderError extends Error {
	/** @param {string} message @param {number} [status] */
	constructor(message, status = 503) {
		super(message);
		this.status = status;
	}
}

/** @param {Response} response */
async function boundedJson(response) {
	if (!response.body)
		throw new DrawingProviderError('The selected provider returned no response.', 502);
	const reader = response.body.getReader();
	const chunks = [];
	let size = 0;
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > MAX_RESPONSE_BYTES)
				throw new DrawingProviderError('The provider response was too large.', 502);
			chunks.push(value);
		}
		const bytes = new Uint8Array(size);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.byteLength;
		}
		return JSON.parse(new TextDecoder().decode(bytes));
	} finally {
		await reader.cancel().catch(() => {});
	}
}

/** @param {string} url @param {RequestInit} options @param {typeof fetch} fetcher */
async function providerJson(url, options, fetcher) {
	const response = await fetcher(url, { ...options, redirect: 'error' });
	if (!response.ok) {
		await response.body?.cancel();
		if (response.status === 429)
			throw new DrawingProviderError(
				'The selected provider is rate limited. Try again later.',
				429
			);
		if ([401, 403].includes(response.status))
			throw new DrawingProviderError(
				'The selected provider key or model access needs attention. Ask the site owner to check its configuration.'
			);
		throw new DrawingProviderError('The selected provider could not complete this step.', 502);
	}
	return boundedJson(response);
}

/** @param {ProviderEnv} env @returns {AgentProvider[]} */
function baseProviders(env) {
	return [
		{
			id: 'cloudflare',
			label: 'Cloudflare AI',
			model: DRAW_AGENT_MODEL,
			vision: true,
			configured: Boolean(env.AI),
			inputRate: 0.45,
			outputRate: 3.2,
			requestRate: 0,
			imageRate: 0,
			maxInputTokens: 80_000
		},
		{
			id: 'openai',
			label: 'OpenAI',
			model: 'gpt-5.4-mini-2026-03-17',
			vision: true,
			configured: Boolean(env.OPENAI_API_KEY?.trim()),
			inputRate: 0.75,
			outputRate: 4.5,
			requestRate: 0,
			imageRate: 0,
			maxInputTokens: 80_000
		},
		// Peak, uncached rates conservatively cover off-peak/cache discounts.
		{
			id: 'deepseek',
			label: 'DeepSeek',
			model: 'deepseek-v4-flash',
			vision: false,
			configured: Boolean(env.DEEPSEEK_API_KEY?.trim()),
			inputRate: 0.44,
			outputRate: 1.32,
			requestRate: 0,
			imageRate: 0,
			maxInputTokens: 80_000
		},
		{
			id: 'featherless',
			label: 'Featherless',
			model: env.FEATHERLESS_MODEL?.trim() || '',
			vision: false,
			configured: false,
			reason: 'Site owner must configure FEATHERLESS_API_KEY and FEATHERLESS_MODEL.',
			inputRate: 0,
			outputRate: 0,
			requestRate: 0,
			imageRate: 0,
			maxInputTokens: 0
		}
	].map((provider) => ({
		...provider,
		...(!provider.configured && !provider.reason
			? { reason: 'Site owner has not configured this provider.' }
			: {})
	}));
}

/** Resolve only the selected provider; fetching a catalog never calls inference. @param {ProviderEnv} env @param {string} id @param {typeof fetch} [fetcher] @returns {Promise<AgentProvider>} */
export async function getDrawingProvider(env, id, fetcher = fetch) {
	const provider = baseProviders(env).find((item) => item.id === id);
	if (!provider) throw new DrawingProviderError('Choose a supported drawing provider.', 422);
	if (id !== 'featherless' || !env.FEATHERLESS_API_KEY?.trim() || !provider.model) return provider;
	if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(provider.model) || provider.model.length > 120) {
		return { ...provider, reason: 'The configured Featherless model ID is invalid.' };
	}
	try {
		const detail = await providerJson(
			`https://api.featherless.ai/v1/models/${provider.model.split('/').map(encodeURIComponent).join('/')}`,
			{
				headers: { Authorization: `Bearer ${env.FEATHERLESS_API_KEY}` },
				signal: AbortSignal.timeout(8_000)
			},
			fetcher
		);
		if (
			detail.id !== provider.model ||
			detail.status !== 'active' ||
			detail.available_on_current_plan !== true ||
			detail.features?.tool_use !== true
		) {
			return {
				...provider,
				reason:
					'The Featherless model must be active, available on your plan, and support native tools.'
			};
		}
		const rates = ['prompt', 'completion', 'request', 'image'].map((key) => {
			const value = detail.pricing?.[key];
			return (typeof value === 'string' && value.trim()) || typeof value === 'number'
				? Number(value)
				: NaN;
		});
		if (
			rates.some((rate) => !Number.isFinite(rate) || rate < 0) ||
			!Number.isSafeInteger(detail.context_length) ||
			detail.context_length < 16_384 ||
			!Number.isSafeInteger(detail.max_completion_tokens) ||
			detail.max_completion_tokens < OUTPUT_TOKENS
		) {
			return {
				...provider,
				reason: 'Featherless pricing or context limits could not be verified.'
			};
		}
		return {
			...provider,
			configured: true,
			reason: undefined,
			vision: detail.vision_supported === true || detail.features?.image_input === true,
			inputRate: rates[0] * 1_000_000,
			outputRate: rates[1] * 1_000_000,
			requestRate: rates[2],
			imageRate: rates[3],
			maxInputTokens: Math.min(80_000, detail.context_length - OUTPUT_TOKENS)
		};
	} catch {
		return {
			...provider,
			reason: 'Featherless model access, capabilities and pricing could not be verified.'
		};
	}
}

/** Only public fields cross the API. @param {ProviderEnv} env @param {typeof fetch} [fetcher] */
export async function listDrawingProviders(env, fetcher = fetch) {
	return Promise.all(
		baseProviders(env).map(async ({ id }) => {
			const p = await getDrawingProvider(env, id, fetcher);
			return {
				id: p.id,
				label: p.label,
				model: p.model,
				vision: p.vision,
				configured: p.configured,
				reason: p.reason
			};
		})
	);
}

/** @param {AgentProvider} provider @param {number} input @param {number} output @param {boolean} hasImage */
export function drawingProviderCost(provider, input, output, hasImage) {
	return (
		Math.ceil(
			input * provider.inputRate +
				output * provider.outputRate +
				(provider.requestRate + (hasImage ? provider.imageRate : 0)) * 1_000_000
		) / 1_000_000
	);
}

/** UTF-8 bytes conservatively upper-bound text tokens. Reserve separately for one bounded viewport image. @param {AgentProvider} provider @param {unknown[]} messages @param {readonly unknown[]} tools @param {boolean} hasImage */
export function drawingProviderReservation(provider, messages, tools, hasImage) {
	const tokens =
		encoder.encode(JSON.stringify({ messages, tools })).byteLength + (hasImage ? 8_192 : 0);
	if (tokens > provider.maxInputTokens)
		throw new DrawingProviderError(
			'This conversation exceeds the selected model’s context limit. Start a new conversation.',
			413
		);
	return Math.max(0.02, drawingProviderCost(provider, tokens, OUTPUT_TOKENS, hasImage));
}

/** Translate the app's validated tool conversation to stateless Responses input. @param {any[]} messages */
function responsesInput(messages) {
	return messages.flatMap(
		/** @returns {any[]} */ (message) => {
			if (message.role === 'tool')
				return [
					{ type: 'function_call_output', call_id: message.tool_call_id, output: message.content }
				];
			const items = [];
			if (message.content)
				items.push({
					role: message.role,
					content: Array.isArray(message.content)
						? /** @type {any[]} */ (message.content).map((part) =>
								part.type === 'image_url'
									? { type: 'input_image', image_url: part.image_url.url, detail: 'low' }
									: { type: 'input_text', text: part.text }
							)
						: message.content
				});
			for (const call of message.tool_calls || [])
				items.push({
					type: 'function_call',
					call_id: call.id,
					name: call.function.name,
					arguments: call.function.arguments
				});
			return items;
		}
	);
}

/** @param {AgentProvider} provider @param {ProviderEnv} env @param {any[]} messages @param {readonly any[]} tools @param {AbortSignal} signal @param {typeof fetch} [fetcher] */
export async function callDrawingProvider(provider, env, messages, tools, signal, fetcher = fetch) {
	if (!provider.configured)
		throw new DrawingProviderError(provider.reason || 'The selected provider is not configured.');
	if (provider.id === 'cloudflare')
		return env.AI?.run(provider.model, {
			messages,
			tools,
			tool_choice: 'auto',
			parallel_tool_calls: false,
			reasoning_effort: 'low',
			max_completion_tokens: OUTPUT_TOKENS,
			stream: false
		});
	const boundedSignal = AbortSignal.any([signal, AbortSignal.timeout(90_000)]);
	if (provider.id === 'openai') {
		const result = await providerJson(
			'https://api.openai.com/v1/responses',
			{
				method: 'POST',
				signal: boundedSignal,
				headers: {
					Authorization: `Bearer ${env.OPENAI_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: provider.model,
					input: responsesInput(messages),
					tools: tools.map(({ function: fn }) => ({ type: 'function', ...fn, strict: true })),
					tool_choice: 'auto',
					parallel_tool_calls: false,
					reasoning: { effort: 'none' },
					max_output_tokens: OUTPUT_TOKENS,
					store: false,
					stream: false,
					service_tier: 'default'
				})
			},
			fetcher
		);
		if (result.status !== 'completed' && result.status !== 'incomplete')
			throw new DrawingProviderError('OpenAI did not complete this response.', 502);
		const output = /** @type {any[]} */ (Array.isArray(result.output) ? result.output : []);
		return {
			choices: [
				{
					finish_reason: result.status === 'incomplete' ? 'length' : 'stop',
					message: {
						content: output
							.filter((item) => item.type === 'message')
							.flatMap((item) => item.content || [])
							.filter((part) => part.type === 'output_text')
							.map((part) => part.text)
							.join('\n'),
						tool_calls: output
							.filter((item) => item.type === 'function_call')
							.map((item) => ({
								id: item.call_id,
								type: 'function',
								function: { name: item.name, arguments: item.arguments }
							}))
					}
				}
			],
			usage: {
				prompt_tokens: result.usage?.input_tokens,
				completion_tokens: result.usage?.output_tokens
			}
		};
	}
	const deepseek = provider.id === 'deepseek';
	return providerJson(
		deepseek
			? 'https://api.deepseek.com/beta/chat/completions'
			: 'https://api.featherless.ai/v1/chat/completions',
		{
			method: 'POST',
			signal: boundedSignal,
			headers: {
				Authorization: `Bearer ${deepseek ? env.DEEPSEEK_API_KEY : env.FEATHERLESS_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: provider.model,
				messages,
				tools: tools.map(({ function: fn }) => ({
					type: 'function',
					function: { ...fn, ...(deepseek ? { strict: true } : {}) }
				})),
				tool_choice: 'auto',
				max_tokens: OUTPUT_TOKENS,
				stream: false,
				...(deepseek ? { thinking: { type: 'disabled' } } : {})
			})
		},
		fetcher
	);
}
