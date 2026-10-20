import assert from 'node:assert/strict';
import test from 'node:test';
import { handle } from '../src/hooks.server.js';

test('public cache responses carry a valid deployed commit, including cache hits', async () => {
	const original = globalThis.caches;
	const entries = new Map();
	globalThis.caches = {
		default: {
			match: async (request) => entries.get(request.url)?.clone(),
			put: async (request, response) => entries.set(request.url, response.clone())
		}
	};
	try {
		const commit = 'a'.repeat(40);
		const event = {
			request: new Request('https://example.com/podcasts'),
			platform: { env: { CF_VERSION_METADATA: { id: 'version-one', tag: commit } } }
		};
		let renders = 0;
		const resolve = async () => {
			renders++;
			return new Response('page', { headers: { 'cache-control': 'public, s-maxage=300' } });
		};
		assert.equal((await handle({ event, resolve })).headers.get('x-swyx-commit'), commit);
		assert.equal((await handle({ event, resolve })).headers.get('x-swyx-commit'), commit);
		assert.equal(renders, 1);

		event.platform.env.CF_VERSION_METADATA = { id: 'version-two', tag: 'not-a-commit' };
		assert.equal((await handle({ event, resolve })).headers.get('x-swyx-commit'), null);
	} finally {
		globalThis.caches = original;
	}
});
