import { expect, test } from '@playwright/test';

test('big text box is public, focused, fullscreen, and distraction-free', async ({ page }) => {
	await page.goto('/box');

	const textbox = page.getByRole('textbox', { name: 'Write anything' });
	await expect(page).toHaveTitle('Big text box · swyx.io');
	await expect(textbox).toBeFocused();
	await expect(page.locator('nav')).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'swyx.io' })).toBeVisible();

	await textbox.fill('hello\nworld');
	await expect(textbox).toHaveValue('hello\nworld');

	const bounds = await textbox.boundingBox();
	const viewport = page.viewportSize();
	expect(bounds?.width).toBe(viewport?.width);
	expect(bounds?.height).toBeGreaterThan((viewport?.height ?? 0) * 0.8);
});
