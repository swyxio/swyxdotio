import assert from 'node:assert/strict';
import test from 'node:test';

import { createPodcastStudioSession } from '../src/lib/podcast-admin-auth.js';
import {
	DRAW_AGENT_MODEL,
	MAX_DRAW_AGENT_REQUEST_BYTES,
	runDrawingAgent
} from '../src/lib/server/draw-agent.js';

const SESSION_SECRET = 'drawing-agent-test-only-session';
const SCREENSHOT = 'data:image/webp;base64,c2FmZS12aWV3cG9ydA==';

/** @param {{ authenticated?: boolean, body?: unknown, ai?: any, origin?: string, contentType?: string, contentLength?: string }} [options] */
async function createEvent(options = {}) {
	const url = new URL('https://swyx.io/tools/api/draw/agent');
	const headers = new Headers({
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
		options.authenticated === false ? undefined : await createPodcastStudioSession(SESSION_SECRET);
	return /** @type {any} */ ({
		url,
		request,
		cookies: { get: () => session },
		platform: {
			env: {
				PODCAST_ADMIN_SESSION_SECRET: SESSION_SECRET,
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
	assert.equal(calls[0][1].messages.at(-1).content[1].image_url.url, SCREENSHOT);
	const raw = await response.text();
	const body = JSON.parse(raw);
	assert.equal(body.toolCalls[0].function.name, 'canvas_bash');
	assert.deepEqual(body.usage, { inputTokens: 120, outputTokens: 18 });
	assert.equal(raw.includes(SESSION_SECRET), false);
	assert.equal(raw.includes(SCREENSHOT), false);
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
