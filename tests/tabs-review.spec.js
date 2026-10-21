import { expect, test } from '@playwright/test';
import { authenticateTools, TEST_TOOLS_MEMBER, TEST_TOOLS_OWNER } from './helpers/tools-auth.js';

test.use({
	baseURL: process.env.TABS_TEST_BASE_URL || 'http://127.0.0.1:4173',
	viewport: { width: 390, height: 844 },
	isMobile: true,
	hasTouch: true
});

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} origin
 * @param {string} name
 * @param {Array<{title: string, url: string, windowId?: string, tabGroup?: string}>} tabs
 */
async function makeBatch(page, origin, name, tabs) {
	const response = await page.request.post('/tools/tabs/api/batches', {
		headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id },
		data: { name, tabs }
	});
	expect(response.status()).toBe(201);
	return (await response.json()).batch;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{id: string}} batch
 * @returns {Promise<{items: Array<{id: string, url: string, status: string, note: string}>}>}
 */
async function getBatch(page, batch) {
	const response = await page.request.get(`/tools/tabs/api/batches/${batch.id}`, {
		headers: { 'X-Tools-User': TEST_TOOLS_OWNER.id }
	});
	expect(response.status()).toBe(200);
	return response.json();
}

/** @param {import('@playwright/test').Page} page */
async function useSwipeMode(page) {
	await page.getByRole('button', { name: 'Swipe', exact: true }).click();
}

/** @param {import('@playwright/test').Page} page */
async function openFilters(page) {
	const filters = page.locator('details.filters');
	if ((await filters.getAttribute('open')) === null) await filters.locator('summary').click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} group
 * @param {string} choice
 */
function filterChoice(page, group, choice) {
	return page
		.getByRole('group', { name: group, exact: true })
		.getByRole('button', { name: choice, exact: true });
}

test('private tab library requires owner sign-in', async ({ page }) => {
	const guestApi = await page.request.get('/tools/tabs/api/batches');
	expect(guestApi.status()).toBe(401);
	await page.goto('/tools/tabs');
	await expect(page).toHaveURL(/\/tools\?next=(?:%2F|\/)tools(?:%2F|\/)tabs/);
	await authenticateTools(page, TEST_TOOLS_MEMBER);
	const memberPage = await page.goto('/tools/tabs');
	expect(memberPage?.status()).toBe(403);
	const memberApi = await page.request.get('/tools/tabs/api/batches', {
		headers: { 'X-Tools-User': TEST_TOOLS_MEMBER.id }
	});
	expect(memberApi.status()).toBe(403);
});

test('a failed batch load is not presented as an empty library', async ({ page }) => {
	await page.goto('/tools');
	await authenticateTools(page);
	await page.route('**/tools/tabs/api/batches', (route) =>
		route.fulfill({ status: 503, json: { error: 'Temporary failure.' } })
	);
	await page.goto('/tools/tabs');
	await expect(page.getByRole('alert')).toContainText('Could not load your batches');
	await expect(page.getByRole('heading', { name: 'Library unavailable.' })).toBeVisible();
	await expect(page.getByText('No batches yet')).not.toBeVisible();
	await page.getByRole('button', { name: 'Dismiss error' }).click();
	await expect(page.getByRole('heading', { name: 'Library unavailable.' })).toBeVisible();
});

test('a stale scroll decision cannot replace a newer bookmark', async ({ page }) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const batch = await makeBatch(page, origin, `QA concurrent ${suffix}`, [
		{ title: 'Concurrent page', url: `https://example.test/${suffix}/concurrent` }
	]);
	const item = (await getBatch(page, batch)).items[0];
	const path = `/tools/tabs/api/batches/${batch.id}/items/${item.id}`;
	const headers = { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id };
	const bookmark = await page.request.patch(path, {
		headers,
		data: { status: 'followup', note: 'Keep this bookmark' }
	});
	expect(bookmark.status()).toBe(200);
	const staleArchive = await page.request.patch(path, {
		headers,
		data: { status: 'archived', expectedStatus: 'unread' }
	});
	expect(staleArchive.status()).toBe(409);
	expect((await getBatch(page, batch)).items[0]).toMatchObject({
		status: 'followup',
		note: 'Keep this bookmark'
	});
});

test('feed decisions and notes persist, and only intentional scroll-past archives', async ({
	page
}) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const urls = Array.from({ length: 10 }, (_, index) => `https://example.test/${suffix}/${index}`);
	const first = await makeBatch(
		page,
		origin,
		`QA feed ${suffix}`,
		urls.map((url, index) => ({ title: `Feed page ${index + 1}`, url }))
	);
	const second = await makeBatch(page, origin, `QA duplicate ${suffix}`, [
		{ title: 'Feed page 1', url: urls[0] }
	]);
	await page.goto(`/tools/tabs?batch=${first.id}`);
	await expect(page.getByRole('button', { name: 'Tap', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(page.locator('details.filters')).not.toHaveAttribute('open');
	await page.getByRole('button', { name: 'Tap', exact: true }).click();
	/** @param {string} title */
	const feedCard = (title) =>
		page.locator('article[data-feed-item]').filter({
			has: page.getByRole('button', { name: title, exact: true })
		});
	const firstCard = feedCard('Feed page 1');
	await expect(firstCard).toBeVisible();
	await firstCard.getByRole('button', { name: 'Bookmark for follow-up' }).click();
	await firstCard.getByRole('button', { name: 'Feed page 1', exact: true }).click();
	await firstCard.getByLabel('Your note').fill('An idea to keep');
	await expect
		.poll(async () => (await getBatch(page, first)).items[0].note)
		.toBe('An idea to keep');
	await page.getByRole('button', { name: 'Scroll', exact: true }).click();
	await openFilters(page);
	const search = page.getByRole('searchbox', { name: 'Find a page' });
	await search.fill('Feed page 4');
	await search.fill('');
	await expect
		.poll(async () => (await getBatch(page, first)).items.map((item) => item.status))
		.toEqual(['followup', ...Array.from({ length: 9 }, () => 'unread')]);
	const middleCard = feedCard('Feed page 5');
	await middleCard.scrollIntoViewIfNeeded();
	await middleCard.hover();
	await page.mouse.wheel(0, -500);
	await page.evaluate(
		() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
	);
	expect((await getBatch(page, first)).items.map((item) => item.status)).toEqual([
		'followup',
		...Array.from({ length: 9 }, () => 'unread')
	]);

	const secondCard = feedCard('Feed page 2');
	/** @param {import('@playwright/test').Locator} card */
	async function scrollPast(card) {
		await card.scrollIntoViewIfNeeded();
		const box = await card.boundingBox();
		if (!box) throw new Error('The feed card is not visible.');
		await card.hover();
		await page.mouse.wheel(0, Math.ceil(box.y + box.height + 10));
	}
	await scrollPast(secondCard);
	await expect
		.poll(
			async () => (await getBatch(page, first)).items.find((item) => item.url === urls[1])?.status
		)
		.toBe('archived');
	await scrollPast(feedCard('Feed page 3'));
	await expect
		.poll(
			async () => (await getBatch(page, first)).items.find((item) => item.url === urls[2])?.status
		)
		.toBe('archived');
	await page.getByRole('button', { name: /^Undo/ }).click();
	await expect
		.poll(
			async () => (await getBatch(page, first)).items.find((item) => item.url === urls[2])?.status
		)
		.toBe('unread');
	expect((await getBatch(page, first)).items.find((item) => item.url === urls[1])?.status).toBe(
		'archived'
	);
	await page.getByRole('button', { name: /^Undo/ }).click();
	await expect
		.poll(
			async () => (await getBatch(page, first)).items.find((item) => item.url === urls[1])?.status
		)
		.toBe('unread');
	await scrollPast(secondCard);
	await expect
		.poll(
			async () => (await getBatch(page, first)).items.find((item) => item.url === urls[1])?.status
		)
		.toBe('archived');
	const saved = await getBatch(page, first);
	expect(saved.items.find((item) => item.url === urls[0])).toMatchObject({
		status: 'followup',
		note: 'An idea to keep'
	});
	expect((await getBatch(page, second)).items[0]).toMatchObject({ status: 'unread', note: '' });

	await page.goto(`/tools/tabs?batch=${first.id}`);
	await page.getByRole('button', { name: 'Tap', exact: true }).click();
	await openFilters(page);
	await filterChoice(page, 'Status', 'Archived').click();
	await expect(feedCard('Feed page 2')).toBeVisible();
	await filterChoice(page, 'Status', 'Follow up').click();
	await feedCard('Feed page 1').getByRole('button', { name: 'Feed page 1', exact: true }).click();
	await expect(feedCard('Feed page 1').getByLabel('Your note')).toHaveValue('An idea to keep');
});

test('desktop filters are available without opening the disclosure', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const batch = await makeBatch(page, origin, `QA desktop ${suffix}`, [
		{ title: 'Desktop page', url: `https://example.test/${suffix}/desktop` }
	]);
	await page.goto(`/tools/tabs?batch=${batch.id}`);
	await expect(page.locator('details.filters')).toHaveAttribute('open');
	await expect(page.getByRole('searchbox', { name: 'Find a page' })).toBeVisible();
	await expect(page.getByRole('group', { name: 'Topic', exact: true })).toBeVisible();
	await expect(page.getByRole('group', { name: 'Status', exact: true })).toBeVisible();
});

test('visible pickers select filters and keep batches separate', async ({ page }) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const first = await makeBatch(
		page,
		origin,
		`Picker first ${suffix}`,
		Array.from({ length: 12 }, (_, index) => ({
			title: `Picker page ${index + 1}`,
			url: `https://example.test/${suffix}/${index}`,
			windowId: String(index)
		}))
	);
	const second = await makeBatch(page, origin, `Picker second ${suffix}`, [
		{ title: 'Other batch', url: `https://example.test/${suffix}/other` }
	]);
	await page.route('**/tools/tabs/api/batches', async (route) => {
		const response = await route.fetch();
		/** @type {{batches: Array<{id: string}>}} */
		const body = await response.json();
		body.batches = body.batches.filter((batch) => [first.id, second.id].includes(batch.id));
		await route.fulfill({ response, json: body });
	});
	await page.goto(`/tools/tabs?batch=${first.id}`);
	const batches = page.getByRole('group', { name: 'Batch', exact: true });
	const firstChoice = batches.getByRole('button', { name: `Picker first ${suffix}` });
	const secondChoice = batches.getByRole('button', { name: `Picker second ${suffix}` });
	await expect(firstChoice).toBeVisible();
	await expect(secondChoice).toBeVisible();
	await expect(firstChoice).toHaveAttribute('aria-pressed', 'true');
	await openFilters(page);
	await expect(filterChoice(page, 'Topic', 'All topics')).toHaveAttribute('aria-pressed', 'true');
	await expect(filterChoice(page, 'Status', 'Unread')).toHaveAttribute('aria-pressed', 'true');
	await expect(filterChoice(page, 'Status', 'Archived')).toBeVisible();
	const lastWindow = filterChoice(page, 'Captured window', 'Window 12');
	await lastWindow.focus();
	await page.keyboard.press('Enter');
	await expect(lastWindow).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByRole('button', { name: 'Picker page 12', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Picker page 1', exact: true })).toHaveCount(0);
	await secondChoice.click();
	await expect(secondChoice).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByRole('button', { name: 'Other batch', exact: true })).toBeVisible();
	await expect(filterChoice(page, 'Status', 'Unread')).toHaveAttribute('aria-pressed', 'true');
	expect((await getBatch(page, first)).items.every((item) => item.status === 'unread')).toBe(true);
	expect((await getBatch(page, second)).items[0].status).toBe('unread');
});

test('full URLs remain visible and wrap in every review mode', async ({ page }) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const url = `https://example.test/${suffix}/${'a'.repeat(220)}?source=reading&part=full#section`;
	const batch = await makeBatch(page, origin, `QA URL ${suffix}`, [
		{ title: 'Long URL page', url }
	]);
	/** @param {import('@playwright/test').Locator} urlElement */
	async function expectFullUrl(urlElement) {
		await expect(urlElement).toHaveText(url);
		await expect(urlElement).toBeVisible();
		const geometry = await urlElement.evaluate((element) => ({
			clientWidth: element.clientWidth,
			scrollWidth: element.scrollWidth,
			clientHeight: element.clientHeight,
			scrollHeight: element.scrollHeight,
			whiteSpace: getComputedStyle(element).whiteSpace
		}));
		expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
		expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight);
		expect(geometry.whiteSpace).not.toBe('nowrap');
	}
	for (const viewport of [
		{ width: 390, height: 844 },
		{ width: 1440, height: 900 }
	]) {
		await page.setViewportSize(viewport);
		await page.goto(`/tools/tabs?batch=${batch.id}`);
		await page.getByRole('button', { name: 'Tap', exact: true }).click();
		const feedUrl = page.locator('article[data-feed-item] .feed-url');
		await expectFullUrl(feedUrl);
		await page.getByRole('button', { name: 'Long URL page', exact: true }).click();
		await expectFullUrl(feedUrl);
		await page.getByRole('button', { name: 'Scroll', exact: true }).click();
		await expectFullUrl(feedUrl);
		await useSwipeMode(page);
		const cardUrl = page.locator('article.card .source-detail');
		const queueUrl = page
			.getByRole('complementary', { name: 'Pages in this view' })
			.locator('.queue-url');
		await expectFullUrl(cardUrl);
		await expectFullUrl(queueUrl);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			viewport.width
		);
	}
});

test('the first reading action is reachable across phone, split, and desktop layouts', async ({
	page
}) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const title = 'A field guide to building thoughtful tools for everyday reading and research';
	const batch = await makeBatch(page, origin, `QA layout ${suffix}`, [
		{ title, url: `https://example.test/${suffix}/reading` }
	]);
	for (const viewport of [
		{ width: 390, height: 844 },
		{ width: 720, height: 900 },
		{ width: 834, height: 1194 },
		{ width: 1440, height: 900 }
	]) {
		await page.setViewportSize(viewport);
		await page.goto(`/tools/tabs?batch=${batch.id}`);
		await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
		const bookmark = page.getByRole('button', { name: 'Bookmark for follow-up' });
		const bounds = await bookmark.boundingBox();
		if (!bounds) throw new Error('The first bookmark action is not visible.');
		expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			viewport.width
		);
	}
});

test('filters stay accessible when changing from a mobile to a desktop viewport', async ({
	page
}) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const batch = await makeBatch(page, origin, `QA resize ${suffix}`, [
		{ title: 'Resize page', url: `https://example.test/${suffix}/resize` }
	]);
	await page.goto(`/tools/tabs?batch=${batch.id}`);
	await expect(page.getByRole('button', { name: 'Tap', exact: true })).toBeVisible();
	await expect(page.locator('details.filters')).not.toHaveAttribute('open');
	await page.setViewportSize({ width: 1280, height: 900 });
	await expect(page.getByRole('searchbox', { name: 'Find a page' })).toBeVisible();
	await expect(page.getByRole('group', { name: 'Status', exact: true })).toBeVisible();
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(page.locator('details.filters summary')).toBeVisible();
	expect((await getBatch(page, batch)).items[0].status).toBe('unread');
});

test('a large synthetic batch can be browsed to its last page', async ({ page }) => {
	test.setTimeout(60_000);
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const batch = await makeBatch(
		page,
		origin,
		`QA large ${suffix}`,
		Array.from({ length: 727 }, (_, index) => ({
			title: `Long feed ${index + 1}`,
			url: `https://example.test/${suffix}/${index}`
		}))
	);
	await page.goto(`/tools/tabs?batch=${batch.id}`);
	await page.getByRole('button', { name: 'Tap', exact: true }).click();
	const cards = page.locator('article[data-feed-item]');
	await expect(cards).toHaveCount(40);
	for (let step = 0; step < 30 && (await cards.count()) < 727; step++) {
		const before = await cards.count();
		await page.getByRole('button', { name: 'Show more pages' }).scrollIntoViewIfNeeded();
		await expect.poll(() => cards.count()).toBeGreaterThan(before);
	}
	await expect(cards).toHaveCount(727);
	const lastCard = cards.last();
	await lastCard.scrollIntoViewIfNeeded();
	await expect(lastCard.getByRole('button', { name: 'Long feed 727', exact: true })).toBeVisible();
	await lastCard.getByRole('button', { name: 'Bookmark for follow-up' }).click();
	await expect.poll(async () => (await getBatch(page, batch)).items[726].status).toBe('followup');
	expect((await getBatch(page, batch)).items[0].status).toBe('unread');
});

test('scroll mode highlights the current page and undo returns it to view', async ({ page }) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const batch = await makeBatch(
		page,
		origin,
		`QA active scroll ${suffix}`,
		Array.from({ length: 8 }, (_, index) => ({
			title: `Active page ${index + 1}`,
			url: `https://example.test/${suffix}/active-${index}`
		}))
	);
	await page.goto(`/tools/tabs?batch=${batch.id}`);
	await page.getByRole('button', { name: 'Scroll', exact: true }).click();
	const cards = page.locator('article[data-feed-item]');
	const first = cards.nth(0);
	const second = cards.nth(1);
	await expect(first).toHaveAttribute('aria-current', 'true');
	await expect(first).toContainText('Current');
	await expect(second).not.toHaveAttribute('aria-current', 'true');
	const box = await first.boundingBox();
	if (!box) throw new Error('The current page is not visible.');
	await first.hover();
	await page.mouse.wheel(0, Math.ceil(box.y + box.height + 5));
	await expect.poll(async () => (await getBatch(page, batch)).items[0].status).toBe('archived');
	await expect(second).toHaveAttribute('aria-current', 'true');
	const undo = page.getByRole('button', { name: /^Undo/ });
	await expect(undo).toBeInViewport();
	await undo.click();
	await expect.poll(async () => (await getBatch(page, batch)).items[0].status).toBe('unread');
	await expect(first).toBeInViewport();
	await page.evaluate(
		() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
	);
	await expect(first).toHaveAttribute('aria-current', 'true');
	expect((await getBatch(page, batch)).items.every((item) => item.status === 'unread')).toBe(true);
});

test('scroll mode archives a page passed by an actual mobile touch gesture', async ({ page }) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const batch = await makeBatch(
		page,
		origin,
		`QA touch scroll ${suffix}`,
		Array.from({ length: 12 }, (_, index) => ({
			title: `Touch feed ${index + 1}`,
			url: `https://example.test/${suffix}/touch-${index}`
		}))
	);
	await page.goto(`/tools/tabs?batch=${batch.id}`);
	await page.getByRole('button', { name: 'Scroll', exact: true }).click();
	const firstCard = page.locator('article[data-feed-item]').first();
	await firstCard.evaluate((element) => element.scrollIntoView({ block: 'start' }));
	await page.evaluate(
		() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
	);
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Input.dispatchTouchEvent', {
		type: 'touchStart',
		touchPoints: [{ x: 190, y: 700 }]
	});
	for (const y of [620, 520, 420, 320, 220, 120]) {
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchMove',
			touchPoints: [{ x: 190, y }]
		});
		await page.waitForTimeout(30);
	}
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await expect
		.poll(async () => {
			const box = await firstCard.boundingBox();
			return box ? box.y + box.height : Infinity;
		})
		.toBeLessThanOrEqual(0);
	await expect.poll(async () => (await getBatch(page, batch)).items[0].status).toBe('archived');
});

test('undo reports a conflict instead of overwriting a newer decision', async ({ page }) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const batch = await makeBatch(page, origin, `QA undo conflict ${suffix}`, [
		{ title: 'Conflict page', url: `https://example.test/${suffix}/conflict` }
	]);
	await page.goto(`/tools/tabs?batch=${batch.id}`);
	await page.getByRole('button', { name: 'Tap', exact: true }).click();
	await page.getByRole('button', { name: 'Bookmark for follow-up' }).click();
	await expect.poll(async () => (await getBatch(page, batch)).items[0].status).toBe('followup');
	const item = (await getBatch(page, batch)).items[0];
	const changed = await page.request.patch(`/tools/tabs/api/batches/${batch.id}/items/${item.id}`, {
		headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id },
		data: { status: 'read' }
	});
	expect(changed.status()).toBe(200);
	await page.getByRole('button', { name: /^Undo/ }).click();
	await expect(page.getByRole('alert')).toContainText('Could not undo');
	expect((await getBatch(page, batch)).items[0].status).toBe('read');
});

test('opens saved content before attempting an isolated preview with an original link', async ({
	page
}) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const url = `https://example.test/${suffix}/preview`;
	const batch = await makeBatch(page, origin, `QA preview ${suffix}`, [
		{ title: 'Preview page', url }
	]);
	await page.route(`**/tools/tabs/api/batches/${batch.id}/items/*`, async (route) => {
		if (route.request().method() !== 'GET') return route.continue();
		const response = await route.fetch();
		const result = await response.json();
		result.page = { summary: 'A previously saved summary.', text: 'Previously saved page text.' };
		await route.fulfill({ response, json: result });
	});
	let externalRequests = 0;
	await page.route(url, async (route) => {
		externalRequests++;
		await route.fulfill({
			status: 200,
			headers: { 'x-frame-options': 'DENY' },
			contentType: 'text/html',
			body: '<p>This site blocks embedding.</p>'
		});
	});
	await page.goto(`/tools/tabs?batch=${batch.id}`);
	await page.getByRole('button', { name: 'Tap', exact: true }).click();
	const card = page.locator('article[data-feed-item]').filter({
		has: page.getByRole('button', { name: 'Preview page', exact: true })
	});
	const title = card.getByRole('button', { name: 'Preview page', exact: true });
	await title.click();
	await expect(card).toContainText('A previously saved summary.');
	await expect(card.locator('iframe')).toHaveCount(0);
	expect(externalRequests).toBe(0);
	await title.click();
	const iframe = card.locator('iframe');
	await expect(iframe).toBeVisible();
	await expect.poll(() => externalRequests).toBe(1);
	const sandbox = await iframe.getAttribute('sandbox');
	expect(sandbox).not.toBeNull();
	expect(sandbox).not.toContain('allow-same-origin');
	await expect(iframe).toHaveAttribute('referrerpolicy', 'no-referrer');
	await expect(card.getByRole('link', { name: /Open original/ })).toBeVisible();
	await expect(card.getByRole('link', { name: /Open original/ })).toHaveAttribute('href', url);
});

test('mobile triage saves notes, swipes, undo, import and batch isolation', async ({ page }) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const alphaUrl = `https://example.test/${suffix}/alpha`;
	const bravoUrl = `https://example.test/${suffix}/bravo`;
	const first = await makeBatch(page, origin, `QA first ${suffix}`, [
		{ title: 'Alpha page', url: alphaUrl, windowId: '10', tabGroup: 'Saved work' },
		{ title: 'Bravo page', url: bravoUrl, windowId: '11', tabGroup: 'OpenAI' }
	]);
	const second = await makeBatch(page, origin, `QA second ${suffix}`, [
		{ title: 'Alpha page', url: alphaUrl, windowId: '20' }
	]);

	await page.goto(`/tools/tabs?batch=${first.id}`);
	await useSwipeMode(page);
	await expect(page.getByRole('button', { name: /Open swyx\.irc chat/ })).toHaveCount(0);
	const card = page.locator('article.card');
	await expect(card.getByRole('heading', { name: 'Alpha page' })).toBeVisible();
	await expect(card).toContainText('Chrome groups: Saved work');
	await expect(card).toContainText('Captured in Window 1');
	await expect(card).toContainText('Title and URL saved');
	await card.getByRole('heading', { name: 'Alpha page' }).scrollIntoViewIfNeeded();
	await card.getByLabel('Your note').fill('Remember Alpha');
	await card.getByRole('button', { name: 'Archive' }).click();
	await expect(card.getByRole('heading', { name: 'Bravo page' })).toBeVisible();
	await expect(page.getByRole('button', { name: /Alpha page/ })).toHaveCount(0);
	let firstData = await getBatch(page, first);
	expect(firstData.items.find((item) => item.url === alphaUrl)).toMatchObject({
		status: 'archived',
		note: 'Remember Alpha'
	});
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await expect(card.getByRole('heading', { name: 'Alpha page' })).toBeVisible();
	await expect(card.getByLabel('Your note')).toHaveValue('Remember Alpha');
	firstData = await getBatch(page, first);
	expect(firstData.items.find((item) => item.url === alphaUrl)?.status).toBe('unread');

	const heading = card.getByRole('heading', { name: 'Alpha page' });
	await heading.scrollIntoViewIfNeeded();
	const box = await heading.boundingBox();
	if (!box) throw new Error('The review card is not visible.');
	const cdp = await page.context().newCDPSession(page);
	const y = Math.round(box.y + box.height / 2);
	const x = Math.round(box.x + Math.min(box.width - 10, 250));
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
	await cdp.send('Input.dispatchTouchEvent', {
		type: 'touchMove',
		touchPoints: [{ x: x - 110, y }]
	});
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await expect(card.getByRole('heading', { name: 'Bravo page' })).toBeVisible();
	firstData = await getBatch(page, first);
	expect(firstData.items.find((item) => item.url === alphaUrl)?.status).toBe('archived');

	const bravoHeading = card.getByRole('heading', { name: 'Bravo page' });
	await bravoHeading.scrollIntoViewIfNeeded();
	const bravoBox = await bravoHeading.boundingBox();
	if (!bravoBox) throw new Error('The review card is not visible.');
	const rightY = Math.round(bravoBox.y + bravoBox.height / 2);
	const rightX = Math.round(bravoBox.x + 15);
	await cdp.send('Input.dispatchTouchEvent', {
		type: 'touchStart',
		touchPoints: [{ x: rightX, y: rightY }]
	});
	await cdp.send('Input.dispatchTouchEvent', {
		type: 'touchMove',
		touchPoints: [{ x: rightX + 110, y: rightY }]
	});
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await expect(page.getByRole('status')).toContainText('Saved for follow-up.');
	firstData = await getBatch(page, first);
	expect(firstData.items.find((item) => item.url === bravoUrl)?.status).toBe('followup');
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await expect(card.getByRole('heading', { name: 'Bravo page' })).toBeVisible();

	await openFilters(page);
	await filterChoice(page, 'Status', 'Archived').click();
	await card.getByRole('heading', { name: 'Bravo page' }).waitFor();
	await card.getByRole('button', { name: 'Review first matching page' }).click();
	await expect(card.getByLabel('Your note')).toHaveValue('Remember Alpha');
	await filterChoice(page, 'Status', 'All statuses').click();
	await page.getByRole('searchbox', { name: 'Find a page' }).fill('Bravo');
	const queue = page.getByRole('complementary', { name: 'Pages in this view' });
	await expect(queue.getByRole('button')).toHaveCount(1);
	await expect(queue.getByRole('button')).toContainText('Bravo page');
	await card.getByRole('button', { name: 'Review first matching page' }).click();
	await expect(card.getByRole('heading', { name: 'Bravo page' })).toBeVisible();
	await page.getByRole('searchbox', { name: 'Find a page' }).fill('');
	await filterChoice(page, 'Topic', 'AI models & research').click();
	await expect(queue.getByRole('button')).toHaveCount(1);
	await filterChoice(page, 'Captured window', 'Window 1').click();
	await expect(queue.getByRole('button')).toHaveCount(0);
	await filterChoice(page, 'Captured window', 'Window 2').click();
	await expect(queue.getByRole('button')).toHaveCount(1);

	await page
		.getByRole('group', { name: 'Batch', exact: true })
		.getByRole('button', { name: `QA second ${suffix}` })
		.click();
	await expect(card.getByRole('heading', { name: 'Alpha page' })).toBeVisible();
	await expect(card.getByLabel('Your note')).toHaveValue('');
	await card.getByLabel('Your note').fill('Second batch note');
	await card.getByRole('button', { name: 'Follow up' }).click();
	await expect(page.getByRole('status')).toContainText('Saved for follow-up.');
	const secondData = await getBatch(page, second);
	expect(secondData.items[0]).toMatchObject({ status: 'followup', note: 'Second batch note' });
	firstData = await getBatch(page, first);
	expect(firstData.items.find((item) => item.url === alphaUrl)).toMatchObject({
		status: 'archived',
		note: 'Remember Alpha'
	});
	await page.goto(`/tools/tabs?batch=${second.id}`);
	await useSwipeMode(page);
	await openFilters(page);
	await filterChoice(page, 'Status', 'Follow up').click();
	await page
		.getByRole('complementary', { name: 'Pages in this view' })
		.getByRole('button', { name: /Alpha page/ })
		.click();
	await expect(page.locator('article.card').getByLabel('Your note')).toHaveValue(
		'Second batch note'
	);

	await page.getByText('＋ Add a batch').click();
	await page.getByLabel('Batch name').fill(`QA import ${suffix}`);
	await page.getByLabel('Or choose a JSON file').setInputFiles({
		name: 'capture.json',
		mimeType: 'application/json',
		buffer: Buffer.from(
			JSON.stringify({
				tabs: [
					{
						title: 'Imported page',
						url: `https://example.test/${suffix}/import`,
						windowId: '42',
						tabGroup: 'Ideas'
					}
				]
			})
		)
	});
	await page.getByRole('button', { name: 'Save new batch' }).click();
	await expect(page.getByRole('status')).toContainText('New batch saved.');
	await expect(card.getByRole('heading', { name: 'Imported page' })).toBeVisible();
	await expect(card).toContainText('Chrome groups: Ideas');
	await expect(card).toContainText('Captured in Window 1');
});

test('a failed note save blocks triage and can be retried', async ({ page }) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const batch = await makeBatch(page, origin, `QA failure ${suffix}`, [
		{ title: 'Note test', url: `https://example.test/${suffix}/note` },
		{ title: 'Next page', url: `https://example.test/${suffix}/next` }
	]);
	await page.goto(`/tools/tabs?batch=${batch.id}`);
	await useSwipeMode(page);
	const card = page.locator('article.card');
	await expect(card.getByRole('heading', { name: 'Note test' })).toBeVisible();
	/** @param {import('@playwright/test').Route} route */
	const failNote = (route) =>
		route.request().method() === 'PATCH' && route.request().postDataJSON()?.note != null
			? route.fulfill({
					status: 503,
					contentType: 'application/json',
					body: JSON.stringify({ message: 'Temporary error' })
				})
			: route.continue();
	await page.route('**/tools/tabs/api/batches/*/items/*', failNote);
	await card.getByLabel('Your note').fill('Keep this draft');
	await card.getByRole('button', { name: 'Archive' }).click();
	await expect(card.getByRole('alert')).toContainText('Note not saved');
	await expect(card.getByRole('heading', { name: 'Note test' })).toBeVisible();
	await expect(card.getByLabel('Your note')).toHaveValue('Keep this draft');
	let saved = await getBatch(page, batch);
	expect(saved.items[0].status).toBe('unread');
	await page.unroute('**/tools/tabs/api/batches/*/items/*', failNote);
	await card.getByRole('button', { name: 'Retry save' }).click();
	await expect(card.getByRole('alert')).toHaveCount(0);
	await card.getByRole('button', { name: 'Archive' }).click();
	await expect(card.getByRole('heading', { name: 'Next page' })).toBeVisible();
	saved = await getBatch(page, batch);
	expect(saved.items[0]).toMatchObject({ status: 'archived', note: 'Keep this draft' });
});

test('a delayed page load does not expose an editable stale note', async ({ page }) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const suffix = crypto.randomUUID();
	const batch = await makeBatch(page, origin, `QA loading ${suffix}`, [
		{ title: 'First page', url: `https://example.test/${suffix}/first` },
		{ title: 'Second page', url: `https://example.test/${suffix}/second` }
	]);
	await page.goto(`/tools/tabs?batch=${batch.id}`);
	await useSwipeMode(page);
	const card = page.locator('article.card');
	await expect(card.getByRole('heading', { name: 'First page' })).toBeVisible();
	await card.getByLabel('Your note').fill('A saved thought');
	await page.getByRole('button', { name: /Second page/ }).click();
	await expect(card.getByRole('heading', { name: 'Second page' })).toBeVisible();
	/** @type {() => void} */
	let release = () => {};
	const gate = new Promise((resolve) => {
		release = () => resolve(undefined);
	});
	await page.route('**/tools/tabs/api/batches/*/items/*', async (route) => {
		if (route.request().method() === 'GET') await gate;
		await route.continue();
	});
	await page.getByRole('button', { name: /First page/ }).click();
	await expect(card).toContainText('Loading saved content');
	await expect(card.getByLabel('Your note')).toHaveCount(0);
	await expect(card.getByRole('button', { name: 'Archive' })).toBeDisabled();
	release();
	await expect(card.getByLabel('Your note')).toHaveValue('A saved thought');
});
