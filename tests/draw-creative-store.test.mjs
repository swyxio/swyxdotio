import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestAiLedger } from './helpers/tools-ai-ledger.mjs';
import { createToolsSession, toolsSessionCookieName } from '../src/lib/server/tools-auth.js';
import {
	forwardCreativeRequest,
	validateCreativeAsset
} from '../src/lib/server/draw-creative-store.js';
import { CREATIVE_LIMITS, readCreativeBody } from '../workers/draw/creative-library.js';
import { referenceCatalog, emptyFewShot } from '../src/lib/draw-creative-examples.js';

const SECRET = 'creative-store-test-secret-longer-than-32-bytes';
const ALICE = '111111111111111111111';
const BOB = '222222222222222222222';
const PNG = new Uint8Array(
	Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4i8AAAAASUVORK5CYII=',
		'base64'
	)
);

function environment({ assets = true } = {}) {
	const objects = new Map();
	const calls = [];
	const binaries = new Map();
	const bucket = {
		put: async (key, data) => {
			binaries.set(key, new Uint8Array(data).slice());
		},
		get: async (key) => {
			const data = binaries.get(key);
			return data ? { body: new Response(data).body, size: data.byteLength } : null;
		},
		delete: async (key) => {
			binaries.delete(key);
		}
	};
	const namespace = {
		idFromName: (name) => name,
		get: (name) => {
			calls.push(name);
			if (!objects.has(name)) objects.set(name, createTestAiLedger());
			return objects.get(name).object;
		}
	};
	return {
		env: {
			TOOLS_SESSION_SECRET: SECRET,
			TOOLS_OWNER_GOOGLE_SUB: ALICE,
			DRAW_PAGES: namespace,
			...(assets ? { DRAW_ASSETS: bucket } : {})
		},
		namespace,
		objects,
		calls,
		binaries,
		bucket
	};
}
async function event(
	store,
	path,
	{
		user = ALICE,
		expected = user,
		method = 'GET',
		body,
		headers = {},
		origin = 'https://swyx.io'
	} = {}
) {
	const token = user
		? await createToolsSession({ id: user, name: 'Same Name', email: 'same@example.com' }, SECRET)
		: undefined;
	const url = new URL(`https://swyx.io/tools/api/draw/creative${path}`);
	return {
		url,
		request: new Request(url, {
			method,
			headers: { Origin: origin, ...(expected ? { 'X-Tools-User': expected } : {}), ...headers },
			...(body === undefined
				? {}
				: { body: body instanceof Uint8Array ? body : JSON.stringify(body) })
		}),
		cookies: { get: (name) => (name === toolsSessionCookieName() ? token : undefined) },
		platform: { env: store.env }
	};
}
async function request(store, path, options) {
	return forwardCreativeRequest(await event(store, path, options));
}
async function create(store, kind, data, user = ALICE) {
	const result = await request(store, `/records/${kind}`, { user, method: 'POST', body: { data } });
	assert.equal(result.status, 201, await result.clone().text());
	return result.json();
}
async function upload(store, options = {}) {
	return request(store, '/assets', {
		method: 'POST',
		body: PNG,
		headers: {
			'Content-Type': 'image/png',
			'X-Asset-Name': encodeURIComponent('Logo α.png'),
			'X-Asset-Role': 'logo'
		},
		...options
	});
}
async function internal(store, path, body, user = ALICE) {
	return store.namespace.get(`creative:google:${user}`).fetch(
		new Request(`https://drawing.internal/creative${path}`, {
			method: 'POST',
			body: JSON.stringify(body)
		})
	);
}

test('private typed records survive object reconstruction and every account uses its own creative namespace', async () => {
	const store = environment();
	const kit = await create(store, 'kits', {
		name: 'My kit',
		brand: 'ls',
		prompt: 'Private house style',
		colors: { background: '#000', foreground: '#fff', accent: '#acf' }
	});
	assert.equal(kit.activeRevision, 1);
	const library = await (await request(store, '/library')).json();
	assert.equal(library.records.kits[0].id, kit.id);
	assert.equal(library.assetsAvailable, true);
	assert.equal(library.limits.assetCount, 100);
	assert.deepEqual(
		(await (await request(store, '/library', { user: BOB })).json()).records.kits,
		[]
	);
	assert.equal(store.calls.includes('personal'), false);
	assert.equal(store.calls.includes(`google:${ALICE}`), false);
	const { sql } = store.objects.get(`creative:google:${ALICE}`);
	const { CreativeLibrary } = await import('../workers/draw/creative-library.js');
	const restored = await new CreativeLibrary(sql).fetch(
		new Request(`https://drawing.internal/creative/records/kits/${kit.id}`)
	);
	assert.equal((await restored.json()).data.prompt, 'Private house style');
});

test('guessed IDs, client tenant fields, and same email/name never cross record or asset boundaries', async () => {
	const store = environment();
	const kit = await create(store, 'kits', { name: 'Private kit' });
	const asset = await (await upload(store)).json();
	for (const method of ['GET', 'PUT', 'DELETE']) {
		const result = await request(
			store,
			`/records/kits/${kit.id}?user=${ALICE}&workspace=personal`,
			{
				user: BOB,
				method,
				...(method === 'GET' ? {} : { body: { revision: 1, data: { name: 'stolen' } } })
			}
		);
		assert.equal(result.status, 404, method);
	}
	assert.equal((await request(store, `/assets/${asset.id}`, { user: BOB })).status, 404);
	assert.equal(
		(
			await request(store, `/records/kits`, {
				user: BOB,
				method: 'POST',
				body: { tenantId: ALICE, data: { name: 'fake' } }
			})
		).status,
		400
	);
	assert.equal(
		(
			await request(store, `/records/briefs`, {
				user: BOB,
				method: 'POST',
				body: { data: { name: 'foreign ref', kitId: kit.id } }
			})
		).status,
		400
	);
	assert.equal(
		(
			await request(store, `/records/kits`, {
				user: BOB,
				method: 'POST',
				body: { data: { name: 'foreign asset', assetIds: [asset.id] } }
			})
		).status,
		400
	);
	assert.equal(store.binaries.has(`creative/google:${ALICE}/${asset.id}`), true);
});

test('anonymous, stale account, and cross-origin requests fail before storage is touched', async () => {
	const store = environment();
	assert.equal((await request(store, '/library', { user: null })).status, 401);
	for (const method of ['GET', 'POST', 'DELETE']) {
		const result = await request(store, '/library', { method, expected: BOB });
		assert.equal(result.status, 409);
		assert.equal((await result.json()).code, 'account_changed');
	}
	assert.equal(
		(
			await request(store, '/records/kits', {
				method: 'POST',
				expected: null,
				body: { data: { name: 'invalid' } }
			})
		).status,
		409
	);
	await assert.rejects(
		() =>
			request(store, '/records/kits', {
				method: 'POST',
				origin: 'https://evil.example',
				body: { data: { name: 'invalid' } }
			}),
		{ status: 403 }
	);
	assert.equal(store.calls.length, 0);
	assert.equal((await request(store, '/library', { expected: null })).status, 200);
});

test('house drafts are immutable snapshots, promotion is explicit, and stale writes cannot overwrite', async () => {
	const store = environment();
	const kit = await create(store, 'kits', { name: 'LS', prompt: 'Original' });
	const draftResponse = await request(store, `/records/kits/${kit.id}`, {
		method: 'PUT',
		body: { revision: 1, data: { ...kit.data, prompt: 'Draft' } }
	});
	const draft = await draftResponse.json();
	assert.equal(draft.revision, 2);
	assert.equal(draft.activeRevision, 1);
	assert.equal(
		(await (await request(store, `/records/kits/${kit.id}/revisions/1`)).json()).data.prompt,
		'Original'
	);
	assert.equal(
		(
			await request(store, `/records/kits/${kit.id}`, {
				method: 'PUT',
				body: { revision: 1, data: { name: 'stale' } }
			})
		).status,
		409
	);
	const brief = await create(store, 'briefs', {
		name: 'Pinned episode',
		kitId: kit.id,
		kitRevision: 1
	});
	const promoted = await (
		await request(store, `/records/kits/${kit.id}/promote`, {
			method: 'POST',
			body: { revision: 2, houseRevision: 2 }
		})
	).json();
	assert.equal(promoted.activeRevision, 2);
	assert.equal(promoted.revision, 3);
	assert.equal(
		(await (await request(store, `/records/briefs/${brief.id}`)).json()).data.kitRevision,
		1
	);
	assert.equal(
		(
			await request(store, `/records/kits/${kit.id}/promote`, {
				method: 'POST',
				body: { revision: 2, houseRevision: 1 }
			})
		).status,
		409
	);
	const rollback = await (
		await request(store, `/records/kits/${kit.id}/promote`, {
			method: 'POST',
			body: { revision: 3, houseRevision: 1 }
		})
	).json();
	assert.equal(rollback.activeRevision, 1);
	assert.equal(
		(await (await request(store, `/records/kits/${kit.id}/revisions`)).json()).revisions.length,
		2
	);
});

test('concurrent writes based on the same revision have exactly one winner', async () => {
	const store = environment();
	const brief = await create(store, 'briefs', { name: 'Episode' });
	const results = await Promise.all(
		['A', 'B'].map((name) =>
			request(store, `/records/briefs/${brief.id}`, {
				method: 'PUT',
				body: { revision: 1, data: { name } }
			})
		)
	);
	assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
});

test('typed compositions, feedback, channel references and exact source evidence persist without a job scheduler', async () => {
	const store = environment();
	const asset = await (await upload(store)).json();
	const kit = await create(store, 'kits', { name: 'LS', assetIds: [asset.id] });
	const channel = await create(store, 'channels', {
		name: 'LS',
		channelId: 'UC123',
		url: 'https://www.youtube.com/@LatentSpace',
		kitId: kit.id,
		references: [
			{
				videoId: 'abcdefghijk',
				title: 'Past video',
				thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
				note: 'Large face'
			}
		]
	});
	const brief = await create(store, 'briefs', {
		name: 'Episode',
		channelId: channel.id,
		peopleAssetIds: [asset.id],
		peopleNames: [{ assetId: asset.id, name: 'Zoë / 李' }],
		transcript: 'Useful quote',
		analysis: {
			quotes: [
				{
					id: 'q1',
					text: 'Useful quote',
					startOffset: 0,
					endOffset: 12,
					provenance: 'source-exact',
					reviewRequired: true
				}
			],
			titles: [
				{
					id: 't1',
					title: 'Useful title',
					hook: 'Useful hook',
					evidenceIds: ['q1'],
					provenance: 'generated',
					reviewRequired: true
				}
			],
			chunks: [{ index: 0, startOffset: 0, endOffset: 12, status: 'succeeded' }]
		}
	});
	assert.equal(brief.data.peopleNames[0].name, 'Zoë / 李');
	const composition = await create(store, 'compositions', {
		briefId: brief.id,
		direction: 'editorial',
		headline: 'A useful hook',
		kitId: kit.id,
		kitRevision: 1,
		recipe: {
			format: 'youtube',
			direction: 'editorial',
			headline: 'A useful hook',
			logos: [{ id: 'logo', assetId: asset.id, role: 'brand' }],
			kit: { brand: 'ls', background: '#000', fontFamily: 5 }
		},
		generationResultId: 'external-result'
	});
	const feedback = await create(store, 'feedback', {
		compositionId: composition.id,
		text: 'Larger face',
		rating: 'favorite',
		scope: 'house'
	});
	assert.equal(feedback.data.text, 'Larger face');
	assert.equal(
		(await (await request(store, `/records/kits/${kit.id}`)).json()).revision,
		1,
		'feedback never changes house style'
	);
	assert.equal(
		(
			await request(store, `/records/briefs/${brief.id}`, {
				method: 'PUT',
				body: {
					revision: 1,
					data: {
						name: 'Bad evidence',
						transcript: 'Original',
						analysis: {
							quotes: [
								{
									id: 'q',
									text: 'Invented',
									startOffset: 0,
									endOffset: 8,
									provenance: 'source-exact',
									reviewRequired: true
								}
							]
						}
					}
				}
			})
		).status,
		400
	);
});

test('record and asset deletion require the current revision and guard current and historical references', async () => {
	const store = environment();
	const asset = await (await upload(store)).json();
	const kit = await create(store, 'kits', { name: 'Kit', assetIds: [asset.id] });
	assert.equal(
		(
			await request(store, `/assets/${asset.id}`, {
				method: 'DELETE',
				body: { revision: asset.revision }
			})
		).status,
		409
	);
	await request(store, `/records/kits/${kit.id}`, {
		method: 'PUT',
		body: { revision: 1, data: { name: 'Kit without asset' } }
	});
	assert.equal(
		(
			await request(store, `/assets/${asset.id}`, {
				method: 'DELETE',
				body: { revision: asset.revision }
			})
		).status,
		409,
		'immutable old snapshots still use asset'
	);
	assert.equal(
		(await request(store, `/records/kits/${kit.id}`, { method: 'DELETE', body: { revision: 1 } }))
			.status,
		409
	);
	assert.equal(
		(await request(store, `/records/kits/${kit.id}`, { method: 'DELETE', body: { revision: 2 } }))
			.status,
		200
	);
	assert.equal(
		(await request(store, `/assets/${asset.id}`, { method: 'DELETE', body: { revision: 1 } }))
			.status,
		409
	);
	assert.equal(
		(
			await request(store, `/assets/${asset.id}`, {
				method: 'DELETE',
				body: { revision: asset.revision }
			})
		).status,
		200
	);
	assert.equal(store.binaries.size, 0);
	assert.equal((await request(store, `/assets/${asset.id}`)).status, 404);
});

test('downloaded originals are authenticated, uncacheable, MIME-pinned and do not expose object URLs', async () => {
	const store = environment();
	const uploaded = await upload(store);
	assert.equal(uploaded.status, 201);
	const asset = await uploaded.json();
	assert.equal(asset.status, 'ready');
	assert.equal(asset.name, 'Logo α.png');
	assert.equal('url' in asset, false);
	const download = await request(store, `/assets/${asset.id}`);
	assert.deepEqual(new Uint8Array(await download.arrayBuffer()), PNG);
	assert.equal(download.headers.get('cache-control'), 'private, no-store');
	assert.equal(download.headers.get('content-type'), 'image/png');
	assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
	assert.match(download.headers.get('content-security-policy'), /sandbox/);
});

test('missing private bucket reports honest asset 503 while metadata continues to work', async () => {
	const store = environment({ assets: false });
	store.env.PODCAST_MEDIA = store.bucket;
	assert.equal((await upload(store)).status, 503);
	await create(store, 'kits', { name: 'Metadata only' });
	assert.equal((await (await request(store, '/library')).json()).assetsAvailable, false);
	assert.equal(store.binaries.size, 0);
});

test('invalid asset formats, SVG, oversized bytes, forged MIME and internal paths are rejected', async () => {
	const store = environment();
	assert.equal(
		(await upload(store, { body: new TextEncoder().encode('<script>alert(1)</script>') })).status,
		415
	);
	assert.equal(
		(
			await upload(store, {
				headers: { 'Content-Type': 'image/svg+xml', 'X-Asset-Name': 'logo.svg' }
			})
		).status,
		415
	);
	assert.equal(
		(
			await upload(store, {
				headers: {
					'Content-Type': 'image/png',
					'X-Asset-Name': 'logo.png',
					'Content-Length': String(CREATIVE_LIMITS.assetBytes + 1)
				}
			})
		).status,
		413
	);
	assert.equal(
		(
			await request(store, '/_assets/reserve', {
				method: 'POST',
				body: { id: crypto.randomUUID() }
			})
		).status,
		404
	);
	assert.equal(store.binaries.size, 0);
});

test('WOFF2 originals are stored inertly, forced to download, and never promise canvas support', async () => {
	const store = environment();
	const woff = new Uint8Array(50);
	woff.set(new TextEncoder().encode('wOF2'));
	const view = new DataView(woff.buffer);
	view.setUint32(8, woff.byteLength);
	view.setUint16(12, 1);
	view.setUint32(16, 100);
	view.setUint32(20, 2);
	const uploaded = await upload(store, {
		body: woff,
		headers: {
			'Content-Type': 'font/woff2',
			'X-Asset-Name': 'licensed.woff2',
			'X-Asset-Role': 'font'
		}
	});
	assert.equal(uploaded.status, 201);
	const font = await uploaded.json();
	assert.equal(font.canvasSupport, 'unavailable');
	assert.match(
		(await request(store, `/assets/${font.id}`)).headers.get('content-disposition'),
		/^attachment;/
	);
	assert.equal(validateCreativeAsset(woff, 'image/png'), false);
	view.setUint32(8, 999);
	assert.equal(validateCreativeAsset(woff, 'font/woff2'), false);
});

test('failed R2 writes release reservations after confirmed cleanup', async () => {
	const store = environment();
	store.bucket.put = async () => {
		throw new Error('Storage failure');
	};
	assert.equal((await upload(store)).status, 503);
	assert.equal((await (await request(store, '/library')).json()).assets.length, 0);
});

test('upload reservations count against quota before binary I/O and deleting assets cannot gain new references', async () => {
	const store = environment();
	for (let index = 0; index < CREATIVE_LIMITS.assetCount; index++) {
		const reserved = await internal(store, '/_assets/reserve', {
			id: crypto.randomUUID(),
			name: 'pending.png',
			mimeType: 'image/png',
			role: 'logo',
			size: 10
		});
		assert.equal(reserved.status, 201);
	}
	assert.equal((await upload(store)).status, 409);
	assert.equal(store.binaries.size, 0);
	const other = environment();
	const asset = await (await upload(other)).json();
	await internal(other, `/_assets/${asset.id}/deleting`, { revision: asset.revision });
	assert.equal((await request(other, `/assets/${asset.id}`)).status, 409);
	assert.equal(
		(
			await request(other, '/records/kits', {
				method: 'POST',
				body: { data: { name: 'Late reference', assetIds: [asset.id] } }
			})
		).status,
		400
	);
});

test('strict schemas reject arbitrary ownership, scene bytes, unsafe URLs, unknown kinds and excessive data', async () => {
	const store = environment();
	for (const data of [
		{ name: 'Bad', owner: ALICE },
		{ name: 'Bad', colors: { background: 'url(javascript:alert(1))' } },
		{ name: 'Bad', prompt: 'x'.repeat(30001) },
		{ name: 'Bad', fontFamily: 999 }
	]) {
		assert.equal(
			(await request(store, '/records/kits', { method: 'POST', body: { data } })).status,
			400
		);
	}
	assert.equal(
		(await request(store, '/records/anything', { method: 'POST', body: { data: {} } })).status,
		404
	);
	assert.equal(
		(
			await request(store, '/records/channels', {
				method: 'POST',
				body: { data: { name: 'Bad', url: 'javascript:alert(1)' } }
			})
		).status,
		400
	);
	assert.equal(
		(
			await request(store, '/records/kits', {
				method: 'POST',
				body: { data: { name: 'Bad', elements: [], files: {} } }
			})
		).status,
		400
	);
	for (let index = 0; index < CREATIVE_LIMITS.records.kits; index++)
		await create(store, 'kits', { name: `Kit ${index}` });
	assert.equal(
		(
			await request(store, '/records/kits', {
				method: 'POST',
				body: { data: { name: 'Too many' } }
			})
		).status,
		409
	);
});

test('bounded request reader rejects chunked bodies without trusting Content-Length', async () => {
	let cancelled = false;
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(new Uint8Array(10));
			controller.enqueue(new Uint8Array(10));
		},
		cancel() {
			cancelled = true;
		}
	});
	await assert.rejects(
		() =>
			readCreativeBody(
				new Request('https://drawing.internal', { method: 'POST', body: stream, duplex: 'half' }),
				15
			),
		{ status: 413 }
	);
	assert.equal(cancelled, true);
});

test('saved modifiers, references and generation snapshots share private assets without duplicating bytes or jobs', async () => {
	const store = environment();
	const asset = await (await upload(store)).json();
	await create(store, 'saved', { name: 'Contrast', kind: 'modifier', text: 'High contrast' });
	await create(store, 'saved', { name: 'Logo', kind: 'reference', assetId: asset.id });
	const saved = await create(store, 'saved', {
		name: 'Generation',
		kind: 'generation',
		assetId: asset.id,
		generation: {
			id: 'generation-123',
			prompt: 'A visual',
			modelId: 'model',
			adapterId: 'adapter',
			modelKind: 'text-to-image',
			createdAt: 1787690000000,
			qualityNote: 'Mock provider result',
			reportedUsd: 0.02,
			width: 1280,
			height: 720,
			modelSettings: { seed: 42 },
			referenceImages: [{ assetId: asset.id, mimeType: 'image/png' }],
			context: { referenceAssetIds: [asset.id] }
		}
	});
	assert.equal(saved.data.generation.modelSettings.seed, 42);
	assert.equal(saved.data.generation.modelKind, 'text-to-image');
	assert.equal(saved.data.generation.createdAt, 1787690000000);
	for (const invalid of [
		{ modelKind: 'image' },
		{ createdAt: '2026-08-25' },
		{ width: -1 },
		{ height: 1.5 },
		{ reportedUsd: -1 }
	]) {
		const response = await request(store, '/records/saved', {
			method: 'POST',
			body: {
				data: {
					name: 'Invalid generation',
					kind: 'generation',
					generation: { ...saved.data.generation, ...invalid }
				}
			}
		});
		assert.equal(response.status, 400);
	}
	assert.equal(
		(await (await request(store, '/library', { user: BOB })).json()).records.saved.length,
		0
	);
	assert.equal(
		(
			await request(store, '/records/saved', {
				method: 'POST',
				body: {
					data: {
						name: 'Unsafe',
						kind: 'generation',
						generation: {
							id: 'bad',
							modelId: 'model',
							prompt: 'Prompt',
							imageUrl: 'https://private.example/image.png'
						}
					}
				}
			})
		).status,
		400
	);
});

test('ambiguous finalization preserves committed bytes and metadata instead of deleting a successful upload', async () => {
	const store = environment();
	const originalGet = store.namespace.get;
	store.namespace.get = (name) => {
		const object = originalGet(name);
		return {
			fetch: async (request) => {
				const response = await object.fetch(request);
				if (new URL(request.url).pathname.endsWith('/ready'))
					throw new Error('Lost response after commit');
				return response;
			}
		};
	};
	assert.equal((await upload(store)).status, 503);
	const assets = (await (await request(store, '/library')).json()).assets;
	assert.equal(assets.length, 1);
	assert.equal(assets[0].status, 'ready');
	assert.equal((await request(store, `/assets/${assets[0].id}`)).status, 200);
});

test('the last allowed house draft can still be promoted or rolled back without duplicating snapshots', async () => {
	const store = environment();
	let kit = await create(store, 'kits', { name: 'Versioned house', prompt: 'First' });
	for (let revision = 2; revision <= CREATIVE_LIMITS.kitRevisions; revision++) {
		const result = await request(store, `/records/kits/${kit.id}`, {
			method: 'PUT',
			body: {
				revision: kit.revision,
				data: { name: 'Versioned house', prompt: `Version ${revision}` }
			}
		});
		assert.equal(result.status, 200);
		kit = await result.json();
	}
	assert.equal(
		(
			await request(store, `/records/kits/${kit.id}`, {
				method: 'PUT',
				body: { revision: kit.revision, data: { name: 'Over limit' } }
			})
		).status,
		409
	);
	const active = await (
		await request(store, `/records/kits/${kit.id}/promote`, {
			method: 'POST',
			body: { revision: kit.revision, houseRevision: 100 }
		})
	).json();
	assert.equal(active.activeRevision, 100);
	const rollback = await request(store, `/records/kits/${kit.id}/promote`, {
		method: 'POST',
		body: { revision: active.revision, houseRevision: 1 }
	});
	assert.equal(rollback.status, 200);
	assert.equal(
		(await (await request(store, `/records/kits/${kit.id}/revisions`)).json()).revisions.length,
		100
	);
});

test('metadata quota counts UTF-8 bytes and inline binary data is rejected in any declared text field', async () => {
	const store = environment();
	for (let index = 0; index < 16; index++)
		await create(store, 'briefs', { name: `Long source ${index}`, transcript: 'x'.repeat(500000) });
	const full = await request(store, '/records/briefs', {
		method: 'POST',
		body: { data: { name: 'Over quota', transcript: 'x'.repeat(500000) } }
	});
	assert.equal(full.status, 409);
	assert.equal((await full.json()).code, 'quota_exceeded');
	const binary = await request(store, '/records/saved', {
		method: 'POST',
		body: { data: { name: 'Inline binary', kind: 'modifier', text: 'data:image/png;base64,AAAA' } }
	});
	assert.equal(binary.status, 400);
	const settings = await request(store, '/records/saved', {
		method: 'POST',
		body: {
			data: {
				name: 'URL setting',
				kind: 'generation',
				generation: {
					id: 'generation',
					prompt: 'Test',
					modelId: 'm',
					modelSettings: { image_url: 'https://private.example/image.png' }
				}
			}
		}
	});
	assert.equal(settings.status, 400);
});

test('personal few-shot selections and prepublish metadata survive kit drafts without changing pinned briefs or crossing tenants', async () => {
	const store = environment();
	const example = referenceCatalog.examples.find((item) => item.thumbnailText);
	const fewShot = {
		...emptyFewShot(),
		examples: [{ id: example.id, fields: ['title'], note: 'Private editorial feedback.' }]
	};
	const kit = await create(store, 'kits', { name: 'House examples', fewShot });
	const videoMetadata = {
		id: 'abcdefghijk',
		url: 'https://www.youtube.com/watch?v=abcdefghijk',
		title: 'Private prepublish title',
		description: 'Private episode description.',
		channelId: 'UC' + 'a'.repeat(22),
		channelTitle: 'My channel',
		thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
		duration: 'PT1H2M3S',
		publishedAt: '2026-08-26T00:00:00Z',
		privacyStatus: 'unlisted',
		provenance: 'youtube-data-api',
		retrievedAt: '2026-08-26T01:00:00Z'
	};
	const brief = await create(store, 'briefs', {
		name: 'Next episode',
		kitId: kit.id,
		kitRevision: 1,
		description: 'My editable description.',
		fewShot,
		videoMetadata
	});
	const nextFewShot = {
		...fewShot,
		examples: [{ ...fewShot.examples[0], fields: ['title', 'hook'], note: 'New house feedback.' }]
	};
	const update = await request(store, `/records/kits/${kit.id}`, {
		method: 'PUT',
		body: { revision: 1, data: { ...kit.data, fewShot: nextFewShot } }
	});
	assert.equal(update.status, 200);
	assert.deepEqual(
		(await (await request(store, `/records/kits/${kit.id}/revisions/1`)).json()).data.fewShot,
		fewShot
	);
	assert.deepEqual(
		(await (await request(store, `/records/kits/${kit.id}/revisions/2`)).json()).data.fewShot,
		nextFewShot
	);
	const restored = await (await request(store, `/records/briefs/${brief.id}`)).json();
	assert.deepEqual(restored.data.fewShot, fewShot);
	assert.deepEqual(restored.data.videoMetadata, videoMetadata);
	assert.equal(restored.data.description, 'My editable description.');
	assert.equal(restored.data.kitRevision, 1);
	for (const path of [`/records/briefs/${brief.id}`, `/records/kits/${kit.id}/revisions/1`])
		assert.equal((await request(store, path, { user: BOB })).status, 404);
	const otherLibrary = await (await request(store, '/library', { user: BOB })).text();
	for (const secret of [
		'Private editorial feedback',
		'Private prepublish title',
		'abcdefghijk',
		'My editable description'
	])
		assert.equal(otherLibrary.includes(secret), false);
	const revised = await request(store, `/records/briefs/${brief.id}`, {
		method: 'PUT',
		body: { revision: 1, data: { ...restored.data, description: 'Revised editable copy.' } }
	});
	assert.equal(revised.status, 200);
	assert.deepEqual(
		(await revised.json()).data.videoMetadata,
		videoMetadata,
		'editing the brief must not overwrite source-backed metadata'
	);
});

test('stored few-shot/metadata fields enforce their explicit shapes and limits without allowing inline media', async () => {
	const store = environment();
	const id = referenceCatalog.examples[0].id;
	const selection = { ...emptyFewShot(), examples: [{ id, fields: ['title'] }] };
	for (const fewShot of [
		{
			...selection,
			examples: referenceCatalog.examples
				.slice(0, 7)
				.map((example) => ({ id: example.id, fields: ['title'] }))
		},
		{ ...selection, examples: [{ id, fields: ['other'] }] },
		{ ...selection, examples: [{ id, fields: ['title'], note: 'x'.repeat(1001) }] },
		{
			...selection,
			examples: [{ id, fields: ['title'], imageUrl: 'https://private.example/image.png' }]
		},
		{ ...selection, examples: [{ id, fields: ['title'], note: 'data:image/png;base64,AAAA' }] }
	])
		assert.equal(
			(
				await request(store, '/records/kits', {
					method: 'POST',
					body: { data: { name: 'Invalid selection', fewShot } }
				})
			).status,
			400
		);
	const minimal = {
		id: 'abcdefghijk',
		url: 'https://www.youtube.com/watch?v=abcdefghijk',
		title: 'Title only',
		provenance: 'youtube-oembed',
		retrievedAt: '2026-08-26T01:00:00Z'
	};
	const brief = await create(store, 'briefs', { name: 'Limited metadata', videoMetadata: minimal });
	assert.equal('description' in brief.data.videoMetadata, false);
	assert.equal('privacyStatus' in brief.data.videoMetadata, false);
	for (const videoMetadata of [
		{ ...minimal, description: 'x'.repeat(20001) },
		{ ...minimal, privacyStatus: 'guessed-unlisted' },
		{ ...minimal, url: 'javascript:alert(1)' },
		{ ...minimal, imageData: 'data:image/png;base64,AAAA' },
		{ ...minimal, provenance: 'guessed-from-channel' }
	])
		assert.equal(
			(
				await request(store, '/records/briefs', {
					method: 'POST',
					body: { data: { name: 'Invalid metadata', videoMetadata } }
				})
			).status,
			400
		);
});
