import { expect, test } from '@playwright/test';

const pagesPath = '/tools/api/draw/pages';

/** @param {import('@playwright/test').Page} page */
async function unlockDrawingPages(page) {
	const origin = new URL(page.url()).origin;
	const response = await page.request.post(`${origin}/tools/api/session`, {
		headers: { Origin: origin },
		data: { password: 'draw-test-password' }
	});
	expect(response.ok()).toBe(true);
	return origin;
}

test('cloud drawing pages require the existing private tools session', async ({ page }) => {
	await page.goto('/draw');
	const origin = new URL(page.url()).origin;

	const response = await page.request.get(`${origin}${pagesPath}`);
	expect(response.status()).toBe(401);
	expect(response.headers()['cache-control']).toContain('no-store');
	const session = await page.request.get(`${origin}/tools/api/session`);
	expect(session.ok()).toBe(true);
	expect(await session.json()).toEqual({ authenticated: false });
	expect(session.headers()['cache-control']).toContain('no-store');

	const mutation = await page.request.post(`${origin}${pagesPath}`, {
		headers: { Origin: origin },
		data: { name: 'Unauthorized drawing' }
	});
	expect(mutation.status()).toBe(401);
});

test('drawing pages can be created, switched, renamed, and deleted locally', async ({ page }) => {
	await page.goto('/draw');
	const pages = page.getByRole('button', { name: 'Manage drawing pages' });
	await pages.click();
	await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Sign in to sync across devices' })).toHaveAttribute(
		'href',
		'/tools?next=/draw'
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
					JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
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
					JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
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
					JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
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
	await page.goto('/tools?next=/draw');
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Password').fill('draw-test-password');
	await page.getByRole('button', { name: 'Unlock tools' }).click();
	await expect(page).toHaveURL(/\/draw$/);
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toBeVisible();
});

test('drawing pages persist through the Durable Object across independent sessions', async ({
	page,
	browser
}) => {
	await page.goto('/draw');
	const origin = await unlockDrawingPages(page);
	const crossOrigin = await page.request.post(`${origin}${pagesPath}`, {
		headers: { Origin: 'https://untrusted.example' },
		data: { name: 'Cross-origin drawing' }
	});
	expect(crossOrigin.status()).toBe(403);

	const pageName = `Drawing smoke ${Date.now()}`;
	const create = await page.request.post(`${origin}${pagesPath}`, {
		headers: { Origin: origin },
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
			headers: { Origin: origin },
			data: { scene }
		});
		expect(save.ok()).toBe(true);

		const secondBrowser = await browser.newContext();
		try {
			const secondPage = await secondBrowser.newPage();
			await secondPage.goto(`${origin}/draw`);
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
			headers: { Origin: origin },
			data: { name: 'Renamed cloud drawing' }
		});
		expect(rename.ok()).toBe(true);
		expect((await rename.json()).name).toBe('Renamed cloud drawing');
	} finally {
		const remove = await page.request.delete(pageUrl, { headers: { Origin: origin } });
		expect(remove.ok()).toBe(true);
	}
});
