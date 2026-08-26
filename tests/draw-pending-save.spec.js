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
	/** @type {unknown[]} */
	const submittedScenes = [];
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
			const submitted = route.request().postDataJSON().scene;
			expect(submitted).not.toHaveProperty('__swyxDrawingRecovery');
			submittedScenes.push(submitted);
			if (!accept)
				return route.fulfill({
					status: 503,
					json: { error: 'Test cloud temporarily unavailable' }
				});
			scene = submitted;
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
		puts: () => puts,
		submittedScenes: () => submittedScenes
	};
}

test('reload before cloud acknowledgement restores unsynced native artwork and later clears only its pending marker', async ({
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
				(key) => JSON.parse(localStorage.getItem(key) ?? '{}').elements?.length ?? 0,
				recoveryKey
			)
		)
		.toBeGreaterThan(10);
	const pending = await page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
		recoveryKey
	);
	expect(pending.elements.length).toBeGreaterThan(10);
	expect(pending.__swyxDrawingRecovery.revision).toEqual(expect.any(String));
	expect(cloud.cloud().elements).toHaveLength(0);
	await page.reload();
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toContainText(
		'Recovery test'
	);
	await expect
		.poll(() =>
			page.evaluate(
				(key) => JSON.parse(localStorage.getItem(key) ?? '{"elements":[]}').elements.length,
				recoveryKey
			)
		)
		.toBe(pending.elements.length);
	await expect(page.getByRole('region', { name: 'Drawing starting points' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Manage drawing pages' }).click();
	await expect(page.getByText('Recovered unsynced changes from this device.')).toBeVisible();
	cloud.allowSave();
	await page.reload();
	await expect.poll(() => cloud.cloud().elements.length).toBe(pending.elements.length);
	await expect
		.poll(() =>
			page.evaluate(
				(key) => JSON.parse(localStorage.getItem(key) ?? '{}').__swyxDrawingRecovery ?? null,
				recoveryKey
			)
		)
		.toBeNull();
	expect(
		await page.evaluate(
			(key) => JSON.parse(localStorage.getItem(key) ?? '{}').elements.length,
			recoveryKey
		)
	).toBe(pending.elements.length);
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
			(key) => JSON.parse(localStorage.getItem(key) ?? '{}').elements?.length ?? 0,
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
				recoveryKey
			)
		)
		.toBe(offlineCount);
	cloud.setOffline(false);
	cloud.allowSave();
	await page.reload();
	await expect.poll(() => cloud.cloud().elements.length).toBe(offlineCount);
	await expect
		.poll(() =>
			page.evaluate(
				(key) => JSON.parse(localStorage.getItem(key) ?? '{}').__swyxDrawingRecovery ?? null,
				recoveryKey
			)
		)
		.toBeNull();
});

const legacyScene = {
	elements: [
		{
			id: 'legacy-only-shape',
			type: 'rectangle',
			x: 300,
			y: 300,
			width: 160,
			height: 100,
			angle: 0,
			strokeColor: '#1e1e1e',
			backgroundColor: '#ffc9c9',
			fillStyle: 'solid',
			seed: 1,
			isDeleted: false
		}
	],
	appState: { viewBackgroundColor: '#ffffff', scrollX: 0, scrollY: 0, zoom: { value: 1 } },
	files: {}
};

test('a legacy active cache is a local fallback, not authority to overwrite newer cloud artwork', async ({
	page
}) => {
	const cloud = await cloudFixture(page);
	cloud.allowSave();
	await page.addInitScript(
		({ key, pageId, scene }) => {
			localStorage.setItem(key, JSON.stringify(scene));
			localStorage.setItem(`${key}:pages`, JSON.stringify({ activePageId: pageId }));
		},
		{ key: storageKey, pageId, scene: legacyScene }
	);
	await page.goto('/draw');
	await expect(page.locator('.excalidraw')).toBeVisible();
	await expect(page.locator('.draw-canvas')).toHaveAttribute('data-storage-key', recoveryKey);
	await expect(page.locator('.draw-canvas')).toHaveAttribute(
		'data-account-storage-key',
		storageKey
	);
	expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBeNull();
	expect(
		await page.evaluate(
			(key) => JSON.parse(localStorage.getItem(key) ?? '{}').elements,
			recoveryKey
		)
	).toEqual([]);
	expect(JSON.stringify(cloud.submittedScenes())).not.toContain('legacy-only-shape');
});

test('an offline legacy cache normalizes cleanly, then its first real edit becomes recoverable', async ({
	page
}) => {
	const cloud = await cloudFixture(page);
	cloud.setOffline(true);
	await page.addInitScript(
		({ key, pageId, scene }) => {
			if (localStorage.getItem(`${key}:${pageId}`) !== null) return;
			localStorage.setItem(key, JSON.stringify(scene));
			localStorage.setItem(
				`${key}:pages`,
				JSON.stringify({
					pages: [{ id: pageId, name: 'Recovery test' }],
					activePageId: pageId
				})
			);
		},
		{ key: storageKey, pageId, scene: legacyScene }
	);
	await page.goto('/draw');
	await expect(page.locator('.excalidraw')).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(
				(key) => JSON.parse(localStorage.getItem(key) ?? '{}').elements?.[0]?.id,
				recoveryKey
			)
		)
		.toBe('legacy-only-shape');
	await expect
		.poll(() =>
			page.evaluate(
				(key) => JSON.parse(localStorage.getItem(key) ?? '{}').elements?.[0]?.index,
				recoveryKey
			)
		)
		.toEqual(expect.any(String));
	expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBeNull();
	expect(
		await page.evaluate(
			(key) => JSON.parse(localStorage.getItem(key) ?? '{}').__swyxDrawingRecovery ?? null,
			recoveryKey
		)
	).toBeNull();
	expect(cloud.puts()).toBe(0);

	await page.getByRole('radio', { name: /^draw$/i }).check({ force: true });
	const bounds = await page.locator('canvas.excalidraw__canvas.interactive').boundingBox();
	if (!bounds) throw new Error('The native drawing canvas is unavailable.');
	const x = bounds.x + bounds.width * 0.6;
	const y = bounds.y + bounds.height * 0.6;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + 50, y + 20, { steps: 5 });
	await page.mouse.up();
	await expect
		.poll(() =>
			page.evaluate(
				(key) => JSON.parse(localStorage.getItem(key) ?? '{}').__swyxDrawingRecovery?.revision,
				recoveryKey
			)
		)
		.toEqual(expect.any(String));
	const edited = await page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
		recoveryKey
	);
	expect(
		edited.elements.some((/** @type {{ type: string }} */ element) => element.type === 'freedraw')
	).toBe(true);
	await page.reload();
	await expect(page.locator('.excalidraw')).toBeVisible();
	const restored = await page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
		recoveryKey
	);
	// Native restore clears the in-progress stroke endpoint and normalizes empty
	// bindings. All artwork (including every point and its geometry) must survive.
	// Persisting that normalized snapshot may issue a new, still-pending revision.
	expect(restored.elements).toEqual(
		edited.elements.map((/** @type {Record<string, any>} */ element) => ({
			...element,
			boundElements: element.boundElements ?? [],
			...(element.type === 'freedraw' ? { lastCommittedPoint: null } : {})
		}))
	);
	expect(restored.__swyxDrawingRecovery).toEqual({
		storageKey,
		pageId,
		revision: expect.any(String)
	});
	expect(cloud.puts()).toBe(0);
	expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBeNull();
});

test('a full device keeps valid legacy artwork open for export and preserves its source bytes', async ({
	page
}) => {
	const cloud = await cloudFixture(page);
	cloud.setOffline(true);
	const legacyBytes = JSON.stringify(legacyScene);
	await page.addInitScript(
		({ key, pageId, canonical, bytes }) => {
			localStorage.setItem(key, bytes);
			localStorage.setItem(
				`${key}:pages`,
				JSON.stringify({
					pages: [{ id: pageId, name: 'Recovery test' }],
					activePageId: pageId
				})
			);
			const setItem = Storage.prototype.setItem;
			Storage.prototype.setItem = function (
				/** @type {string} */ key,
				/** @type {string} */ value
			) {
				if (this === localStorage && key === canonical)
					throw new DOMException('Test canonical cache is full.', 'QuotaExceededError');
				return setItem.call(this, key, value);
			};
		},
		{ key: storageKey, pageId, canonical: recoveryKey, bytes: legacyBytes }
	);
	await page.goto('/draw');
	await expect(page.locator('.excalidraw')).toBeVisible();
	await expect(page.getByRole('alert')).toContainText(
		'Could not save the latest changes on this device'
	);
	await page.getByRole('button', { name: 'Export drawing', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Creative workspace', exact: true })).toBeVisible();
	expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(legacyBytes);
	expect(await page.evaluate((key) => localStorage.getItem(key), recoveryKey)).toBeNull();
	expect(cloud.puts()).toBe(0);
});

test('a legacy cache from a different remembered page is never imported into the current cloud page', async ({
	page
}) => {
	const cloud = await cloudFixture(page);
	cloud.allowSave();
	const legacyBytes = JSON.stringify(legacyScene);
	await page.addInitScript(
		({ key, bytes }) => {
			localStorage.setItem(key, bytes);
			localStorage.setItem(`${key}:pages`, JSON.stringify({ activePageId: 'another-page' }));
		},
		{ key: storageKey, bytes: legacyBytes }
	);
	await page.goto('/draw');
	await expect(page.locator('.excalidraw')).toBeVisible();
	expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(legacyBytes);
	expect(
		await page.evaluate(
			(key) => JSON.parse(localStorage.getItem(key) ?? '{}').elements,
			recoveryKey
		)
	).toEqual([]);
	expect(JSON.stringify(cloud.submittedScenes())).not.toContain('legacy-only-shape');
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
