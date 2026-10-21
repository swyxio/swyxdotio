import { test, expect } from '@playwright/test';

const baseUrl = process.env.CHAT_TEST_BASE_URL || 'http://127.0.0.1:4173';
/** @type {Record<string, string>} */
const titles = {
	'article:america250': 'What America has meant to me',
	'article:learn-in-public': 'Learn in Public'
};

/** @typedef {{ socket: import('@playwright/test').WebSocketRoute, key: string, id: string, nick: string, x: number, y: number, mode: string }} MockReader */
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
	const row = (reader) => [reader.id, 'US', '#2563EB', reader.x, reader.y, reader.mode];
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
				mode: 'd'
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
				[reader.x, reader.y, reader.mode] = frame.slice(2);
				for (const peer of readers.values()) {
					if (peer.id !== id && peer.key === key) {
						send(peer, [1, 'm', id, reader.x, reader.y, reader.mode]);
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

/** @param {import('@playwright/test').Page} page */
async function openChat(page) {
	const chat = page.getByRole('region', { name: 'swyx.irc', exact: true });
	if (!(await chat.isVisible()))
		await page.getByRole('button', { name: 'Open swyx.irc chat', exact: true }).click();
	await expect(chat).toBeVisible();
	return chat;
}

test('sitewide readers exclude self, link to other pages, and show same-page cursors', async ({
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
	await expect(chat.getByRole('button', { name: '0 other readers online' })).toBeVisible({
		timeout: 10_000
	});
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
		const readingNow = chat.getByRole('region', { name: 'Readers and their pages' });
		const inlinePageLink = readingNow.getByRole('link', { name: 'Learn in Public' });
		await expect(readingNow.getByText('Bob', { exact: true })).toBeVisible();
		await expect(inlinePageLink).toHaveAttribute('href', '/learn-in-public');
		await expect(readingNow.getByText('Alice', { exact: true })).toHaveCount(0);
		await page.setViewportSize({ width: 390, height: 300 });
		await expect(inlinePageLink).toBeInViewport();
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
		const pageLink = roster.getByRole('link', { name: 'Learn in Public' });
		await expect(pageLink).toHaveAttribute('href', '/learn-in-public');
		await expect(pageLink).toBeFocused();
		await expect(roster.getByText('1 reader', { exact: true })).toBeVisible();
		await expect(roster.getByText('Bob', { exact: true })).toBeVisible();
		await expect(roster.getByRole('link', { name: 'What America has meant to me' })).toHaveCount(0);
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
