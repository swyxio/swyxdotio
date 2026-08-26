import { readFile } from 'node:fs/promises';
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
	await page.goto('/draw');
	await openDesignLibrary(page);
	const library = page.getByRole('region', { name: 'Branded design templates' });
	await expect(library.getByRole('button', { name: /^insert .+ design$/i })).toHaveCount(5);
	await expect(library).toContainText('1280 × 720');
	await library.getByRole('button', { name: 'Insert Latent Space thumbnail design' }).click();
	await expect(page.getByRole('region', { name: 'Selected design artboard' })).toContainText(
		'1280 × 720'
	);
	const design = await scene(page);
	const frame = design.elements.find((element) => element.type === 'frame' && !element.isDeleted);
	expect(frame.width).toBe(1280);
	expect(frame.height).toBe(720);
	const children = design.elements.filter((element) => element.frameId === frame.id);
	expect(children.some((element) => element.text === 'YOUR SHARPEST\nIDEA HERE')).toBe(true);
	const logo = children.find((element) => element.type === 'image');
	expect(logo.fileId).toBe('latent-space-official-hex');
	expect(design.files[logo.fileId].mimeType).toBe('image/png');
	expect(
		children.some(
			(element) => ['text', 'image'].includes(element.type) && element.x >= 1050 && element.y >= 620
		)
	).toBe(false);
	await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
});

test('artboards duplicate as editable variants, resize proportionally, and export exact-size PNG files', async ({
	page
}) => {
	await page.goto('/draw');
	await openDesignLibrary(page);
	await page.getByRole('button', { name: 'Insert FDE episode thumbnail design' }).click();
	const controls = page.getByRole('region', { name: 'Selected design artboard' });
	await controls.getByRole('button', { name: 'Duplicate design artboard' }).click();
	let current = await scene(page);
	let frames = current.elements.filter((element) => element.type === 'frame' && !element.isDeleted);
	expect(frames).toHaveLength(2);
	expect(frames[1].name).toContain('Variant');
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
	await page.goto('/draw');
	await openDesignLibrary(page);
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
	await page.goto('/draw');
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
		(element) => element.type === 'rectangle' && element.strokeStyle === 'dashed'
	);
	expect(headline.x + headline.width).toBeLessThan(portrait.x);
});

test('design workflows remain reachable and artboard controls stay contained on narrow screens', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/draw');
	await page.getByRole('button', { name: 'Choose drawing mode and tools' }).click();
	await page.getByRole('button', { name: 'Open drawing templates and library' }).click();
	await page.getByRole('tab', { name: 'Design', exact: true }).click();
	await page.getByRole('button', { name: 'Insert Article launch banner design' }).click();
	const controls = page.getByRole('region', { name: 'Selected design artboard' });
	await expect(controls).toBeVisible();
	const bounds = await controls.boundingBox();
	expect(bounds?.x).toBeGreaterThanOrEqual(0);
	expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390);
});
