import { test, expect } from '@playwright/test';

const articleUrl = 'http://127.0.0.1:4173/america250';

test('phone index and contents expand without covering the article', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(articleUrl);
	const index = page.getByRole('button', { name: 'index' });
	const contents = page.getByRole('button', { name: 'Table of Contents' });
	await expect(contents).toHaveAttribute('aria-expanded', 'false');
	await contents.click();
	await expect(contents).toHaveAttribute('aria-expanded', 'true');
	const tocBox = await page.getByRole('navigation', { name: 'Table of contents' }).boundingBox();
	const headline = await page.locator('.article-header h1').boundingBox();
	if (!tocBox || !headline) throw new Error('Article or contents is not visible');
	expect(tocBox.y + tocBox.height).toBeLessThan(headline.y);
	await contents.click();
	await index.click();
	await expect(index).toHaveAttribute('aria-expanded', 'true');
	await expect(
		page.getByRole('navigation', { name: 'Explore writing' }).getByText('Featured reads')
	).toBeVisible();
	const indexBox = await page.getByRole('navigation', { name: 'Explore writing' }).boundingBox();
	const nextHeadline = await page.locator('.article-header h1').boundingBox();
	if (!indexBox || !nextHeadline) throw new Error('Article or index is not visible');
	expect(indexBox.y + indexBox.height).toBeLessThan(nextHeadline.y);
	await page.keyboard.press('Escape');
	await expect(index).toHaveAttribute('aria-expanded', 'false');
});

test('desktop index unfolds in the left margin alongside the contents', async ({ page }) => {
	await page.setViewportSize({ width: 1200, height: 900 });
	await page.goto(articleUrl);
	const index = page.getByRole('button', { name: 'index' });
	await index.click();
	await expect(index).toHaveAttribute('aria-expanded', 'true');
	const panel = page.locator('#article-index-panel');
	await expect(panel).toHaveCSS('position', 'static');
	const indexBox = await panel.boundingBox();
	const headline = await page.locator('.article-header h1').boundingBox();
	const tocBox = await page.getByRole('navigation', { name: 'Table of contents' }).boundingBox();
	if (!indexBox || !headline || !tocBox) throw new Error('Article rails are not visible');
	await expect(page.locator('article h2').first()).toHaveCSS('font-family', /Inter/);
	expect(indexBox.x + indexBox.width).toBeLessThan(headline.x);
	expect(tocBox.x).toBeGreaterThan(headline.x + headline.width);
});

test('both desktop rails remain scrollable in a short window', async ({ page }) => {
	await page.setViewportSize({ width: 1200, height: 320 });
	await page.goto(articleUrl);
	const contents = page.getByRole('navigation', { name: 'Table of contents' });
	const list = contents.locator('ul');
	await expect(list).toBeVisible();
	await expect.poll(() => list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
	await list.locator('a').last().scrollIntoViewIfNeeded();
	const lastLink = await list.locator('a').last().boundingBox();
	const tocBox = await contents.boundingBox();
	if (!lastLink || !tocBox) throw new Error('Contents rail is not visible');
	expect(tocBox.y + tocBox.height).toBeLessThanOrEqual(320);
	expect(lastLink.y + lastLink.height).toBeLessThanOrEqual(320);
	await page.getByRole('button', { name: 'index' }).click();
	const panel = page.locator('#article-index-panel');
	await panel.locator('a').last().scrollIntoViewIfNeeded();
	const indexBox = await panel.boundingBox();
	const lastIndexLink = await panel.locator('a').last().boundingBox();
	if (!indexBox || !lastIndexLink) throw new Error('Index rail is not visible');
	expect(indexBox.y + indexBox.height).toBeLessThanOrEqual(320);
	expect(lastIndexLink.y + lastIndexLink.height).toBeLessThanOrEqual(320);
});
