import { expect, test } from '@playwright/test';
import { authenticateTools, TEST_TOOLS_MEMBER, TEST_TOOLS_OWNER } from './helpers/tools-auth.js';
import {
	DRAW_GENERATION_MODELS,
	DEFAULT_DRAW_TEXT_TO_IMAGE_MODEL
} from '../src/lib/draw-generation-models.js';

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
	await page.goto('/tools/draw');
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
		if (route.request().method() === 'GET') return route.continue();
		paidRequests += 1;
		await route.fulfill({
			status: 500,
			json: { error: 'Unexpected inference in navigation test' }
		});
	});
	await page.goto('/tools/draw');
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
	await page.goto('/tools/draw');
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
	await expect(page.getByRole('status', { name: 'Background drawing jobs' })).toHaveCount(0);
	await expect(page.getByRole('tab', { name: 'Design', exact: true })).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await page.getByRole('button', { name: 'Open drawing assistant' }).click();
	await expect(page.getByRole('tab', { name: 'Design', exact: true })).toHaveCount(0);
	await expect(prompt).toHaveValue('A local draft that must survive changing starting experience.');
	await page.getByRole('button', { name: 'Open image and video generation' }).click();
	await expect(assistant).toHaveCount(0);
	await expect(page.getByRole('status', { name: 'Background drawing jobs' })).toHaveCount(0);
});

test('phone menus and Library have one foreground surface, with no controls covering the category row', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/tools/draw');
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
		.getByRole('button', { name: 'Insert Claim, evidence, objection preset' })
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

test('blank Experiment opens one idle composer and preserves model choices even before a prompt is typed', async ({
	page
}) => {
	let paidRequests = 0;
	await page.route(/\/tools\/api\/draw\/(edit|agent|creative-source)(?:[/?]|$)/, (route) => {
		if (route.request().method() === 'GET') return route.continue();
		paidRequests++;
		return route.abort('blockedbyclient');
	});
	await page.goto('/tools/draw');
	await page
		.getByRole('region', { name: 'Drawing starting points' })
		.getByRole('button', { name: 'Experiment', exact: true })
		.click();
	const panel = page.getByRole('region', { name: 'Selected image tools' });
	const prompt = panel.getByRole('textbox', { name: 'AI image editing prompt' });
	const models = panel.getByRole('button', { name: 'AI model and workflow selector' });
	await expect(prompt).toHaveValue('');
	await expect(models).toContainText(DEFAULT_DRAW_TEXT_TO_IMAGE_MODEL.label);
	const alternative = DRAW_GENERATION_MODELS.find(
		(model) => model.kind === 'text-to-image' && model.id !== DEFAULT_DRAW_TEXT_TO_IMAGE_MODEL.id
	);
	if (!alternative) throw new Error('Expected another text-to-image model in the shared catalog.');
	await models.click();
	await panel.getByRole('searchbox', { name: 'Search AI models' }).fill(alternative.label);
	await panel
		.getByRole('button', { name: `Use only ${alternative.label} · ${alternative.workflow}` })
		.click();
	await page.getByRole('button', { name: 'Open drawing templates and library' }).click();
	await expect(panel).toBeHidden();
	await page.getByRole('button', { name: 'Open image and video generation' }).click();
	await selectMode(page, 'thinking');
	await expect(prompt).toHaveValue('');
	await expect(models).toContainText(alternative.label);
	await expect(page.getByRole('status', { name: 'Background drawing jobs' })).toHaveCount(0);
	expect((await scene(page)).elements).toEqual([]);
	expect(paidRequests).toBe(0);
});

for (const viewport of [
	{ width: 390, height: 844 },
	{ width: 390, height: 420 },
	{ width: 625, height: 844 },
	{ width: 844, height: 390 }
]) {
	test.describe(`touch text entry ${viewport.width}x${viewport.height}`, () => {
		test.use({ viewport, isMobile: true, hasTouch: true });
		test('opening tools does not summon the keyboard; fields are zoom-safe and explicit keyboard focus remains', async ({
			page
		}) => {
			let paid = 0;
			await page.route(/\/tools\/api\/draw\/(agent|edit)(?:[/?]|$)/, (route) => {
				if (route.request().method() === 'GET') return route.continue();
				paid++;
				return route.abort('blockedbyclient');
			});
			await page.goto('/tools/draw');
			await authenticateTools(page);
			await page.reload();
			const menu = page.getByRole('button', { name: 'Choose drawing mode and tools' });
			await menu.click();
			await page.getByRole('button', { name: 'Open drawing assistant' }).click();
			const assistant = page.getByRole('region', { name: 'Drawing assistant' });
			const composer = assistant.getByRole('textbox', { name: 'Message drawing assistant' });
			await expect(composer).toBeVisible();
			await expect(composer).not.toBeFocused();
			await expect(composer).toHaveCSS('font-size', '16px');
			await assistant.getByRole('button', { name: 'Try Notes → diagram workflow' }).click();
			await expect(composer).not.toBeFocused();
			await expect(composer).toHaveValue(/Turn my notes below/);
			await assistant.getByRole('button', { name: 'Try Make this essay-ready workflow' }).click();
			await assistant.getByRole('button', { name: 'Use suggestion instead' }).click();
			await expect(composer).not.toBeFocused();
			await expect(composer).toHaveValue(/Make the selected diagram essay-ready/);
			await composer.fill('A draft stays here after minimizing.');
			await assistant.getByRole('button', { name: 'Minimize drawing assistant' }).click();
			await expect(assistant).toHaveCount(0);
			await page.keyboard.press('Control+j');
			await expect(composer).toBeFocused();
			await expect(composer).toHaveValue('A draft stays here after minimizing.');
			await assistant.getByRole('button', { name: 'Minimize drawing assistant' }).click();
			await menu.click();
			await page.getByRole('button', { name: 'Open image and video generation' }).click();
			const media = page.getByRole('region', { name: 'Selected image tools' });
			const prompt = media.getByRole('textbox', { name: 'AI image editing prompt' });
			await expect(prompt).not.toBeFocused();
			await expect(prompt).toHaveCSS('font-size', '16px');
			await media.getByRole('button', { name: 'AI model and workflow selector' }).click();
			const search = media.getByRole('searchbox', { name: 'Search AI models' });
			await expect(search).toBeVisible();
			await expect(search).not.toBeFocused();
			await expect(search).toHaveCSS('font-size', '16px');
			await media.getByRole('button', { name: 'AI model and workflow selector' }).click();
			await prompt.fill('A deliberately typed draft');
			await media.getByRole('button', { name: 'Minimize image tools' }).click();
			expect(
				await page.evaluate(() => document.activeElement?.matches('input,textarea,select'))
			).toBe(false);
			await page.getByRole('button', { name: 'Manage drawing pages' }).click();
			await page
				.getByRole('button', { name: /^Rename / })
				.first()
				.click();
			const name = page.getByRole('textbox', { name: 'Page name' });
			await expect(name).toBeFocused();
			await expect(name).toHaveCSS('font-size', '16px');
			await name.press('Escape');
			await page.keyboard.press('Control+k');
			const command = page.getByRole('textbox', {
				name: 'Search components, presets, pages, and actions'
			});
			await expect(command).toBeFocused();
			await expect(command).toHaveCSS('font-size', '16px');
			await page.keyboard.press('Escape');
			expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toMatch(
				/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\D|$)/
			);
			expect(paid).toBe(0);
		});

		test('Send and Stop stay reachable with a mocked request on short and narrow touch screens', async ({
			page
		}) => {
			let requests = 0;
			let release = () => {};
			const pending = new Promise((resolve) => {
				release = () => resolve(undefined);
			});
			await page.route('**/tools/api/draw/agent', async (route) => {
				if (route.request().method() === 'GET')
					return route.fulfill({
						json: {
							providers: [
								{
									id: 'cloudflare',
									label: 'Fixture provider',
									model: 'Fixture',
									vision: false,
									configured: true
								}
							]
						}
					});
				requests++;
				await pending;
				await route
					.fulfill({ json: { content: 'Fixture response', toolCalls: [] } })
					.catch(() => {});
			});
			await page.goto('/tools/draw');
			await authenticateTools(page);
			await page.reload();
			await page.getByRole('button', { name: 'Choose drawing mode and tools' }).click();
			await page.getByRole('button', { name: 'Open drawing assistant' }).click();
			const assistant = page.getByRole('region', { name: 'Drawing assistant' });
			const composer = assistant.getByRole('textbox', { name: 'Message drawing assistant' });
			await composer.fill('Describe the visible native shapes.');
			const send = assistant.getByRole('button', { name: 'Send', exact: true });
			await expect(send).toBeEnabled();
			await send.scrollIntoViewIfNeeded();
			await expect(send).toBeInViewport();
			await expect
				.poll(() =>
					send.evaluate((element) => {
						const r = element.getBoundingClientRect();
						return element.contains(
							document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
						);
					})
				)
				.toBe(true);
			await page.screenshot({
				path: `/tmp/draw-mobile-send-${viewport.width}x${viewport.height}.png`
			});
			try {
				await send.click();
				await expect.poll(() => requests).toBe(1);
				const stop = assistant.getByRole('button', { name: 'Stop', exact: true });
				await stop.scrollIntoViewIfNeeded();
				await expect(stop).toBeInViewport();
				await expect
					.poll(() =>
						stop.evaluate((element) => {
							const r = element.getBoundingClientRect();
							return element.contains(
								document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
							);
						})
					)
					.toBe(true);
				await page.screenshot({
					path: `/tmp/draw-mobile-stop-${viewport.width}x${viewport.height}.png`
				});
				await stop.click();
				await expect(stop).toHaveCount(0);
				await expect(assistant).toContainText('Stopped');
				page.once('dialog', (dialog) => dialog.accept());
				await assistant.getByRole('button', { name: 'Clear assistant conversation' }).click();
				await expect(composer).not.toBeFocused();
				expect(requests).toBe(1);
			} finally {
				release();
			}
		});
	});
}
