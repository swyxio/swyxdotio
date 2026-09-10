import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchCardImage } from '../src/lib/og/images.js';
import { handle } from '../src/hooks.server.js';

test('image deadline includes a stalled body, even when it ignores abort', async () => {
	let cancelled = false;
	const start = performance.now();
	const image = await fetchCardImage(
		'https://example.test/image.png',
		async () =>
			new Response(
				new ReadableStream({
					cancel() {
						cancelled = true;
					}
				}),
				{
					headers: { 'content-type': 'image/png' }
				}
			),
		20
	);
	assert.equal(image, undefined);
	assert.ok(performance.now() - start < 500);
	assert.equal(cancelled, true);
});

test('stream size is bounded without trusting Content-Length', async () => {
	let pulls = 0;
	let cancelled = false;
	const image = await fetchCardImage(
		'https://example.test/image.png',
		async () =>
			new Response(
				new ReadableStream({
					pull(controller) {
						pulls++;
						controller.enqueue(new Uint8Array(1024 * 1024));
					},
					cancel() {
						cancelled = true;
					}
				}),
				{ headers: { 'content-type': 'image/png', 'content-length': '100' } }
			)
	);
	assert.equal(image, undefined);
	assert.ok(pulls <= 6);
	assert.equal(cancelled, true);
});

test('tiny compressed images with excessive decoded dimensions are rejected', async () => {
	const bytes = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1kAAAAASUVORK5CYII=',
		'base64'
	);
	bytes.writeUInt32BE(10000, 16);
	bytes.writeUInt32BE(10000, 20);
	assert.equal(
		await fetchCardImage(
			'https://example.test/image.png',
			async () => new Response(bytes, { headers: { 'content-type': 'image/png' } })
		),
		undefined
	);
});

test('OG query noise shares cache while content generation still invalidates', async () => {
	const original = globalThis.caches;
	const entries = new Map();
	let generation = 'one';
	let renders = 0;
	globalThis.caches = {
		default: {
			async match(req) {
				return entries.get(req.url)?.clone();
			},
			async put(req, response) {
				entries.set(req.url, response);
			}
		}
	};
	const request = async (query) =>
		handle({
			event: {
				request: new Request(`https://swyx.io/og/page/home.png?${query}`),
				platform: {
					env: {
						CF_VERSION_METADATA: { id: 'version-one' },
						CONTENT_MANIFEST: {
							async get() {
								return generation;
							}
						}
					}
				}
			},
			resolve: async () => {
				renders++;
				return new Response('PNG', { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
			}
		});
	try {
		await request('v=one');
		await request('v=two&random=three');
		assert.equal(renders, 1);
		generation = 'two';
		await request('v=two');
		assert.equal(renders, 2);
	} finally {
		globalThis.caches = original;
	}
});
