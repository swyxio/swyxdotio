import { expect, test } from '@playwright/test';

test('About renders the editorial introduction, sections, and press photos', async ({ page }) => {
	await page.goto('/about');
	await expect(page.getByRole('heading', { name: 'Shawn Wang (swyx)', exact: true })).toBeVisible();
	await expect(page.locator('h2#current-work')).toBeVisible();
	await expect(page.locator('.about-copy')).toBeVisible();
	await expect(page.locator('.press-photo-grid figure')).toHaveCount(4);
});

test.describe('Ideas library', () => {
	test('search and category controls preserve shareable URL parameters', async ({ page }) => {
		await page.goto('/ideas');
		await page.getByRole('searchbox', { name: 'Search articles' }).fill('temporal');
		await expect(page).toHaveURL(/\/ideas\?filter=temporal$/);
		await page.locator('label.ideas-filter', { hasText: 'Essay' }).click();
		await expect(page).toHaveURL(/\/ideas\?filter=temporal&show=Essay$/);
		await expect(page.locator('#ideas-results')).toHaveAttribute('aria-busy', 'false');
		await expect(page.locator('.ideas-row')).not.toHaveCount(0);
	});

	test('search and categories survive a direct visit', async ({ page }) => {
		await page.goto('/ideas?filter=temporal&show=Essay');
		await expect(page.getByRole('searchbox', { name: 'Search articles' })).toHaveValue('temporal');
		await expect(page.getByRole('checkbox', { name: 'Essay', exact: true })).toBeChecked();
		await expect(page.locator('#ideas-results')).toHaveAttribute('aria-busy', 'false');
		await expect(page.locator('.ideas-row')).not.toHaveCount(0);
	});
});
