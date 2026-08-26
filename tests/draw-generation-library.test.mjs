import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestAiLedger } from './helpers/tools-ai-ledger.mjs';
import { createToolsSession } from '../src/lib/server/tools-auth.js';
import { forwardCreativeRequest } from '../src/lib/server/draw-creative-store.js';
import {
	loadDrawingGenerationLibrary,
	saveDrawingGenerationLibraryEntry,
	removeDrawingGenerationLibraryEntry
} from '../src/lib/draw-generation-library.js';

const USER = '222222222222222222222';
const SECRET = 'generation-library-test-secret-at-least32chars';
const IMAGE =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4i8AAAAASUVORK5CYII=';

async function library() {
	const objects = new Map(),
		binaries = new Map(),
		requests = [];
	const token = await createToolsSession(
		{ id: USER, name: 'Fixture', email: 'fixture@example.com' },
		SECRET
	);
	const env = {
		TOOLS_SESSION_SECRET: SECRET,
		DRAW_PAGES: {
			idFromName: (name) => name,
			get(name) {
				if (!objects.has(name)) objects.set(name, createTestAiLedger());
				return objects.get(name).object;
			}
		},
		DRAW_ASSETS: {
			async put(key, bytes) {
				binaries.set(key, new Uint8Array(bytes));
			},
			async get(key) {
				const bytes = binaries.get(key);
				return bytes ? { body: new Response(bytes).body, size: bytes.byteLength } : null;
			},
			async delete(key) {
				binaries.delete(key);
			}
		}
	};
	const fetcher = async (path, options = {}) => {
		requests.push({
			path,
			method: options.method || 'GET',
			body: typeof options.body === 'string' ? options.body : undefined
		});
		const url = new URL(path, 'https://draw.test');
		return forwardCreativeRequest({
			url,
			request: new Request(url, {
				...options,
				headers: { Origin: url.origin, ...options.headers }
			}),
			cookies: { get: () => token },
			platform: { env }
		});
	};
	return { fetcher, requests, binaries };
}

test('modifiers use the real private record route and listing never fetches media', async () => {
	const store = await library();
	const entry = await saveDrawingGenerationLibraryEntry(
		USER,
		{ kind: 'modifier', name: 'Lighting', text: 'Soft side lighting' },
		store.fetcher
	);
	assert.equal(entry.text, 'Soft side lighting');
	assert.deepEqual(await loadDrawingGenerationLibrary(USER, store.fetcher), [entry]);
	assert.equal(store.binaries.size, 0);
	assert.ok(store.requests.every((request) => !request.path.includes('/assets')));
	await removeDrawingGenerationLibraryEntry(USER, entry, store.fetcher);
	assert.deepEqual(await loadDrawingGenerationLibrary(USER, store.fetcher), []);
});

test('saved raster generation uploads private bytes explicitly but stores only canonical metadata', async () => {
	const store = await library();
	const generation = {
		id: 'result',
		prompt: 'Ceramic cup',
		modelId: 'nano-banana-2',
		adapterId: 'fal',
		modelKind: 'image-edit',
		modelLabel: 'Nano Banana 2',
		createdAt: Date.now(),
		dataURL: IMAGE,
		mimeType: 'image/png',
		modelSettings: { seed: 42 },
		qualityNote: 'Soft texture',
		referenceImages: [{ dataURL: IMAGE, mimeType: 'image/png' }]
	};
	const entry = await saveDrawingGenerationLibraryEntry(
		USER,
		{ kind: 'generation', name: 'Cup', generation },
		store.fetcher
	);
	assert.equal(entry.generation.createdAt, generation.createdAt);
	assert.equal(entry.generation.modelKind, 'image-edit');
	assert.equal(entry.generation.qualityNote, 'Soft texture');
	assert.equal(store.binaries.size, 2);
	assert.ok(entry.generation.assetId);
	assert.ok(entry.generation.referenceImages[0].assetId);
	assert.ok(
		store.requests
			.filter((request) => request.body)
			.every((request) => !request.body.includes('data:'))
	);
	const before = store.requests.length;
	await loadDrawingGenerationLibrary(USER, store.fetcher);
	assert.deepEqual(
		store.requests.slice(before).map((request) => request.path),
		['/tools/api/draw/creative/library']
	);
});

test('saved video is recipe-only without retaining or fetching an expiring provider URL', async () => {
	const store = await library();
	const entry = await saveDrawingGenerationLibraryEntry(
		USER,
		{
			kind: 'generation',
			name: 'Motion',
			generation: {
				id: 'video',
				prompt: 'Slow camera pan',
				modelId: 'grok-imagine-video',
				modelKind: 'image-to-video',
				modelLabel: 'Grok',
				createdAt: Date.now(),
				dataURL: 'https://media.example.test/private-expiring.mp4',
				mimeType: 'video/mp4',
				referenceImages: []
			}
		},
		store.fetcher
	);
	assert.equal(entry.generation.modelKind, 'image-to-video');
	assert.equal(store.binaries.size, 0);
	assert.ok(store.requests.every((request) => !request.path.includes('/assets')));
	assert.ok(
		store.requests
			.filter((request) => request.body)
			.every((request) => !request.body.includes('https://media.'))
	);
});
