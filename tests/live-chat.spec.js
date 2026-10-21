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

test('quick messages fill the composer without sending or erasing a draft', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await mockChat(context);
	await page.goto(`${baseUrl}/america250`);
	await page.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click();
	const chat = page.getByRole('region', { name: 'swyx.irc', exact: true });
	const composer = chat.getByLabel('Message', { exact: true });
	const log = chat.getByRole('log', { name: 'Recent chat messages' });
	await chat.getByRole('button', { name: 'Add Hey everyone! 👋 to message' }).click();
	await expect(composer).toHaveValue('Hey everyone! 👋');
	await expect(composer).toBeFocused();
	await page.keyboard.type(' there');
	await expect(composer).toHaveValue('Hey everyone! 👋 there');
	await expect(log.getByText('Hey everyone! 👋')).toHaveCount(0);
	await composer.fill('My existing draft');
	await chat.getByRole('button', { name: 'Add What are you working on? to message' }).focus();
	await page.keyboard.press('Enter');
	await expect(composer).toHaveValue('My existing draft What are you working on?');
	await expect(log.getByText('My existing draft')).toHaveCount(0);
	await composer.fill('x'.repeat(500));
	await expect(
		chat.getByRole('button', { name: 'Add Love this site! ❤️ to message' })
	).toBeDisabled();
});

test('mobile chat floats over the article without moving the reader', async ({ page, context }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await mockChat(context);
	await page.goto(`${baseUrl}/america250`);
	const launcher = page.getByRole('button', { name: 'Open swyx.irc chat', exact: true });
	await expect(launcher).toBeVisible();
	const launcherBox = await launcher.boundingBox();
	if (!launcherBox) throw new Error('Live reader shortcut was not visible');
	expect(launcherBox.height).toBeGreaterThanOrEqual(44);
	expect(390 - (launcherBox.x + launcherBox.width)).toBeLessThanOrEqual(16);
	expect(844 - (launcherBox.y + launcherBox.height)).toBeLessThanOrEqual(16);
	await page.evaluate(() => window.scrollTo(0, 600));
	const before = await page.evaluate(() => window.scrollY);
	await launcher.click();
	const chat = page.getByRole('region', { name: 'swyx.irc', exact: true });
	await expect(chat).toBeVisible();
	await expect(chat).toContainText('Messages disappear after 48 hours');
	await expect(chat).toContainText('Backups may persist up to 30 days');
	const panel = await chat.boundingBox();
	if (!panel) throw new Error('Floating chat was not visible');
	expect(await chat.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
	expect(panel.x).toBeGreaterThanOrEqual(0);
	expect(panel.y).toBeGreaterThanOrEqual(0);
	expect(panel.x + panel.width).toBeLessThanOrEqual(390);
	expect(panel.y + panel.height).toBeLessThanOrEqual(844);
	const openLauncher = page.getByRole('button', { name: 'Close swyx.irc chat', exact: true });
	await expect(openLauncher).toBeVisible();
	const openLauncherBox = await openLauncher.boundingBox();
	if (!openLauncherBox) throw new Error('Live reader shortcut was not visible while chat was open');
	expect(panel.y + panel.height).toBeLessThanOrEqual(openLauncherBox.y);
	expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
	await chat.getByRole('button', { name: 'Close chat' }).click();
	await expect(chat).toHaveCount(0);
	await expect(launcher).toBeFocused();
	expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
});

test('a saved chat position leaves the live reader count visible', async ({ page, context }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await mockChat(context);
	await context.addInitScript(() => {
		localStorage.setItem(
			'swyx:chat:geometry:v1:standard',
			JSON.stringify({ x: 60, y: 320, width: 320, height: 510 })
		);
	});
	await page.goto(`${baseUrl}/america250`);
	await page.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click();
	const chat = await page.getByRole('region', { name: 'swyx.irc', exact: true }).boundingBox();
	const launcher = await page.getByRole('button', { name: 'Close swyx.irc chat' }).boundingBox();
	if (!chat || !launcher) throw new Error('Chat or live reader count was not visible');
	expect(chat.y + chat.height).toBeLessThanOrEqual(launcher.y);
});

test('resizing to mobile keeps the open chat clear of the live reader count', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	await mockChat(context);
	await page.goto(`${baseUrl}/america250`);
	await page.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click();
	await page.setViewportSize({ width: 390, height: 844 });
	const chat = page.getByRole('region', { name: 'swyx.irc', exact: true });
	const launcher = page.getByRole('button', { name: 'Close swyx.irc chat', exact: true });
	await expect
		.poll(async () => {
			const box = await chat.boundingBox();
			const pill = await launcher.boundingBox();
			return box && pill ? box.y + box.height <= pill.y : false;
		})
		.toBe(true);
});

test('the reader count stays accessible on a short screen', async ({ page, context }) => {
	await page.setViewportSize({ width: 390, height: 300 });
	await mockChat(context);
	await page.goto(`${baseUrl}/america250`);
	await page.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click();
	const chat = page.getByRole('region', { name: 'swyx.irc', exact: true });
	const launcher = page.getByRole('button', { name: 'Close swyx.irc chat', exact: true });
	const [panel, pill] = await Promise.all([chat.boundingBox(), launcher.boundingBox()]);
	if (!panel || !pill) throw new Error('Chat or live reader count was not visible');
	expect(panel.y).toBeGreaterThanOrEqual(0);
	expect(panel.y + panel.height).toBeLessThanOrEqual(pill.y);
	await chat.getByRole('button', { name: 'Move chat window' }).focus();
	await page.keyboard.press('Shift+ArrowDown');
	const moved = await chat.boundingBox();
	if (!moved) throw new Error('Chat disappeared while moving it');
	expect(moved.y + moved.height).toBeGreaterThan(pill.y);
	await launcher.click();
	await expect(chat).toHaveCount(0);
});

test('wide desktop chat leaves the expanded index and reading column clear', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await mockChat(context);
	await page.goto(`${baseUrl}/learn-in-public`);
	const chat = page.getByRole('region', { name: 'swyx.irc', exact: true });
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
	await expect(page.getByRole('button', { name: 'Open swyx.irc chat', exact: true })).toBeVisible();
});

test('narrow and wide layouts remember separate positions without covering the index', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await mockChat(context);
	await page.goto(`${baseUrl}/learn-in-public`);
	await page.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click();
	const chat = page.getByRole('region', { name: 'swyx.irc', exact: true });
	const move = chat.getByRole('button', { name: 'Move chat window' });
	await move.focus();
	await page.keyboard.press('ArrowUp');
	const narrow = await chat.boundingBox();
	if (!narrow) throw new Error('Narrow chat was not visible');
	await page.setViewportSize({ width: 1600, height: 900 });
	await expect.poll(async () => (await chat.boundingBox())?.width).toBe(268);
	const index = page.getByRole('navigation', { name: 'Explore writing' });
	await index.getByRole('button', { name: 'index' }).click();
	await expect(index.getByText('Follow a thread')).toBeVisible();
	const [wide, indexBox] = await Promise.all([chat.boundingBox(), index.boundingBox()]);
	if (!wide || !indexBox) throw new Error('Wide chat or index was not visible');
	expect(wide.x + wide.width).toBeLessThan(indexBox.x);
	await chat.getByRole('button', { name: 'Resize chat window' }).focus();
	await page.keyboard.press('ArrowRight');
	await page.setViewportSize({ width: 390, height: 844 });
	await expect.poll(async () => (await chat.boundingBox())?.y).toBeCloseTo(narrow.y, 0);
	await expect.poll(async () => (await chat.boundingBox())?.width).toBeCloseTo(narrow.width, 0);
	await page.setViewportSize({ width: 1600, height: 900 });
	await expect.poll(async () => (await chat.boundingBox())?.width).toBe(wide.width + 12);
	await page.setViewportSize({ width: 390, height: 844 });
	await expect.poll(async () => (await chat.boundingBox())?.y).toBeCloseTo(narrow.y, 0);
	const handle = await move.boundingBox();
	if (!handle) throw new Error('Narrow move handle was not visible');
	await page.mouse.move(handle.x + 20, handle.y + 20);
	await page.mouse.down();
	await page.setViewportSize({ width: 1600, height: 900 });
	await page.mouse.move(500, 200);
	await page.mouse.up();
	await page.setViewportSize({ width: 390, height: 844 });
	await expect.poll(async () => (await chat.boundingBox())?.x).toBeCloseTo(narrow.x, 0);
	await expect.poll(async () => (await chat.boundingBox())?.y).toBeCloseTo(narrow.y, 0);
});

test('dragging and resizing persist across reloads and stay within the viewport', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	await mockChat(context);
	await page.goto(`${baseUrl}/america250`);
	await page.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click();
	const chat = page.getByRole('region', { name: 'swyx.irc', exact: true });
	const move = chat.getByRole('button', { name: 'Move chat window' });
	const resize = chat.getByRole('button', { name: 'Resize chat window' });
	await chat.getByLabel('Message', { exact: true }).fill('Draft stays in place');
	const before = await chat.boundingBox();
	const moveBox = await move.boundingBox();
	if (!before || !moveBox) throw new Error('Chat or move handle not found');
	await page.mouse.move(moveBox.x + 20, moveBox.y + 20);
	await page.mouse.down();
	await page.mouse.move(moveBox.x + 220, moveBox.y - 80, { steps: 8 });
	await page.mouse.up();
	const moved = await chat.boundingBox();
	if (!moved) throw new Error('Chat disappeared during drag');
	expect(moved.x).toBeCloseTo(before.x + 200, 0);
	expect(moved.y).toBeCloseTo(before.y - 100, 0);
	const resizeBox = await resize.boundingBox();
	if (!resizeBox) throw new Error('Resize handle not found');
	await page.mouse.move(resizeBox.x + 20, resizeBox.y + 20);
	await page.mouse.down();
	await page.mouse.move(resizeBox.x + 100, resizeBox.y + 50, { steps: 8 });
	await page.mouse.up();
	const resized = await chat.boundingBox();
	if (!resized) throw new Error('Chat disappeared during resize');
	expect(resized.width).toBeCloseTo(moved.width + 80, 0);
	expect(resized.height).toBeCloseTo(moved.height + 30, 0);
	await expect(chat.getByLabel('Message', { exact: true })).toHaveValue('Draft stays in place');
	await page.reload();
	await page.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click();
	const restored = await chat.boundingBox();
	if (!restored) throw new Error('Saved chat was not restored');
	for (const key of /** @type {const} */ (['x', 'y', 'width', 'height'])) {
		expect(restored[key]).toBeCloseTo(resized[key], 0);
	}
	await page.setViewportSize({ width: 390, height: 700 });
	const clamped = await chat.boundingBox();
	if (!clamped) throw new Error('Chat was not visible at the smaller viewport');
	expect(clamped.x).toBeGreaterThanOrEqual(0);
	expect(clamped.y).toBeGreaterThanOrEqual(0);
	expect(clamped.x + clamped.width).toBeLessThanOrEqual(390);
	expect(clamped.y + clamped.height).toBeLessThanOrEqual(700);
	await page.setViewportSize({ width: 390, height: 430 });
	await expect(chat.getByLabel('Message', { exact: true })).toBeInViewport();
	await expect(resize).toBeInViewport();
	await expect(chat.getByRole('button', { name: 'Close chat' })).toBeInViewport();
	await page.setViewportSize({ width: 390, height: 300 });
	const compact = await chat.boundingBox();
	if (!compact) throw new Error('Compact chat was not visible');
	await expect(chat.getByText(/backups up to 30 days/)).toBeVisible();
	await expect(chat.getByText(/unverified names/)).toBeVisible();
	for (const control of [
		chat.getByLabel('Message', { exact: true }),
		chat.getByRole('button', { name: /send/ }),
		resize
	]) {
		const box = await control.boundingBox();
		if (!box) throw new Error('Compact chat control was not visible');
		expect(box.y).toBeGreaterThanOrEqual(compact.y);
		expect(box.y + box.height).toBeLessThanOrEqual(compact.y + compact.height);
	}
	const send = chat.getByRole('button', { name: /send/ });
	const form = chat.locator('form');
	const sendBox = await send.boundingBox();
	const formBox = await form.boundingBox();
	if (!sendBox || !formBox) throw new Error('Compact chat form was not visible');
	expect(sendBox.y).toBeGreaterThanOrEqual(formBox.y);
	expect(sendBox.y + sendBox.height).toBeLessThanOrEqual(formBox.y + formBox.height);
	await page.setViewportSize({ width: 1100, height: 850 });
	await expect.poll(async () => (await chat.boundingBox())?.width).toBeCloseTo(resized.width, 0);
	await move.focus();
	await page.keyboard.press('ArrowRight');
	await expect.poll(async () => (await chat.boundingBox())?.x).toBeCloseTo(resized.x + 12, 0);
	await resize.focus();
	await page.keyboard.press('ArrowLeft');
	await expect
		.poll(async () => (await chat.boundingBox())?.width)
		.toBeCloseTo(resized.width - 12, 0);
});

test('touch gestures move and resize the chat without scrolling the article', async ({
	browser
}) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		isMobile: true
	});
	await mockChat(context);
	const page = await context.newPage();
	await page.goto(`${baseUrl}/america250`);
	await page.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click();
	const chat = page.getByRole('region', { name: 'swyx.irc', exact: true });
	const moveBox = await chat.getByRole('button', { name: 'Move chat window' }).boundingBox();
	const before = await chat.boundingBox();
	if (!moveBox || !before) throw new Error('Touch move handle not found');
	const cdp = await context.newCDPSession(page);
	/** @param {number} x @param {number} y @param {number} dx @param {number} dy */
	const touch = async (x, y, dx, dy) => {
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchMove',
			touchPoints: [{ x: x + dx, y: y + dy }]
		});
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	};
	await touch(moveBox.x + 25, moveBox.y + 25, 20, -80);
	const moved = await chat.boundingBox();
	if (!moved) throw new Error('Chat disappeared after touch drag');
	expect(moved.x).toBeCloseTo(before.x + 20, 0);
	expect(moved.y).toBeCloseTo(before.y - 80, 0);
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
	const resizeBox = await chat.getByRole('button', { name: 'Resize chat window' }).boundingBox();
	if (!resizeBox) throw new Error('Touch resize handle not found');
	await touch(resizeBox.x + 22, resizeBox.y + 22, -40, -70);
	const resized = await chat.boundingBox();
	if (!resized) throw new Error('Chat disappeared after touch resize');
	expect(resized.width).toBeCloseTo(moved.width - 40, 0);
	expect(resized.height).toBeCloseTo(moved.height - 70, 0);
	await context.close();
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
		first.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click(),
		second.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click()
	]);
	const firstChat = first.getByRole('region', { name: 'swyx.irc', exact: true });
	const secondChat = second.getByRole('region', { name: 'swyx.irc', exact: true });
	await expect(firstChat.getByRole('button', { name: 'Move chat window' })).toContainText(
		'Connected'
	);
	await expect(secondChat.getByRole('button', { name: 'Move chat window' })).toContainText(
		'Connected'
	);
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
	await page.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click();
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
	await page.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click();
	await page.getByRole('link', { name: 'swyx.io', exact: true }).click();
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
	await expect(page.getByRole('region', { name: 'swyx.irc', exact: true })).toHaveCount(0);
	expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
});

test('Escape closes only the focused control and ignores IME composition', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await mockChat(context);
	await page.goto(`${baseUrl}/learn-in-public`);
	const chat = page.getByRole('region', { name: 'swyx.irc', exact: true });
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
	await page.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click();
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
	await expect(page.getByRole('region', { name: 'swyx.irc', exact: true })).toHaveCount(0);
	expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
});
