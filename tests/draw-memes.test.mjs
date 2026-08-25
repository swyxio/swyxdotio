import assert from 'node:assert/strict';
import test from 'node:test';

import {
	DRAW_MEME_TEMPLATES,
	fetchMemeTemplates,
	IMGFLIP_MEMES_ENDPOINT,
	searchMemeTemplates
} from '../src/lib/draw-memes.js';

test('default meme library includes the 20 current popular Imgflip templates', () => {
	assert.equal(DRAW_MEME_TEMPLATES.length, 20);
	assert.equal(new Set(DRAW_MEME_TEMPLATES.map(({ id }) => id)).size, 20);
	assert.equal(DRAW_MEME_TEMPLATES[0].name, 'Drake Hotline Bling');
	assert.equal(DRAW_MEME_TEMPLATES[1].name, 'Two Buttons');
	assert.equal(DRAW_MEME_TEMPLATES[2].name, 'Distracted Boyfriend');

	for (const template of DRAW_MEME_TEMPLATES) {
		assert.match(template.id, /^\d+$/);
		assert.match(template.url, /^https:\/\/i\.imgflip\.com\/.+\.(?:jpg|png)$/);
		assert.ok(template.name.length > 2);
		assert.ok(template.width > 0 && template.height > 0);
		assert.ok(template.keywords.length >= 3);
	}
});

test('meme search matches names and useful aliases without contacting Imgflip', () => {
	assert.equal(searchMemeTemplates('').length, 20);
	assert.equal(searchMemeTemplates('   ').length, 20);
	assert.equal(searchMemeTemplates('DRAKE hotline')[0].id, '181913649');
	assert.equal(searchMemeTemplates('astronaut earth')[0].name, 'Always Has Been');
	assert.equal(searchMemeTemplates('sweating choice')[0].name, 'Two Buttons');
	assert.deepEqual(searchMemeTemplates('this cannot possibly match'), []);
});

test('public meme catalog loads lazily, normalizes API entries, and caches requests', async () => {
	let requests = 0;
	const fetch = async (url) => {
		requests += 1;
		assert.equal(url, IMGFLIP_MEMES_ENDPOINT);
		return {
			ok: true,
			json: async () => ({
				success: true,
				data: {
					memes: [
						{
							id: '181913649',
							name: 'Drake Hotline Bling',
							url: 'https://i.imgflip.com/30b1gx.jpg',
							width: 1200,
							height: 1200,
							captions: 1553250
						},
						{
							id: '55311130',
							name: 'This Is Fine',
							url: 'https://i.imgflip.com/wxica.jpg',
							width: 580,
							height: 282
						},
						{
							id: 'bad-url',
							name: 'Invalid',
							url: 'https://untrusted.example/meme.png',
							width: 100,
							height: 100
						}
					]
				}
			})
		};
	};

	const firstRequest = fetchMemeTemplates({ fetch, force: true });
	const secondRequest = fetchMemeTemplates({ fetch });
	assert.equal(firstRequest, secondRequest);
	const templates = await firstRequest;

	assert.equal(requests, 1);
	assert.equal(templates.length, 2);
	assert.ok(templates[0].keywords.includes('rejection'));
	assert.deepEqual(templates[1].keywords, []);
	assert.equal(searchMemeTemplates('this fine', templates)[0].id, '55311130');
	assert.equal(await fetchMemeTemplates({ fetch }), templates);
});

test('failed or malformed meme requests report useful errors and allow retries', async () => {
	await assert.rejects(
		fetchMemeTemplates({
			fetch: async () => ({ ok: false, status: 503 }),
			force: true
		}),
		/could not be loaded \(503\)/
	);

	await assert.rejects(
		fetchMemeTemplates({
			fetch: async () => ({
				ok: true,
				json: async () => ({ success: false, error_message: 'rate limited' })
			})
		}),
		/rate limited/
	);

	await assert.rejects(
		fetchMemeTemplates({
			fetch: async () => ({
				ok: true,
				json: async () => ({ success: true, data: { memes: [] } })
			})
		}),
		/no usable meme templates/
	);
});
