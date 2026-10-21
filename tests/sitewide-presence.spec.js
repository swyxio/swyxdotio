import { test, expect } from '@playwright/test';

const baseUrl = process.env.CHAT_TEST_BASE_URL || 'http://127.0.0.1:4173';
/** @type {Record<string, string>} */
const titles = {
	'article:america250': 'What America has meant to me',
	'article:learn-in-public': 'Learn in Public',
	'page:home': 'Shawn @swyx Wang'
};
const articleBlocks = 'h1,h2,h3,h4,h5,h6,p,li,pre,blockquote,figure,img,table,video';

/** @typedef {{ socket: import('@playwright/test').WebSocketRoute, key: string, id: string, nick: string, x: number, y: number, mode: string, anchor: number[] | null }} MockReader */
/** @typedef {{ id: string, nick: string, text: string, createdAt: number }} MockMessage */

/** A shared, in-memory presence service for independent browser contexts.
 * @param {MockMessage[]} [messages]
 */
function mockReaders(messages = []) {
	/** @type {Map<string, MockReader>} */
	const readers = new Map();
	/** @type {Set<import('@playwright/test').WebSocketRoute>} */
	const chatSockets = new Set();
	let sequence = 0;
	/** @param {MockReader} reader */
	const row = (reader) => [
		reader.id,
		'US',
		'#2563EB',
		reader.x,
		reader.y,
		reader.mode,
		...(reader.anchor || [])
	];
	/** @param {MockReader} reader @param {unknown[]} frame */
	const send = (reader, frame) => reader.socket.send(JSON.stringify(frame));
	/** @param {string} key */
	const publish = (key) => {
		const count = [...readers.values()].filter((reader) => reader.key === key).length;
		for (const reader of readers.values()) send(reader, [1, 'g', key, count, titles[key] || key]);
	};

	/** @param {import('@playwright/test').BrowserContext} context */
	async function install(context) {
		await context.routeWebSocket('**/api/chat', (socket) => {
			chatSockets.add(socket);
			socket.send(JSON.stringify({ type: 'history', messages }));
			socket.onClose(() => chatSockets.delete(socket));
		});
		await context.routeWebSocket('**/api/presence/*', (socket) => {
			const key = decodeURIComponent(new URL(socket.url()).pathname.split('/').pop() || '');
			const id = `${(++sequence).toString(16).padStart(4, '0')}abcd`;
			const existing = [...readers.values()];
			const reader = {
				socket,
				key,
				id,
				nick: `reader${id.slice(0, 4)}`,
				x: 0.4,
				y: 0.01,
				mode: 'd',
				anchor: null
			};
			readers.set(id, reader);
			send(reader, [1, 'w', id, [row(reader)]]);
			for (const peer of existing.filter((item) => item.key === key)) {
				send(reader, [1, 's', [row(peer)]]);
				send(peer, [1, 'j', ...row(reader)]);
			}
			for (const peer of existing) {
				send(reader, [1, 'u', peer.id, peer.key, peer.nick]);
				send(peer, [1, 'u', reader.id, reader.key, reader.nick]);
			}
			for (const pageKey of new Set([...readers.values()].map((item) => item.key))) {
				const count = [...readers.values()].filter((item) => item.key === pageKey).length;
				send(reader, [1, 'g', pageKey, count, titles[pageKey] || pageKey]);
			}
			send(reader, [1, 'g']);
			publish(key);
			socket.onMessage((raw) => {
				const frame = JSON.parse(String(raw));
				if (frame[1] === 'n') {
					reader.nick = frame[2];
					for (const peer of readers.values()) {
						if (peer.id !== id) send(peer, [1, 'u', id, key, reader.nick]);
					}
					return;
				}
				if (frame[1] !== 'p') return;
				[reader.x, reader.y, reader.mode] = frame.slice(2, 5);
				reader.anchor = frame.length === 9 ? frame.slice(5, 9) : null;
				for (const peer of readers.values()) {
					if (peer.id !== id && peer.key === key) {
						send(peer, [1, 'm', id, reader.x, reader.y, reader.mode, ...(reader.anchor || [])]);
					}
				}
			});
			socket.onClose(() => {
				readers.delete(id);
				for (const peer of readers.values()) {
					send(peer, [1, 'q', id]);
					if (peer.key === key) send(peer, [1, 'l', id]);
				}
				publish(key);
			});
		});
	}

	return {
		install,
		count: () => readers.size,
		/** @param {string} nick */
		position: (nick) => {
			const reader = [...readers.values()].find((item) => item.nick === nick);
			return reader ? { x: reader.x, y: reader.y, mode: reader.mode, anchor: reader.anchor } : null;
		},
		/** @param {MockMessage} message */
		addMessage(message) {
			messages.push(message);
			for (const reader of readers.values()) send(reader, [1, 'z', message.id]);
			for (const socket of chatSockets) socket.send(JSON.stringify({ type: 'message', message }));
		},
		/** @param {string} key @param {number} code */
		async close(key, code) {
			const reader = [...readers.values()].find((item) => item.key === key);
			if (!reader) throw new Error(`No reader socket on ${key}`);
			// A server-initiated close does not call the mock's page-side onClose.
			readers.delete(reader.id);
			for (const peer of readers.values()) {
				send(peer, [1, 'q', reader.id]);
				if (peer.key === key) send(peer, [1, 'l', reader.id]);
			}
			publish(key);
			await reader.socket.close({ code, reason: 'test disconnect' });
		}
	};
}

test('following a named reader jumps to their cursor across pages and on the same page', async ({
	browser,
	page,
	context
}) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	const readers = mockReaders();
	await readers.install(context);
	await context.addInitScript(() => localStorage.setItem('swyx:chat:nick:v1', 'Alice'));
	await page.goto(`${baseUrl}/america250`);
	const chat = await openChat(page);
	const otherContext = await browser.newContext({ viewport: { width: 1100, height: 850 } });
	try {
		await readers.install(otherContext);
		await otherContext.addInitScript(() => localStorage.setItem('swyx:chat:nick:v1', 'Bob'));
		const other = await otherContext.newPage();
		await other.goto(`${baseUrl}/learn-in-public`);
		const roster = chat.getByRole('region', { name: 'Readers and their pages' });
		const findBob = roster.getByRole('link', { name: 'Find Bob on Learn in Public' });
		await expect(findBob).toBeVisible({ timeout: 10_000 });

		await other.evaluate(() => window.scrollTo(0, 2500));
		await other.mouse.move(500, 300);
		await expect
			.poll(() => readers.position('Bob'), { timeout: 5_000 })
			.toMatchObject({ mode: 'd', x: expect.any(Number), y: expect.any(Number) });
		await expect.poll(() => readers.position('Bob')?.y || 0).toBeGreaterThan(0.01);
		const destination = readers.position('Bob');
		if (!destination) throw new Error('Missing Bob’s cursor position');
		// The router's initial scroll reset must not cancel the queued follow.
		await page.evaluate(() => window.scrollTo(0, 1000));
		await findBob.click();
		await expect(page).toHaveURL(/\/learn-in-public$/);
		await expect(page.locator('.remote-cursor').filter({ hasText: 'Bob' })).toBeVisible({
			timeout: 10_000
		});
		const expectedScroll = await page.evaluate(
			({ depth, anchor, selector }) => {
				const height = Math.max(document.documentElement.scrollHeight, innerHeight);
				const block =
					anchor &&
					document.querySelector('article.reading-prose')?.querySelectorAll(selector)[anchor[0]];
				const rect = block?.getBoundingClientRect();
				const y =
					rect && anchor
						? rect.top + window.scrollY + (rect.height * anchor[2]) / 10000
						: depth * height;
				return Math.max(0, Math.min(height - innerHeight, y - innerHeight / 2));
			},
			{ depth: destination.y, anchor: destination.anchor, selector: articleBlocks }
		);
		expect(expectedScroll).toBeGreaterThan(400);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(expectedScroll, 0);

		// Scrolling with a stationary mouse updates its document position and
		// preserves the desktop cursor, rather than reverting to a depth marker.
		await other.evaluate(() => window.scrollTo(0, 3500));
		await expect
			.poll(() => Math.abs((readers.position('Bob')?.y || 0) - destination.y))
			.toBeGreaterThan(0.001);
		const scrolledPosition = readers.position('Bob');
		if (!scrolledPosition) throw new Error('Missing Bob’s position after scrolling');
		expect(scrolledPosition.mode).toBe('d');
		await other.mouse.move(500, 340);
		await expect
			.poll(() => Math.abs((readers.position('Bob')?.y || 0) - scrolledPosition.y))
			.toBeGreaterThan(0.0001);
		const movedPosition = readers.position('Bob');
		if (!movedPosition) throw new Error('Missing Bob’s position after a small pointer movement');
		const expectedAfterScroll = await page.evaluate(
			({ depth, anchor, selector }) => {
				const height = Math.max(document.documentElement.scrollHeight, innerHeight);
				const block =
					anchor &&
					document.querySelector('article.reading-prose')?.querySelectorAll(selector)[anchor[0]];
				const rect = block?.getBoundingClientRect();
				const y =
					rect && anchor
						? rect.top + window.scrollY + (rect.height * anchor[2]) / 10000
						: depth * height;
				return Math.max(0, Math.min(height - innerHeight, y - innerHeight / 2));
			},
			{ depth: movedPosition.y, anchor: movedPosition.anchor, selector: articleBlocks }
		);

		// Following the same person on the current page does not navigate or reload.
		await page.evaluate(() => window.scrollTo(0, 0));
		const reopened = await openChat(page);
		const samePageBob = reopened
			.getByRole('region', { name: 'Readers and their pages' })
			.getByRole('link', { name: 'Find Bob on Learn in Public' });
		await samePageBob.click();
		await expect(page).toHaveURL(/\/learn-in-public$/);
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeCloseTo(expectedAfterScroll, 0);
		await expect(page.locator('.remote-cursor').filter({ hasText: 'Bob' })).toBeVisible();

		// If the selected reader leaves before the new page connects, do not
		// jump to a stale position or a different reader.
		await page.goto(`${baseUrl}/america250`);
		const source = await openChat(page);
		const departedBob = source
			.getByRole('region', { name: 'Readers and their pages' })
			.getByRole('link', { name: 'Find Bob on Learn in Public' });
		await expect(departedBob).toBeVisible({ timeout: 10_000 });
		await departedBob.click();
		await readers.close('article:learn-in-public', 1008);
		await expect(page).toHaveURL(/\/learn-in-public$/);
		await expect(page.getByRole('button', { name: 'Open swyx.irc chat' })).toContainText(
			'0 others here',
			{ timeout: 10_000 }
		);
		expect(await page.evaluate(() => window.scrollY)).toBe(0);
	} finally {
		await otherContext.close();
	}
});

test('scrolling cancels a pending cross-page follow', async ({ browser, page, context }) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	const readers = mockReaders();
	await readers.install(context);
	await page.goto(`${baseUrl}/america250`);
	const chat = await openChat(page);
	const otherContext = await browser.newContext({ viewport: { width: 1100, height: 850 } });
	try {
		await readers.install(otherContext);
		await otherContext.addInitScript(() => localStorage.setItem('swyx:chat:nick:v1', 'Bob'));
		const other = await otherContext.newPage();
		await other.goto(`${baseUrl}/learn-in-public`);
		const findBob = chat
			.getByRole('region', { name: 'Readers and their pages' })
			.getByRole('link', { name: 'Find Bob on Learn in Public' });
		await expect(findBob).toBeVisible({ timeout: 10_000 });
		await other.evaluate(() => window.scrollTo(0, 3500));
		await other.mouse.move(500, 300);
		await expect.poll(() => readers.position('Bob')?.y || 0).toBeGreaterThan(0.1);
		await findBob.click();
		await expect(page).toHaveURL(/\/learn-in-public$/);
		// Native scrollbar drags emit the same scroll event. Headless Chromium
		// on macOS hides the scrollbar, so change the viewport directly here.
		await page.evaluate(
			() =>
				new Promise((resolve) => {
					requestAnimationFrame(() => requestAnimationFrame(resolve));
				})
		);
		await page.evaluate(() => window.scrollTo(0, 1100));
		const chosenScroll = await page.evaluate(() => window.scrollY);
		expect(chosenScroll).toBeGreaterThan(100);
		await expect.poll(() => readers.count(), { timeout: 10_000 }).toBe(2);
		await expect(
			page.locator('.remote-cursor, .offscreen-marker').filter({ hasText: 'Bob' })
		).toBeVisible({
			timeout: 10_000
		});
		expect(await page.evaluate(() => window.scrollY)).toBe(chosenScroll);
	} finally {
		await otherContext.close();
	}
});

test('textless media anchors identify public sources without query strings', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	const readers = mockReaders();
	await readers.install(context);
	await context.addInitScript(() => localStorage.setItem('swyx:chat:nick:v1', 'Alice'));
	await page.goto(`${baseUrl}/learn-in-public`);
	await expect.poll(() => readers.count(), { timeout: 10_000 }).toBe(1);
	await page.evaluate(() => {
		const article = document.querySelector('article.reading-prose');
		if (!article) throw new Error('Article missing');
		article.insertAdjacentHTML(
			'afterbegin',
			`<img id="test-image" src="/media-a.png?visitor=one#start" style="width:200px;height:100px;display:block">
			<figure id="test-figure" style="width:200px;height:100px;padding:25px"><img id="test-figure-image" src="/figure-a.png?visitor=one#start" style="width:80px;height:40px"></figure>
			<video id="test-video" style="width:200px;height:100px;display:block"><source id="test-source" src="/video-a.mp4?visitor=one#start"></video>`
		);
	});
	for (const [container, media, original, changed] of [
		['#test-image', '#test-image', '/media-a.png', '/media-b.png'],
		['#test-figure', '#test-figure-image', '/figure-a.png', '/figure-b.png'],
		['#test-video', '#test-source', '/video-a.mp4', '/video-b.mp4']
	]) {
		const target = page.locator(container);
		await target.scrollIntoViewIfNeeded();
		const box = await target.boundingBox();
		if (!box) throw new Error(`Missing ${container}`);
		const index = await target.evaluate((element, selector) => {
			const article = document.querySelector('article.reading-prose');
			return article ? [...article.querySelectorAll(selector)].indexOf(element) : -1;
		}, articleBlocks);
		await page.mouse.move(box.x + 5, box.y + 5);
		await expect
			.poll(() => readers.position('Alice')?.anchor?.[0], { timeout: 10_000 })
			.toBe(index);
		const before = readers.position('Alice')?.anchor;
		if (!before) throw new Error(`Missing ${container} anchor`);
		await page
			.locator(media)
			.evaluate(
				(element, path) => element.setAttribute('src', `${path}?visitor=two#end`),
				original
			);
		await page.mouse.move(box.x + 15, box.y + 5);
		await expect.poll(() => readers.position('Alice')?.anchor?.[1]).not.toBe(before[1]);
		expect(readers.position('Alice')?.anchor?.[3]).toBe(before[3]);
		await page
			.locator(media)
			.evaluate((element, path) => element.setAttribute('src', `${path}?visitor=two#end`), changed);
		await page.mouse.move(box.x + 20, box.y + 5);
		await expect
			.poll(() => {
				const anchor = readers.position('Alice')?.anchor;
				return Boolean(anchor && anchor[0] === index && anchor[3] !== before[3]);
			})
			.toBe(true);
		await page.locator(media).evaluate((element) => element.removeAttribute('src'));
		await page.mouse.move(box.x + 25, box.y + 5);
		await expect.poll(() => readers.position('Alice')?.anchor).toBeNull();
	}
});

test('following a mobile reader centers the matching article passage on desktop', async ({
	browser,
	page,
	context
}) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	const readers = mockReaders();
	await readers.install(context);
	await page.goto(`${baseUrl}/america250`);
	const chat = await openChat(page);
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true
	});
	try {
		await readers.install(mobileContext);
		await mobileContext.addInitScript(() => localStorage.setItem('swyx:chat:nick:v1', 'Bob'));
		const mobile = await mobileContext.newPage();
		await mobile.goto(`${baseUrl}/learn-in-public`);
		const findBob = chat
			.getByRole('region', { name: 'Readers and their pages' })
			.getByRole('link', { name: 'Find Bob on Learn in Public' });
		await expect(findBob).toBeVisible({ timeout: 10_000 });
		const target = await mobile.evaluate((selector) => {
			const article = document.querySelector('article.reading-prose');
			const paragraph = article?.querySelectorAll('p')[12];
			if (!article || !paragraph) throw new Error('Article does not have the test passage');
			const index = [...article.querySelectorAll(selector)].indexOf(paragraph);
			const rect = paragraph.getBoundingClientRect();
			window.scrollTo(0, window.scrollY + rect.top + rect.height / 2 - innerHeight / 2);
			return { index, text: paragraph.textContent };
		}, articleBlocks);
		await expect
			.poll(() => readers.position('Bob')?.anchor?.[0], { timeout: 10_000 })
			.toBe(target.index);
		const mobilePosition = readers.position('Bob');
		if (!mobilePosition?.anchor) throw new Error('Mobile reader did not publish a content anchor');
		const anchor = mobilePosition.anchor;
		expect(mobilePosition.mode).toBe('r');
		await findBob.click();
		await expect(page).toHaveURL(/\/learn-in-public$/);
		await expect(page.locator('.rail-marker').filter({ hasText: 'Bob' })).toBeVisible({
			timeout: 10_000
		});
		const matchingPassage = page
			.locator('article.reading-prose')
			.locator(articleBlocks)
			.nth(target.index);
		await expect(matchingPassage).toHaveText(target.text || '');
		await expect
			.poll(async () =>
				matchingPassage.evaluate((block, offset) => {
					const rect = block.getBoundingClientRect();
					return Math.abs(rect.top + (rect.height * offset) / 10000 - window.innerHeight / 2);
				}, anchor[2])
			)
			.toBeLessThan(3);
	} finally {
		await mobileContext.close();
	}
});

test('following a mobile reader on the homepage finds the same section', async ({
	browser,
	page,
	context
}) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	const readers = mockReaders();
	await readers.install(context);
	await page.goto(`${baseUrl}/america250`);
	const chat = await openChat(page);
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true
	});
	try {
		await readers.install(mobileContext);
		await mobileContext.addInitScript(() => localStorage.setItem('swyx:chat:nick:v1', 'Bob'));
		const mobile = await mobileContext.newPage();
		await mobile.goto(`${baseUrl}/`);
		const findBob = chat
			.getByRole('region', { name: 'Readers and their pages' })
			.getByRole('link', { name: 'Find Bob on Shawn @swyx Wang' });
		await expect(findBob).toBeVisible({ timeout: 10_000 });
		const index = await mobile.evaluate((selector) => {
			const main = document.querySelector('main#skip');
			const heading = document.querySelector('#latest');
			if (!main || !heading) throw new Error('Homepage section missing');
			const index = [...main.querySelectorAll(selector)].indexOf(heading);
			const rect = heading.getBoundingClientRect();
			window.scrollTo(0, window.scrollY + rect.top + rect.height / 2 - innerHeight / 2);
			return index;
		}, articleBlocks);
		expect(index).toBeGreaterThanOrEqual(0);
		await expect.poll(() => readers.position('Bob')?.anchor?.[0], { timeout: 10_000 }).toBe(index);
		const mobilePosition = readers.position('Bob');
		if (!mobilePosition?.anchor) throw new Error('Homepage reader did not publish an anchor');
		const anchor = mobilePosition.anchor;
		await findBob.click();
		await expect(page).toHaveURL(`${baseUrl}/`);
		await expect(page.locator('.rail-marker').filter({ hasText: 'Bob' })).toBeVisible({
			timeout: 10_000
		});
		await expect
			.poll(async () =>
				page.locator('#latest').evaluate((block, offset) => {
					const rect = block.getBoundingClientRect();
					return Math.abs(rect.top + (rect.height * offset) / 10000 - window.innerHeight / 2);
				}, anchor[2])
			)
			.toBeLessThan(3);
	} finally {
		await mobileContext.close();
	}
});

/** @param {import('@playwright/test').Page} page */
async function openChat(page) {
	const chat = page.getByRole('region', { name: 'swyx.irc', exact: true });
	if (!(await chat.isVisible()))
		await page.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click();
	await expect(chat).toBeVisible();
	return chat;
}

test('message timestamps appear on hover without shifting the message', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	const createdAt = Date.now();
	const readers = mockReaders([{ id: 'time-test', nick: 'reader', text: 'hello!', createdAt }]);
	await readers.install(context);
	await page.goto(`${baseUrl}/america250`);
	const chat = await openChat(page);
	const message = chat.locator('.chat-message').filter({ hasText: 'hello!' });
	const timestamp = message.locator('time');
	await expect(timestamp).toHaveAttribute('datetime', new Date(createdAt).toISOString());
	await expect(timestamp).toHaveCSS('opacity', '0');
	const before = await message.locator('.chat-nick').boundingBox();
	await message.hover();
	await expect(timestamp).toHaveCSS('opacity', '1');
	const after = await message.locator('.chat-nick').boundingBox();
	expect(after).toEqual(before);
	await page.mouse.move(0, 0);
	await expect(timestamp).toHaveCSS('opacity', '0');
});

test('sitewide readers exclude self, link to other pages, and show same-page cursors', async ({
	browser,
	page,
	context
}) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	const readers = mockReaders([{ id: 'old', nick: 'Caro', text: 'hello', createdAt: Date.now() }]);
	await readers.install(context);
	await context.addInitScript(() => localStorage.setItem('swyx:chat:nick:v1', 'Alice'));
	await page.goto(`${baseUrl}/america250`);
	const chat = await openChat(page);
	await expect(chat.getByRole('button', { name: '0 other readers online' })).toBeVisible({
		timeout: 10_000
	});
	const presenceButton = page.getByRole('button', { name: 'Close swyx.irc chat' });
	await expect(presenceButton).toBeVisible();
	await expect(presenceButton).toContainText('0 others here');
	const launcherBox = await presenceButton.boundingBox();
	if (!launcherBox) throw new Error('Presence launcher was not visible');
	expect(launcherBox.x + launcherBox.width).toBeGreaterThan(1100 - 40);
	expect(launcherBox.y + launcherBox.height).toBeGreaterThan(850 - 40);
	await chat.getByLabel('Message', { exact: true }).fill('A draft to keep');

	const otherContext = await browser.newContext({ viewport: { width: 1100, height: 850 } });
	try {
		await readers.install(otherContext);
		await otherContext.addInitScript(() => localStorage.setItem('swyx:chat:nick:v1', 'Bob'));
		const other = await otherContext.newPage();
		await other.goto(`${baseUrl}/learn-in-public`);
		await expect(chat.getByRole('button', { name: '1 other reader online' })).toBeVisible({
			timeout: 10_000
		});
		await expect(presenceButton).toContainText('1 other here');
		const readingNow = chat.getByRole('region', { name: 'Readers and their pages' });
		const inlinePageLink = readingNow.getByRole('link', { name: 'Learn in Public', exact: true });
		await expect(readingNow.getByText('Bob', { exact: true })).toBeVisible();
		await expect(inlinePageLink).toHaveAttribute('href', '/learn-in-public');
		await expect(readingNow.getByText('Alice', { exact: true })).toHaveCount(0);
		await page.setViewportSize({ width: 390, height: 300 });
		await expect(inlinePageLink).toBeInViewport();
		const log = chat.getByRole('log', { name: 'Recent chat messages' });
		const logBox = await log.boundingBox();
		const messageBox = await log.getByText('hello', { exact: true }).boundingBox();
		if (!logBox || !messageBox) throw new Error('Compact chat log was not visible');
		expect(logBox.height).toBeGreaterThanOrEqual(32);
		expect(messageBox.y).toBeGreaterThanOrEqual(logBox.y);
		expect(messageBox.y + messageBox.height).toBeLessThanOrEqual(logBox.y + logBox.height);
		const form = chat.locator('form');
		const send = chat.getByRole('button', { name: /send/ });
		const formBox = await form.boundingBox();
		const sendBox = await send.boundingBox();
		if (!formBox || !sendBox) throw new Error('Compact chat form was not visible');
		expect(sendBox.y + sendBox.height).toBeLessThanOrEqual(formBox.y + formBox.height);
		await page.setViewportSize({ width: 1100, height: 850 });
		const readerToggle = chat.getByRole('button', { name: '1 other reader online' });
		await readerToggle.focus();
		await page.keyboard.press('Enter');
		const roster = chat.getByRole('region', { name: 'Live readers' });
		const pageLink = roster.getByRole('link', { name: 'Learn in Public', exact: true });
		await expect(pageLink).toHaveAttribute('href', '/learn-in-public');
		await expect(pageLink).toBeFocused();
		await expect(roster.getByText('1 reader', { exact: true })).toBeVisible();
		await expect(roster.getByText('Bob', { exact: true })).toBeVisible();
		await expect(roster.getByRole('link', { name: 'What America has meant to me' })).toHaveCount(0);
		const [rosterTab] = await Promise.all([
			context.waitForEvent('page'),
			pageLink.click({ modifiers: ['Meta'] })
		]);
		await expect(roster).toBeVisible();
		await rosterTab.close();
		const backToChat = chat.getByRole('button', { name: '← back to chat' });
		for (
			let step = 0;
			step < 12 && !(await backToChat.evaluate((button) => button === document.activeElement));
			step++
		) {
			await page.keyboard.press('Tab');
		}
		await expect(backToChat).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(readerToggle).toBeFocused();
		await expect(chat.getByLabel('Message', { exact: true })).toHaveValue('A draft to keep');
		const [newTab] = await Promise.all([
			context.waitForEvent('page'),
			inlinePageLink.click({ modifiers: ['Meta'] })
		]);
		await expect(chat).toBeVisible();
		await expect(chat.getByLabel('Message', { exact: true })).toHaveValue('A draft to keep');
		await expect(page).toHaveURL(/\/america250$/);
		await newTab.close();
		await inlinePageLink.click();
		await expect(page).toHaveURL(/\/learn-in-public$/);
		await expect(chat).toHaveCount(0);
		await expect.poll(() => readers.count(), { timeout: 10_000 }).toBe(2);
		await other.mouse.move(200, 200);
		await expect(page.locator('.remote-cursor')).toBeVisible({ timeout: 10_000 });
		await expect(page.locator('.remote-cursor')).toContainText('Bob');
		const otherChat = await openChat(other);
		await otherChat.getByLabel('Nickname (unverified)').fill('Bea');
		await expect(page.locator('.remote-cursor')).toContainText('Bea', { timeout: 5_000 });

		const reopened = await openChat(page);
		await expect(reopened.getByRole('button', { name: '1 other reader online' })).toBeVisible();
		await expect(
			reopened
				.getByRole('region', { name: 'Readers and their pages' })
				.getByText('Bea', { exact: true })
		).toBeVisible();
		await reopened.getByRole('button', { name: '1 other reader online' }).click();
		await expect(
			reopened.getByRole('region', { name: 'Live readers' }).getByText('Bea', { exact: true })
		).toBeVisible();
		await otherChat.getByLabel('Nickname (unverified)').fill('');
		await expect(
			reopened.getByRole('region', { name: 'Live readers' }).getByText('Bea', { exact: true })
		).toHaveCount(0, { timeout: 5_000 });
		await expect(
			reopened.getByRole('region', { name: 'Live readers' }).getByText(/^reader[a-z0-9]+$/)
		).toBeVisible();
		await reopened.getByRole('button', { name: '← back to chat' }).click();
		await expect(reopened.getByLabel('Message', { exact: true })).toHaveValue('A draft to keep');
	} finally {
		await otherContext.close();
	}
});

test('Escape dismisses the share menu before the chat window', async ({ page, context }) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	const readers = mockReaders();
	await readers.install(context);
	await page.goto(`${baseUrl}/america250`);
	const chat = await openChat(page);
	await chat.getByRole('button', { name: '0 other readers online' }).click({ timeout: 10_000 });
	const share = chat.getByRole('button', { name: 'Share this page ✨' });
	await share.click();
	const menu = page.getByRole('menu', { name: 'Share this page' });
	await expect(menu).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(menu).toHaveCount(0);
	await expect(chat).toBeVisible();
	await expect(share).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(chat).toHaveCount(0);
});

test('mobile reading rail labels the other reader', async ({ browser }) => {
	const readers = mockReaders();
	const first = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
	const second = await browser.newContext({
		viewport: { width: 390, height: 844 },
		hasTouch: true
	});
	try {
		await readers.install(first);
		await readers.install(second);
		await first.addInitScript(() => localStorage.setItem('swyx:chat:nick:v1', 'Alice'));
		await second.addInitScript(() => localStorage.setItem('swyx:chat:nick:v1', 'Bob'));
		const a = await first.newPage();
		const b = await second.newPage();
		await a.goto(`${baseUrl}/america250`);
		await b.goto(`${baseUrl}/america250`);
		await expect(a.locator('.rail-marker')).toContainText('Bob', { timeout: 10_000 });
	} finally {
		await first.close();
		await second.close();
	}
});

test('a cleared nickname uses the new socket identity after reconnecting', async ({ browser }) => {
	const readers = mockReaders();
	const first = await browser.newContext({ viewport: { width: 1100, height: 850 } });
	const second = await browser.newContext({ viewport: { width: 1100, height: 850 } });
	try {
		await readers.install(first);
		await readers.install(second);
		await second.addInitScript(() => localStorage.setItem('swyx:chat:nick:v1', 'Bea'));
		const a = await first.newPage();
		const b = await second.newPage();
		await a.goto(`${baseUrl}/america250`);
		await expect.poll(() => readers.count(), { timeout: 10_000 }).toBe(1);
		await b.goto(`${baseUrl}/learn-in-public`);
		const chatA = await openChat(a);
		await chatA.getByRole('button', { name: '1 other reader online' }).click({ timeout: 10_000 });
		const roster = chatA.getByRole('region', { name: 'Live readers' });
		await expect(roster.getByText('Bea', { exact: true })).toBeVisible();
		const chatB = await openChat(b);
		await chatB.getByLabel('Nickname (unverified)').fill('');
		await expect(roster.getByText('reader0002', { exact: true })).toBeVisible({ timeout: 5_000 });
		await readers.close('article:learn-in-public', 1012);
		await expect(roster.getByText('reader0003', { exact: true })).toBeVisible({ timeout: 10_000 });
		await expect(roster.getByText('reader', { exact: true })).toHaveCount(0);
	} finally {
		await first.close();
		await second.close();
	}
});

test('returning from readers restores chat position and shows new messages at the bottom', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	const now = Date.now();
	const history = Array.from({ length: 40 }, (_, index) => ({
		id: String(index),
		nick: 'reader',
		text: `Earlier message ${index}`,
		createdAt: now
	}));
	const readers = mockReaders(history);
	await readers.install(context);
	await page.goto(`${baseUrl}/america250`);
	const chat = await openChat(page);
	const log = chat.getByRole('log', { name: 'Recent chat messages' });
	await expect(log.getByText('Earlier message 39')).toBeVisible();
	await log.evaluate((element) => (element.scrollTop = element.scrollHeight / 2));
	const previous = await log.evaluate((element) => element.scrollTop);
	expect(previous).toBeGreaterThan(0);
	const toggle = chat.getByRole('button', { name: '0 other readers online' });
	await toggle.click({ timeout: 10_000 });
	await chat.getByRole('button', { name: '← back to chat' }).click();
	await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBeCloseTo(previous, 0);

	await log.evaluate((element) => (element.scrollTop = element.scrollHeight));
	await toggle.click();
	readers.addMessage({
		id: '00000000-0000-4000-8000-000000000001',
		nick: 'reader',
		text: 'Arrived while viewing readers',
		createdAt: now
	});
	await expect(
		chat.getByRole('button', { name: '← back to chat · 1 unread message' })
	).toBeVisible();
	await chat.getByRole('button', { name: '← back to chat · 1 unread message' }).click();
	await expect(log.getByText('Arrived while viewing readers')).toBeVisible();
	await expect
		.poll(() =>
			log.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop)
		)
		.toBeLessThanOrEqual(1);
});

test('resizing keeps the latest chat visible without pulling a reader away from older messages', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	const now = Date.now();
	const history = Array.from({ length: 30 }, (_, index) => ({
		id: String(index),
		nick: 'reader',
		text: `Message ${index}: a longer thought that wraps when the chat becomes narrower.`,
		createdAt: now
	}));
	const readers = mockReaders(history);
	await readers.install(context);
	await page.goto(`${baseUrl}/america250`);
	const chat = await openChat(page);
	const log = chat.getByRole('log', { name: 'Recent chat messages' });
	const distanceFromBottom = () =>
		log.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop);
	await expect.poll(distanceFromBottom).toBeLessThanOrEqual(1);
	await page.setViewportSize({ width: 390, height: 844 });
	await expect.poll(distanceFromBottom).toBeLessThanOrEqual(1);

	await log.evaluate((element) => (element.scrollTop = 0));
	await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBe(0);
	await page.setViewportSize({ width: 1100, height: 850 });
	await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBe(0);
});

test('resizing past a fully visible log restores the older message position', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 1100, height: 1200 });
	const now = Date.now();
	const history = Array.from({ length: 20 }, (_, index) => ({
		id: String(index),
		nick: 'reader',
		text: `Older message ${index}`,
		createdAt: now
	}));
	const readers = mockReaders(history);
	await readers.install(context);
	await page.goto(`${baseUrl}/america250`);
	const chat = await openChat(page);
	const log = chat.getByRole('log', { name: 'Recent chat messages' });
	await expect
		.poll(() => log.evaluate((element) => element.scrollHeight - element.clientHeight))
		.toBeGreaterThan(100);
	await log.evaluate((element) => (element.scrollTop = 50));
	await page.evaluate(() => new Promise(requestAnimationFrame));
	const resize = chat.getByRole('button', { name: 'Resize chat window' });
	await resize.focus();
	for (let i = 0; i < 10; i++) await page.keyboard.press('Shift+ArrowDown');
	await expect
		.poll(() => log.evaluate((element) => element.scrollHeight - element.clientHeight))
		.toBeLessThanOrEqual(0);
	for (let i = 0; i < 10; i++) await page.keyboard.press('Shift+ArrowUp');
	await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBeCloseTo(50, 0);
	await log.focus();
	await log.press('End');
	await expect
		.poll(() =>
			log.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop)
		)
		.toBeLessThanOrEqual(1);
	await page.setViewportSize({ width: 390, height: 844 });
	await expect
		.poll(() =>
			log.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop)
		)
		.toBeLessThanOrEqual(1);
});

test('wheel scrolling during a resize keeps the reader’s chosen position', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	const now = Date.now();
	const readers = mockReaders(
		Array.from({ length: 40 }, (_, index) => ({
			id: String(index),
			nick: 'reader',
			text: `Earlier message ${index}`,
			createdAt: now
		}))
	);
	await readers.install(context);
	await page.goto(`${baseUrl}/america250`);
	const chat = await openChat(page);
	const log = chat.getByRole('log', { name: 'Recent chat messages' });
	await log.evaluate((element) => (element.scrollTop = 50));
	await page.evaluate(() => new Promise(requestAnimationFrame));
	const box = await log.boundingBox();
	if (!box) throw new Error('Chat log is not visible');
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await chat.getByRole('button', { name: 'Resize chat window' }).focus();
	await Promise.all([page.keyboard.press('Shift+ArrowDown'), page.mouse.wheel(0, 120)]);
	await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBeGreaterThan(50);
	const selected = await log.evaluate((element) => element.scrollTop);
	await page.keyboard.press('Shift+ArrowUp');
	await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBeCloseTo(selected, 0);
});

test('a collapsed chat shows a local unread badge and clears it on opening', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const readers = mockReaders([
		{ id: 'old', nick: 'reader', text: 'History', createdAt: Date.now() }
	]);
	await readers.install(context);
	await page.goto(`${baseUrl}/america250`);
	const launcher = page.getByRole('button', { name: 'Open swyx.irc chat', exact: true });
	await expect(launcher).toBeVisible();
	await expect.poll(() => readers.count(), { timeout: 10_000 }).toBe(1);
	await expect(launcher.locator('.unread-badge')).toHaveCount(0);
	readers.addMessage({
		id: '00000000-0000-4000-8000-000000000002',
		nick: 'reader',
		text: 'New message',
		createdAt: Date.now()
	});
	await expect(launcher.locator('.unread-badge')).toHaveText('1');
	await expect(launcher).toHaveAccessibleDescription(/1 unread message/);
	await launcher.click();
	const chat = page.getByRole('region', { name: 'swyx.irc', exact: true });
	await expect(chat.getByText('New message')).toBeVisible();
	await chat.getByRole('button', { name: 'Close chat' }).click();
	await expect(launcher.locator('.unread-badge')).toHaveCount(0);
});

test('mobile hide and show live readers synchronizes across open tabs', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const readers = mockReaders();
	await readers.install(context);
	await page.goto(`${baseUrl}/america250`);
	const firstChat = await openChat(page);
	await expect(firstChat.getByRole('button', { name: '0 other readers online' })).toBeVisible({
		timeout: 10_000
	});
	const second = await context.newPage();
	await second.setViewportSize({ width: 390, height: 844 });
	await second.goto(`${baseUrl}/learn-in-public`);
	const secondChat = await openChat(second);
	await expect(firstChat.getByRole('button', { name: '1 other reader online' })).toBeVisible({
		timeout: 10_000
	});
	await expect(secondChat.getByRole('button', { name: '1 other reader online' })).toBeVisible();
	await firstChat.getByRole('button', { name: '1 other reader online' }).click();
	await firstChat.getByRole('button', { name: 'Hide live readers' }).click();
	await expect(firstChat.getByRole('button', { name: 'Show live readers' })).toBeVisible();
	await expect(secondChat.getByRole('button', { name: 'Live readers hidden' })).toBeVisible();
	await expect(secondChat.getByRole('region', { name: 'Readers and their pages' })).toHaveCount(0);
	await expect.poll(() => readers.count()).toBe(0);
	await secondChat.getByRole('button', { name: 'Live readers hidden' }).click();
	await secondChat.getByRole('button', { name: 'Show live readers' }).click();
	await expect(firstChat.getByRole('button', { name: 'Hide live readers' })).toBeVisible({
		timeout: 10_000
	});
	await expect(secondChat.getByText('1 other reader online', { exact: true })).toBeVisible({
		timeout: 10_000
	});
	await expect.poll(() => readers.count()).toBe(2);
});

test('disconnected readers never appear as zero and recover after a reconnect', async ({
	page,
	context
}) => {
	await page.setViewportSize({ width: 1100, height: 850 });
	const readers = mockReaders();
	await readers.install(context);
	await page.goto(`${baseUrl}/america250`);
	const chat = await openChat(page);
	await expect(chat.getByRole('button', { name: '0 other readers online' })).toBeVisible({
		timeout: 10_000
	});
	await readers.close('article:america250', 1012);
	await expect(chat.getByRole('button', { name: 'Connecting readers…' })).toBeVisible();
	await expect(chat.getByRole('button', { name: '0 other readers online' })).toHaveCount(0);
	await expect(chat.getByRole('button', { name: '0 other readers online' })).toBeVisible({
		timeout: 10_000
	});
	await readers.close('article:america250', 1013);
	await expect(chat.getByRole('button', { name: 'Live readers unavailable' })).toBeVisible();
	await expect(chat.getByRole('button', { name: '0 other readers online' })).toHaveCount(0);
});
