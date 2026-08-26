import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/** @typedef {{ isDeleted?: boolean, text?: string, roughness?: number }} DrawingElement */

/**
 * @param {import('@playwright/test').Page} page
 * @param {'Presets' | 'Components' | 'Memes'} section
 */
async function openDrawingTemplates(page, section) {
	await page.getByRole('checkbox', { name: 'Library' }).check({ force: true });
	await page.getByRole('tab', { name: 'Templates, components, and memes' }).click();
	await page.getByRole('tab', { name: section, exact: true }).click();
}

test('drawing canvas always uses light mode even when the site is dark', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
	await page.goto('/tools/draw');

	await expect(page.locator('html')).toHaveClass(/dark/);
	await expect(page.locator('.excalidraw')).toBeVisible();
	await expect(page.locator('.excalidraw')).not.toHaveClass(/theme--dark/);
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toHaveCSS(
		'background-color',
		'rgb(255, 255, 255)'
	);
	await expect(page.getByRole('button', { name: 'Browse UI components' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Browse drawing presets' })).toHaveCount(0);
	const pages = await page.getByRole('button', { name: 'Manage drawing pages' }).boundingBox();
	const toolbar = await page.locator('.App-toolbar').first().boundingBox();
	expect(pages).not.toBeNull();
	expect(toolbar).not.toBeNull();
	if (pages && toolbar) expect(pages.x + pages.width).toBeLessThanOrEqual(toolbar.x);

	await page.getByRole('checkbox', { name: 'Library' }).check({ force: true });
	const templatesTab = page.getByRole('tab', { name: 'Templates, components, and memes' });
	await expect(templatesTab).toHaveText('');
	await expect(templatesTab.locator('svg')).toBeVisible();
});

for (const viewport of [
	{ width: 768, height: 900 },
	{ width: 390, height: 844 }
]) {
	test(`drawing controls stay accessible without overlap at ${viewport.width}px`, async ({
		page
	}) => {
		await page.setViewportSize(viewport);
		await page.goto('/tools/draw');

		const pages = page.getByRole('button', { name: 'Manage drawing pages' });
		const workspace = page.getByRole('button', { name: 'Choose drawing mode and tools' });
		const toolbar = page.locator('.App-toolbar').first();
		await expect(pages).toBeVisible();
		await expect(workspace).toBeVisible();
		await expect(toolbar).toBeVisible();

		const pageBounds = await pages.boundingBox();
		const templateBounds = await workspace.boundingBox();
		const toolbarBounds = await toolbar.boundingBox();
		if (!pageBounds || !templateBounds || !toolbarBounds) {
			throw new Error('Compact drawing controls must have visible bounds.');
		}
		expect(pageBounds.y).toBeGreaterThanOrEqual(toolbarBounds.y + toolbarBounds.height);
		expect(templateBounds.y).toBeGreaterThanOrEqual(toolbarBounds.y + toolbarBounds.height);
		expect(pageBounds.x + pageBounds.width).toBeLessThanOrEqual(templateBounds.x);

		await workspace.click();
		await page.getByRole('button', { name: 'Open drawing templates and library' }).click();
		await expect(workspace).toBeHidden();
		await expect(pages).toBeHidden();
		await expect(page.getByRole('tab', { name: 'Presets', exact: true })).toBeVisible();
		await page.getByRole('tab', { name: 'Memes', exact: true }).click();
		await expect(page.getByRole('region', { name: 'Meme templates' })).toBeVisible();
		await page.getByTestId('sidebar-close').click();
		await expect(workspace).toBeVisible();
		await expect(pages).toBeVisible();
	});
}

test('drawing canvas is public, fullscreen, and persists drawings in the browser', async ({
	page
}) => {
	const response = await page.goto('/tools/draw');

	expect(response?.status()).toBe(200);
	await expect(page).toHaveURL(/\/tools\/draw$/);
	await expect(page).toHaveTitle('Draw · swyx.io');
	await expect(page.locator('nav')).toHaveCount(0);
	await expect(page.locator('footer')).toHaveCount(0);

	const editor = page.locator('.draw-canvas');
	const canvas = editor.locator('canvas.excalidraw__canvas.interactive');
	const drawTool = editor.getByRole('radio', { name: /^draw$/i });

	await expect(editor).toBeVisible();
	await expect(canvas).toBeVisible();
	await expect(drawTool).toBeVisible();

	const bounds = await editor.boundingBox();
	const viewport = page.viewportSize();
	expect(bounds?.width).toBeGreaterThanOrEqual((viewport?.width ?? 0) * 0.95);
	expect(bounds?.height).toBeGreaterThanOrEqual((viewport?.height ?? 0) * 0.95);

	await drawTool.check({ force: true });

	const canvasBounds = await canvas.boundingBox();
	expect(canvasBounds).not.toBeNull();
	if (!canvasBounds) throw new Error('Drawing canvas has no visible bounds');

	const startX = canvasBounds.x + canvasBounds.width * 0.35;
	const startY = canvasBounds.y + canvasBounds.height * 0.4;
	await page.mouse.move(startX, startY);
	await page.mouse.down();
	await page.mouse.move(startX + 120, startY + 60, { steps: 12 });
	await page.mouse.up();

	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: DrawingElement[] }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
				return scene.elements.filter((element) => !element.isDeleted).length;
			})
		)
		.toBe(1);

	await page.reload();
	await expect(canvas).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: DrawingElement[] }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
				return scene.elements.filter((element) => !element.isDeleted).length;
			})
		)
		.toBe(1);
});

test('visual presets insert labeled editable diagrams without replacing existing work', async ({
	page
}) => {
	await page.goto('/tools/draw');

	await openDrawingTemplates(page, 'Presets');

	const presetOptions = page.getByRole('button', { name: /^insert .+ preset$/i });
	await expect(presetOptions).toHaveCount(12);

	await page.getByRole('button', { name: /insert priority quadrants preset/i }).click();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: DrawingElement[] }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
				return scene.elements.some((element) => element.text?.includes('Act now'));
			})
		)
		.toBe(true);
	const initialScene = await page.evaluate(
		() =>
			/** @type {{ elements: DrawingElement[] }} */ (
				JSON.parse(
					localStorage.getItem(
						document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
							'swyx-excalidraw:guest'
					) ?? '{"elements":[]}'
				)
			)
	);
	const initialShapeCount = initialScene.elements.filter((element) => !element.isDeleted).length;
	expect(initialShapeCount).toBeGreaterThan(4);
	expect(initialScene.elements.some((element) => element.text?.includes('Plan'))).toBe(true);
	expect(initialScene.elements.some((element) => element.roughness === 2)).toBe(true);

	await page.getByRole('button', { name: /insert strategy scatterplot preset/i }).click();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: DrawingElement[] }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
				return scene.elements.filter((element) => !element.isDeleted).length;
			})
		)
		.toBeGreaterThan(initialShapeCount);
	const combinedScene = await page.evaluate(
		() =>
			/** @type {{ elements: DrawingElement[] }} */ (
				JSON.parse(
					localStorage.getItem(
						document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
							'swyx-excalidraw:guest'
					) ?? '{"elements":[]}'
				)
			)
	);
	expect(combinedScene.elements.some((element) => element.text === 'Strategic fit')).toBe(true);
	expect(combinedScene.elements.some((element) => element.text === 'Effort')).toBe(true);
	expect(combinedScene.elements.some((element) => element.text?.includes('Act now'))).toBe(true);

	await page.reload();
	await expect(page.locator('.draw-canvas canvas.excalidraw__canvas.interactive')).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: DrawingElement[] }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
				return scene.elements.some((element) => element.text === 'Strategic fit');
			})
		)
		.toBe(true);
});

for (const label of ['Two architectures', 'Agent / tool loop', 'Claim, evidence, objection']) {
	test(`${label} starter inserts bound editable shapes with one native undo and no inference`, async ({
		page
	}, testInfo) => {
		/** @type {string[]} */
		const inference = [];
		page.on('request', (request) => {
			if (/\/draw\/(agent|fal)|huggingface\.co/.test(request.url())) inference.push(request.url());
		});
		// Exercise Excalidraw's browser-download path, not the OS-native save picker.
		await page.addInitScript(() => {
			Reflect.deleteProperty(window, 'showOpenFilePicker');
			Reflect.deleteProperty(window, 'showSaveFilePicker');
		});
		await page.goto('/tools/draw');
		await openDrawingTemplates(page, 'Presets');
		await page.getByRole('button', { name: `Insert ${label} preset`, exact: true }).click();
		/** @returns {Promise<{ elements: any[] }>} */
		const getScene = () =>
			page.evaluate(() => {
				const key = document.querySelector('.draw-canvas')?.getAttribute('data-storage-key');
				if (!key) throw new Error('The drawing account scope is not ready.');
				return JSON.parse(localStorage.getItem(key) ?? '{"elements":[]}');
			});
		await expect.poll(async () => (await getScene()).elements.length).toBeGreaterThan(8);
		const inserted = await getScene();
		const clippedLabels = await page.evaluate((elements) => {
			const measure = document.createElement('canvas').getContext('2d');
			return elements
				.filter((element) => {
					if (element.type !== 'text' || !measure) return false;
					measure.font = `${element.fontSize}px Excalifont`;
					return element.text
						.split('\n')
						.some(
							(/** @type {string} */ line) => measure.measureText(line).width > element.width + 2
						);
				})
				.map((element) => element.text);
		}, inserted.elements);
		expect(clippedLabels).toEqual([]);
		const ids = new Set(inserted.elements.map((element) => element.id));
		const arrows = inserted.elements.filter((element) => element.type === 'arrow');
		expect(arrows.length).toBeGreaterThanOrEqual(3);
		for (const edge of arrows) {
			expect(ids.has(edge.startBinding?.elementId)).toBe(true);
			expect(ids.has(edge.endBinding?.elementId)).toBe(true);
			expect(edge.boundElements.some((/** @type {any} */ bound) => bound.type === 'text')).toBe(
				true
			);
		}
		await page.getByRole('button', { name: 'Undo', exact: true }).click();
		await expect
			.poll(async () => (await getScene()).elements.filter((element) => !element.isDeleted).length)
			.toBe(0);
		await page.getByRole('button', { name: 'Redo', exact: true }).click();
		await expect
			.poll(async () => (await getScene()).elements.filter((element) => !element.isDeleted).length)
			.toBe(inserted.elements.length);
		expect(inference).toEqual([]);
		await page.getByRole('checkbox', { name: 'Library', exact: true }).uncheck({ force: true });
		await page.mouse.click(900, 660);
		await testInfo.attach('editable-scene', {
			body: JSON.stringify(inserted),
			contentType: 'application/json'
		});
		await testInfo.attach('figure', { body: await page.screenshot(), contentType: 'image/png' });
		await page.getByTestId('main-menu-trigger').click();
		await page.getByRole('button', { name: 'Export image...', exact: true }).click();
		for (const format of ['PNG', 'SVG']) {
			const downloadEvent = page.waitForEvent('download');
			await page.getByRole('button', { name: `Export to ${format}`, exact: true }).click();
			const download = await downloadEvent;
			const path = testInfo.outputPath(`figure.${format.toLowerCase()}`);
			await download.saveAs(path);
			const bytes = await readFile(path);
			if (format === 'PNG') {
				expect(bytes.subarray(1, 4).toString()).toBe('PNG');
				expect(bytes.readUInt32BE(16)).toBeGreaterThan(900);
				expect(bytes.readUInt32BE(20)).toBeGreaterThan(400);
			} else {
				expect(bytes.toString()).toContain('<svg');
				for (const element of inserted.elements.filter((element) => element.type === 'text')) {
					for (const line of element.text.split('\n')) expect(bytes.toString()).toContain(line);
				}
			}
			await testInfo.attach(`export-${format.toLowerCase()}`, {
				path,
				contentType: format === 'PNG' ? 'image/png' : 'image/svg+xml'
			});
		}
		expect(inference).toEqual([]);
	});
}

test('hand-drawn UI components are searchable, editable, and preserve existing drawings', async ({
	page
}) => {
	await page.goto('/tools/draw');
	await openDrawingTemplates(page, 'Components');

	const componentMenu = page.getByRole('region', { name: 'UI components' });
	await expect(componentMenu).toBeVisible();
	const componentOptions = componentMenu.getByRole('button', { name: /^insert .+ component$/i });
	expect(await componentOptions.count()).toBeGreaterThanOrEqual(12);

	const search = componentMenu.getByRole('textbox', { name: 'Search UI components' });
	await search.fill('button');
	await expect(componentOptions.first()).toBeVisible();
	const selectedLabel = await componentOptions.first().getAttribute('aria-label');
	expect(selectedLabel?.toLowerCase()).toContain('button');
	await componentOptions.first().click();
	await expect(componentMenu).toBeVisible();

	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: DrawingElement[] }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
				return scene.elements.filter((element) => !element.isDeleted);
			})
		)
		.toEqual(expect.arrayContaining([expect.objectContaining({ roughness: expect.any(Number) })]));
	const initialCount = await page.evaluate(
		() =>
			JSON.parse(
				localStorage.getItem(
					document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
						'swyx-excalidraw:guest'
				) ?? '{"elements":[]}'
			).elements.length
	);

	await componentMenu.getByRole('textbox', { name: 'Search UI components' }).fill('table');
	await componentOptions.first().click();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					).elements.length
			)
		)
		.toBeGreaterThan(initialCount);

	await page.reload();
	await expect(page.locator('.draw-canvas canvas.excalidraw__canvas.interactive')).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					).elements.length
			)
		)
		.toBeGreaterThan(initialCount);
});

test('meme templates live in the native library, search current memes, and insert undoable images', async ({
	page
}) => {
	let catalogRequests = 0;
	await page.route('https://api.imgflip.com/get_memes', async (route) => {
		catalogRequests += 1;
		await route.fulfill({
			json: {
				success: true,
				data: {
					memes: [
						{
							id: 'test-extended-catalog',
							name: 'Agentic Rubber Duck Debugger',
							url: 'https://i.imgflip.com/test-rubber-duck.jpg',
							width: 460,
							height: 460
						}
					]
				}
			}
		});
	});
	await page.route('https://i.imgflip.com/**', (route) =>
		route.fulfill({
			path: 'static/swyx-ski.jpeg',
			headers: { 'access-control-allow-origin': '*' }
		})
	);
	await page.goto('/tools/draw');
	expect(catalogRequests).toBe(0);
	await openDrawingTemplates(page, 'Memes');

	const memeLibrary = page.getByRole('region', { name: 'Meme templates' });
	const templates = memeLibrary.getByRole('button', { name: /^insert .+ meme template$/i });
	await expect(templates).toHaveCount(20);
	await expect(memeLibrary.getByRole('link', { name: 'Templates via Imgflip' })).toBeVisible();
	await expect.poll(() => catalogRequests).toBe(1);

	const search = memeLibrary.getByRole('textbox', { name: 'Search meme templates' });
	await search.fill('rubber duck');
	const extendedTemplate = memeLibrary.getByRole('button', {
		name: 'Insert Agentic Rubber Duck Debugger meme template'
	});
	await expect(extendedTemplate).toBeVisible();
	await extendedTemplate.click();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene =
					/** @type {{ elements: Array<{ type: string, fileId?: string, isDeleted?: boolean }>, files: Record<string, { dataURL: string }> }} */ (
						JSON.parse(
							localStorage.getItem(
								document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
									'swyx-excalidraw:guest'
							) ?? '{"elements":[],"files":{}}'
						)
					);
				const image = scene.elements.find(
					(element) => element.type === 'image' && !element.isDeleted
				);
				return image?.fileId ? scene.files[image.fileId]?.dataURL.startsWith('data:image/') : false;
			})
		)
		.toBe(true);
	await page.getByRole('button', { name: 'Undo' }).click();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: Array<{ type: string, isDeleted?: boolean }> }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
				return scene.elements.filter((element) => element.type === 'image' && !element.isDeleted)
					.length;
			})
		)
		.toBe(0);
});

test('command palette searches components, presets, pages, and actions with keyboard controls', async ({
	page
}) => {
	await page.goto('/tools/draw');
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toBeVisible();
	await page.keyboard.press('Control+k');

	const palette = page.getByRole('dialog', { name: 'Workspace commands' });
	const search = palette.getByRole('textbox', {
		name: 'Search components, presets, pages, and actions'
	});
	await expect(palette).toBeVisible();
	await expect(search).toBeFocused();
	await expect(palette.getByText('Actions', { exact: true }).first()).toBeVisible();
	await expect(palette.getByText('Components', { exact: true }).first()).toBeVisible();

	await search.fill('button');
	await expect(palette.getByRole('button').first()).toContainText(/button/i);
	await search.press('ArrowDown');
	await search.press('ArrowUp');
	await search.press('Enter');
	await expect(palette).toHaveCount(0);
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					).elements.length
			)
		)
		.toBeGreaterThan(0);

	await page.keyboard.press('Meta+k');
	await expect(palette).toBeVisible();
	await search.fill('priority quadrants');
	await expect(palette.getByText('Presets', { exact: true })).toBeVisible();
	await search.press('Enter');
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: DrawingElement[] }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
				return scene.elements.some((element) => element.text?.includes('Act now'));
			})
		)
		.toBe(true);

	await page.keyboard.press('Control+k');
	await search.fill('page 1');
	await expect(palette.getByText('Pages', { exact: true })).toBeVisible();
	await search.fill('import screenshot');
	await expect(palette.getByRole('button', { name: /import screenshot or image/i })).toBeVisible();
	await search.fill('drake hotline');
	await expect(palette.getByText('Memes', { exact: true })).toBeVisible();
	await expect(palette.getByRole('button', { name: /drake hotline bling/i })).toBeVisible();
	await search.fill('nothing matches this phrase');
	await expect(palette.getByText(/no matches/i)).toBeVisible();
	await search.press('Escape');
	await expect(palette).toHaveCount(0);

	await page.keyboard.press('Control+k');
	await page
		.getByRole('button', { name: 'Close command palette' })
		.click({ position: { x: 10, y: 10 } });
	await expect(palette).toHaveCount(0);
});

test('software architecture libraries preload and preserve personally added components', async ({
	page
}) => {
	await page.goto('/tools/draw');

	await expect
		.poll(() =>
			page.evaluate(() => {
				const items = /** @type {{ id: string }[]} */ (
					JSON.parse(
						localStorage.getItem(
							(document.querySelector('.draw-canvas')?.getAttribute('data-account-storage-key') ||
								'swyx-excalidraw:guest') + ':library'
						) ?? '[]'
					)
				);
				return items.length;
			})
		)
		.toBe(42);

	const items = await page.evaluate(
		() =>
			/** @type {{ id: string }[]} */ (
				JSON.parse(
					localStorage.getItem(
						(document.querySelector('.draw-canvas')?.getAttribute('data-account-storage-key') ||
							'swyx-excalidraw:guest') + ':library'
					) ?? '[]'
				)
			)
	);
	expect(items.filter((item) => item.id.startsWith('software-architecture-'))).toHaveLength(7);
	expect(items.filter((item) => item.id.startsWith('system-design-components-'))).toHaveLength(24);

	await page.getByRole('checkbox', { name: 'Library' }).check({ force: true });
	await expect(page.locator('.library-unit.library-unit__active')).toHaveCount(42);
	await page.locator('.library-unit.library-unit__active .library-unit__dragger').first().click();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: unknown[] }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
				return scene.elements.length;
			})
		)
		.toBeGreaterThan(0);

	await page.evaluate(() => {
		const storedItems = /** @type {{ id: string }[]} */ (
			JSON.parse(
				localStorage.getItem(
					(document.querySelector('.draw-canvas')?.getAttribute('data-account-storage-key') ||
						'swyx-excalidraw:guest') + ':library'
				) ?? '[]'
			)
		);
		storedItems.push({ ...storedItems[0], id: 'my-personal-component' });
		localStorage.setItem(
			(document.querySelector('.draw-canvas')?.getAttribute('data-account-storage-key') ||
				'swyx-excalidraw:guest') + ':library',
			JSON.stringify(storedItems)
		);
	});
	await page.reload();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const storedItems = /** @type {{ id: string }[]} */ (
					JSON.parse(
						localStorage.getItem(
							(document.querySelector('.draw-canvas')?.getAttribute('data-account-storage-key') ||
								'swyx-excalidraw:guest') + ':library'
						) ?? '[]'
					)
				);
				return storedItems.some((item) => item.id === 'my-personal-component');
			})
		)
		.toBe(true);
});

for (const fixture of [
	{ label: 'portrait', path: '/swyx-ski.jpeg', mode: 'portrait-fast' },
	{ label: 'nonhuman object', path: '/assets/hammers.png', mode: 'general-balanced' }
]) {
	test(`image background removal preserves ${fixture.label} dimensions and supports undo`, async ({
		page
	}) => {
		await page.addInitScript(() => {
			/** @type {any} */ (globalThis).__SWYX_REMOVE_IMAGE_BACKGROUND__ = async (
				/** @type {Blob} */ source,
				/** @type {{ mode: string, onProgress: (value: { phase: 'download' | 'processing', progress: number, label: string }) => void }} */ options
			) => {
				options.onProgress({ phase: 'download', progress: 0.45, label: 'Downloading test model' });
				const image = await createImageBitmap(source);
				const drawing = document.createElement('canvas');
				drawing.width = image.width;
				drawing.height = image.height;
				const context = drawing.getContext('2d');
				if (!context) throw new Error('Canvas rendering is unavailable.');
				context.drawImage(image, 0, 0);
				context.clearRect(0, 0, 1, 1);
				options.onProgress({ phase: 'processing', progress: 1, label: 'Removing test background' });
				return new Promise((resolve, reject) => {
					drawing.toBlob(
						(blob) => (blob ? resolve(blob) : reject(new Error('Could not create test image.'))),
						'image/png'
					);
				});
			};
		});
		await page.goto('/tools/draw');
		const drawingCanvas = page.locator('.draw-canvas canvas.excalidraw__canvas.interactive');
		await expect(drawingCanvas).toBeVisible();
		await expect(page.getByRole('region', { name: 'Selected image tools' })).toHaveCount(0);
		await drawingCanvas.click({ position: { x: 80, y: 170 } });
		await drawingCanvas.click({ position: { x: 360, y: 280 } });
		await page.evaluate(async (path) => {
			const source = await fetch(path).then((response) => response.blob());
			const transfer = new DataTransfer();
			transfer.items.add(new File([source], 'selected-image.png', { type: source.type }));
			document.dispatchEvent(
				new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer })
			);
		}, fixture.path);

		const toolbar = page.getByRole('region', { name: 'Selected image tools' });
		await expect(toolbar).toBeVisible();
		await expect
			.poll(() =>
				page.evaluate(() => {
					const scene =
						/** @type {{ elements: { type: string, width: number, fileId?: string }[], files: Record<string, unknown> }} */ (
							JSON.parse(
								localStorage.getItem(
									document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
										'swyx-excalidraw:guest'
								) ?? '{"elements":[],"files":{}}'
							)
						);
					const image = scene.elements.find((element) => element.type === 'image');
					return image?.fileId && scene.files[image.fileId] ? image.width : 0;
				})
			)
			.toBeGreaterThan(100);
		const canvasBounds = await drawingCanvas.boundingBox();
		if (!canvasBounds) throw new Error('Drawing canvas is not visible.');
		await page.mouse.move(canvasBounds.x + 360, canvasBounds.y + 280);
		await page.mouse.down();
		await page.mouse.move(canvasBounds.x + 390, canvasBounds.y + 300, { steps: 4 });
		await page.mouse.up();
		await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
		await expect(toolbar.getByRole('combobox', { name: 'Background removal model' })).toHaveCount(
			0
		);
		await toolbar.getByRole('button', { name: 'Background', exact: true }).click();
		const modeSelect = toolbar.getByRole('combobox', { name: 'Background removal model' });
		await expect(modeSelect.locator('option')).toHaveCount(4);
		await expect(modeSelect).toHaveValue('portrait-fast');
		if (fixture.mode !== 'portrait-fast') {
			await modeSelect.selectOption(fixture.mode);
			await expect(toolbar.getByText('First use downloads ~85 MB.')).toBeVisible();
		}

		const original = await page.evaluate(() => {
			const scene =
				/** @type {{ elements: { type: string, id: string, fileId: string, x: number, y: number, width: number, height: number }[] }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
			return scene.elements.find((element) => element.type === 'image');
		});
		expect(original).toBeDefined();
		if (!original) throw new Error('The pasted image was not added to the canvas.');

		await toolbar.getByRole('button', { name: 'Remove image background' }).click();
		await expect
			.poll(() =>
				page.evaluate(() => {
					const scene = /** @type {{ elements: { type: string, fileId: string }[] }} */ (
						JSON.parse(
							localStorage.getItem(
								document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
									'swyx-excalidraw:guest'
							) ?? '{"elements":[]}'
						)
					);
					return scene.elements.find((element) => element.type === 'image')?.fileId;
				})
			)
			.not.toBe(original.fileId);

		const processed = await page.evaluate(async () => {
			const scene =
				/** @type {{ elements: { type: string, id: string, fileId: string, x: number, y: number, width: number, height: number }[], files: Record<string, { dataURL: string, mimeType: string }> }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[],"files":{}}'
					)
				);
			const image = scene.elements.find((element) => element.type === 'image');
			if (!image) throw new Error('Processed image missing.');
			const asset = scene.files[image.fileId];
			const bitmap = await createImageBitmap(await fetch(asset.dataURL).then((res) => res.blob()));
			const drawing = document.createElement('canvas');
			drawing.width = bitmap.width;
			drawing.height = bitmap.height;
			const context = drawing.getContext('2d');
			if (!context) throw new Error('Canvas rendering is unavailable.');
			context.drawImage(bitmap, 0, 0);
			return {
				image,
				fileIds: Object.keys(scene.files),
				mimeType: asset.mimeType,
				pixelAlpha: context.getImageData(0, 0, 1, 1).data[3],
				imageWidth: bitmap.width,
				imageHeight: bitmap.height,
				rememberedMode: JSON.parse(
					localStorage.getItem(
						(document.querySelector('.draw-canvas')?.getAttribute('data-account-storage-key') ||
							'swyx-excalidraw:guest') + ':background-mode'
					) ?? 'null'
				)
			};
		});
		expect(processed.image.id).toBe(original.id);
		expect(processed.image.x).toBe(original.x);
		expect(processed.image.y).toBe(original.y);
		expect(processed.image.width).toBe(original.width);
		expect(processed.image.height).toBe(original.height);
		expect(processed.fileIds).toEqual([processed.image.fileId]);
		expect(processed.mimeType).toBe('image/png');
		expect(processed.pixelAlpha).toBe(0);
		if (fixture.mode !== 'portrait-fast') expect(processed.rememberedMode).toBe(fixture.mode);

		await page.getByRole('button', { name: 'Undo' }).click();
		await expect
			.poll(() =>
				page.evaluate(() => {
					const scene = /** @type {{ elements: { type: string, fileId: string }[] }} */ (
						JSON.parse(
							localStorage.getItem(
								document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
									'swyx-excalidraw:guest'
							) ?? '{"elements":[]}'
						)
					);
					return scene.elements.find((element) => element.type === 'image')?.fileId;
				})
			)
			.toBe(original.fileId);
	});
}
