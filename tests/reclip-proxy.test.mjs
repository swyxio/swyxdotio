import assert from 'node:assert/strict';
import test from 'node:test';
import { createToolsSession } from '../src/lib/server/tools-auth.js';
import { proxyReclip } from '../src/lib/server/reclip-proxy.js';

const secret = 'a-test-secret-with-at-least-thirty-two-bytes';
const owner = { id: 'owner123', email: 'owner@example.com', name: 'Owner' };
const member = { id: 'member123', email: 'member@example.com', name: 'Member' };
const job = '01234567-89ab-4def-8123-456789abcdef';

async function event({
	user,
	path = 'info',
	method = 'POST',
	headers = {},
	body = '{}',
	service
} = {}) {
	const token = user && (await createToolsSession(user, secret));
	const url = new URL(`/tools/reclip/api/${path}`, 'https://swyx.io');
	return {
		url,
		params: { path },
		cookies: { get: () => token },
		platform: {
			env: {
				TOOLS_SESSION_SECRET: secret,
				TOOLS_OWNER_GOOGLE_SUB: owner.id,
				RECLIP_SERVICE: service
			}
		},
		request: new Request(url, {
			method,
			headers: { origin: 'https://swyx.io', 'content-type': 'application/json', ...headers },
			...(method === 'POST' ? { body } : {})
		})
	};
}

test('only the signed-in Google owner can use the downloader', async () => {
	let calls = 0;
	const service = {
		fetch: async () => {
			calls++;
			return Response.json({ ok: true });
		}
	};
	assert.equal((await proxyReclip(await event({ service }))).status, 401);
	assert.equal((await proxyReclip(await event({ user: member, service }))).status, 403);
	assert.equal(calls, 0);
	assert.equal((await proxyReclip(await event({ user: owner, service }))).status, 200);
	assert.equal(calls, 1);
});

test('mutation rejects cross-origin, non-JSON and oversized requests before forwarding', async () => {
	const service = {
		fetch: async () => {
			throw new Error('must not be called');
		}
	};
	assert.equal(
		(
			await proxyReclip(
				await event({ user: owner, service, headers: { origin: 'https://evil.example' } })
			)
		).status,
		403
	);
	assert.equal(
		(
			await proxyReclip(
				await event({ user: owner, service, headers: { 'sec-fetch-site': 'cross-site' } })
			)
		).status,
		403
	);
	assert.equal(
		(
			await proxyReclip(
				await event({ user: owner, service, headers: { 'content-type': 'text/plain' } })
			)
		).status,
		415
	);
	assert.equal(
		(await proxyReclip(await event({ user: owner, service, body: 'x'.repeat(128 * 1024 + 1) })))
			.status,
		413
	);
});

test('proxy only permits downloader routes and strips client credentials and backend cookies', async () => {
	let received;
	const service = {
		fetch: async (request) => {
			received = request;
			return new Response('partial', {
				status: 206,
				headers: { 'content-range': 'bytes 0-6/100', 'set-cookie': 'secret=bad' }
			});
		}
	};
	for (const path of ['admin', 'file/../../admin', `status/${job}/extra`])
		assert.equal(
			(await proxyReclip(await event({ user: owner, method: 'GET', path, service }))).status,
			404
		);
	const response = await proxyReclip(
		await event({
			user: owner,
			method: 'GET',
			path: `file/${job}`,
			service,
			headers: { range: 'bytes=0-6', authorization: 'Bearer attacker', cookie: 'attacker=1' }
		})
	);
	assert.equal(response.status, 206);
	assert.equal(response.headers.get('content-range'), 'bytes 0-6/100');
	assert.equal(response.headers.get('set-cookie'), null);
	assert.equal(received.headers.get('authorization'), null);
	assert.equal(received.headers.get('cookie'), null);
	assert.equal(received.headers.get('range'), 'bytes=0-6');
	assert.equal(received.url, `https://reclip.internal/api/file/${job}`);
});

test('missing private service fails closed', async () => {
	assert.equal((await proxyReclip(await event({ user: owner }))).status, 503);
});
