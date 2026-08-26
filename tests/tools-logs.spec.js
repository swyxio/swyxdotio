import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { authenticateTools, TEST_TOOLS_OWNER } from './helpers/tools-auth.js';

function member() {
	const id = crypto.randomUUID().replaceAll('-', '');
	return { id, name: 'Dashboard member', email: `${id}@example.com` };
}

/** @param {import('@playwright/test').Page} page @param {ReturnType<typeof member>} user @param {string} [action] @param {string} [status] */
async function seedBrowserAction(page, user, action = 'box.open', status = 'succeeded') {
	const origin = await authenticateTools(page, user);
	const id = crypto.randomUUID();
	const response = await page.request.post('/tools/api/logs', {
		headers: { Origin: origin, 'X-Tools-User': user.id },
		data: { id, action, status }
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
	await expect(page.locator('.summary')).toHaveCount(0);
	await expect(page.getByText('not connected', { exact: true })).toBeVisible();
});

test('owner can inspect everyone while ordinary users cannot; mobile stays contained', async ({
	page
}) => {
	await page.goto('/tools');
	const user = member();
	const { id } = await seedBrowserAction(page, user);
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
	await page.getByRole('searchbox', { name: 'Search metadata' }).fill(id);
	await page.getByRole('button', { name: 'Search', exact: true }).click();
	await expect(page.locator('tbody tr')).toHaveCount(1);
	await page.getByRole('button', { name: 'Accounts', exact: true }).click();
	await page
		.getByRole('button', { name: 'Filter Dashboard member: 1 events', exact: true })
		.click();
	await expect(page).toHaveURL(new RegExp(`account=${user.id}`));
	expect(page.url()).not.toContain(user.email);
	await page.getByRole('combobox', { name: 'Accounts', exact: true }).selectOption('mine');
	await expect(page.getByText(user.email, { exact: true })).toHaveCount(0);
	expect(new URL(page.url()).searchParams.has('account')).toBe(false);
});

test('signed-in box opens appear in the dashboard without its text', async ({ page }) => {
	await page.goto('/tools');
	const user = member();
	await authenticateTools(page, user);
	const recorded = page.waitForResponse(
		(response) =>
			response.url().endsWith('/tools/api/logs') && response.request().method() === 'POST'
	);
	await page.goto('/tools/box');
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
	for (const format of ['csv', 'json']) {
		const requestPromise = page.waitForRequest(
			(request) =>
				request.url().includes(`/tools/api/logs/export?`) &&
				request.url().includes(`format=${format}`)
		);
		const [download] = await Promise.all([
			page.waitForEvent('download'),
			page.getByRole('button', { name: `Export ${format.toUpperCase()}`, exact: true }).click()
		]);
		const request = await requestPromise;
		expect(request.headers()['x-tools-user']).toBe(user.id);
		expect(new URL(request.url()).searchParams.has('snapshot')).toBe(true);
		const file = await download.path();
		expect(file).toBeTruthy();
		const contents = await readFile(file, 'utf8');
		if (format === 'json') {
			/** @type {{entries:import('../src/lib/tools-logs-view.js').ToolLogEntry[]}} */
			const exported = JSON.parse(contents);
			expect(exported.entries).toHaveLength(55);
			expect(exported.entries.every((entry) => entry.account === undefined)).toBe(true);
		} else {
			expect(contents.trim().split(/\r?\n/)).toHaveLength(56);
			expect(contents).not.toContain(user.email);
		}
		await expect(page.getByRole('status')).toContainText('all 55 records');
		await expect(page.locator('tbody tr')).toHaveCount(50);
	}
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

test('quick views, metadata search, drilldowns and request details remain bookmarkable', async ({
	page
}) => {
	await page.goto('/tools');
	const user = member();
	await seedBrowserAction(page, user);
	const failed = await seedBrowserAction(page, user, 'draw.meme.insert', 'failed');
	await seedBrowserAction(page, user, 'draw.design.insert');
	await page.goto('/tools/logs');
	await expect(page.locator('tbody tr')).toHaveCount(3);
	await page.getByRole('checkbox', { name: 'Hide tool opens' }).check();
	await expect(page.locator('tbody tr')).toHaveCount(2);
	await expect(page).toHaveURL(/opens=hide/);
	await page.getByRole('button', { name: 'Failures', exact: true }).click();
	await expect(page.locator('tbody tr')).toHaveCount(1);
	await expect(page.getByRole('table')).toContainText('Inserted meme');
	await page.getByRole('searchbox', { name: 'Search metadata' }).fill(failed.id);
	await page.getByRole('button', { name: 'Search', exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`q=${failed.id}`));
	await page.reload();
	await expect(page.getByRole('searchbox', { name: 'Search metadata' })).toHaveValue(failed.id);
	await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue('failed');
	await page.getByRole('button', { name: /Inspect Inserted meme/ }).click();
	await expect(page.getByRole('region', { name: 'Request quick view' })).toContainText(failed.id);
	await expect(page.getByRole('button', { name: 'Close quick view' })).toBeFocused();
	await page.getByRole('button', { name: 'Close quick view' }).click();
	await expect(page.getByRole('button', { name: /Inspect Inserted meme/ })).toBeFocused();
	await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
	await expect(page.locator('tbody tr')).toHaveCount(3);
	await expect(page).toHaveURL(/\/tools\/logs$/);
	await page.getByRole('button', { name: 'Filter Draw: 2 events', exact: true }).click();
	await expect(page.locator('tbody tr')).toHaveCount(2);
	await expect(page).toHaveURL(/tool=draw/);
	await page.getByRole('button', { name: 'Actions', exact: true }).click();
	await page.getByRole('button', { name: 'Filter Inserted meme: 1 events', exact: true }).click();
	await expect(page.locator('tbody tr')).toHaveCount(1);
	await expect(page).toHaveURL(/action=draw.meme.insert/);
	await page.getByRole('button', { name: /^Filter \d{4}-\d{2}-\d{2}:/ }).click();
	await expect(page).toHaveURL(/day=\d{4}-\d{2}-\d{2}/);
	await page.getByRole('button', { name: 'More filters', exact: true }).click();
	await expect(page.getByRole('combobox', { name: 'Action', exact: true })).toHaveValue(
		'draw.meme.insert'
	);
	await page.evaluate(() => {
		history.pushState({}, '', '/tools/logs?kind=tool&source=browser&status=failed');
		window.dispatchEvent(new PopStateEvent('popstate'));
	});
	await expect(page.getByRole('combobox', { name: 'Source', exact: true })).toHaveValue('browser');
	await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue('failed');
	await expect(page.locator('tbody tr')).toHaveCount(1);
});

test('export failures are explicit and a changed filter cancels an in-flight download', async ({
	page
}) => {
	await page.goto('/tools');
	await seedBrowserAction(page, member());
	await page.goto('/tools/logs');
	await expect(page.getByRole('table')).toBeVisible();
	await page.route('**/tools/api/logs/export?*', (route) =>
		route.fulfill({ status: 413, json: { error: 'too_many_records' } })
	);
	await page.getByRole('button', { name: 'Export CSV' }).click();
	await expect(page.getByRole('alert')).toContainText('No partial file was downloaded');
	await page.unroute('**/tools/api/logs/export?*');
	let release = () => {};
	/** @type {Promise<void>} */
	const held = new Promise((resolve) => {
		release = resolve;
	});
	let finish = () => {};
	/** @type {Promise<void>} */
	const completed = new Promise((resolve) => {
		finish = resolve;
	});
	let downloads = 0;
	page.on('download', () => downloads++);
	await page.route('**/tools/api/logs/export?*', async (route) => {
		await held;
		try {
			await route.fulfill({
				status: 200,
				contentType: 'text/csv',
				headers: { 'X-Export-Count': '1', 'X-Export-Complete': 'true' },
				body: 'id\nshould-not-download\n'
			});
		} catch {
			/* Request was aborted by the filter change. */
		}
		finish();
	});
	await page.getByRole('button', { name: 'Export CSV' }).click();
	await expect(page.getByRole('button', { name: 'Cancel export' })).toBeVisible();
	await page.getByRole('button', { name: 'AI only', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'No recorded activity in this view' })
	).toBeVisible();
	release();
	await completed;
	await expect(page.getByRole('button', { name: 'Cancel export' })).toHaveCount(0);
	expect(downloads).toBe(0);
	await expect(page.getByRole('status')).toHaveCount(0);
});

/** Synthetic metadata only: validates presentation without invoking any provider.
 * @returns {import('../src/lib/tools-logs-view.js').ToolLogs}
 */
function generationLogsFixture() {
	/** @type {import('../src/lib/tools-logs-view.js').ToolLogGeneration} */
	const observed = {
		adapter: 'fal',
		modelMaker: 'Black Forest Labs',
		modality: 'text-to-image',
		runId: 'shared-run',
		clientJobId: 'client-image-job',
		providerRequestId: 'fal-request-image',
		estimatedCostUsd: 0.04,
		requestedOutputs: 2,
		referenceCount: 0,
		width: 1024,
		height: 768,
		resolution: null,
		durationSeconds: null,
		submittedAt: '2026-08-26T10:00:00.000Z',
		startedObservedAt: '2026-08-26T10:00:01.200Z',
		finishedObservedAt: '2026-08-26T10:00:06.200Z',
		lastObservedAt: '2026-08-26T10:00:06.200Z',
		providerStatus: 'completed',
		cancellation: null,
		cancellationRequestedAt: null,
		errorCode: null,
		observedElapsedMs: 6200,
		observedQueueMs: 1200
	};
	const other = {
		id: 'other-generation-account',
		name: 'Other generator',
		email: 'generator@example.com'
	};
	/** @type {import('../src/lib/tools-logs-view.js').ToolLogEntry[]} */
	const entries = [
		{
			id: 'generation-image',
			createdAt: '2026-08-26T10:00:00.000Z',
			kind: 'ai',
			tool: 'draw',
			action: 'draw.ai.media',
			status: 'succeeded',
			source: 'server',
			model: 'fal-ai/flux-2',
			estimatedReservedUsd: 0.08,
			account: TEST_TOOLS_OWNER,
			generation: observed
		},
		{
			id: 'generation-video',
			createdAt: '2026-08-26T10:01:00.000Z',
			kind: 'ai',
			tool: 'draw',
			action: 'draw.ai.media',
			status: 'submitted',
			source: 'server',
			model: 'fal-ai/veo3',
			estimatedReservedUsd: 0.8,
			account: other,
			generation: {
				...observed,
				modelMaker: 'Google',
				modality: 'image-to-video',
				estimatedCostUsd: null,
				clientJobId: 'client-video-job',
				providerRequestId: 'fal-request-video',
				requestedOutputs: 1,
				referenceCount: 1,
				width: null,
				height: null,
				resolution: '720p',
				durationSeconds: 6,
				submittedAt: '2026-08-26T10:01:00.000Z',
				lastObservedAt: '2026-08-26T10:01:05.000Z',
				startedObservedAt: null,
				finishedObservedAt: null,
				providerStatus: 'queued',
				cancellation: 'requested',
				cancellationRequestedAt: '2026-08-26T10:01:05.000Z',
				observedElapsedMs: null,
				observedQueueMs: null
			}
		},
		{
			id: 'generation-historical',
			createdAt: '2026-08-26T09:50:00.000Z',
			kind: 'ai',
			tool: 'draw',
			action: 'draw.ai.media',
			status: 'failed',
			source: 'server',
			model: 'historical-model',
			estimatedReservedUsd: 0.1,
			account: TEST_TOOLS_OWNER
		},
		{
			id: 'assistant-only',
			createdAt: '2026-08-26T09:40:00.000Z',
			kind: 'ai',
			tool: 'draw',
			action: 'draw.ai.assistant',
			status: 'succeeded',
			source: 'server',
			model: 'assistant-model',
			estimatedReservedUsd: 0.01,
			account: TEST_TOOLS_OWNER
		}
	];
	const totals = {
		aiRequests: 4,
		toolActions: 0,
		estimatedReservedUsd: 0.99,
		failedRequests: 1,
		pendingRequests: 1,
		succeededRequests: 2,
		cancelledRequests: 0,
		activeAccounts: 2
	};
	return {
		entries,
		nextCursor: null,
		summary: totals,
		daily: [
			{
				date: '2026-08-26',
				aiRequests: 4,
				toolActions: 0,
				estimatedReservedUsd: 0.99,
				failedRequests: 1,
				pendingRequests: 1
			}
		],
		breakdowns: {
			tools: [],
			models: [],
			actions: [],
			accounts: [],
			adapters: [
				{
					key: 'fal',
					count: 2,
					aiRequests: 2,
					toolActions: 0,
					failedRequests: 0,
					pendingRequests: 1,
					estimatedReservedUsd: 0.88
				}
			],
			modalities: [
				{
					key: 'text-to-image',
					count: 1,
					aiRequests: 1,
					toolActions: 0,
					failedRequests: 0,
					pendingRequests: 0,
					estimatedReservedUsd: 0.08
				},
				{
					key: 'image-to-video',
					count: 1,
					aiRequests: 1,
					toolActions: 0,
					failedRequests: 0,
					pendingRequests: 1,
					estimatedReservedUsd: 0.8
				}
			]
		},
		breakdownLimit: 20,
		retentionDays: 30,
		range: { from: '2026-08-19T10:10:00.000Z', to: '2026-08-26T10:10:00.000Z' },
		generationRuns: [
			{
				id: 'shared-run',
				jobs: 1,
				succeeded: 1,
				failed: 0,
				cancelled: 0,
				pending: 0,
				estimatedCostUsd: 0.04,
				estimatedReservedUsd: 0.08,
				estimateCoverage: 1,
				timingCoverage: 1,
				firstAdmittedAt: '2026-08-26T10:00:00.000Z',
				lastOutcomeAt: '2026-08-26T10:00:06.200Z',
				observedElapsedMs: 6200,
				account: TEST_TOOLS_OWNER
			},
			{
				id: 'shared-run',
				jobs: 1,
				succeeded: 0,
				failed: 0,
				cancelled: 0,
				pending: 1,
				estimatedCostUsd: null,
				estimatedReservedUsd: 0.8,
				estimateCoverage: 0,
				timingCoverage: 0,
				firstAdmittedAt: '2026-08-26T10:01:00.000Z',
				lastOutcomeAt: null,
				observedElapsedMs: null,
				account: other
			}
		]
	};
}

test('media filters and account-scoped runs preserve correlation without implying GPU billing', async ({
	page
}) => {
	await page.goto('/tools');
	await authenticateTools(page, TEST_TOOLS_OWNER);
	const fixture = generationLogsFixture();
	await page.route('**/tools/api/logs?*', (route) => route.fulfill({ json: fixture }));
	await page.goto('/tools/logs?scope=all');
	await expect(page.getByRole('heading', { name: 'Runs · matching admitted jobs' })).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Inspect run shared-run for owner@example.com', exact: true })
	).toContainText('1/1 jobs estimated');
	await expect(
		page.getByRole('button', {
			name: 'Inspect run shared-run for generator@example.com',
			exact: true
		})
	).toContainText('Unavailable');
	await page.getByRole('button', { name: 'Media', exact: true }).click();
	await expect(page).toHaveURL(/action=draw.ai.media/);
	await page.getByRole('button', { name: 'More filters', exact: true }).click();
	await page.getByRole('combobox', { name: 'Hosting provider', exact: true }).selectOption('fal');
	await page
		.getByRole('combobox', { name: 'Generation mode', exact: true })
		.selectOption('image-to-video');
	await expect(page).toHaveURL(/adapter=fal/);
	await expect(page).toHaveURL(/modality=image-to-video/);
	await page.reload();
	await expect(page.getByRole('combobox', { name: 'Hosting provider', exact: true })).toHaveValue(
		'fal'
	);
	await expect(page.getByRole('combobox', { name: 'Generation mode', exact: true })).toHaveValue(
		'image-to-video'
	);
	await page
		.getByRole('button', { name: 'Inspect run shared-run for owner@example.com', exact: true })
		.click();
	await expect(page).toHaveURL(new RegExp(`account=${TEST_TOOLS_OWNER.id}`));
	const query = new URL(page.url()).searchParams;
	expect(query.get('run')).toBe('shared-run');
	expect(query.has('modality')).toBe(false);
	expect(query.has('adapter')).toBe(false);
	await page.getByRole('button', { name: 'Providers', exact: true }).click();
	await page.getByRole('button', { name: 'Filter fal: 2 events', exact: true }).click();
	await expect(page).toHaveURL(/adapter=fal/);
	await page.getByRole('button', { name: 'Modes', exact: true }).click();
	await page.getByRole('button', { name: 'Filter image-to-video: 1 events', exact: true }).click();
	await expect(page).toHaveURL(/modality=image-to-video/);
	await page.getByRole('textbox', { name: 'Run ID', exact: true }).fill('another-run');
	await page.getByRole('textbox', { name: 'Run ID', exact: true }).press('Tab');
	await expect(page).toHaveURL(/run=another-run/);
});

test('generation quick view distinguishes estimates, observations, unknowns, and cancellation requests', async ({
	page
}) => {
	await page.goto('/tools');
	await authenticateTools(page, TEST_TOOLS_OWNER);
	await page.route('**/tools/api/logs?*', (route) =>
		route.fulfill({ json: generationLogsFixture() })
	);
	await page.goto('/tools/logs?scope=all&action=draw.ai.media');
	await page.locator('tbody tr').filter({ hasText: 'fal-ai/flux-2' }).getByRole('button').click();
	const detail = page.getByRole('region', { name: 'Generation metadata', exact: true });
	await expect(detail).toContainText('Black Forest Labs');
	await expect(detail).toContainText('fal-request-image');
	await expect(detail).toContainText('client-image-job');
	await expect(detail).toContainText('6.2 s');
	await expect(detail).toContainText('1.2 s');
	await expect(
		detail.locator('dl > div').filter({ hasText: 'Catalog cost estimate' })
	).toContainText('$0.04');
	await expect(detail.locator('dl > div').filter({ hasText: 'Reference count' })).toContainText(
		'0'
	);
	await expect(detail).toContainText('not GPU execution time');
	await page.getByRole('button', { name: 'Close quick view' }).click();
	await page.locator('tbody tr').filter({ hasText: 'fal-ai/veo3' }).getByRole('button').click();
	await expect(detail).toContainText('Requested · not confirmed');
	await expect(
		detail.locator('dl > div').filter({ hasText: 'Observed elapsed wall time' })
	).toContainText('Unavailable');
	await expect(
		detail.locator('dl > div').filter({ hasText: 'Catalog cost estimate' })
	).toContainText('Unavailable');
	await page.setViewportSize({ width: 390, height: 844 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: '/tmp/tools-generation-logs-mobile.png', fullPage: true });
	await page.getByRole('button', { name: 'Close quick view' }).click();
	await page
		.locator('tbody tr')
		.filter({ hasText: 'historical-model' })
		.getByRole('button')
		.click();
	await expect(detail).toContainText('Historical settings and timings are unavailable');
	await expect(detail).toContainText('does not establish a provider-confirmed failure');
	await expect(detail.locator('dl > div').filter({ hasText: 'Observed queue wait' })).toContainText(
		'Unavailable'
	);
	await page.getByRole('button', { name: 'Close quick view' }).click();
	await page.locator('tbody tr').filter({ hasText: 'assistant-model' }).getByRole('button').click();
	await expect(detail).toHaveCount(0);
});
