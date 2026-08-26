import { expect, test } from '@playwright/test';
import { authenticateTools, TEST_TOOLS_MEMBER } from './helpers/tools-auth.js';

/** @param {import('@playwright/test').Page} page */
async function openComposer(page, signedIn = true) {
	await page.goto('/draw');
	if (signedIn) {
		await authenticateTools(page, TEST_TOOLS_MEMBER);
		await page.reload();
	}
	await page.getByRole('button', { name: 'Open image and video generation' }).click();
	const panel = page.getByRole('region', { name: 'Selected image tools' });
	await expect(panel.getByRole('textbox', { name: 'AI image editing prompt' })).toBeVisible();
	return panel;
}

/** @param {import('@playwright/test').Page} page */
async function images(page) {
	return page.evaluate(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 96;
		canvas.height = 64;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas unavailable');
		return ['#cc7733', '#3399cc'].map((color) => {
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, 96, 64);
			return canvas.toDataURL();
		});
	});
}

/** @param {import('@playwright/test').Page} page */
async function scene(page) {
	return page.evaluate(() =>
		/** @type {{elements:{type:string,isDeleted?:boolean}[]}} */ (
			JSON.parse(
				localStorage.getItem(
					document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') || ''
				) || '{"elements":[]}'
			)
		).elements.filter((e) => !e.isDeleted)
	);
}

/** @param {import('@playwright/test').Page} page @param {{failOnce?:boolean,pending?:boolean}} [options] */
async function mockGeneration(page, options = {}) {
	/** @type {Record<string,FormDataEntryValue>[]} */
	const calls = [];
	/** @type {string[]} */
	let output = [];
	await page.route('**/tools/api/draw/edit**', async (route) => {
		const request = route.request();
		if (request.method() === 'POST') {
			const form = await new Response(new Uint8Array(request.postDataBuffer() ?? []), {
				headers: { 'Content-Type': request.headers()['content-type'] }
			}).formData();
			calls.push(Object.fromEntries(form));
			if (options.failOnce && calls.length === 1) {
				await route.fulfill({ status: 503, json: { error: 'Fixture unavailable' } });
				return;
			}
			await route.fulfill({
				status: 202,
				json: { requestId: `job-${calls.length}`, model: form.get('model') }
			});
			return;
		}
		if (request.method() === 'DELETE') {
			await route.fulfill({ json: { status: 'CANCEL_REQUESTED' } });
			return;
		}
		await route.fulfill({
			json: options.pending
				? { status: 'IN_PROGRESS' }
				: {
						status: 'COMPLETED',
						image:
							output[
								(Number(new URL(request.url()).searchParams.get('requestId')?.slice(4)) - 1) %
									output.length
							]
					}
		});
	});
	return {
		calls,
		/** @param {string[]} value */
		setOutput(value) {
			output = value;
		}
	};
}

test('empty canvas composer never spends on entry; result preview and remix are inert; insertion uses native undo', async ({
	page
}) => {
	const mock = await mockGeneration(page);
	const panel = await openComposer(page);
	mock.setOutput(await images(page));
	expect(mock.calls).toHaveLength(0);
	expect(await scene(page)).toEqual([]);
	await panel
		.getByRole('textbox', { name: 'AI image editing prompt' })
		.fill('A ceramic teapot on a blue shelf');
	await panel.getByRole('button', { name: 'Generate AI image', exact: true }).click();
	await expect(panel.getByRole('button', { name: 'Add to canvas', exact: true })).toBeVisible();
	expect(mock.calls).toHaveLength(1);
	expect(mock.calls[0].image).toBeUndefined();
	expect(await scene(page)).toEqual([]);
	await panel.getByRole('button', { name: 'Restore reference image, prompt, and model' }).click();
	expect(mock.calls).toHaveLength(1);
	expect(await scene(page)).toEqual([]);
	await panel.getByRole('button', { name: 'Add to canvas', exact: true }).click();
	await expect
		.poll(async () => (await scene(page)).filter((e) => e.type === 'image').length)
		.toBe(1);
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await expect.poll(async () => (await scene(page)).length).toBe(0);
});

test('retry snapshots reactive recipes and retains the original run cap', async ({ page }) => {
	const mock = await mockGeneration(page, { failOnce: true });
	const panel = await openComposer(page);
	mock.setOutput(await images(page));
	await panel.getByRole('textbox', { name: 'AI image editing prompt' }).fill('A paper lantern');
	await panel.getByRole('button', { name: 'Generate AI image', exact: true }).click();
	await panel.getByRole('button', { name: 'Retry failed jobs (same run budget)' }).click();
	await expect(panel.getByRole('button', { name: 'Add to canvas', exact: true })).toBeVisible();
	expect(mock.calls).toHaveLength(2);
	expect(mock.calls[1].runId).toBe(mock.calls[0].runId);
	expect(mock.calls[1].runLimitUsd).toBe(mock.calls[0].runLimitUsd);
	expect(mock.calls[1].clientJobId).not.toBe(mock.calls[0].clientJobId);
});

test('minimized queue remains active; cancel is explicit and never claims a provider refund', async ({
	page
}) => {
	const mock = await mockGeneration(page, { pending: true });
	const panel = await openComposer(page);
	await panel
		.getByRole('textbox', { name: 'AI image editing prompt' })
		.fill('A blue paper airplane');
	await panel.getByRole('button', { name: 'Generate AI image', exact: true }).click();
	await expect(panel.getByRole('region', { name: 'Generation queue' })).toContainText('Generating');
	await panel.getByRole('button', { name: 'Minimize image tools' }).click();
	await expect(page.getByRole('button', { name: 'Open image and video generation' })).toHaveText(
		'Generating…'
	);
	await panel.getByRole('button', { name: 'Expand image tools' }).click();
	await panel.getByRole('button', { name: 'Cancel remaining jobs' }).click();
	await expect(panel.getByRole('region', { name: 'Generation queue' })).toContainText(
		'not confirmed'
	);
	expect(mock.calls).toHaveLength(1);
	expect(await scene(page)).toEqual([]);
});

test('guest desktop and phone retain prompt/model controls without paid requests or page overflow', async ({
	page
}) => {
	const mock = await mockGeneration(page);
	const panel = await openComposer(page, false);
	await expect(panel.getByRole('link', { name: 'Sign in to generate' })).toBeVisible();
	for (const width of [1440, 390]) {
		await page.setViewportSize({ width, height: 844 });
		await expect(panel.getByRole('textbox', { name: 'AI image editing prompt' })).toBeVisible();
		await expect(
			panel.getByRole('button', { name: 'AI model and workflow selector' })
		).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		await page.screenshot({ path: `/tmp/draw-experiment-${width}.png` });
	}
	expect(mock.calls).toHaveLength(0);
});

test('a running batch survives panel switches and remains cancellable from the shared shell', async ({
	page
}) => {
	const mock = await mockGeneration(page, { pending: true });
	const panel = await openComposer(page);
	await panel.getByRole('textbox', { name: 'AI image editing prompt' }).fill('A paper kite');
	await panel.getByRole('button', { name: 'Generate AI image', exact: true }).click();
	await expect(panel.getByRole('region', { name: 'Generation queue' })).toContainText('Generating');
	await page.getByRole('button', { name: 'Open drawing templates and library' }).click();
	await expect(panel).toBeHidden();
	const background = page.getByRole('status', { name: 'Background drawing jobs' });
	await expect(background).toContainText('Generating media…');
	await background.getByRole('button', { name: 'Show generation' }).click();
	await expect(panel.getByRole('textbox', { name: 'AI image editing prompt' })).toHaveValue(
		'A paper kite'
	);
	await page.getByRole('button', { name: 'Open drawing assistant' }).click();
	await expect(panel).toBeHidden();
	await page.screenshot({ path: '/tmp/draw-shell-background-desktop.png' });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.screenshot({ path: '/tmp/draw-shell-background-phone.png' });
	await background.getByRole('button', { name: 'Cancel generation', exact: true }).click();
	await expect(background).toHaveCount(0);
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.getByRole('button', { name: 'Open image and video generation' }).click();
	await expect(panel.getByRole('region', { name: 'Generation queue' })).toContainText(
		'not confirmed'
	);
	expect(mock.calls).toHaveLength(1);
	expect(await scene(page)).toEqual([]);
});

test('two models share one batch and comparison board insertion is one native undo', async ({
	page
}) => {
	const mock = await mockGeneration(page);
	const panel = await openComposer(page);
	mock.setOutput(await images(page));
	await panel.getByRole('button', { name: 'AI model and workflow selector' }).click();
	await panel
		.getByRole('checkbox', { name: 'Grok Imagine Image 2.0 · Grok 2 medium-quality text to image' })
		.check();
	await panel.getByRole('button', { name: 'AI model and workflow selector' }).click();
	await panel
		.getByRole('textbox', { name: 'AI image editing prompt' })
		.fill('A geometric ceramic sculpture');
	await panel.getByRole('button', { name: 'Generate AI image', exact: true }).click();
	await expect(panel.getByRole('button', { name: 'Add comparison board (2)' })).toBeVisible();
	expect(mock.calls).toHaveLength(2);
	expect(mock.calls[0].runId).toBe(mock.calls[1].runId);
	await panel.getByRole('button', { name: 'Add comparison board (2)' }).click();
	await expect
		.poll(async () => (await scene(page)).filter((e) => e.type === 'image').length)
		.toBe(2);
	expect((await scene(page)).filter((e) => e.type === 'text')).toHaveLength(2);
	await panel.getByRole('button', { name: 'Minimize image tools' }).click();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const colors = new Set();
				for (const canvas of document.querySelectorAll('.draw-canvas canvas')) {
					const element = /** @type {HTMLCanvasElement} */ (canvas);
					const ctx = element.getContext('2d');
					if (!ctx) continue;
					const pixels = ctx.getImageData(0, 0, element.width, element.height).data;
					for (let i = 0; i < pixels.length; i += 4) {
						if (pixels[i] === 204 && pixels[i + 1] === 119 && pixels[i + 2] === 51)
							colors.add('orange');
						if (pixels[i] === 51 && pixels[i + 1] === 153 && pixels[i + 2] === 204)
							colors.add('blue');
					}
				}
				return colors.size;
			})
		)
		.toBe(2);
	await page.screenshot({ path: '/tmp/draw-experiment-board.png' });
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await expect.poll(async () => (await scene(page)).length).toBe(0);
});

test('page navigation is blocked while generated artwork is decoding for insertion', async ({
	page
}) => {
	const mock = await mockGeneration(page);
	const panel = await openComposer(page);
	mock.setOutput(await images(page));
	await panel.getByRole('textbox', { name: 'AI image editing prompt' }).fill('A yellow bowl');
	await panel.getByRole('button', { name: 'Generate AI image', exact: true }).click();
	await expect(panel.getByRole('button', { name: 'Add to canvas', exact: true })).toBeVisible();
	await page.evaluate(() => {
		const NativeImage = window.Image;
		/** @type {(()=>void)[]} */
		const pending = [];
		window.Image = class extends NativeImage {
			set src(value) {
				pending.push(() => {
					super.src = value;
				});
			}
			get src() {
				return super.src;
			}
		};
		/** @type {any} */ (window).__releaseGenerationImages = () => {
			window.Image = NativeImage;
			pending.forEach((release) => release());
		};
	});
	const currentPage = await page.getByRole('button', { name: 'Manage drawing pages' }).innerText();
	await panel.getByRole('button', { name: 'Add to canvas', exact: true }).click();
	await page.getByRole('button', { name: 'Manage drawing pages' }).click();
	await page.getByRole('button', { name: 'New page', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toHaveText(currentPage);
	await page.evaluate(() => /** @type {any} */ (window).__releaseGenerationImages());
	await expect
		.poll(async () => (await scene(page)).filter((e) => e.type === 'image').length)
		.toBe(1);
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await expect.poll(async () => (await scene(page)).length).toBe(0);
});

test('private saved modifier reopens through the real account API without generation', async ({
	page
}) => {
	const mock = await mockGeneration(page);
	let panel = await openComposer(page);
	const name = `Lighting ${Date.now()}`;
	await panel
		.getByRole('textbox', { name: 'AI image editing prompt' })
		.fill('Soft editorial side lighting');
	await panel.locator('.saved-library summary').click();
	await panel.getByRole('textbox', { name: 'Saved item name' }).fill(name);
	await panel.getByRole('button', { name: 'Save prompt modifier' }).click();
	await expect(panel.getByText('Saved to your private library')).toBeVisible();
	await page.reload();
	await page.getByRole('button', { name: 'Open image and video generation' }).click();
	panel = page.getByRole('region', { name: 'Selected image tools' });
	await panel.locator('.saved-library summary').click();
	const row = panel.locator('.saved-library li').filter({ hasText: name });
	await row.getByRole('button', { name: 'Append', exact: true }).click();
	await expect(panel.getByRole('textbox', { name: 'AI image editing prompt' })).toHaveValue(
		'Soft editorial side lighting'
	);
	expect(mock.calls).toHaveLength(0);
	page.once('dialog', (dialog) => dialog.accept());
	await row.getByRole('button', { name: `Remove saved ${name}` }).click();
	await expect(row).toHaveCount(0);
});

test('saved image recipe remixes its private reference after reload without rerunning or downloading the output', async ({
	page
}) => {
	const mock = await mockGeneration(page);
	let panel = await openComposer(page);
	const output = await images(page);
	mock.setOutput(output);
	await panel.getByLabel('Attach generation reference').setInputFiles({
		name: 'reference.png',
		mimeType: 'image/png',
		buffer: Buffer.from(output[0].split(',')[1], 'base64')
	});
	await panel.getByRole('button', { name: 'AI model and workflow selector' }).click();
	await panel.locator('.fal-model-folder[aria-label="Image editing models"] summary').click();
	await panel.getByRole('button', { name: 'Use only Nano Banana 2 · Balanced 1K edit' }).click();
	await panel
		.getByRole('textbox', { name: 'AI image editing prompt' })
		.fill('Soft light on a ceramic cup');
	await panel.getByRole('button', { name: 'Generate AI image edit', exact: true }).click();
	await expect(panel.getByRole('button', { name: 'Add to canvas', exact: true })).toBeVisible();
	const name = `Private recipe ${Date.now()}`;
	await panel.locator('.saved-library summary').click();
	await panel.getByRole('textbox', { name: 'Saved item name' }).fill(name);
	await panel.getByRole('button', { name: 'Save generation', exact: true }).click();
	await expect(panel.getByText('Saved to your private library')).toBeVisible();
	/** @type {string[]} */ const mediaReads = [];
	page.on('request', (request) => {
		if (request.method() === 'GET' && request.url().includes('/creative/assets/'))
			mediaReads.push(request.url());
	});
	await page.reload();
	await page.getByRole('button', { name: 'Open image and video generation' }).click();
	panel = page.getByRole('region', { name: 'Selected image tools' });
	await panel.locator('.saved-library summary').click();
	const row = panel.locator('.saved-library li').filter({ hasText: name });
	await expect(row).toBeVisible();
	expect(mediaReads).toHaveLength(0);
	await row.getByRole('button', { name: 'Remix', exact: true }).click();
	await expect(panel.getByRole('textbox', { name: 'AI image editing prompt' })).toHaveValue(
		'Soft light on a ceramic cup'
	);
	await expect(panel.getByRole('img', { name: 'Reference attached to this draft' })).toBeVisible();
	expect(mediaReads).toHaveLength(1);
	expect(mock.calls).toHaveLength(1);
	expect(await scene(page)).toEqual([]);
	page.once('dialog', (dialog) => dialog.accept());
	await row.getByRole('button', { name: `Remove saved ${name}` }).click();
	await expect(row).toHaveCount(0);
});
