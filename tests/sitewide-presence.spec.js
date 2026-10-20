import { test, expect } from '@playwright/test';

const baseUrl = process.env.CHAT_TEST_BASE_URL || 'http://127.0.0.1:4173';
/** @type {Record<string, string>} */
const titles = {
	'article:america250': 'What America has meant to me',
	'article:learn-in-public': 'Learn in Public'
};

/** @typedef {{ socket: import('@playwright/test').WebSocketRoute, key: string, id: string, x: number, y: number, mode: string }} MockReader */
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
			const id = `reader${++sequence}`;
			const existing = [...readers.values()];
			const reader = { socket, key, id, x: 0.4, y: 0.01, mode: 'd' };
			readers.set(id, reader);
			send(reader, [1, 'w', id, [row(reader)]]);
			for (const peer of existing.filter((item) => item.key === key)) {
				send(reader, [1, 's', [row(peer)]]);
				send(peer, [1, 'j', ...row(reader)]);
			}
			for (const pageKey of new Set([...readers.values()].map((item) => item.key))) {
				const count = [...readers.values()].filter((item) => item.key === pageKey).length;
				send(reader, [1, 'g', pageKey, count, titles[pageKey] || pageKey]);
			}
			send(reader, [1, 'g']);
			publish(key);
			socket.onMessage((raw) => {
				const frame = JSON.parse(String(raw));
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
			for (const socket of chatSockets) socket.send(JSON.stringify({ type: 'message', message }));
		},
		/** @param {string} key @param {number} code */
		async close(key, code) {
			const reader = [...readers.values()].find((item) => item.key === key);
			if (!reader) throw new Error(`No reader socket on ${key}`);
			// A server-initiated close does not call the mock's page-side onClose.
			readers.delete(reader.id);
			for (const peer of readers.values()) {
				if (peer.key === key) send(peer, [1, 'l', reader.id]);
			}
			publish(key);
			await reader.socket.close({ code, reason: 'test disconnect' });
		}
	};
}

/** @param {import('@playwright/test').Page} page */
async function openChat(page) {
	const chat = page.getByRole('region', { name: 'swyx', exact: true });
	if (!(await chat.isVisible()))
		await page.getByRole('button', { name: 'chat', exact: true }).click();
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
	await page.goto(`${baseUrl}/america250`);
	const chat = await openChat(page);
	await expect(chat.getByRole('button', { name: '0 other readers online' })).toBeVisible({
		timeout: 10_000
	});
	await chat.getByLabel('Message', { exact: true }).fill('A draft to keep');

	const otherContext = await browser.newContext({ viewport: { width: 1100, height: 850 } });
	try {
		await readers.install(otherContext);
		const other = await otherContext.newPage();
		await other.goto(`${baseUrl}/learn-in-public`);
		await expect(chat.getByRole('button', { name: '1 other reader online' })).toBeVisible({
			timeout: 10_000
		});
		const readerToggle = chat.getByRole('button', { name: '1 other reader online' });
		await readerToggle.focus();
		await page.keyboard.press('Enter');
		const roster = chat.getByRole('region', { name: 'Live readers' });
		const pageLink = roster.getByRole('link', { name: 'Learn in Public' });
		await expect(pageLink).toHaveAttribute('href', '/learn-in-public');
		await expect(pageLink).toBeFocused();
		await expect(roster.getByText('1 reader', { exact: true })).toBeVisible();
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
		await chat.getByRole('button', { name: '1 other reader online' }).click();
		await roster.getByRole('link', { name: 'Learn in Public' }).click();
		await expect(page).toHaveURL(/\/learn-in-public$/);
		await expect(chat).toHaveCount(0);
		await expect.poll(() => readers.count(), { timeout: 10_000 }).toBe(2);
		await other.mouse.move(200, 200);
		await expect(page.locator('.remote-cursor')).toBeVisible({ timeout: 10_000 });

		const reopened = await openChat(page);
		await expect(reopened.getByRole('button', { name: '1 other reader online' })).toBeVisible();
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
		id: 'new',
		nick: 'reader',
		text: 'Arrived while viewing readers',
		createdAt: now
	});
	await chat.getByRole('button', { name: '← back to chat' }).click();
	await expect(log.getByText('Arrived while viewing readers')).toBeVisible();
	await expect
		.poll(() =>
			log.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop)
		)
		.toBeLessThanOrEqual(1);
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
