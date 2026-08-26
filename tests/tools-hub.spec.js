import { expect, test } from '@playwright/test';
import { authenticateTools, TEST_TOOLS_OWNER, TEST_TOOLS_MEMBER } from './helpers/tools-auth.js';

const sampleUsage = {
	assistantTurnsThisHour: 1,
	mediaJobsThisHour: 0,
	estimatedReservedTodayUsd: 0.05
};

test.beforeEach(async ({ page }) => {
	await page.route('**/tools/api/ai/usage', (route) =>
		route.fulfill({ json: { usage: sampleUsage } })
	);
});

for (const tool of ['draw', 'box']) {
	test(`${tool} bookmarks redirect permanently and preserve query and fragment`, async ({
		page
	}) => {
		const oldUrl = `/${tool}?from=bookmark&value=a%2Fb`;
		const canonical = `/tools${oldUrl}`;
		const redirect = await page.request.get(oldUrl, { maxRedirects: 0 });
		expect(redirect.status()).toBe(308);
		expect(redirect.headers().location).toBe(canonical);
		const response = await page.goto(`${oldUrl}#saved`);
		expect(response?.status()).toBe(200);
		expect(response?.headers()['cache-control']).toContain('no-store');
		expect(response?.headers()['x-robots-tag']).toContain('noindex');
		await expect(page).toHaveURL(new RegExp(`/tools/${tool}\\?from=bookmark&value=a%2Fb#saved$`));
		await expect(page.locator('.site-nav-shell')).toHaveCount(0);
		await expect(page.locator('.literary-footer')).toHaveCount(0);
		if (tool === 'draw') await expect(page.locator('.excalidraw')).toBeVisible();
		else await expect(page.getByRole('textbox', { name: 'Write anything' })).toBeVisible();
	});
}

/** @param {import('@playwright/test').Page} page @param {typeof TEST_TOOLS_OWNER} [user] */
async function signIn(page, user = TEST_TOOLS_OWNER) {
	await page.goto('/tools');
	await authenticateTools(page, user);
	await page.reload();
}

test('guest has three working direct links, honest disclosure, and a safe Google continuation', async ({
	page
}) => {
	await page.goto('/tools?next=%2Ftools%2Fdraw&authError=1');
	await expect(page.getByRole('alert')).toContainText('Google sign-in did not finish');
	const cabinet = page.getByRole('navigation', { name: 'Your tools' });
	await expect(cabinet.getByRole('link')).toHaveCount(3);
	await expect(cabinet.getByRole('link', { name: /^Draw/ })).toHaveAttribute('href', '/tools/draw');
	await expect(cabinet.getByRole('link', { name: /^Big text box/ })).toHaveAttribute(
		'href',
		'/tools/box'
	);
	await expect(cabinet.getByRole('link', { name: /^Tool logs/ })).toHaveAttribute(
		'href',
		'/tools/logs'
	);
	await expect(page.getByRole('link', { name: 'Sign in with Google' })).toHaveAttribute(
		'href',
		'/tools/auth/google?next=%2Ftools%2Fdraw'
	);
	await expect(page.getByRole('complementary', { name: 'Usage allowance' })).toContainText(
		'site owner can review usage metadata and account identity'
	);
	await expect(page.getByRole('region', { name: 'Your AI usage' })).toHaveCount(0);
	await cabinet.getByRole('link', { name: /^Big text box/ }).click();
	await expect(page.getByRole('textbox', { name: 'Write anything' })).toBeVisible();
});

test('account disclosure retains identity, dismisses conventionally, and adapts to role changes', async ({
	page
}) => {
	await signIn(page);
	await expect(page.getByRole('navigation', { name: 'Your tools' }).getByRole('link')).toHaveCount(
		5
	);
	const account = page.locator('.account-menu > summary');
	await account.focus();
	await page.keyboard.press('Enter');
	await expect(page.getByText(TEST_TOOLS_OWNER.email, { exact: true })).toBeVisible();
	await page.getByText('Account identity', { exact: true }).click();
	await expect(page.locator('.account-identity')).toContainText(TEST_TOOLS_OWNER.id);
	await page.keyboard.press('Escape');
	await expect(account).toBeFocused();
	await expect(page.getByRole('button', { name: 'Sign out', exact: true })).not.toBeVisible();
	await account.click();
	await page.getByRole('heading', { level: 1 }).click();
	await expect(page.locator('.account-menu')).not.toHaveAttribute('open', '');
	await authenticateTools(page, TEST_TOOLS_MEMBER);
	await page.reload();
	await expect(page.getByRole('navigation', { name: 'Your tools' }).getByRole('link')).toHaveCount(
		3
	);
	await expect(page.getByRole('link', { name: /Podcast studio/ })).toHaveCount(0);
	await account.click();
	await expect(page.getByText(TEST_TOOLS_MEMBER.email, { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await expect(page.getByRole('link', { name: 'Sign in with Google' })).toBeVisible();
});

test('usage loading and failure never masquerade as zero, and browser reload recovers', async ({
	page
}) => {
	/** @type {() => void} */
	let release = () => {};
	const pending = new Promise((resolve) => {
		release = () => resolve(undefined);
	});
	await page.route('**/tools/api/ai/usage', async (route) => {
		await pending;
		await route.fulfill({ status: 503, json: { error: 'unavailable' } });
	});
	await signIn(page, TEST_TOOLS_MEMBER);
	const usage = page.getByRole('region', { name: 'Your AI usage' });
	await expect(usage).toContainText('Loading your usage');
	await expect(usage).not.toContainText('$0.00');
	release();
	await expect(usage).toContainText('temporarily unavailable');
	await expect(usage).not.toContainText('$0.00');
	await page.unroute('**/tools/api/ai/usage');
	await page.route('**/tools/api/ai/usage', (route) =>
		route.fulfill({ json: { usage: sampleUsage } })
	);
	await page.reload();
	await expect(usage).toContainText('$0.05 / $2.00');
});

test('signout shows pending and recoverable failure without hiding the current account', async ({
	page
}) => {
	await signIn(page);
	/** @type {() => void} */
	let release = () => {};
	const pending = new Promise((resolve) => {
		release = () => resolve(undefined);
	});
	await page.route('**/tools/api/session', async (route) => {
		if (route.request().method() !== 'DELETE') return route.continue();
		await pending;
		await route.fulfill({ status: 503 });
	});
	await page.locator('.account-menu > summary').click();
	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Signing out…' })).toBeDisabled();
	release();
	await expect(page.getByRole('alert')).toContainText('Could not sign out');
	await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeEnabled();
	await expect(page.getByText(TEST_TOOLS_OWNER.email, { exact: true })).toBeVisible();
});

/** @type {[string, number, number][]} */
const viewports = [
	['phone', 390, 844],
	['tablet', 834, 1194],
	['split', 720, 900],
	['desktop', 1440, 900]
];
for (const [name, width, height] of viewports) {
	test(`cabinet and expanded controls stay reachable on ${name}`, async ({ page }) => {
		await page.setViewportSize({ width, height });
		await signIn(page, {
			...TEST_TOOLS_OWNER,
			name: 'A very long account display name that should not widen the page',
			email: 'long.account.with.a.very.long.address@example.com'
		});
		const cabinet = page.getByRole('navigation', { name: 'Your tools' });
		await expect(cabinet.getByRole('link')).toHaveCount(5);
		await expect
			.poll(() =>
				cabinet
					.locator('img')
					.evaluateAll((images) =>
						images.every(
							(image) =>
								image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
						)
					)
			)
			.toBe(true);
		const first = await cabinet.getByRole('link').first().boundingBox();
		if (!first) throw new Error('First drawer is missing');
		expect(first.y).toBeLessThan(height - 120);
		if (width === 390) expect(first.y).toBeLessThan(420);
		if (width === 1440) {
			const headingLines = await page
				.getByRole('heading', { level: 1 })
				.evaluate(
					(element) =>
						element.getBoundingClientRect().height /
						parseFloat(getComputedStyle(element).lineHeight)
				);
			expect(headingLines).toBeLessThan(1.2);
		}
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		await page.locator('.account-menu > summary').click();
		await page.getByText('Account identity', { exact: true }).click();
		const panel = await page.locator('.account-panel').boundingBox();
		if (!panel) throw new Error('Account panel is missing');
		expect(panel.x).toBeGreaterThanOrEqual(0);
		expect(panel.x + panel.width).toBeLessThanOrEqual(width);
		await page.keyboard.press('Escape');
		await page.getByText('The rules of the workshop', { exact: true }).click();
		await expect(page.getByRole('complementary', { name: 'Funded AI usage notice' })).toBeVisible();
		await expect(page.locator('.workshop-rules')).toContainText('$20 site-wide guard');
		await expect(page.locator('.workshop-rules')).toContainText('not provider invoices');
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
	});
}
