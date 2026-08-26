import { expect, test } from '@playwright/test';
import { drawingPendingSaveKey } from '../src/lib/draw-pending-save.js';

const pageId = '33333333-3333-4333-8333-333333333333';
const storageKey = 'swyx-excalidraw:google:222222222222222222222';
const recoveryKey = drawingPendingSaveKey(storageKey, pageId);

/** Deterministic cloud transport; native editor, fonts, localStorage, and journal are real. */
/** @param {import('@playwright/test').Page} page */
async function cloudFixture(page) {
	let accept = false;
	let offline = false;
	let puts = 0;
	let scene = { elements: [], files: {} };
	await page.route('**/tools/api/session', (route) =>
		route.fulfill({
			json: {
				authenticated: true,
				user: {
					id: '222222222222222222222',
					email: 'member@example.com',
					name: 'Test member',
					isOwner: false
				}
			}
		})
	);
	await page.route('**/tools/api/draw/pages**', async (route) => {
		if (offline) return route.fulfill({ status: 503, json: { error: 'Offline fixture' } });
		if (route.request().method() === 'PUT') {
			puts++;
			if (!accept)
				return route.fulfill({
					status: 503,
					json: { error: 'Test cloud temporarily unavailable' }
				});
			scene = route.request().postDataJSON().scene;
			return route.fulfill({
				json: { id: pageId, name: 'Recovery test', updatedAt: new Date().toISOString() }
			});
		}
		return route.fulfill({
			json: route.request().url().endsWith(`/pages/${pageId}`)
				? { id: pageId, name: 'Recovery test', scene }
				: { pages: [{ id: pageId, name: 'Recovery test' }], activePageId: pageId }
		});
	});
	return {
		allowSave: () => {
			accept = true;
		},
		/** @param {boolean} value */
		setOffline: (value) => {
			offline = value;
		},
		cloud: () => scene,
		puts: () => puts
	};
}

test('reload before cloud acknowledgement restores unsynced native artwork and later clears only the saved journal', async ({
	page
}) => {
	const cloud = await cloudFixture(page);
	await page.goto('/draw');
	await page
		.getByRole('region', { name: 'Drawing starting points' })
		.getByRole('button', { name: /^Compare architectures/ })
		.click();
	await expect
		.poll(() =>
			page.evaluate(
				(key) => JSON.parse(localStorage.getItem(key) ?? '{}').scene?.elements.length ?? 0,
				recoveryKey
			)
		)
		.toBeGreaterThan(10);
	const pending = await page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
		recoveryKey
	);
	expect(pending.scene.elements.length).toBeGreaterThan(10);
	expect(cloud.cloud().elements).toHaveLength(0);
	await page.reload();
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toContainText(
		'Recovery test'
	);
	await expect
		.poll(() =>
			page.evaluate(
				(key) => JSON.parse(localStorage.getItem(key) ?? '{"elements":[]}').elements.length,
				storageKey
			)
		)
		.toBe(pending.scene.elements.length);
	await expect(page.getByRole('region', { name: 'Drawing starting points' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Manage drawing pages' }).click();
	await expect(page.getByText('Recovered unsynced changes from this device.')).toBeVisible();
	cloud.allowSave();
	await page.reload();
	await expect.poll(() => cloud.cloud().elements.length).toBe(pending.scene.elements.length);
	await expect
		.poll(() => page.evaluate((key) => localStorage.getItem(key), recoveryKey))
		.toBeNull();
});

test('edits during a cloud outage update recovery and survive later cloud restoration', async ({
	page
}) => {
	const cloud = await cloudFixture(page);
	await page.goto('/draw');
	await page
		.getByRole('region', { name: 'Drawing starting points' })
		.getByRole('button', { name: /^Compare architectures/ })
		.click();
	const count = () =>
		page.evaluate(
			(key) => JSON.parse(localStorage.getItem(key) ?? '{}').scene?.elements.length ?? 0,
			recoveryKey
		);
	await expect.poll(count).toBeGreaterThan(10);
	const originalCount = await count();
	cloud.setOffline(true);
	await page.reload();
	await page.getByRole('button', { name: 'Open drawing templates and library' }).click();
	await page.getByRole('button', { name: 'Insert Claim, evidence, objection preset' }).click();
	await expect.poll(count).toBeGreaterThan(originalCount);
	const offlineCount = await count();
	await page.reload();
	await expect
		.poll(() =>
			page.evaluate(
				(key) => JSON.parse(localStorage.getItem(key) ?? '{"elements":[]}').elements.length,
				storageKey
			)
		)
		.toBe(offlineCount);
	cloud.setOffline(false);
	cloud.allowSave();
	await page.reload();
	await expect.poll(() => cloud.cloud().elements.length).toBe(offlineCount);
	await expect
		.poll(() => page.evaluate((key) => localStorage.getItem(key), recoveryKey))
		.toBeNull();
});

test('corrupt recovery data is not overwritten by an old cloud scene or a blank editor', async ({
	page
}) => {
	const cloud = await cloudFixture(page);
	await page.addInitScript(({ key }) => localStorage.setItem(key, '{partial-recovery'), {
		key: recoveryKey
	});
	await page.goto('/draw');
	await expect(page.getByRole('alert')).toContainText('Could not restore your drawing safely');
	await expect(page.getByRole('region', { name: 'Drawing starting points' })).toHaveCount(0);
	expect(await page.evaluate((key) => localStorage.getItem(key), recoveryKey)).toBe(
		'{partial-recovery'
	);
	expect(cloud.puts()).toBe(0);
});
