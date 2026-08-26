import { expect, test } from '@playwright/test';
import { authenticateTools, TEST_TOOLS_OWNER } from './helpers/tools-auth.js';

function member() {
	const id = crypto.randomUUID().replaceAll('-', '');
	return { id, name: 'Dashboard member', email: `${id}@example.com` };
}

/** @param {import('@playwright/test').Page} page @param {ReturnType<typeof member>} user @param {string} [action] */
async function seedBrowserAction(page, user, action = 'box.open') {
	const origin = await authenticateTools(page, user);
	const id = crypto.randomUUID();
	const response = await page.request.post('/tools/api/logs', {
		headers: { Origin: origin, 'X-Tools-User': user.id },
		data: { id, action, status: 'succeeded' }
	});
	expect(response.status()).toBe(201);
	return { id, origin };
}

test('tool logs require Google login and preserve the destination', async ({ page }) => {
	await page.goto('/tools/logs');
	await expect(page).toHaveURL(/\/tools\?next=(?:%2F|\/)tools(?:%2F|\/)logs/);
	await expect(page.getByRole('link', { name: 'Sign in with Google' })).toHaveAttribute(
		'href',
		/next=%2Ftools%2Flogs/
	);
});

test('real ledger scopes logs, rejects impersonation, and excludes drawing contents', async ({
	page
}) => {
	await page.goto('/tools');
	const user = member();
	const { id, origin } = await seedBrowserAction(page, user);
	const headers = { Origin: origin, 'X-Tools-User': user.id };
	const created = await page.request.post('/tools/api/draw/pages', {
		headers,
		data: { name: 'PRIVATE-NAME-NEVER-IN-LOGS' }
	});
	expect(created.status()).toBe(201);
	const drawing = await created.json();
	const response = await page.request.get('/tools/api/logs?days=1', { headers });
	expect(response.ok()).toBe(true);
	expect(response.headers()['cache-control']).toContain('no-store');
	/** @type {import('../src/lib/tools-logs-view.js').ToolLogs} */
	const body = await response.json();
	expect(body.entries.some((entry) => entry.id === id)).toBe(true);
	expect(body.entries.some((entry) => entry.action === 'draw.page.create')).toBe(true);
	expect(body.entries.every((entry) => entry.account === undefined)).toBe(true);
	expect(JSON.stringify(body)).not.toContain('PRIVATE-NAME-NEVER-IN-LOGS');
	expect((await page.request.get('/tools/api/logs?scope=all', { headers })).status()).toBe(403);
	expect(
		(await page.request.get(`/tools/api/logs?userId=${TEST_TOOLS_OWNER.id}`, { headers })).status()
	).toBe(400);
	expect(
		(
			await page.request.post('/tools/api/logs', {
				headers,
				data: {
					id: crypto.randomUUID(),
					action: 'box.open',
					status: 'succeeded',
					userId: TEST_TOOLS_OWNER.id
				}
			})
		).status()
	).toBe(400);
	expect(
		(
			await page.request.post('/tools/api/logs', {
				headers: { ...headers, Origin: 'https://evil.example' },
				data: { id: crypto.randomUUID(), action: 'box.open', status: 'succeeded' }
			})
		).status()
	).toBe(403);
	expect(
		(
			await page.request.get('/tools/api/logs', {
				headers: { 'X-Tools-User': TEST_TOOLS_OWNER.id }
			})
		).status()
	).toBe(409);
	await page.request.delete(`/tools/api/draw/pages/${drawing.id}`, { headers });
});

test('dashboard filters and unavailable state do not invent totals', async ({ page }) => {
	await page.goto('/tools');
	await seedBrowserAction(page, member());
	await page.goto('/tools/logs');
	await expect(page.getByRole('heading', { name: 'Tool logs', exact: true })).toBeVisible();
	await expect(page.getByRole('table')).toContainText('Opened big text box');
	await expect(page.getByRole('combobox', { name: 'Accounts', exact: true })).toHaveCount(0);
	await page.getByRole('combobox', { name: 'Activity', exact: true }).selectOption('ai');
	await expect(page).toHaveURL(/kind=ai/);
	await expect(
		page.getByRole('heading', { name: 'No recorded activity in this view' })
	).toBeVisible();
	await page.route('**/tools/api/logs?*', (route) =>
		route.fulfill({ status: 503, json: { error: 'unavailable' } })
	);
	await page.getByRole('button', { name: 'Refresh', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Activity is unavailable');
	await expect(page.getByRole('definition')).toHaveCount(0);
	await expect(page.getByText('not connected', { exact: true })).toBeVisible();
});

test('owner can inspect everyone while ordinary users cannot; mobile stays contained', async ({
	page
}) => {
	await page.goto('/tools');
	const user = member();
	await seedBrowserAction(page, user);
	await authenticateTools(page, TEST_TOOLS_OWNER);
	await page.goto('/tools/logs?scope=all&tool=box');
	await expect(page.getByRole('combobox', { name: 'Accounts', exact: true })).toHaveValue('all');
	await expect(page.getByRole('table')).toContainText(user.email);
	await expect(page.getByRole('columnheader', { name: 'Account', exact: true })).toBeVisible();
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(page.getByRole('heading', { name: 'Tool logs', exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: '/tmp/swyxdotio-tool-logs-mobile.png', fullPage: true });
	await page.getByRole('combobox', { name: 'Accounts', exact: true }).selectOption('mine');
	await expect(page.getByRole('columnheader', { name: 'Account', exact: true })).toHaveCount(0);
	await expect(page.getByText(user.email, { exact: true })).toHaveCount(0);
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.getByRole('combobox', { name: 'Accounts', exact: true }).selectOption('all');
	await expect(page.getByRole('table')).toContainText(user.email);
	await page.screenshot({ path: '/tmp/swyxdotio-tool-logs-desktop.png', fullPage: true });
});

test('signed-in box opens appear in the dashboard without its text', async ({ page }) => {
	await page.goto('/tools');
	const user = member();
	await authenticateTools(page, user);
	const recorded = page.waitForResponse(
		(response) =>
			response.url().endsWith('/tools/api/logs') && response.request().method() === 'POST'
	);
	await page.goto('/box');
	await page.getByRole('textbox', { name: 'Write anything' }).fill('PRIVATE-TEXT-NEVER-IN-LOGS');
	expect((await recorded).ok()).toBe(true);
	await expect(page.getByRole('link', { name: /Tool opens are logged/ })).toBeVisible();
	await page.goto('/tools/logs?tool=box');
	await expect(page.getByRole('table')).toContainText('Opened big text box');
	const response = await page.request.get('/tools/api/logs?tool=box');
	expect(await response.text()).not.toContain('PRIVATE-TEXT-NEVER-IN-LOGS');
});

test('loading older activity preserves filtered totals and does not duplicate rows', async ({
	page
}) => {
	await page.goto('/tools');
	const user = member();
	const origin = await authenticateTools(page, user);
	const responses = await Promise.all(
		Array.from({ length: 55 }, () =>
			page.request.post('/tools/api/logs', {
				headers: { Origin: origin, 'X-Tools-User': user.id },
				data: { id: crypto.randomUUID(), action: 'draw.meme.insert', status: 'succeeded' }
			})
		)
	);
	expect(responses.every((response) => response.status() === 201)).toBe(true);
	await page.goto('/tools/logs?tool=draw');
	await expect(page.locator('tbody tr')).toHaveCount(50);
	await expect(page.locator('.summary')).toContainText('55');
	await page.getByRole('button', { name: 'Load older activity' }).click();
	await expect(page.locator('tbody tr')).toHaveCount(55);
	await expect(page.getByRole('button', { name: 'Load older activity' })).toHaveCount(0);
	await expect(page.locator('.summary')).toContainText('55');
});

test('a changed account clears the old dashboard rather than showing the new account under stale identity', async ({
	page
}) => {
	await page.goto('/tools');
	await seedBrowserAction(page, member());
	await page.goto('/tools/logs');
	await expect(page.getByRole('table')).toBeVisible();
	await authenticateTools(page, member());
	await page.getByRole('button', { name: 'Refresh', exact: true }).click();
	await expect(page).toHaveURL(/\/tools\?next=(?:%2F|\/)tools(?:%2F|\/)logs/);
	await expect(page.getByRole('table')).toHaveCount(0);
});
