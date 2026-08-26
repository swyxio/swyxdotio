import { createTestAiLedger, ledgerRequest } from './helpers/tools-ai-ledger.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

import { createToolsSession } from '../src/lib/server/tools-auth.js';
import {
	DRAW_AGENT_MODEL,
	MAX_DRAW_AGENT_REQUEST_BYTES,
	runDrawingAgent
} from '../src/lib/server/draw-agent.js';
import {
	chargeDrawingAgentBudget,
	createDrawingAgentBudget,
	drawingAgentModelCostUsd,
	readDrawingAgentBudget
} from '../src/lib/server/draw-agent-budget.js';

const SESSION_SECRET = 'drawing-agent-test-only-session-secret';
const SCREENSHOT = 'data:image/webp;base64,c2FmZS12aWV3cG9ydA==';

/** @param {{ authenticated?: boolean, owner?: boolean, body?: unknown, ai?: any, origin?: string, contentType?: string, contentLength?: string, ledger?: any }} [options] */
async function createEvent(options = {}) {
	const url = new URL('https://swyx.io/tools/api/draw/agent');
	const headers = new Headers({
		'X-Tools-User': options.owner === false ? 'other-google-sub' : 'owner-google-sub',
		Origin: options.origin ?? url.origin,
		'Content-Type': options.contentType ?? 'application/json'
	});
	if (options.contentLength) headers.set('Content-Length', options.contentLength);
	const request = new Request(url, {
		method: 'POST',
		headers,
		body: JSON.stringify(
			options.body ?? { messages: [{ role: 'user', content: 'Add a rectangle' }] }
		)
	});
	const session =
		options.authenticated === false
			? undefined
			: await createToolsSession(
					{
						id: options.owner === false ? 'other-google-sub' : 'owner-google-sub',
						email: 'user@example.com',
						name: 'Test User'
					},
					SESSION_SECRET
				);
	return /** @type {any} */ ({
		url,
		request,
		cookies: { get: () => session },
		platform: {
			env: {
				TOOLS_SESSION_SECRET: SESSION_SECRET,
				TOOLS_OWNER_GOOGLE_SUB: 'owner-google-sub',
				DRAW_PAGES:
					options.ledger === null ? undefined : (options.ledger ?? createTestAiLedger()).namespace,
				AI:
					options.ai === undefined
						? { run: async () => ({ choices: [{ message: { content: 'Done.' } }] }) }
						: options.ai
			}
		}
	});
}

test('drawing assistant uses a signed session, same-origin requests, and a server-owned AI binding', async () => {
	const unauthorized = await runDrawingAgent(await createEvent({ authenticated: false }));
	assert.equal(unauthorized.status, 401);
	assert.equal(unauthorized.headers.get('Cache-Control'), 'private, no-store');
	const crossOrigin = await createEvent({ origin: 'https://evil.example' });
	await assert.rejects(
		() => runDrawingAgent(crossOrigin),
		/** @param {any} error */ (error) => {
			return error.status === 403;
		}
	);
	const unavailable = await runDrawingAgent(await createEvent({ ai: null }));
	assert.equal(unavailable.status, 503);
});

test('drawing assistant sends only the visible viewport to the selected vision model with native tools', async () => {
	/** @type {any[]} */
	const calls = [];
	const response = await runDrawingAgent(
		await createEvent({
			body: { messages: [{ role: 'user', content: 'Draw a diagram' }], screenshot: SCREENSHOT },
			ai: {
				run: async (...args) => {
					calls.push(args);
					return {
						choices: [
							{
								message: {
									content: null,
									tool_calls: [
										{
											id: 'call_1',
											type: 'function',
											function: {
												name: 'canvas_bash',
												arguments: JSON.stringify({ command: 'draw inspect' })
											}
										}
									]
								}
							}
						],
						usage: { prompt_tokens: 120, completion_tokens: 18 },
						private_secret: SESSION_SECRET
					};
				}
			}
		})
	);
	assert.equal(response.status, 200);
	assert.equal(calls[0][0], DRAW_AGENT_MODEL);
	assert.equal(calls[0][1].tools[0].function.name, 'canvas_bash');
	assert.equal(calls[0][1].reasoning_effort, 'low');
	assert.equal(calls[0][1].max_completion_tokens, 2_000);
	const systemPrompt = calls[0][1].messages[0].content;
	assert.match(systemPrompt, /https:\/\/swyx.io\/why-temporal/);
	assert.match(systemPrompt, /For explanatory diagrams and essay figures/);
	assert.match(systemPrompt, /Mark missing evidence as unknown/);
	assert.match(systemPrompt, /modify only the copies/);
	assert.match(systemPrompt, /For thumbnail, speaker announcement, article launch banner/);
	assert.equal(calls[0][1].messages.at(-1).content[1].image_url.url, SCREENSHOT);
	const raw = await response.text();
	const body = JSON.parse(raw);
	assert.equal(body.toolCalls[0].function.name, 'canvas_bash');
	assert.deepEqual(body.usage, { inputTokens: 120, outputTokens: 18 });
	assert.equal(body.modelCostUsd, drawingAgentModelCostUsd(120, 18));
	assert.equal(body.spendingUsd, body.modelCostUsd);
	assert.equal((await readDrawingAgentBudget(body.budget, SESSION_SECRET)).spent, 112);
	assert.equal(raw.includes(SESSION_SECRET), false);
	assert.equal(raw.includes(SCREENSHOT), false);
});

test('truncated model output cannot execute partial commands or claim a completed review', async () => {
	for (const output of [
		{ content: '' },
		{ content: '', tool_calls: [{ function: { name: 'canvas_bash', arguments: '{"command":' } }] }
	]) {
		const response = await runDrawingAgent(
			await createEvent({
				body: {
					messages: [
						{ role: 'user', content: 'Improve this diagram' },
						{ role: 'tool', tool_call_id: 'completed', content: JSON.stringify({ exitCode: 0 }) }
					]
				},
				ai: { run: async () => ({ choices: [{ finish_reason: 'length', message: output }] }) }
			})
		);
		assert.equal(response.status, 502);
		const body = await response.json();
		assert.equal(body.code, 'response_truncated');
		assert.equal(body.toolCalls, undefined);
	}
});

test('drawing assistant signs shared run budgets, tracks model tokens, and rejects tampering or overspending', async () => {
	const first = await runDrawingAgent(
		await createEvent({
			body: { messages: [{ role: 'user', content: 'Align the diagram' }], budgetCap: 0.25 },
			ai: {
				run: async () => ({
					choices: [{ message: { content: 'Done.' } }],
					usage: { prompt_tokens: 1_000, completion_tokens: 100 }
				})
			}
		})
	);
	assert.equal(first.status, 200);
	const firstBody = await first.json();
	assert.equal(firstBody.spendingUsd, 0.00077);
	const second = await runDrawingAgent(
		await createEvent({
			body: { messages: [{ role: 'user', content: 'Continue' }], budget: firstBody.budget },
			ai: {
				run: async () => ({
					choices: [{ message: { content: 'Done.' } }],
					usage: { prompt_tokens: 1_000, completion_tokens: 100 }
				})
			}
		})
	);
	assert.equal((await second.json()).spendingUsd, 0.00154);
	const invalid = await runDrawingAgent(
		await createEvent({
			body: {
				messages: [{ role: 'user', content: 'Continue' }],
				budget: `${firstBody.budget}tampered`
			}
		})
	);
	assert.equal(invalid.status, 402);
	let called = false;
	const exhausted = await chargeDrawingAgentBudget(
		await createDrawingAgentBudget(0.25, SESSION_SECRET),
		0.24,
		SESSION_SECRET
	);
	const blocked = await runDrawingAgent(
		await createEvent({
			body: { messages: [{ role: 'user', content: 'Continue' }], budget: exhausted.token },
			ai: {
				run: async () => {
					called = true;
					return { choices: [{ message: { content: 'Done.' } }] };
				}
			}
		})
	);
	assert.equal(blocked.status, 402);
	assert.equal(called, false);
	const overMaximum = await runDrawingAgent(
		await createEvent({ body: { messages: [{ role: 'user', content: 'Continue' }], budgetCap: 5 } })
	);
	assert.equal(overMaximum.status, 402);
});

test('drawing assistant accepts structured text and empty model completions after successful canvas review', async () => {
	const structured = await runDrawingAgent(
		await createEvent({
			ai: {
				run: async () => ({
					choices: [{ message: { content: [{ type: 'text', text: 'Thumbnail is ready.' }] } }]
				})
			}
		})
	);
	assert.equal(structured.status, 200);
	assert.equal((await structured.json()).content, 'Thumbnail is ready.');

	const completed = await runDrawingAgent(
		await createEvent({
			body: {
				messages: [
					{ role: 'user', content: 'Create and review a thumbnail.' },
					{
						role: 'assistant',
						content: null,
						tool_calls: [
							{
								id: 'review_1',
								type: 'function',
								function: {
									name: 'canvas_bash',
									arguments: JSON.stringify({ command: 'draw inspect' })
								}
							}
						]
					},
					{
						role: 'tool',
						tool_call_id: 'review_1',
						content: JSON.stringify({ stdout: 'Thumbnail ready', stderr: '', exitCode: 0 })
					}
				],
				screenshot: SCREENSHOT
			},
			ai: { run: async () => ({ choices: [{ message: { content: null, tool_calls: [] } }] }) }
		})
	);
	assert.equal(completed.status, 200);
	assert.equal((await completed.json()).content, 'Canvas review complete.');

	const incomplete = await runDrawingAgent(
		await createEvent({
			ai: { run: async () => ({ choices: [{ message: { content: null, tool_calls: [] } }] }) }
		})
	);
	assert.equal(incomplete.status, 502);
});

test('drawing assistant rejects oversized requests, untrusted screenshot URLs, and unknown tool calls', async () => {
	const oversized = await runDrawingAgent(
		await createEvent({ contentLength: String(MAX_DRAW_AGENT_REQUEST_BYTES + 1) })
	);
	assert.equal(oversized.status, 413);
	const externalImage = await runDrawingAgent(
		await createEvent({
			body: {
				messages: [{ role: 'user', content: 'Draw something' }],
				screenshot: 'https://evil.example/private.png'
			}
		})
	);
	assert.equal(externalImage.status, 422);
	const invalidTool = await runDrawingAgent(
		await createEvent({
			ai: {
				run: async () => ({
					choices: [
						{
							message: {
								tool_calls: [
									{
										id: 'call_1',
										function: { name: 'read_secrets', arguments: '{}' }
									}
								]
							}
						}
					]
				})
			}
		})
	);
	assert.equal(invalidTool.status, 502);
});

test('signed nonowner Google identities receive funded, durably limited AI access', async () => {
	let called = false;
	const response = await runDrawingAgent(
		await createEvent({
			owner: false,
			ai: {
				run: async () => {
					called = true;
					return { choices: [{ message: { content: 'Done.' } }] };
				}
			}
		})
	);
	assert.equal(response.status, 200);
	assert.equal(called, true);
});

test('drawing assistant rejects stale account headers before spending', async () => {
	let called = false;
	const event = await createEvent({
		ai: {
			run: async () => {
				called = true;
				return {};
			}
		}
	});
	event.request.headers.set('X-Tools-User', 'previous-user');
	assert.equal((await runDrawingAgent(event)).status, 409);
	assert.equal(called, false);
});

test('missing or failed durable usage tracking prevents all funded model calls', async () => {
	let called = false;
	for (const ledger of [
		null,
		{
			namespace: {
				idFromName: (name) => name,
				get: () => ({
					fetch: async () => {
						throw new Error('Offline');
					}
				})
			}
		}
	]) {
		const response = await runDrawingAgent(
			await createEvent({
				ledger,
				ai: {
					run: async () => {
						called = true;
						return {};
					}
				}
			})
		);
		assert.equal(response.status, 503);
	}
	assert.equal(called, false);
});

test('replaying a signed per-run budget cannot bypass durable per-account funded limits', async () => {
	const ledger = createTestAiLedger();
	const budget = await createDrawingAgentBudget(1, SESSION_SECRET);
	let calls = 0;
	const ai = {
		run: async () => {
			calls++;
			return {
				choices: [{ message: { content: 'Done.' } }],
				usage: { prompt_tokens: 10, completion_tokens: 10 }
			};
		}
	};
	for (let index = 0; index < 21; index++) {
		const response = await runDrawingAgent(
			await createEvent({
				ledger,
				ai,
				body: { messages: [{ role: 'user', content: 'Continue' }], budget }
			})
		);
		assert.equal(response.status, index < 20 ? 200 : 429);
	}
	assert.equal(calls, 20);
	assert.equal(
		ledger.database.prepare('SELECT COUNT(*) AS count FROM tools_ai_usage').get().count,
		20
	);
});

test('model failures are metadata-logged without prompts or model errors and keep their reservation', async () => {
	const ledger = createTestAiLedger();
	const response = await runDrawingAgent(
		await createEvent({
			ledger,
			body: { messages: [{ role: 'user', content: 'PRIVATE_PROMPT' }] },
			ai: {
				run: async () => {
					throw new Error('PRIVATE_PROVIDER_ERROR');
				}
			}
		})
	);
	assert.equal(response.status, 502);
	const row = ledger.database.prepare('SELECT * FROM tools_ai_usage').get();
	assert.equal(row.status, 'failed');
	assert.equal(row.reserved_micros, 50_000);
	assert.doesNotMatch(JSON.stringify(row), /PRIVATE/);
});
