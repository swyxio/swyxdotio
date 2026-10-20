import { test, expect } from '@playwright/test';

test('the preloaded fonts render on a normal connection', async ({ page }) => {
	await page.goto('http://127.0.0.1:4173/america250');
	await page.evaluate(() => document.fonts.ready);
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('DOM.enable');
	await cdp.send('CSS.enable');
	const { root } = await cdp.send('DOM.getDocument');
	for (const [selector, family] of [
		['.article-header h1', 'Inter'],
		['.brand-link', 'Newsreader']
	]) {
		const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
		const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
		expect(fonts.some((font) => font.familyName.startsWith(family) && font.isCustomFont)).toBe(
			true
		);
	}
});

for (const width of [390, 1200]) {
	test(`late fonts do not change visible text at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		let releaseFonts;
		const fontsReady = new Promise((resolve) => (releaseFonts = resolve));
		const delayedFonts = [];
		await page.route(
			/\/fonts\/(inter-normal-400-700-latin|newsreader-semibold)\.woff2$/,
			async (route) => {
				delayedFonts.push(route.request().url());
				await fontsReady;
				await route.continue();
			}
		);
		await page.goto('http://127.0.0.1:4173/america250', { waitUntil: 'domcontentloaded' });
		const title = page.locator('.article-header h1');
		const brand = page.locator('.brand-link');
		await expect(title).toBeVisible();
		await expect(brand).toBeVisible();
		// Let the optional font display window expire before releasing the responses.
		await page.waitForTimeout(500);
		expect(delayedFonts).toHaveLength(2);
		const textWidth = (locator) =>
			locator.evaluate((element) => {
				const range = document.createRange();
				range.selectNodeContents(element);
				return range.getBoundingClientRect().width;
			});
		const before = await Promise.all([textWidth(title), textWidth(brand)]);
		const responses = delayedFonts.map((url) => page.waitForResponse(url));
		releaseFonts();
		await Promise.all(responses);
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(300);
		const after = await Promise.all([textWidth(title), textWidth(brand)]);
		expect(after).toEqual(before);
	});
}
