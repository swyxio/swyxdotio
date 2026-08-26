import { readFile, copyFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { authenticateTools, TEST_TOOLS_OWNER, TEST_TOOLS_MEMBER } from './helpers/tools-auth.js';

/** @param {import('@playwright/test').Page} page */
async function openDesignLibrary(page) {
	await page.getByRole('checkbox', { name: 'Library' }).check({ force: true });
	await page.getByRole('tab', { name: 'Templates, components, and memes' }).click();
	await page.getByRole('tab', { name: 'Design', exact: true }).click();
}

/** @param {import('@playwright/test').Page} page */
async function scene(page) {
	return /** @type {{ elements: any[], files: Record<string, any> }} */ (
		await page.evaluate(() =>
			JSON.parse(
				localStorage.getItem(
					document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
						'swyx-excalidraw:guest'
				) ?? '{"elements":[],"files":{}}'
			)
		)
	);
}

test('branded thumbnail templates create exact editable frames with the official Latent Space logo', async ({
	page
}) => {
	await page.setViewportSize({ width: 1280, height: 1300 });
	await page.goto('/tools/draw');
	await openDesignLibrary(page);
	const library = page.getByRole('region', { name: 'Branded design templates' });
	await expect(library.getByRole('button', { name: /^insert .+ design$/i })).toHaveCount(3);
	await expect(library).toContainText('1280 × 720');
	await expect(library).toContainText('public photo of swyx');
	await expect(library.getByRole('img')).toHaveCount(3);
	await page.screenshot({ path: '/tmp/draw-photo-gallery-desktop.png' });
	await page.evaluate(() => document.fonts.ready);
	await library.screenshot({ path: '/tmp/draw-photo-cards.png' });
	await library.getByRole('button', { name: 'Insert Latent Space thumbnail design' }).click();
	await expect(page.getByRole('region', { name: 'Selected design artboard' })).toContainText(
		'1280 × 720'
	);
	const design = await scene(page);
	const frame = design.elements.find((element) => element.type === 'frame' && !element.isDeleted);
	expect(frame.width).toBe(1280);
	expect(frame.height).toBe(720);
	expect([frame.x, frame.y]).toEqual([0, 0]);
	const background = design.elements.find(
		(e) =>
			e.type === 'rectangle' &&
			e.frameId === frame.id &&
			e.width === frame.width &&
			e.height === frame.height
	);
	expect([background.x, background.y]).toEqual([frame.x, frame.y]);
	const children = design.elements.filter((element) => element.frameId === frame.id);
	expect(children.some((element) => element.text === 'CODE IS\nTHE EASY\nPART.')).toBe(true);
	const logo = children.find((element) => element.customData?.designRole === 'brand-logo');
	expect(logo.fileId).toBe('latent-space-official-hex');
	expect(design.files[logo.fileId].mimeType).toBe('image/png');
	expect(
		children.some(
			(element) => ['text', 'image'].includes(element.type) && element.x >= 1050 && element.y >= 620
		)
	).toBe(false);
	await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
	await page.reload();
	await expect(page.locator('.draw-canvas canvas.excalidraw__canvas.interactive')).toBeVisible();
	const restored = await scene(page);
	expect(restored.elements.find((e) => e.id === frame.id)).toMatchObject({
		x: 0,
		y: 0,
		width: 1280,
		height: 720
	});
	const restoredPhoto = restored.elements.find((e) => e.customData?.designRole === 'guest-photo');
	expect(restored.files[restoredPhoto.fileId].dataURL).toMatch(/^data:image\/webp/);
});

test('artboards duplicate as editable variants, resize proportionally, and export exact-size PNG files', async ({
	page
}) => {
	await page.goto('/tools/draw');
	await openDesignLibrary(page);
	await page.getByRole('button', { name: 'Insert FDE episode thumbnail design' }).click();
	const controls = page.getByRole('region', { name: 'Selected design artboard' });
	await controls.getByRole('button', { name: 'Duplicate design artboard' }).click();
	let current = await scene(page);
	let frames = current.elements.filter((element) => element.type === 'frame' && !element.isDeleted);
	expect(frames).toHaveLength(2);
	expect(frames[1].name).toContain('Variant');
	expect(frames[1].y).toBe(frames[0].y);
	const duplicateBackground = current.elements.find(
		(e) =>
			e.type === 'rectangle' &&
			e.frameId === frames[1].id &&
			e.width === frames[1].width &&
			e.height === frames[1].height
	);
	expect([duplicateBackground.x, duplicateBackground.y]).toEqual([frames[1].x, frames[1].y]);
	await controls.getByRole('combobox', { name: 'Resize design artboard' }).selectOption('square');
	await expect(controls).toContainText('1080 × 1080');
	current = await scene(page);
	frames = current.elements.filter((element) => element.type === 'frame' && !element.isDeleted);
	expect(frames.map((frame) => [frame.width, frame.height])).toEqual([
		[1280, 720],
		[1080, 1080]
	]);
	const downloadEvent = page.waitForEvent('download');
	await controls.getByRole('button', { name: 'Download design as PNG' }).click();
	const download = await downloadEvent;
	expect(download.suggestedFilename()).toMatch(/\.png$/);
	const path = await download.path();
	if (!path) throw new Error('The design download did not produce a local file.');
	const bytes = await readFile(path);
	expect(bytes.subarray(1, 4).toString()).toBe('PNG');
	expect(bytes.readUInt32BE(16)).toBe(1080);
	expect(bytes.readUInt32BE(20)).toBe(1080);
	const corner = await page.evaluate(
		async (dataURL) => {
			const image = await createImageBitmap(await fetch(dataURL).then((r) => r.blob()));
			const canvas = new OffscreenCanvas(image.width, image.height);
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Missing test canvas');
			context.drawImage(image, 0, 0);
			image.close();
			return Array.from(context.getImageData(2, 2, 1, 1).data);
		},
		'data:image/png;base64,' + bytes.toString('base64')
	);
	expect(corner).toEqual([247, 247, 244, 255]);
	for (const [label, extension] of [
		['Download design as JPG', 'jpg'],
		['Download design as SVG', 'svg']
	]) {
		const nextDownload = page.waitForEvent('download');
		await controls.getByRole('button', { name: label }).click();
		const exported = await nextDownload;
		expect(exported.suggestedFilename()).toMatch(new RegExp(`\\.${extension}$`));
		const exportedPath = await exported.path();
		if (!exportedPath) throw new Error(`The ${extension} design export did not download.`);
		const exportedBytes = await readFile(exportedPath);
		if (extension === 'jpg') {
			expect(exportedBytes[0]).toBe(0xff);
			expect(exportedBytes[1]).toBe(0xd8);
		} else {
			expect(exportedBytes.toString()).toContain('<svg');
		}
	}
});

test('speaker designs use portrait dimensions and pages duplicate the complete editable scene', async ({
	page
}) => {
	await page.goto('/tools/draw');
	await openDesignLibrary(page);
	await page.getByText('Other formats · speaker cards, articles & slides', { exact: true }).click();
	await page.getByRole('button', { name: 'Insert AI Engineer speaker card design' }).click();
	await expect(page.getByRole('region', { name: 'Selected design artboard' })).toContainText(
		'1080 × 1350'
	);
	await page.getByTestId('sidebar-close').click();
	await page.getByRole('button', { name: 'Manage drawing pages' }).click();
	await page.getByRole('button', { name: 'Duplicate Page 1' }).click();
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toContainText(
		'Page 1 copy'
	);
	const copied = await scene(page);
	expect(
		copied.elements.some(
			(element) => element.type === 'frame' && element.width === 1080 && element.height === 1350
		)
	).toBe(true);
	expect(copied.elements.some((element) => element.text === 'SPEAKER\nNAME')).toBe(true);
});

test('authenticated assistant offers grounded Canva-style tasks and creates branded editable artboards', async ({
	page
}) => {
	await page.goto('/tools/draw');
	const origin = new URL(page.url()).origin;
	await authenticateTools(page);
	await page.reload();
	let round = 0;
	await page.route('**/tools/api/draw/agent', async (route) => {
		if (route.request().method() === 'GET') return route.continue();
		round++;
		await route.fulfill({
			json:
				round === 1
					? {
							content: '',
							toolCalls: [
								{
									id: 'design_call',
									type: 'function',
									function: {
										name: 'canvas_bash',
										arguments: JSON.stringify({
											command: 'draw design insert ls-podcast --headline "HARNESS ENGINEERING"'
										})
									}
								}
							]
						}
					: {
							content: 'Created an editable Latent Space thumbnail with the official logo.',
							toolCalls: []
						}
		});
	});
	await page.getByRole('button', { name: 'Open drawing assistant' }).click();
	const assistant = page.getByRole('region', { name: 'Drawing assistant' });
	await expect(assistant.getByRole('button', { name: /try .+ workflow/i })).toHaveCount(8);
	await assistant.getByRole('button', { name: 'Try Podcast thumbnail workflow' }).click();
	await expect(assistant.getByRole('textbox', { name: 'Message drawing assistant' })).toHaveValue(
		/timestamp zone/
	);
	await assistant.getByRole('button', { name: 'Send' }).click();
	await expect(assistant).toContainText('Created an editable Latent Space thumbnail', {
		timeout: 20_000
	});
	await assistant.getByRole('button', { name: 'Browse assistant design workflows' }).click();
	await expect(assistant.getByRole('button', { name: /try .+ workflow/i })).toHaveCount(8);
	await assistant.getByRole('button', { name: 'Try Speaker announcement workflow' }).click();
	await expect(assistant.getByRole('textbox', { name: 'Message drawing assistant' })).toHaveValue(
		/1080 × 1350/
	);
	await expect
		.poll(async () =>
			(await scene(page)).elements.some((element) => element.text === 'HARNESS\nENGINEERING')
		)
		.toBe(true);
	const design = await scene(page);
	const headline = design.elements.find((element) => element.text === 'HARNESS\nENGINEERING');
	const portrait = design.elements.find(
		(element) => element.customData?.designRole === 'guest-photo'
	);
	expect(headline.x + headline.width).toBeLessThan(portrait.x);
});

test('design workflows remain reachable and artboard controls stay contained on narrow screens', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/tools/draw');
	await page.getByRole('button', { name: 'Choose drawing mode and tools' }).click();
	await page.getByRole('button', { name: 'Open drawing templates and library' }).click();
	await page.getByRole('tab', { name: 'Design', exact: true }).click();
	await page.screenshot({ path: '/tmp/draw-photo-gallery-mobile.png' });
	await page
		.getByRole('button', { name: 'Insert Evidence + reaction thumbnail design' })
		.scrollIntoViewIfNeeded();
	await page.screenshot({ path: '/tmp/draw-photo-gallery-mobile-more.png' });
	await page.getByText('Other formats · speaker cards, articles & slides', { exact: true }).click();
	await page.getByRole('button', { name: 'Insert Article launch banner design' }).click();
	const controls = page.getByRole('region', { name: 'Selected design artboard' });
	await expect(controls).toBeVisible();
	const bounds = await controls.boundingBox();
	expect(bounds?.x).toBeGreaterThanOrEqual(0);
	expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390);
});

test('design insertion waits for its font, preserves intervening native edits, and does not cross pages', async ({
	page
}) => {
	await page.goto('/tools/draw');
	await openDesignLibrary(page);
	await page.evaluate(() => {
		const load = document.fonts.load.bind(document.fonts);
		/** @type {(()=>void)[]} */ const pending = [];
		document.fonts.load = (font, text) =>
			font.startsWith('100px')
				? new Promise((resolve, reject) =>
						pending.push(() => load(font, text).then(resolve, reject))
					)
				: load(font, text);
		/** @type {any} */ (window).__releaseDesignFonts = () =>
			pending.splice(0).forEach((fn) => fn());
	});
	await page.getByRole('button', { name: 'Insert Latent Space thumbnail design' }).click();
	await page.getByRole('tab', { name: 'Presets', exact: true }).click();
	await page.getByRole('button', { name: 'Insert Priority quadrants preset' }).click();
	await expect
		.poll(async () => (await scene(page)).elements.filter((e) => !e.isDeleted).length)
		.toBeGreaterThan(0);
	const original = (await scene(page)).elements.filter((e) => !e.isDeleted).map((e) => e.id);
	expect(original.length).toBeGreaterThan(0);
	await page.evaluate(() => /** @type {any} */ (window).__releaseDesignFonts());
	await expect
		.poll(
			async () =>
				(await scene(page)).elements.filter((e) => e.type === 'frame' && !e.isDeleted).length
		)
		.toBe(1);
	const inserted = (await scene(page)).elements.filter((e) => !e.isDeleted).map((e) => e.id);
	expect(original.every((id) => inserted.includes(id))).toBe(true);
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await expect
		.poll(async () => (await scene(page)).elements.filter((e) => !e.isDeleted).map((e) => e.id))
		.toEqual(original);
	await openDesignLibrary(page);
	await page.getByRole('button', { name: 'Insert Latent Space thumbnail design' }).click();
	await page.getByTestId('sidebar-close').click();
	await page.getByRole('button', { name: 'Manage drawing pages' }).click();
	await page.getByRole('button', { name: 'New page', exact: true }).click();
	await page.evaluate(() => /** @type {any} */ (window).__releaseDesignFonts());
	await expect(
		page.getByText('The account or page changed. Nothing was inserted.', { exact: true })
	).toBeVisible();
	expect((await scene(page)).elements.filter((e) => !e.isDeleted)).toHaveLength(0);
});

test('every starter renders its editable headline inside the real artboard', async ({ page }) => {
	await page.goto('/tools/draw');
	for (const [id, label] of [
		['ls-podcast', 'Latent Space thumbnail'],
		['fde-decision', 'FDE episode thumbnail'],
		['thumbnail-evidence', 'Evidence + reaction thumbnail'],
		['aie-speaker', 'AI Engineer speaker card'],
		['blog-launch', 'Article launch banner'],
		['keynote-slide', 'Conference title slide']
	]) {
		await openDesignLibrary(page);
		const button = page.getByRole('button', { name: `Insert ${label} design`, exact: true });
		if (!(await button.isVisible()))
			await page
				.getByText('Other formats · speaker cards, articles & slides', { exact: true })
				.click();
		await button.click();
		const controls = page.getByRole('region', { name: 'Selected design artboard' });
		await expect(controls).toContainText(label);
		const drawing = await scene(page);
		const frame = drawing.elements.find(
			(e) => e.type === 'frame' && e.name === label && !e.isDeleted
		);
		for (const text of drawing.elements.filter(
			(e) => e.frameId === frame.id && e.type === 'text'
		)) {
			expect(text.x, `${id}: ${text.text}`).toBeGreaterThanOrEqual(frame.x);
			expect(text.y, `${id}: ${text.text}`).toBeGreaterThanOrEqual(frame.y);
			expect(text.x + text.width, `${id}: ${text.text}`).toBeLessThanOrEqual(frame.x + frame.width);
			expect(text.y + text.height, `${id}: ${text.text}`).toBeLessThanOrEqual(
				frame.y + frame.height
			);
		}
		const downloadEvent = page.waitForEvent('download');
		await controls.getByRole('button', { name: 'Download design as PNG' }).click();
		const path = await (await downloadEvent).path();
		if (!path) throw new Error('No design export');
		await copyFile(path, `/tmp/draw-photo-${id}.png`);
	}
});

test('a chosen canvas photo is reused explicitly without replacing the original or calling a model', async ({
	page
}) => {
	/** @type {string[]} */
	const modelRequests = [];
	page.on('request', (request) => {
		if (/\/tools\/api\/(fal|draw\/generat|draw\/agent)/.test(request.url()))
			modelRequests.push(request.url());
	});
	await page.goto('/tools/draw');
	const canvas = page.locator('.draw-canvas canvas.excalidraw__canvas.interactive');
	await expect(canvas).toBeVisible();
	await canvas.click({ position: { x: 80, y: 170 } });
	await page.evaluate(async () => {
		const blob = await fetch('/swyx-ski.jpeg').then((r) => r.blob());
		const transfer = new DataTransfer();
		transfer.items.add(new File([blob], 'guest.jpg', { type: blob.type }));
		document.dispatchEvent(
			new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer })
		);
	});
	await expect(page.getByRole('region', { name: 'Selected image tools' })).toBeVisible();
	await expect
		.poll(
			async () =>
				(await scene(page)).elements.filter((e) => e.type === 'image' && !e.isDeleted).length
		)
		.toBe(1);
	await expect
		.poll(async () => {
			const drawing = await scene(page);
			const image = drawing.elements.find((e) => e.type === 'image' && !e.isDeleted);
			return !!drawing.files[image?.fileId];
		})
		.toBe(true);
	const before = await scene(page);
	const original = before.elements.find((e) => e.type === 'image');
	await openDesignLibrary(page);
	await page.getByRole('checkbox', { name: 'Use selected image as guest' }).check();
	await page.getByRole('button', { name: 'Insert Latent Space thumbnail design' }).click();
	await expect(page.getByRole('region', { name: 'Selected design artboard' })).toBeVisible();
	const after = await scene(page);
	const photo = after.elements.find(
		(e) => e.customData?.designRole === 'guest-photo' && !e.isDeleted
	);
	expect(photo.fileId).toBe(original.fileId);
	expect(after.files[photo.fileId].dataURL).toBe(before.files[original.fileId].dataURL);
	const retained = after.elements.find((e) => e.id === original.id);
	expect([retained.x, retained.y, retained.width, retained.height, retained.fileId]).toEqual([
		original.x,
		original.y,
		original.width,
		original.height,
		original.fileId
	]);
	expect(after.files['draw-public-swyx-headshot']).toBeUndefined();
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await expect
		.poll(async () => (await scene(page)).elements.filter((e) => !e.isDeleted).map((e) => e.id))
		.toEqual([original.id]);
	expect(modelRequests).toEqual([]);
});

test('missing public artwork reports a retryable error without inserting a partial template', async ({
	page
}) => {
	await page.route('**/assets/latent-space-hex-gradient.png', (route) =>
		route.fulfill({ status: 503, body: 'Unavailable' })
	);
	await page.goto('/tools/draw');
	await openDesignLibrary(page);
	await page.getByRole('button', { name: 'Insert Latent Space thumbnail design' }).click();
	await expect(
		page.getByText('The template image could not be loaded. Try inserting again.', { exact: true })
	).toBeVisible();
	expect((await scene(page)).elements.filter((e) => !e.isDeleted)).toEqual([]);
	expect(Object.keys((await scene(page)).files)).toEqual([]);
	await page.unroute('**/assets/latent-space-hex-gradient.png');
	await page.getByRole('button', { name: 'Insert Latent Space thumbnail design' }).click();
	await expect(page.getByRole('region', { name: 'Selected design artboard' })).toBeVisible();
});
