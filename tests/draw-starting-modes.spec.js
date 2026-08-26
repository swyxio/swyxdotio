import { expect, test } from '@playwright/test';
import { authenticateTools, TEST_TOOLS_MEMBER, TEST_TOOLS_OWNER } from './helpers/tools-auth.js';

/** @param {import('@playwright/test').Page} page */
async function scene(page) {
	return page.evaluate(() =>
		JSON.parse(
			localStorage.getItem(
				document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
					'swyx-excalidraw:guest'
			) ?? '{"elements":[],"files":{}}'
		)
	);
}

/** @param {import('@playwright/test').Page} page @param {string} mode */
async function selectMode(page, mode) {
	await page.getByRole('button', { name: 'Choose drawing mode and tools' }).click();
	await page.getByRole('combobox', { name: 'Starting experience', exact: true }).selectOption(mode);
	await page.keyboard.press('Escape');
}

test('starting points wait for verified identity and never mistake restoration failure for a new drawing', async ({
	page
}) => {
	/** @type {(() => void) | undefined} */ let identify;
	const ready = new Promise((resolve) => {
		identify = () => resolve(undefined);
	});
	await page.route('**/tools/api/session', async (route) => {
		await ready;
		await route.fulfill({ json: { authenticated: false, user: null } });
	});
	await page.goto('/draw');
	await expect(page.getByRole('region', { name: 'Drawing starting points' })).toHaveCount(0);
	identify?.();
	await expect(page.getByRole('region', { name: 'Drawing starting points' })).toBeVisible();
	await page.route('**/tools/api/session', (route) => route.fulfill({ status: 503, json: {} }));
	await page.reload();
	await expect(page.getByRole('alert')).toContainText('Could not verify your account');
	await expect(page.getByRole('region', { name: 'Drawing starting points' })).toHaveCount(0);
});

test('mode changes preserve artwork, native undo, and account-scoped defaults without paid requests', async ({
	page
}) => {
	let paidRequests = 0;
	await page.route(/\/tools\/api\/draw\/(edit|agent)(?:[/?]|$)/, async (route) => {
		paidRequests += 1;
		await route.fulfill({
			status: 500,
			json: { error: 'Unexpected inference in navigation test' }
		});
	});
	await page.goto('/draw');
	const welcome = page.getByRole('region', { name: 'Drawing starting points' });
	await welcome.getByRole('button', { name: /^Compare architectures/ }).click();
	await expect(welcome).toHaveCount(0);
	await expect.poll(async () => (await scene(page)).elements.length).toBeGreaterThan(0);
	const original = (await scene(page)).elements;
	for (const mode of ['thumbnails', 'experiment', 'thinking']) {
		await selectMode(page, mode);
		expect((await scene(page)).elements).toEqual(original);
		await expect(welcome).toHaveCount(0);
		await expect(
			page.getByRole('button', { name: 'Open drawing templates and library' })
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Open drawing assistant' })).toBeVisible();
	}
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await expect
		.poll(
			async () =>
				(await scene(page)).elements.filter((/** @type {any} */ element) => !element.isDeleted)
					.length
		)
		.toBe(0);
	await expect(welcome).toHaveCount(0);
	await page.getByRole('button', { name: 'Redo', exact: true }).click();
	await expect
		.poll(
			async () =>
				(await scene(page)).elements.filter((/** @type {any} */ element) => !element.isDeleted)
					.length
		)
		.toBe(original.length);
	expect(paidRequests).toBe(0);
	await selectMode(page, 'thumbnails');
	await page.reload();
	await expect(page.getByRole('button', { name: 'Choose drawing mode and tools' })).toContainText(
		'Thumbnails'
	);
	await expect(welcome).toHaveCount(0);

	await authenticateTools(page, TEST_TOOLS_OWNER);
	await page.reload();
	await expect(page.getByRole('button', { name: 'Choose drawing mode and tools' })).toContainText(
		'Thinking'
	);
	await selectMode(page, 'experiment');
	await authenticateTools(page, TEST_TOOLS_MEMBER);
	await page.reload();
	await expect(page.getByRole('button', { name: 'Choose drawing mode and tools' })).toContainText(
		'Thinking'
	);
	expect(paidRequests).toBe(0);
});

test('mode and library navigation preserve an assistant draft and Escape dismisses the topmost menu', async ({
	page
}) => {
	await page.goto('/draw');
	await authenticateTools(page);
	await page.reload();
	await page.getByRole('button', { name: 'Open drawing assistant' }).click();
	const assistant = page.getByRole('region', { name: 'Drawing assistant' });
	const prompt = assistant.getByRole('textbox', { name: 'Message drawing assistant' });
	await prompt.fill('A local draft that must survive changing starting experience.');
	await selectMode(page, 'thumbnails');
	await expect(assistant).toBeVisible();
	await expect(prompt).toHaveValue('A local draft that must survive changing starting experience.');
	await expect(page.getByRole('button', { name: 'Choose drawing mode and tools' })).toBeFocused();
	await page.getByRole('button', { name: 'Open drawing templates and library' }).click();
	await expect(assistant).toHaveCount(0);
	await expect(page.getByRole('tab', { name: 'Design', exact: true })).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await page.getByRole('button', { name: 'Open drawing assistant' }).click();
	await expect(page.getByRole('tab', { name: 'Design', exact: true })).toHaveCount(0);
	await expect(prompt).toHaveValue('A local draft that must survive changing starting experience.');
});

test('phone menus and Library have one foreground surface, with no controls covering the category row', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/draw');
	const mode = page.getByRole('button', { name: 'Choose drawing mode and tools' });
	const pages = page.getByRole('button', { name: 'Manage drawing pages' });
	await mode.click();
	const menu = page.getByRole('region', { name: 'Drawing mode and tools' });
	await expect(menu).toBeVisible();
	await menu.getByRole('button', { name: 'Open drawing templates and library' }).click();
	await expect(mode).toBeHidden();
	await expect(pages).toBeHidden();
	await expect(page.getByRole('tab', { name: 'Presets', exact: true })).toBeVisible();
	const scrollableAncestors = await page
		.getByRole('button', { name: 'Insert Argument map preset' })
		.evaluate((element) => {
			let count = 0;
			for (let parent = element.parentElement; parent; parent = parent.parentElement) {
				if (
					['auto', 'scroll'].includes(getComputedStyle(parent).overflowY) &&
					parent.scrollHeight > parent.clientHeight + 1
				)
					count++;
			}
			return count;
		});
	expect(scrollableAncestors).toBe(1);
	await page.getByTestId('sidebar-close').click();
	await expect(mode).toBeVisible();
	await mode.click();
	await page.keyboard.press('Escape');
	await expect(menu).toHaveCount(0);
	await expect(mode).toBeFocused();
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
	expect(overflow).toBe(false);
});
