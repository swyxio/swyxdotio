import { expect, test } from '@playwright/test';
import { authenticateTools, TEST_TOOLS_OWNER, TEST_TOOLS_MEMBER } from './helpers/tools-auth.js';

const pagesPath = '/tools/api/draw/pages';

/** @param {import('@playwright/test').Page} page */
async function unlockDrawingPages(page) {
	const origin = new URL(page.url()).origin;
	await authenticateTools(page);
	return origin;
}

test('cloud drawing pages require the Google tools session', async ({ page }) => {
	await page.goto('/tools/draw');
	const origin = new URL(page.url()).origin;

	const response = await page.request.get(`${origin}${pagesPath}`);
	expect(response.status()).toBe(401);
	expect(response.headers()['cache-control']).toContain('no-store');
	const session = await page.request.get(`${origin}/tools/api/session`);
	expect(session.ok()).toBe(true);
	expect(await session.json()).toMatchObject({ authenticated: false, user: null });
	expect(session.headers()['cache-control']).toContain('no-store');

	const mutation = await page.request.post(`${origin}${pagesPath}`, {
		headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id },
		data: { name: 'Unauthorized drawing' }
	});
	expect(mutation.status()).toBe(401);
});

test('drawing pages can be created, switched, renamed, and deleted locally', async ({ page }) => {
	await page.goto('/tools/draw');
	const pages = page.getByRole('button', { name: 'Manage drawing pages' });
	await pages.click();
	await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Sign in to sync across devices' })).toHaveAttribute(
		'href',
		'/tools?next=/tools/draw'
	);

	await page.getByRole('button', { name: 'New page' }).click();
	await pages.click();
	await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toBeVisible();

	await page.getByRole('checkbox', { name: 'Library' }).check({ force: true });
	await page.getByRole('tab', { name: 'Templates, components, and memes' }).click();
	await page.getByRole('tab', { name: 'Presets', exact: true }).click();
	await page.getByRole('button', { name: 'Insert Priority quadrants preset' }).click();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: { text?: string }[] }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
				return scene.elements.some((element) => element.text?.includes('Act now'));
			})
		)
		.toBe(true);

	await pages.click();
	await page.getByRole('button', { name: 'Page 1', exact: true }).click();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: { text?: string }[] }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
				return scene.elements.some((element) => element.text?.includes('Act now'));
			})
		)
		.toBe(false);
	await pages.click();
	await page.getByRole('button', { name: 'Page 2', exact: true }).click();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: { text?: string }[] }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
				return scene.elements.some((element) => element.text?.includes('Act now'));
			})
		)
		.toBe(true);

	await pages.click();
	await page.getByRole('button', { name: 'Rename Page 2' }).click();
	const name = page.getByRole('textbox', { name: 'Page name' });
	await name.fill('Product diagrams');
	await name.press('Enter');
	await expect(page.getByRole('button', { name: 'Product diagrams', exact: true })).toBeVisible();

	await page.reload();
	await page.getByRole('button', { name: 'Manage drawing pages' }).click();
	await expect(page.getByRole('button', { name: 'Product diagrams', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Delete Product diagrams' }).click();
	await expect(page.getByRole('button', { name: 'Product diagrams', exact: true })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toBeVisible();
});

test('unlocking cloud drawing sync returns directly to the drawing canvas', async ({ page }) => {
	await page.goto('/tools?next=/tools/draw');
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('link', { name: 'Sign in with Google' })).toHaveAttribute(
		'href',
		'/tools/auth/google?next=%2Ftools%2Fdraw'
	);
	await authenticateTools(page);
	await page.goto('/tools/draw');
	await expect(page).toHaveURL(/\/tools\/draw$/);
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toBeVisible();
});

test('drawing pages persist through the Durable Object across independent sessions', async ({
	page,
	browser
}) => {
	await page.goto('/tools/draw');
	const origin = await unlockDrawingPages(page);
	const crossOrigin = await page.request.post(`${origin}${pagesPath}`, {
		headers: { Origin: 'https://untrusted.example', 'X-Tools-User': TEST_TOOLS_OWNER.id },
		data: { name: 'Cross-origin drawing' }
	});
	expect(crossOrigin.status()).toBe(403);

	const pageName = `Drawing smoke ${Date.now()}`;
	const create = await page.request.post(`${origin}${pagesPath}`, {
		headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id },
		data: { name: pageName }
	});
	expect(create.ok()).toBe(true);
	const createdPage = await create.json();
	const pageUrl = `${origin}${pagesPath}/${createdPage.id}`;

	try {
		const scene = {
			elements: [{ id: 'cloud-smoke', type: 'text', text: 'Saved outside this browser' }],
			appState: { viewBackgroundColor: '#ffffff' },
			files: {}
		};
		const save = await page.request.put(pageUrl, {
			headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id },
			data: { scene }
		});
		expect(save.ok()).toBe(true);

		const secondBrowser = await browser.newContext();
		try {
			const secondPage = await secondBrowser.newPage();
			await secondPage.goto(`${origin}/tools/draw`);
			await unlockDrawingPages(secondPage);

			const persisted = await secondPage.request.get(pageUrl);
			expect(persisted.ok()).toBe(true);
			const loadedPage = await persisted.json();
			expect(loadedPage.name).toBe(pageName);
			expect(loadedPage.scene.elements[0].text).toBe('Saved outside this browser');
		} finally {
			await secondBrowser.close();
		}

		const rename = await page.request.put(pageUrl, {
			headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id },
			data: { name: 'Renamed cloud drawing' }
		});
		expect(rename.ok()).toBe(true);
		expect((await rename.json()).name).toBe('Renamed cloud drawing');
	} finally {
		const remove = await page.request.delete(pageUrl, {
			headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id }
		});
		expect(remove.ok()).toBe(true);
	}
});

test('two Google accounts cannot read or change each other’s cloud drawings', async ({
	page,
	browser
}) => {
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const create = await page.request.post(`${origin}${pagesPath}`, {
		headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id },
		data: { name: 'Owner-only account isolation test' }
	});
	expect(create.status()).toBe(201);
	const owned = await create.json();
	const otherContext = await browser.newContext();
	try {
		const other = await otherContext.newPage();
		await other.goto(`${origin}/tools`);
		await authenticateTools(other, TEST_TOOLS_MEMBER);
		const url = `${origin}${pagesPath}/${owned.id}`;
		expect((await other.request.get(url)).status()).toBe(404);
		for (const method of ['PUT', 'DELETE']) {
			const response = await other.request.fetch(url, {
				method,
				headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_MEMBER.id },
				...(method === 'PUT' ? { data: { name: 'Stolen' } } : {})
			});
			expect(response.status()).toBe(404);
		}
		const stale = await other.request.post(`${origin}${pagesPath}`, {
			headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id },
			data: { name: 'Stale tab' }
		});
		expect(stale.status()).toBe(409);
		expect((await other.request.get(`${origin}/tools/podcast`)).status()).toBe(403);
		expect(
			(
				await other.request.post(`${origin}/tools/api/draw/agent`, {
					headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_MEMBER.id },
					data: {}
				})
			).status()
		).toBe(422);
		expect(
			(
				await other.request.post(`${origin}/tools/podcast/api/uploads`, {
					headers: { Origin: origin },
					data: {}
				})
			).status()
		).toBe(403);
	} finally {
		await otherContext.close();
		await page.request.delete(`${origin}${pagesPath}/${owned.id}`, {
			headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id }
		});
	}
});

test('account switching keeps browser caches separate and removes owner-only tools', async ({
	page
}) => {
	await page.goto('/tools');
	await authenticateTools(page);
	await page.goto('/tools/draw');
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toBeVisible();
	const ownerKey = `swyx-excalidraw:google:${TEST_TOOLS_OWNER.id}`;
	await expect(page.locator('.draw-canvas')).toHaveAttribute('data-account-storage-key', ownerKey);
	await page.goto('/tools');
	await expect(page.getByRole('link', { name: /Podcast studio/ })).toBeVisible();
	await page.evaluate(
		(key) =>
			localStorage.setItem(`${key}:library`, JSON.stringify([{ id: 'private-owner-library' }])),
		ownerKey
	);
	const openDrawing = await page.context().newPage();
	await openDrawing.goto('/tools/draw');
	await expect(openDrawing.locator('.draw-canvas')).toHaveAttribute(
		'data-account-storage-key',
		ownerKey
	);
	await authenticateTools(page, TEST_TOOLS_MEMBER);
	await page.reload();
	await expect(openDrawing.locator('.draw-canvas')).toHaveAttribute(
		'data-account-storage-key',
		`swyx-excalidraw:google:${TEST_TOOLS_MEMBER.id}`
	);
	await expect(page.getByRole('link', { name: /Podcast studio/ })).toHaveCount(0);
	await page.locator('.account-menu > summary').click();
	await expect(page.getByText(TEST_TOOLS_MEMBER.email, { exact: true })).toBeVisible();
	await page.goto('/tools/draw');
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toBeVisible();
	await expect(page.locator('.draw-canvas')).toHaveAttribute(
		'data-account-storage-key',
		`swyx-excalidraw:google:${TEST_TOOLS_MEMBER.id}`
	);
	const memberLibrary = await page.evaluate(
		(id) => localStorage.getItem(`swyx-excalidraw:google:${id}:library`),
		TEST_TOOLS_MEMBER.id
	);
	expect(memberLibrary).not.toContain('private-owner-library');
	await page.goto('/tools');
	await page.locator('.account-menu > summary').click();
	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await expect(page.getByRole('link', { name: 'Sign in with Google' })).toBeVisible();
	expect((await page.request.get('/tools/api/draw/pages')).status()).toBe(401);
	await expect(openDrawing.locator('.draw-canvas')).toHaveAttribute(
		'data-account-storage-key',
		'swyx-excalidraw:guest'
	);
	await openDrawing.close();
	await page.goto('/tools/draw');
	await expect(page.locator('.draw-canvas')).toHaveAttribute(
		'data-account-storage-key',
		'swyx-excalidraw:guest'
	);
});

test('members and guests see funded AI limits and logging before using the assistant', async ({
	page
}) => {
	await page.goto('/tools');
	await expect(page.getByRole('complementary', { name: 'Usage allowance' })).toContainText(
		'rate limited, and logged'
	);
	await page.getByText('The rules of the workshop', { exact: true }).click();
	const notice = page.getByRole('complementary', { name: 'Funded AI usage notice' });
	await expect(notice).toContainText('rate limited, and logged');
	await expect(notice).toContainText('20 assistant turns');
	await expect(notice).toContainText('30 days');
	await authenticateTools(page, TEST_TOOLS_MEMBER);
	await page.reload();
	await expect(page.getByRole('region', { name: 'Your AI usage' })).toContainText(
		'assistant turns'
	);
	const usage = await page.request.get('/tools/api/ai/usage', {
		headers: { 'X-Tools-User': TEST_TOOLS_MEMBER.id }
	});
	expect(usage.status()).toBe(200);
	expect(await usage.json()).toMatchObject({
		policy: { assistantTurnsPerHour: 20, mediaJobsPerHour: 5, retentionDays: 30 }
	});
	await page.goto('/tools/draw');
	await page.getByRole('button', { name: 'Open drawing assistant' }).click();
	await expect(page.getByRole('complementary', { name: 'Funded AI usage notice' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Sign in to use the assistant' })).toHaveCount(0);
	await expect(page.getByText(/available only to that account/)).toHaveCount(0);
});
