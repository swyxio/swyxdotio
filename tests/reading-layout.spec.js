import { test, expect } from '@playwright/test';
import http from 'node:http';

const articleUrl = 'http://127.0.0.1:4173/america250';

test('the phone contents row is in place before the article HTML finishes streaming', async ({
	page
}) => {
	const html = await (await fetch(articleUrl)).text();
	const section = html.indexOf('<h2 id="pretraining-', html.indexOf('class="article-header"'));
	if (section < 0) throw new Error('Could not find the first section in the article');
	let finishStream = () => {};
	const server = http.createServer((request, response) => {
		if (request.url === '/america250') {
			response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
			response.write(html.slice(0, section));
			finishStream = () => {
				if (!response.writableEnded) response.end(html.slice(section));
			};
			return;
		}
		const upstream = http.request(
			{
				host: '127.0.0.1',
				port: 4173,
				path: request.url,
				method: request.method,
				headers: { ...request.headers, host: '127.0.0.1:4173' }
			},
			(upstreamResponse) => {
				response.writeHead(upstreamResponse.statusCode ?? 500, upstreamResponse.headers);
				upstreamResponse.pipe(response);
			}
		);
		upstream.on('error', () => response.destroy());
		request.pipe(upstream);
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Could not start stream server');
	try {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(`http://127.0.0.1:${address.port}/america250`, { waitUntil: 'commit' });
		const contents = page.getByRole('button', { name: 'Table of Contents' });
		const title = page.locator('.article-header h1');
		await expect(contents).toBeVisible();
		await expect(title).toBeVisible();
		await page.evaluate(() => document.fonts.ready);
		const before = await title.boundingBox();
		finishStream();
		await expect(page.locator('#pretraining-my-first-america-run-2007-2010')).toBeAttached();
		await expect(page.locator('article[data-toc-root]')).toBeAttached();
		const after = await title.boundingBox();
		if (!before || !after) throw new Error('Article title is not visible');
		expect(Math.abs(after.y - before.y)).toBeLessThan(1);
	} finally {
		finishStream();
		server.closeAllConnections();
		server.close();
	}
});

test('the phone contents row is already in place before scripts finish loading', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	let releaseScripts = () => {};
	const scriptsReady = new Promise((resolve) => {
		releaseScripts = () => resolve(undefined);
	});
	await page.route('**/*', async (route) => {
		if (route.request().resourceType() === 'script') await scriptsReady;
		await route.continue();
	});
	await page.goto(articleUrl, { waitUntil: 'commit' });
	const contents = page.getByRole('button', { name: 'Table of Contents' });
	const title = page.locator('.article-header h1');
	await expect(contents).toBeVisible();
	await expect(title).toBeVisible();
	await page.evaluate(() => document.fonts.ready);
	const before = await title.boundingBox();
	releaseScripts();
	await expect(page.locator('article[data-toc-root]')).toBeAttached();
	await expect(contents).toHaveAttribute('aria-expanded', 'false');
	const after = await title.boundingBox();
	if (!before || !after) throw new Error('Article title is not visible');
	expect(Math.abs(after.y - before.y)).toBeLessThan(1);
	await contents.click();
	await expect(
		page.getByRole('navigation', { name: 'Table of contents' }).getByRole('link', {
			name: 'A parting thought'
		})
	).toBeVisible();
});

test('an article without section headings does not reserve a contents row', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('http://127.0.0.1:4173/aie-singapore-the-agentic-nation');
	await expect(page.locator('article[data-toc-root]')).toBeAttached();
	await expect(page.getByRole('button', { name: 'Table of Contents' })).toBeHidden();
});

test('contents follows the reading position after large scrolls in either direction', async ({
	page
}) => {
	await page.setViewportSize({ width: 1200, height: 900 });
	await page.goto(articleUrl);
	const contents = page.getByRole('navigation', { name: 'Table of contents' });
	const title = contents.getByRole('link', { name: 'What America has meant to me' });
	const firstSection = contents.getByRole('link', { name: /Pretraining: My First America Run/ });
	const lastSection = contents.getByRole('link', { name: 'A parting thought' });
	await expect(title).toHaveAttribute('aria-current', 'location');

	// A heading visible lower down should not become current before the reader reaches it.
	await page.locator('#pretraining-my-first-america-run-2007-2010').evaluate((heading) => {
		window.scrollTo(0, window.scrollY + heading.getBoundingClientRect().top - 400);
	});
	await expect(title).toHaveAttribute('aria-current', 'location');

	await page.locator('#a-parting-thought').evaluate((heading) => {
		window.scrollTo(0, window.scrollY + heading.getBoundingClientRect().top - 32);
	});
	await expect(lastSection).toHaveAttribute('aria-current', 'location');

	await page.locator('#pretraining-my-first-america-run-2007-2010').evaluate((heading) => {
		window.scrollTo(0, window.scrollY + heading.getBoundingClientRect().top - 32);
	});
	await expect(firstSection).toHaveAttribute('aria-current', 'location');
});

test('phone contents highlights the section selected by a link', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(articleUrl);
	await page.getByRole('button', { name: 'Table of Contents' }).click();
	const lastSection = page
		.getByRole('navigation', { name: 'Table of contents' })
		.getByRole('link', {
			name: 'A parting thought'
		});
	await lastSection.click();
	await expect(page).toHaveURL(/#a-parting-thought$/);
	await expect(lastSection).toHaveAttribute('aria-current', 'location');
});

test('contents highlights a short final section at the bottom of the page', async ({ page }) => {
	await page.setViewportSize({ width: 1200, height: 900 });
	await page.goto(articleUrl);
	const lastHeading = page.locator('#a-parting-thought');
	await lastHeading.evaluate((heading) => {
		while (heading.nextElementSibling) heading.nextElementSibling.remove();
		heading.insertAdjacentHTML('afterend', '<p style="height: 80px">A short final section.</p>');
		document.querySelector('.article-endmatter')?.remove();
		document.querySelector('footer')?.remove();
	});
	const lastSection = page
		.getByRole('navigation', { name: 'Table of contents' })
		.getByRole('link', {
			name: 'A parting thought'
		});
	await lastSection.click();
	await expect
		.poll(() => lastHeading.evaluate((heading) => heading.getBoundingClientRect().top))
		.toBeGreaterThan(80);
	await expect(lastSection).toHaveAttribute('aria-current', 'location');
});

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
