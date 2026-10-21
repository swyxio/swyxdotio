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
 * @returns {Promise<{items: Array<{url: string, status: string, note: string}>}>}
 */
async function getBatch(page, batch) {
	const response = await page.request.get(`/tools/tabs/api/batches/${batch.id}`, {
		headers: { 'X-Tools-User': TEST_TOOLS_OWNER.id }
	});
	expect(response.status()).toBe(200);
	return response.json();
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
	await page.getByRole('button', { name: 'Undo' }).click();
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
	await page.getByRole('button', { name: 'Undo' }).click();
	await expect(card.getByRole('heading', { name: 'Bravo page' })).toBeVisible();

	await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('archived');
	await card.getByRole('heading', { name: 'Bravo page' }).waitFor();
	await card.getByRole('button', { name: 'Review first matching page' }).click();
	await expect(card.getByLabel('Your note')).toHaveValue('Remember Alpha');
	await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('all');
	await page.getByRole('searchbox', { name: 'Find a page' }).fill('Bravo');
	const queue = page.getByRole('complementary', { name: 'Pages in this view' });
	await expect(queue.getByRole('button')).toHaveCount(1);
	await expect(queue.getByRole('button')).toContainText('Bravo page');
	await card.getByRole('button', { name: 'Review first matching page' }).click();
	await expect(card.getByRole('heading', { name: 'Bravo page' })).toBeVisible();
	await page.getByRole('searchbox', { name: 'Find a page' }).fill('');
	await page
		.getByRole('combobox', { name: 'Topic', exact: true })
		.selectOption('AI models & research');
	await expect(queue.getByRole('button')).toHaveCount(1);
	await page.getByRole('combobox', { name: 'Captured window' }).selectOption('10');
	await expect(queue.getByRole('button')).toHaveCount(0);
	await page.getByRole('combobox', { name: 'Captured window' }).selectOption('11');
	await expect(queue.getByRole('button')).toHaveCount(1);

	await page.getByRole('combobox', { name: 'Batch', exact: true }).selectOption(second.id);
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
