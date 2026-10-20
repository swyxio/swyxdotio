import { test, expect } from '@playwright/test';

const baseUrl = process.env.CHAT_TEST_BASE_URL || 'http://127.0.0.1:4173';

/** @param {import('@playwright/test').BrowserContext} context */
async function mockChat(context) {
	/** @type {Set<import('@playwright/test').WebSocketRoute>} */
	const sockets = new Set();
	/** @type {{ id: string, nick: string, text: string, createdAt: number }[]} */
	const messages = [];
	let rejectNext = false;
	await context.routeWebSocket('**/api/chat', (socket) => {
		sockets.add(socket);
		socket.send(JSON.stringify({ type: 'history', messages }));
		socket.onClose(() => {
			sockets.delete(socket);
		});
		socket.onMessage((data) => {
			const frame = JSON.parse(String(data));
			if (frame.type !== 'message') return;
			if (rejectNext) {
				rejectNext = false;
				socket.send(
					JSON.stringify({ type: 'error', requestId: frame.requestId, message: 'Please wait.' })
				);
				return;
			}
			const message = {
				id: String(messages.length + 1),
				nick: frame.nick,
				text: frame.text,
				createdAt: Date.now()
			};
			messages.push(message);
			for (const client of sockets) client.send(JSON.stringify({ type: 'message', message }));
			socket.send(JSON.stringify({ type: 'ack', requestId: frame.requestId, id: message.id }));
		});
	});
	return { rejectNext: () => (rejectNext = true) };
}

test('mobile chat opens below the article and restores the reader position', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await mockChat(context);
	await page.goto(`${baseUrl}/america250`);
	const launcher = page.getByRole('button', { name: 'chat', exact: true });
	await expect(launcher).toBeVisible();
	const [launcherBox, paragraphBox] = await Promise.all([
		launcher.boundingBox(),
		page.locator('article.swyxcontent p').first().boundingBox()
	]);
	if (!launcherBox || !paragraphBox)
		throw new Error('Chat shortcut or article text was not visible');
	expect(launcherBox.width).toBeGreaterThanOrEqual(24);
	expect(launcherBox.x).toBeGreaterThanOrEqual(paragraphBox.x + paragraphBox.width);
	await page.evaluate(() => window.scrollTo(0, 600));
	const before = await page.evaluate(() => window.scrollY);
	await launcher.click();
	const chat = page.getByRole('region', { name: 'swyx', exact: true });
	await expect(chat).toBeVisible();
	await expect(chat).toContainText('Messages disappear after 48 hours');
	await expect(chat).toContainText('Backups may persist up to 30 days');
	const positions = await page.evaluate(() => {
		const articleElement = document.querySelector('article.swyxcontent');
		const panelElement = document.querySelector('#live-chat');
		if (!articleElement || !panelElement) throw new Error('Article or chat was not found');
		const article = articleElement.getBoundingClientRect();
		const panel = panelElement.getBoundingClientRect();
		return { articleBottom: article.bottom + scrollY, panelTop: panel.top + scrollY };
	});
	expect(positions.panelTop).toBeGreaterThanOrEqual(positions.articleBottom);
	await chat.getByRole('button', { name: 'Close chat' }).click();
	await expect(chat).toHaveCount(0);
	await expect(launcher).toBeFocused();
	expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
});

test('wide desktop chat leaves the expanded index and reading column clear', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await mockChat(context);
	await page.goto(`${baseUrl}/learn-in-public`);
	const chat = page.getByRole('region', { name: 'swyx', exact: true });
	await expect(chat).toBeVisible();
	const index = page.getByRole('navigation', { name: 'Explore writing' });
	await index.getByRole('button', { name: 'index' }).click();
	await expect(index.getByText('Follow a thread')).toBeVisible();
	const [chatBox, indexBox, articleBox] = await Promise.all([
		chat.boundingBox(),
		index.boundingBox(),
		page.locator('.article-header').boundingBox()
	]);
	if (!chatBox || !indexBox || !articleBox)
		throw new Error('Chat, index or article was not visible');
	expect(chatBox.x + chatBox.width).toBeLessThan(indexBox.x);
	expect(indexBox.x + indexBox.width).toBeLessThan(articleBox.x);
	await chat.getByRole('button', { name: 'Close chat' }).click();
	await expect(page.getByRole('button', { name: 'chat', exact: true })).toBeVisible();
});

test('two readers receive messages and rejected sends preserve the draft', async ({ browser }) => {
	const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
	const mock = await mockChat(context);
	const first = await context.newPage();
	const second = await context.newPage();
	await Promise.all([
		first.goto(`${baseUrl}/america250`),
		second.goto(`${baseUrl}/learn-in-public`)
	]);
	await Promise.all([
		first.getByRole('button', { name: 'chat', exact: true }).click(),
		second.getByRole('button', { name: 'chat', exact: true }).click()
	]);
	const firstChat = first.getByRole('region', { name: 'swyx', exact: true });
	const secondChat = second.getByRole('region', { name: 'swyx', exact: true });
	await expect(firstChat.getByText('Connected')).toBeVisible();
	await expect(secondChat.getByText('Connected')).toBeVisible();
	await firstChat.getByLabel('Nickname (unverified)').fill('alice');
	await firstChat.getByLabel('Message', { exact: true }).fill('Hello from the notebook');
	await firstChat.getByRole('button', { name: /send/ }).click();
	await expect(secondChat.getByText('Hello from the notebook')).toBeVisible();
	await expect(firstChat.getByLabel('Message', { exact: true })).toHaveValue('');
	mock.rejectNext();
	await firstChat.getByLabel('Message', { exact: true }).fill('Keep this draft');
	await firstChat.getByRole('button', { name: /send/ }).click();
	await expect(firstChat.getByRole('status')).toHaveText('Please wait.');
	await expect(firstChat.getByLabel('Message', { exact: true })).toHaveValue('Keep this draft');
	await context.close();
});

test('an open chat removes a message when its 48 hours are up', async ({ page, context }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await context.routeWebSocket('**/api/chat', (socket) => {
		socket.send(
			JSON.stringify({
				type: 'history',
				messages: [
					{
						id: 'expiring',
						nick: 'guest',
						text: 'Almost expired',
						createdAt: Date.now() - 48 * 60 * 60 * 1000 + 2500
					}
				]
			})
		);
	});
	await page.goto(`${baseUrl}/america250`);
	await page.getByRole('button', { name: 'chat', exact: true }).click();
	const message = page.getByText('Almost expired');
	await expect(message).toBeVisible();
	await expect(message).toHaveCount(0, { timeout: 5000 });
});

test('closing chat after client-side navigation keeps the new page scroll position', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await mockChat(context);
	await page.goto(`${baseUrl}/america250`);
	await page.evaluate(() => {
		document.documentElement.dataset.clientNavigation = 'yes';
		window.scrollTo(0, 600);
	});
	await page.getByRole('button', { name: 'chat', exact: true }).click();
	await page.locator('footer').getByRole('link', { name: 'Home', exact: true }).click();
	await expect(page).toHaveURL(`${baseUrl}/`);
	await expect(page.locator('h1#me')).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.dataset.clientNavigation)).toBe('yes');
	const before = await page.evaluate(() => {
		window.scrollTo(0, 1100);
		const panel = /** @type {HTMLElement | null} */ (document.querySelector('#live-chat'));
		if (!panel) throw new Error('Chat did not remain open');
		panel.focus({ preventScroll: true });
		return window.scrollY;
	});
	expect(before).toBeGreaterThan(600);
	await page.keyboard.press('Escape');
	await expect(page.getByRole('region', { name: 'swyx', exact: true })).toHaveCount(0);
	expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
});

test('Escape closes only the focused control and ignores IME composition', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await mockChat(context);
	await page.goto(`${baseUrl}/learn-in-public`);
	const chat = page.getByRole('region', { name: 'swyx', exact: true });
	const indexToggle = page
		.getByRole('navigation', { name: 'Explore writing' })
		.getByRole('button', { name: 'index' });
	await expect(chat).toBeVisible();
	await indexToggle.click();
	await expect(indexToggle).toHaveAttribute('aria-expanded', 'true');
	await page.keyboard.press('Escape');
	await expect(indexToggle).toHaveAttribute('aria-expanded', 'false');
	await expect(chat).toBeVisible();
	await indexToggle.click();
	await chat.getByLabel('Message', { exact: true }).focus();
	await page.evaluate(() => {
		document.activeElement?.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'Escape',
				bubbles: true,
				cancelable: true,
				isComposing: true
			})
		);
	});
	await expect(chat).toBeVisible();
	await expect(indexToggle).toHaveAttribute('aria-expanded', 'true');
	await page.keyboard.press('Escape');
	await expect(chat).toHaveCount(0);
	await expect(indexToggle).toHaveAttribute('aria-expanded', 'true');
});

test('closing chat after jumping to an article heading keeps that position', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await mockChat(context);
	await page.goto(`${baseUrl}/america250`);
	await page.evaluate(() => window.scrollTo(0, 600));
	await page.getByRole('button', { name: 'chat', exact: true }).click();
	const toc = page.getByRole('navigation', { name: 'Table of contents' });
	await toc.getByRole('button', { name: /Table of Contents/ }).click();
	await expect(toc.locator('a[href^="#"]').nth(1)).toBeVisible();
	await toc.locator('a[href^="#"]').nth(1).click();
	await expect(page).toHaveURL(/#.+/);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(600);
	const before = await page.evaluate(() => {
		const panel = /** @type {HTMLElement | null} */ (document.querySelector('#live-chat'));
		if (!panel) throw new Error('Chat did not remain open');
		panel.focus({ preventScroll: true });
		return window.scrollY;
	});
	await page.keyboard.press('Escape');
	await expect(page.getByRole('region', { name: 'swyx', exact: true })).toHaveCount(0);
	expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
});
