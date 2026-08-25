import { expect, test } from '@playwright/test';

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
	const canvas = editor.locator('.tl-canvas');
	const drawTool = editor.getByRole('button', { name: /^(draw|pencil)\b/i }).first();

	await expect(editor).toBeVisible();
	await expect(canvas).toBeVisible();
	await expect(drawTool).toBeVisible();

	const bounds = await editor.boundingBox();
	const viewport = page.viewportSize();
	expect(bounds?.width).toBeGreaterThanOrEqual((viewport?.width ?? 0) * 0.95);
	expect(bounds?.height).toBeGreaterThanOrEqual((viewport?.height ?? 0) * 0.95);

	await drawTool.click();

	const canvasBounds = await canvas.boundingBox();
	expect(canvasBounds).not.toBeNull();
	if (!canvasBounds) throw new Error('Drawing canvas has no visible bounds');

	const startX = canvasBounds.x + canvasBounds.width * 0.35;
	const startY = canvasBounds.y + canvasBounds.height * 0.4;
	await page.mouse.move(startX, startY);
	await page.mouse.down();
	await page.mouse.move(startX + 120, startY + 60, { steps: 12 });
	await page.mouse.up();

	const shapes = editor.locator('.tl-shape');
	await expect(shapes).toHaveCount(1);

	await expect
		.poll(() =>
			page.evaluate(
				() =>
					new Promise((resolve, reject) => {
						const request = indexedDB.open('TLDRAW_DOCUMENT_v2swyx-draw');
						request.onerror = () => reject(request.error);
						request.onsuccess = () => {
							const database = request.result;
							const records = database
								.transaction('records', 'readonly')
								.objectStore('records')
								.getAll();
							records.onerror = () => {
								database.close();
								reject(records.error);
							};
							records.onsuccess = () => {
								database.close();
								resolve(records.result.filter((record) => record.typeName === 'shape').length);
							};
						};
					})
			)
		)
		.toBe(1);

	await page.reload();
	await expect(canvas).toBeVisible();
	await expect(shapes).toHaveCount(1);
});
