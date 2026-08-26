import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { authenticateTools, TEST_TOOLS_OWNER } from './helpers/tools-auth.js';

/** @param {import('@playwright/test').Page} page */
async function openThumbnails(page) {
	await page.goto('/tools/draw');
	await authenticateTools(page, TEST_TOOLS_OWNER);
	await page.reload();
	if ((page.viewportSize()?.width ?? 1280) <= 650)
		await page.getByRole('button', { name: 'Choose drawing mode and tools', exact: true }).click();
	await page.getByRole('button', { name: 'Make thumbnails', exact: true }).click();
	const composer = page.getByRole('region', { name: 'Thumbnail composer', exact: true });
	await expect(composer.getByRole('textbox', { name: 'Thumbnail context' })).toBeEnabled();
	return composer;
}
/** @param {import('@playwright/test').Page} page */
async function fixtures(page) {
	return page.evaluate(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 1280;
		canvas.height = 720;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('No canvas');
		return ['#39486a', '#514880', '#2f6968', '#715849'].map((color, index) => {
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, 1280, 720);
			ctx.fillStyle = '#fff';
			ctx.font = 'bold 64px sans-serif';
			ctx.fillText(`TEST THUMBNAIL ${index + 1}`, 70, 200);
			return canvas.toDataURL('image/png');
		});
	});
}
/** @param {import('@playwright/test').Page} page */
async function modelMock(page, { failure = false, pending = false } = {}) {
	/** @type {any[]} */ const calls = [];
	/** @type {(string|null)[]} */ const cancellations = [];
	/** @type {string[]} */ let outputs = [];
	await page.route('**/tools/api/draw/edit**', async (route) => {
		const request = route.request(),
			url = new URL(request.url());
		if (request.method() === 'POST') {
			const form = await new Response(new Uint8Array(request.postDataBuffer() ?? []), {
				headers: { 'Content-Type': request.headers()['content-type'] }
			}).formData();
			const images = await Promise.all(
				form
					.getAll('image')
					.map(async (image) =>
						Buffer.from(await /** @type {File} */ (image).arrayBuffer()).toString('base64')
					)
			);
			calls.push({
				prompt: form.get('prompt'),
				settings: JSON.parse(String(form.get('settings'))),
				model: form.get('model'),
				runId: form.get('runId'),
				jobId: form.get('clientJobId'),
				images
			});
			if (failure && calls.length === 3) {
				await route.fulfill({ status: 503, json: { error: 'One fixture failed' } });
				return;
			}
			await route.fulfill({
				status: 202,
				json: { requestId: `thumb-${calls.length}`, model: form.get('model') }
			});
			return;
		}
		if (request.method() === 'DELETE') {
			cancellations.push(url.searchParams.get('requestId'));
			await route.fulfill({ json: { status: 'CANCEL_REQUESTED' } });
			return;
		}
		const id = Number(url.searchParams.get('requestId')?.split('-')[1]);
		await route.fulfill({
			json: pending
				? { status: 'IN_PROGRESS' }
				: { status: 'COMPLETED', image: outputs[(id - 1) % outputs.length] }
		});
	});
	return {
		calls,
		cancellations,
		/** @param {string[]} value */
		setOutputs(value) {
			outputs = value;
		}
	};
}
/** @param {import('@playwright/test').Locator} composer @param {string[]} outputs */
async function attach(composer, outputs) {
	await composer.getByLabel('Attach thumbnail images').setInputFiles(
		outputs.slice(0, 2).map((data, index) => ({
			name: `reference-${index}.png`,
			mimeType: 'image/png',
			buffer: Buffer.from(data.split(',')[1], 'base64')
		}))
	);
	await expect(composer.locator('.reference-card')).toHaveCount(2);
	await composer.getByLabel('Role for reference 2').selectOption('keep');
	await composer
		.getByLabel('Label for reference 2')
		.fill('Alice, Bob, Carol, Dave, Eve; ACME and official LS logo');
	await composer
		.getByRole('textbox', { name: 'Thumbnail context' })
		.fill(
			'A podcast about reliable voice agents. Keep all five named guests and both supplied companies. Use a supported short hook.'
		);
}
/** Image preparation may re-encode PNG as WebP; compare actual ordered pixels rather than file encoding.
 * @param {import('@playwright/test').Page} page @param {string[]} submitted @param {string[]} originals
 */
async function expectReferencePixels(page, submitted, originals) {
	const colors = await page.evaluate(
		async ({ submitted, originals }) => {
			async function sample(/** @type {string} */ url) {
				const blob = await (await fetch(url)).blob();
				const bitmap = await createImageBitmap(blob);
				const canvas = document.createElement('canvas');
				canvas.width = 1;
				canvas.height = 1;
				const ctx = canvas.getContext('2d');
				if (!ctx) throw new Error('No canvas');
				ctx.drawImage(bitmap, 10, 10, 1, 1, 0, 0, 1, 1);
				bitmap.close();
				return Array.from(ctx.getImageData(0, 0, 1, 1).data);
			}
			return {
				actual: await Promise.all(
					submitted.map((value) => sample(`data:image/webp;base64,${value}`))
				),
				expected: await Promise.all(originals.map(sample))
			};
		},
		{ submitted, originals }
	);
	expect(colors.actual).toHaveLength(colors.expected.length);
	colors.expected.forEach((color, index) =>
		color.forEach((value, channel) =>
			expect(Math.abs(colors.actual[index][channel] - value)).toBeLessThanOrEqual(3)
		)
	);
}
/** @param {import('@playwright/test').Page} page @returns {Promise<any>} */
async function history(page) {
	return page.evaluate(
		() =>
			new Promise((resolve, reject) => {
				const request = indexedDB.open('swyx-draw-generation-history', 1);
				request.onsuccess = () => {
					const db = request.result,
						read = db.transaction('drawing-pages').objectStore('drawing-pages').getAll();
					read.onsuccess = () => {
						resolve(read.result);
						db.close();
					};
					read.onerror = () => reject(read.error);
				};
				request.onerror = () => reject(request.error);
			})
	);
}
/** @param {import('@playwright/test').Page} page */
async function canvasCount(page) {
	return page.evaluate(() => {
		const key = document.querySelector('.draw-canvas')?.getAttribute('data-storage-key');
		return JSON.parse(localStorage.getItem(key ?? '') || '{"elements":[]}').elements.filter(
			(/** @type {{isDeleted?:boolean}} */ e) => !e.isDeleted
		).length;
	});
}

test('thumbnail loop sends actual ordered references, four directions, then four feedback variants and preserves every result', async ({
	page
}) => {
	/** @type {string[]} */ const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const mock = await modelMock(page);
	let composer = await openThumbnails(page);
	const initialCanvasCount = await canvasCount(page);
	const oversizedContext = 'x'.repeat(20_001);
	await composer.getByRole('textbox', { name: 'Thumbnail context' }).fill(oversizedContext);
	await expect(composer.getByRole('textbox', { name: 'Thumbnail context' })).toHaveValue(
		oversizedContext
	);
	await expect(
		composer.getByText('Keep context within 20,000 characters. Nothing has been truncated.', {
			exact: true
		})
	).toBeVisible();
	await expect(
		composer.getByRole('button', { name: 'Generate 4 thumbnails', exact: true })
	).toBeDisabled();
	const output = await fixtures(page);
	mock.setOutputs(output);
	await attach(composer, output);
	expect(mock.calls).toHaveLength(0);
	expect(await canvasCount(page)).toBe(initialCanvasCount);
	await page.getByRole('button', { name: 'Open assets and creative workspace' }).click();
	await page.getByRole('button', { name: 'Close creative workspace' }).click();
	await page.getByRole('button', { name: 'Make thumbnails', exact: true }).click();
	await expect(composer.locator('.reference-card')).toHaveCount(2);
	await composer.getByRole('textbox', { name: 'Thumbnail context' }).press('Enter');
	expect(mock.calls).toHaveLength(0);
	await composer.getByRole('textbox', { name: 'Thumbnail context' }).press('Control+Enter');
	await expect(composer.locator('.result-grid article')).toHaveCount(4);
	expect(mock.calls).toHaveLength(4);
	expect(new Set(mock.calls.map((call) => call.prompt)).size).toBe(4);
	expect(new Set(mock.calls.map((call) => call.runId)).size).toBe(1);
	await expectReferencePixels(page, mock.calls[0].images, output.slice(0, 2));
	for (const call of mock.calls) {
		expect(call.images).toHaveLength(2);
		expect(call.images).toEqual(mock.calls[0].images);
		expect(call.prompt).toContain('Alice, Bob, Carol, Dave, Eve');
		expect(call.settings.image_size).toEqual({ width: 1280, height: 720 });
	}
	await expect.poll(async () => ((await history(page))[0]?.generations ?? []).length).toBe(4);
	/** @type {import('../src/lib/draw-generation-history.js').DrawingImageGeneration[]} */ const initial =
		(await history(page))[0].generations;
	const selectedId = initial[0].id;
	await composer
		.locator('.result-grid article')
		.first()
		.getByRole('button', { name: 'Use for feedback', exact: true })
		.click();
	await composer
		.getByRole('textbox', { name: 'Thumbnail feedback' })
		.fill('Less busy. Keep every person, both logos, and the composition. Make four variations.');
	await composer.getByRole('button', { name: 'Generate 4 more variants', exact: true }).click();
	await expect(composer.locator('.result-grid article')).toHaveCount(8);
	expect(mock.calls).toHaveLength(8);
	await expectReferencePixels(page, mock.calls[4].images, [
		...output.slice(0, 2),
		initial[0].dataURL
	]);
	for (const call of mock.calls.slice(4)) {
		expect(call.images).toHaveLength(3);
		expect(call.images.slice(0, 2)).toEqual(mock.calls[0].images);
		expect(call.images[2]).toBe(mock.calls[4].images[2]);
		expect(call.prompt).toContain('Less busy. Keep every person');
		expect(call.prompt).toContain('Alice, Bob, Carol, Dave, Eve');
		expect(call.runId).not.toBe(mock.calls[0].runId);
	}
	await expect.poll(async () => ((await history(page))[0]?.generations ?? []).length).toBe(8);
	/** @type {import('../src/lib/draw-generation-history.js').DrawingImageGeneration[]} */ const records =
		(await history(page))[0].generations;
	for (const result of records.filter((item) => item.parentGenerationId)) {
		expect(result.parentGenerationId).toBe(selectedId);
		expect((result.referenceImages ?? []).map((ref) => ref.role)).toEqual([
			'inspiration',
			'keep',
			'parent'
		]);
		expect(result.referenceImages?.[2].generationId).toBe(selectedId);
	}
	expect(records.filter((item) => item.parentGenerationId)).toHaveLength(4);
	expect(initial.every((item) => records.some((result) => result.id === item.id))).toBe(true);
	const downloadEvent = page.waitForEvent('download');
	await composer
		.locator('.result-grid article')
		.first()
		.getByRole('button', { name: 'Download', exact: true })
		.click();
	const downloaded = await downloadEvent;
	const downloadedPath = await downloaded.path();
	if (!downloadedPath) throw new Error('Download unavailable');
	const bytes = await readFile(downloadedPath);
	expect(downloaded.suggestedFilename()).toMatch(/\.jpg$/);
	const size = await page.evaluate(async (base64) => {
		const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
		const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
		const size = { width: bitmap.width, height: bitmap.height };
		bitmap.close();
		return size;
	}, bytes.toString('base64'));
	expect(size).toEqual({ width: 1280, height: 720 });
	expect(await canvasCount(page)).toBe(initialCanvasCount);
	await composer
		.getByRole('heading', { name: 'Make a thumbnail', exact: true })
		.scrollIntoViewIfNeeded();
	await page
		.getByRole('region', { name: 'Selected image tools' })
		.evaluate((node) => (node.scrollTop = 0));
	await page.screenshot({ path: '/tmp/draw-thumbnail-loop-desktop.png' });
	await page.reload();
	await page.getByRole('button', { name: 'Make thumbnails', exact: true }).click();
	composer = page.getByRole('region', { name: 'Thumbnail composer', exact: true });
	await expect(composer.locator('.result-grid article')).toHaveCount(8);
	await expect(composer.locator('.reference-card')).toHaveCount(2);
	await expect(composer.getByRole('textbox', { name: 'Thumbnail feedback' })).toHaveValue(
		/Less busy/
	);
	expect(mock.calls).toHaveLength(8);
	expect(errors).toEqual([]);
});

test('thumbnail partial failures retry in the same shared run and cancellation preserves completed images', async ({
	page
}) => {
	const mock = await modelMock(page, { failure: true });
	const composer = await openThumbnails(page);
	const output = await fixtures(page);
	mock.setOutputs(output);
	await attach(composer, output);
	await composer.getByRole('button', { name: 'Generate 4 thumbnails', exact: true }).click();
	await expect(composer.locator('.result-grid article')).toHaveCount(3);
	await expect(composer.getByRole('button', { name: 'Retry failed', exact: true })).toBeVisible();
	await composer.getByRole('button', { name: 'Retry failed', exact: true }).click();
	await expect(composer.locator('.result-grid article')).toHaveCount(4);
	expect(mock.calls).toHaveLength(5);
	expect(mock.calls[4].runId).toBe(mock.calls[0].runId);
	expect(mock.calls[4].images).toEqual(mock.calls[2].images);
	await page.unroute('**/tools/api/draw/edit**');
	const pending = await modelMock(page, { pending: true });
	pending.setOutputs(output);
	await composer
		.locator('.result-grid article')
		.first()
		.getByRole('button', { name: 'Use for feedback', exact: true })
		.click();
	await composer
		.getByRole('textbox', { name: 'Thumbnail feedback' })
		.fill('Four more, preserve all requirements.');
	await composer.getByRole('button', { name: 'Generate 4 more variants', exact: true }).click();
	await expect.poll(() => pending.calls.length).toBe(2);
	await composer.getByRole('button', { name: 'Stop generation', exact: true }).click();
	await expect(
		composer.getByRole('button', { name: 'Generate 4 more variants', exact: true })
	).toBeEnabled();
	await expect.poll(() => pending.cancellations.length).toBe(2);
	expect(pending.calls).toHaveLength(2);
	await expect(composer.locator('.result-grid article')).toHaveCount(4);
});

test('phone thumbnail composer preserves drafts on close, uses four variants, and does not overflow', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const mock = await modelMock(page);
	let composer = await openThumbnails(page);
	const initialCanvasCount = await canvasCount(page);
	const output = await fixtures(page);
	mock.setOutputs(output);
	await attach(composer, output);
	const viewport = await composer.evaluate((node) => ({
		scroll: node.scrollWidth,
		width: node.clientWidth
	}));
	expect(viewport.scroll).toBeLessThanOrEqual(viewport.width + 1);
	await composer.getByRole('button', { name: 'Generate 4 thumbnails', exact: true }).click();
	await expect(composer.locator('.result-grid article')).toHaveCount(4);
	await composer
		.locator('.result-grid article')
		.first()
		.getByRole('button', { name: 'Use for feedback', exact: true })
		.click();
	await composer
		.getByRole('textbox', { name: 'Thumbnail feedback' })
		.fill('Bigger headline, retain everyone.');
	await composer.getByRole('button', { name: 'Generate 4 more variants', exact: true }).click();
	await expect(composer.locator('.result-grid article')).toHaveCount(8);
	await composer
		.getByRole('heading', { name: 'Make a thumbnail', exact: true })
		.scrollIntoViewIfNeeded();
	await page
		.getByRole('region', { name: 'Selected image tools' })
		.evaluate((node) => (node.scrollTop = 0));
	await page.screenshot({ path: '/tmp/draw-thumbnail-loop-mobile.png' });
	await composer.getByRole('button', { name: 'Close thumbnail composer' }).click();
	await page.getByRole('button', { name: 'Choose drawing mode and tools', exact: true }).click();
	await page.getByRole('button', { name: 'Make thumbnails', exact: true }).click();
	await expect(composer.getByRole('textbox', { name: 'Thumbnail feedback' })).toHaveValue(
		'Bigger headline, retain everyone.'
	);
	expect(mock.calls).toHaveLength(8);
	expect(await canvasCount(page)).toBe(initialCanvasCount);
});

test('thumbnail style saves through the actual private library and can be explicitly reused', async ({
	page
}) => {
	const mock = await modelMock(page);
	const composer = await openThumbnails(page);
	const output = await fixtures(page);
	mock.setOutputs(output);
	await attach(composer, output);
	await composer.getByRole('button', { name: 'Generate 4 thumbnails', exact: true }).click();
	await expect(composer.locator('.result-grid article')).toHaveCount(4);
	await composer
		.locator('.result-grid article')
		.first()
		.getByRole('button', { name: 'Use for feedback', exact: true })
		.click();
	await composer.getByRole('button', { name: 'Save this style', exact: true }).first().click();
	const library = page.getByRole('region', { name: 'Thumbnail references and saved styles' });
	const name = `Thumbnail style ${Date.now()}`;
	await library.getByRole('textbox', { name: 'Thumbnail style name' }).fill(name);
	await library.getByRole('button', { name: 'Save style privately', exact: true }).click();
	await expect(library.getByRole('status')).toContainText('Reusable style saved privately');
	expect(mock.calls).toHaveLength(4);
	await library.getByRole('button', { name: 'Done', exact: true }).click();
	await composer.getByRole('button', { name: 'Use saved images', exact: true }).click();
	await library.getByRole('button', { name: `${name} · Use style`, exact: true }).click();
	await expect(composer.locator('.reference-card')).toHaveCount(4);
	expect(mock.calls).toHaveLength(4);
});

test('a pending thumbnail file read cannot attach to a different drawing page', async ({
	page
}) => {
	const composer = await openThumbnails(page);
	const output = await fixtures(page);
	await page.evaluate(() => {
		const original = FileReader.prototype.readAsDataURL;
		/** @type {(()=>void)[]} */ const waiting = [];
		FileReader.prototype.readAsDataURL = function (/** @type {Blob} */ blob) {
			waiting.push(() => original.call(this, blob));
		};
		/** @type {any} */ (window).__releaseThumbnailReads = () => {
			FileReader.prototype.readAsDataURL = original;
			waiting.forEach((fn) => fn());
		};
	});
	await composer.getByLabel('Attach thumbnail images').setInputFiles({
		name: 'delayed.png',
		mimeType: 'image/png',
		buffer: Buffer.from(output[0].split(',')[1], 'base64')
	});
	await page.getByRole('button', { name: 'Manage drawing pages' }).click();
	await page.getByRole('button', { name: 'New page', exact: true }).click();
	await page.getByRole('button', { name: 'Make thumbnails', exact: true }).click();
	await page.evaluate(() => /** @type {any} */ (window).__releaseThumbnailReads());
	await expect(composer.getByRole('textbox', { name: 'Thumbnail context' })).toBeEnabled();
	// Synchronize through another FileReader completion, after the released image read.
	await page.evaluate(
		() =>
			new Promise((resolve) => {
				const reader = new FileReader();
				reader.onload = () => resolve(null);
				reader.readAsDataURL(new Blob(['done']));
			})
	);
	await expect(composer.locator('.reference-card')).toHaveCount(0);
	expect(
		(await history(page)).every(
			(/** @type {any} */ record) => !record.draft?.thumbnail?.references?.length
		)
	).toBe(true);
});
