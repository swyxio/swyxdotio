import { expect, test } from '@playwright/test';

test('about page renders markdown headings (marked + prerender)', async ({ page }) => {
  await page.goto('/about');
  // about content is rendered from content.md via marked at build time
  await expect(page.locator('h2#tldr')).toBeVisible();
  await expect(page.locator('article.prose')).toBeVisible();
});

test.describe('test blog page', () => {
  test('blog page to preserve url params', async ({ page }) => {
    // Go to http://localhost:5173/
    await page.goto('/ideas');

    // Click [placeholder="Hit \/ to search"]
    await page.locator('[placeholder="Hit \\/ to search"]').click();

    // Fill [placeholder="Hit \/ to search"]
    await page.locator('[placeholder="Hit \\/ to search"]').fill('test');
    await expect(page).toHaveURL('http://localhost:5173/ideas?filter=test');

    // Click label:has-text("Blog")
    await page.locator('label:has-text("Blog")').click();
    await expect(page).toHaveURL('http://localhost:5173/ideas?filter=test&show=Blog');
  });

  test('blog to honour existing params', async ({ page }) => {
    await page.goto('http://localhost:5173/ideas?filter=test&show=Blog');
    await expect(page).toHaveURL('http://localhost:5173/ideas?filter=test&show=Blog');
  });
});
