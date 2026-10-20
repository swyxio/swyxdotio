import { test, expect } from '@playwright/test';

const baseUrl = process.env.READING_TEST_BASE_URL || 'http://127.0.0.1:4173';

for (const viewport of [
	{ width: 390, height: 844 },
	{ width: 1200, height: 900 }
]) {
	test(`curated index links stay in the page flow at ${viewport.width}px`, async ({ page }) => {
		await page.setViewportSize(viewport);
		await page.goto(`${baseUrl}/learn-in-public`);
		await expect(page.locator('#floating-toc-items li').first()).toBeAttached();
		const index = page.getByRole('navigation', { name: 'Explore writing' });
		const toggle = index.getByRole('button', { name: 'index' });
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(index.getByText('Follow a thread')).toBeVisible();
		await expect(index.locator('.thread-title')).toContainText('Learning in public');
		await expect(index.getByRole('link', { name: 'How to Create Luck' })).toHaveCount(1);
		await expect(index.getByRole('link', { name: 'Getting Senpai To Notice You' })).toBeVisible();
		await expect(index.getByRole('link', { name: 'Learn in Public', exact: true })).toHaveCount(0);
		await expect(index.getByText('Featured reads')).toBeVisible();
		await expect(index.getByText('Nearby in time')).toBeAttached();

		const indexBox = await index.boundingBox();
		const headline = await page.locator('.article-header h1').boundingBox();
		if (!indexBox || !headline) throw new Error('Article or index is not visible');
		if (viewport.width < 1200) expect(indexBox.y + indexBox.height).toBeLessThan(headline.y);
		else expect(indexBox.x + indexBox.width).toBeLessThan(headline.x);

		await page.keyboard.press('Escape');
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect(toggle).toBeFocused();
	});
}
