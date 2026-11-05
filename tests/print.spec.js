import { test, expect } from '@playwright/test';

const articleUrl = 'http://127.0.0.1:4173/america250';

test.use({ colorScheme: 'dark' });

test('a dark-theme article prints as a light reading copy without site chrome', async ({
	page
}) => {
	await page.goto(articleUrl);
	await expect(page.locator('article[data-toc-root]')).toBeAttached();
	await expect(page.locator('html')).toHaveClass(/\bdark\b/);
	const bodyColor = () => page.locator('body').evaluate((body) => getComputedStyle(body).color);
	expect(await bodyColor()).toBe('rgb(240, 232, 217)');

	await page.emulateMedia({ media: 'print' });
	expect(await bodyColor()).toBe('rgb(41, 42, 36)');
	await expect(page.locator('.article-header h1')).toBeVisible();
	for (const selector of [
		'.site-nav-shell',
		'.literary-footer',
		'.chat-launcher',
		'.article-index',
		'.floating-toc',
		'.article-endmatter'
	]) {
		await expect(page.locator(selector).first()).toBeHidden();
	}
});

test('printed articles spell out external link addresses once', async ({ page }) => {
	await page.goto(articleUrl);
	await expect(page.locator('article[data-toc-root]')).toBeAttached();
	await page.emulateMedia({ media: 'print' });
	/** @param {import('@playwright/test').Locator} link */
	const printedAddress = (link) =>
		link.evaluate((element) => getComputedStyle(element, '::after').content);
	const article = page.locator('article.reading-prose');
	const described = article.locator('a[href="https://en.wikipedia.org/wiki/Lilongwe"]');
	await expect(described).toHaveText('Lilongwe');
	expect(await printedAddress(described)).toBe('" (https://en.wikipedia.org/wiki/Lilongwe)"');
	expect(await printedAddress(article.locator('.article-byline a').first())).toBe('none');
	expect(await printedAddress(article.locator('.heading-link').first())).toBe('none');
	// Bare URLs already show their address, so it is not printed a second time.
	await described.evaluate((link) => link.classList.add('bare-link'));
	expect(await printedAddress(described)).toBe('none');
});
