import { expect, test } from '@playwright/test';

/** @typedef {{ isDeleted?: boolean, text?: string, roughness?: number }} DrawingElement */

test('drawing canvas always uses light mode even when the site is dark', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
	await page.goto('/draw');

	await expect(page.locator('html')).toHaveClass(/dark/);
	await expect(page.locator('.excalidraw')).toBeVisible();
	await expect(page.locator('.excalidraw')).not.toHaveClass(/theme--dark/);
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toHaveCSS(
		'background-color',
		'rgb(255, 255, 255)'
	);
});

test('drawing canvas is public, fullscreen, and persists drawings in the browser', async ({
	page
}) => {
	const response = await page.goto('/draw');

	expect(response?.status()).toBe(200);
	await expect(page).toHaveURL(/\/draw$/);
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
					JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
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
					JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
				);
				return scene.elements.filter((element) => !element.isDeleted).length;
			})
		)
		.toBe(1);
});

test('visual presets insert labeled editable diagrams without replacing existing work', async ({
	page
}) => {
	await page.goto('/draw');

	const browsePresets = page.getByRole('button', { name: /presets|templates/i });
	await expect(browsePresets).toBeVisible();
	await browsePresets.click();

	const presetOptions = page.getByRole('button', { name: /^insert .+ preset$/i });
	await expect(presetOptions).toHaveCount(9);

	await page.getByRole('button', { name: /insert priority quadrants preset/i }).click();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: DrawingElement[] }} */ (
					JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
				);
				return scene.elements.some((element) => element.text?.includes('Act now'));
			})
		)
		.toBe(true);
	const initialScene = await page.evaluate(
		() =>
			/** @type {{ elements: DrawingElement[] }} */ (
				JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
			)
	);
	const initialShapeCount = initialScene.elements.filter((element) => !element.isDeleted).length;
	expect(initialShapeCount).toBeGreaterThan(4);
	expect(initialScene.elements.some((element) => element.text?.includes('Plan'))).toBe(true);
	expect(initialScene.elements.some((element) => element.roughness === 2)).toBe(true);

	await browsePresets.click();
	await page.getByRole('button', { name: /insert strategy scatterplot preset/i }).click();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: DrawingElement[] }} */ (
					JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
				);
				return scene.elements.filter((element) => !element.isDeleted).length;
			})
		)
		.toBeGreaterThan(initialShapeCount);
	const combinedScene = await page.evaluate(
		() =>
			/** @type {{ elements: DrawingElement[] }} */ (
				JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
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
					JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
				);
				return scene.elements.some((element) => element.text === 'Strategic fit');
			})
		)
		.toBe(true);
});

test('software architecture libraries preload and preserve personally added components', async ({
	page
}) => {
	await page.goto('/draw');

	await expect
		.poll(() =>
			page.evaluate(() => {
				const items = /** @type {{ id: string }[]} */ (
					JSON.parse(localStorage.getItem('swyx-excalidraw:library') ?? '[]')
				);
				return items.length;
			})
		)
		.toBe(42);

	const items = await page.evaluate(
		() =>
			/** @type {{ id: string }[]} */ (
				JSON.parse(localStorage.getItem('swyx-excalidraw:library') ?? '[]')
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
					JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
				);
				return scene.elements.length;
			})
		)
		.toBeGreaterThan(0);

	await page.evaluate(() => {
		const storedItems = /** @type {{ id: string }[]} */ (
			JSON.parse(localStorage.getItem('swyx-excalidraw:library') ?? '[]')
		);
		storedItems.push({ ...storedItems[0], id: 'my-personal-component' });
		localStorage.setItem('swyx-excalidraw:library', JSON.stringify(storedItems));
	});
	await page.reload();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const storedItems = /** @type {{ id: string }[]} */ (
					JSON.parse(localStorage.getItem('swyx-excalidraw:library') ?? '[]')
				);
				return storedItems.some((item) => item.id === 'my-personal-component');
			})
		)
		.toBe(true);
});
