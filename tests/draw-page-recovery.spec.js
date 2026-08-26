import { expect, test } from '@playwright/test';
import { createDrawingPendingSave, drawingPendingSaveKey } from '../src/lib/draw-pending-save.js';

const userId = '222222222222222222222';
const storageKey = `swyx-excalidraw:google:${userId}`;
const sourceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const destinationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const otherPageId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

/** A real native element; Excalidraw restores and edits this fixture normally. */
function nativeScene(id, color = '#ffc9c9') {
	return {
		elements: [
			{
				id,
				type: 'rectangle',
				x: 300,
				y: 300,
				width: 160,
				height: 100,
				angle: 0,
				strokeColor: '#1e1e1e',
				backgroundColor: color,
				fillStyle: 'solid',
				strokeWidth: 2,
				strokeStyle: 'solid',
				roughness: 0,
				opacity: 100,
				groupIds: [],
				frameId: null,
				roundness: null,
				seed: 1,
				version: 1,
				versionNonce: 1,
				isDeleted: false,
				boundElements: null,
				updated: 1,
				link: null,
				locked: false
			}
		],
		appState: { viewBackgroundColor: '#ffffff', scrollX: 0, scrollY: 0, zoom: { value: 1 } },
		files: {}
	};
}

/** Deterministic cloud transport only; editor, localStorage, and recovery are real. */
/** @param {import('@playwright/test').Page} page */
async function cloudFixture(page) {
	const records = new Map([
		[sourceId, { id: sourceId, name: 'Source page', scene: nativeScene('source-shape') }],
		[
			destinationId,
			{
				id: destinationId,
				name: 'Destination page',
				scene: nativeScene('destination-shape', '#a5d8ff')
			}
		],
		[otherPageId, { id: otherPageId, name: 'Keep this page', scene: nativeScene('other-shape') }]
	]);
	/** @type {{id:string, scene:ReturnType<typeof nativeScene>}[]} */
	const puts = [];
	const deletes = [];
	let deleteAllowed = true;
	let paidRequests = 0;
	await page.route(/\/tools\/api\/draw\/(edit|agent|generate)(?:[/?]|$)/, async (route) => {
		paidRequests++;
		await route.fulfill({
			status: 500,
			json: { error: 'Inference is not part of recovery tests.' }
		});
	});
	await page.route('**/tools/api/session', (route) =>
		route.fulfill({
			json: {
				authenticated: true,
				user: { id: userId, email: 'member@example.com', name: 'Test member', isOwner: false }
			}
		})
	);
	await page.route('**/tools/api/draw/pages**', async (route) => {
		const request = route.request();
		const id = new URL(request.url()).pathname.split('/').at(-1);
		if (id === 'pages') {
			return route.fulfill({
				json: {
					pages: Array.from(records.values(), ({ id, name }) => ({ id, name })),
					activePageId: sourceId
				}
			});
		}
		const record = records.get(id);
		if (!record) return route.fulfill({ status: 404, json: { error: 'Drawing page not found.' } });
		if (request.method() === 'PUT' || request.method() === 'DELETE') {
			expect(request.headers()['x-tools-user']).toBe(userId);
		}
		if (request.method() === 'PUT') {
			const { scene } = request.postDataJSON();
			puts.push({ id, scene });
			record.scene = scene;
			return route.fulfill({ json: { ...record, updatedAt: new Date().toISOString() } });
		}
		if (request.method() === 'DELETE') {
			deletes.push(id);
			if (!deleteAllowed)
				return route.fulfill({ status: 503, json: { error: 'Temporary delete failure' } });
			records.delete(id);
			return route.fulfill({ json: { ok: true, activePageId: sourceId } });
		}
		return route.fulfill({ json: record });
	});
	return {
		puts,
		deletes,
		scene: (id) => records.get(id)?.scene,
		allowDelete: (allowed) => {
			deleteAllowed = allowed;
		},
		paidRequests: () => paidRequests
	};
}

/** @param {import('@playwright/test').Page} page */
async function cachedScene(page) {
	return page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? '{"elements":[]}'),
		storageKey
	);
}

test('successful page deletion removes only its recovery journal, preserving other pages and accounts', async ({
	page
}) => {
	const cloud = await cloudFixture(page);
	const oversizedScene = nativeScene('deleted-unsynced-shape');
	oversizedScene.elements[0].customData = { localRecovery: 'x'.repeat(1_800_001) };
	const deleted = createDrawingPendingSave(storageKey, destinationId, oversizedScene);
	const otherPage = createDrawingPendingSave(storageKey, otherPageId, nativeScene('keep-unsynced'));
	const otherAccount = createDrawingPendingSave(
		'swyx-excalidraw:google:111111111111111111111',
		destinationId,
		nativeScene('private-other-account')
	);
	const entries = [deleted, otherPage, otherAccount].map((record) => [
		drawingPendingSaveKey(record.storageKey, record.pageId),
		JSON.stringify(record)
	]);
	await page.addInitScript((entries) => {
		for (const [key, value] of entries) localStorage.setItem(key, value);
	}, entries);
	await page.goto('/draw');
	const pages = page.getByRole('button', { name: 'Manage drawing pages' });
	await expect(pages).toContainText('Source page');
	await expect.poll(async () => (await cachedScene(page)).elements[0]?.id).toBe('source-shape');
	await pages.click();
	cloud.allowDelete(false);
	await page.getByRole('button', { name: 'Delete Destination page', exact: true }).click();
	await expect.poll(() => cloud.deletes.length).toBe(1);
	expect(await page.evaluate((key) => localStorage.getItem(key), entries[0][0])).toBe(
		entries[0][1]
	);
	await expect(page.getByRole('button', { name: 'Destination page', exact: true })).toBeVisible();

	cloud.allowDelete(true);
	await page.getByRole('button', { name: 'Delete Destination page', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Destination page', exact: true })).toHaveCount(0);
	await expect
		.poll(() => page.evaluate((key) => localStorage.getItem(key), entries[0][0]))
		.toBeNull();
	for (const [key, value] of entries.slice(1)) {
		expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(value);
	}
	expect(cloud.puts.some(({ id }) => id === destinationId)).toBe(false);
	expect(cloud.paidRequests()).toBe(0);
});

test('a failed destination cache write keeps the source page and native scene active for later edits', async ({
	page
}) => {
	const cloud = await cloudFixture(page);
	const destination = structuredClone(cloud.scene(destinationId));
	await page.goto('/draw');
	const pages = page.getByRole('button', { name: 'Manage drawing pages' });
	await expect(pages).toContainText('Source page');
	await expect.poll(async () => (await cachedScene(page)).elements[0]?.id).toBe('source-shape');
	await page.evaluate((key) => {
		const setItem = Storage.prototype.setItem;
		Storage.prototype.setItem = function (itemKey, value) {
			if (this === localStorage && itemKey === key && value.includes('destination-shape')) {
				document.documentElement.dataset.failedDrawingCacheWrite = 'true';
				throw new DOMException('Test destination cache is full.', 'QuotaExceededError');
			}
			return setItem.call(this, itemKey, value);
		};
	}, storageKey);
	await pages.click();
	await page.getByRole('button', { name: 'Destination page', exact: true }).click();
	await expect(page.locator('html')).toHaveAttribute('data-failed-drawing-cache-write', 'true');
	await expect(pages).toContainText('Source page');
	await expect(page.getByRole('button', { name: 'Source page', exact: true })).toHaveAttribute(
		'aria-current',
		'page'
	);
	expect(
		await page.evaluate(
			(key) => JSON.parse(localStorage.getItem(`${key}:pages`)).activePageId,
			storageKey
		)
	).toBe(sourceId);
	await pages.click();

	// A native edit proves the live editor still holds A, not merely an old cached copy.
	await page.getByRole('radio', { name: /^draw$/i }).check({ force: true });
	const canvas = page.locator('canvas.excalidraw__canvas.interactive');
	const bounds = await canvas.boundingBox();
	if (!bounds) throw new Error('Native drawing canvas is unavailable.');
	const x = bounds.x + bounds.width * 0.6;
	const y = bounds.y + bounds.height * 0.6;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + 50, y + 20, { steps: 5 });
	await page.mouse.up();
	await expect
		.poll(async () =>
			(await cachedScene(page)).elements.some((element) => element.type === 'freedraw')
		)
		.toBe(true);
	const edited = await cachedScene(page);
	expect(edited.elements.some((element) => element.id === 'source-shape')).toBe(true);
	expect(edited.elements.some((element) => element.id === 'destination-shape')).toBe(false);
	await expect
		.poll(() =>
			cloud.puts.some(
				({ id, scene }) =>
					id === sourceId && scene.elements.some((element) => element.type === 'freedraw')
			)
		)
		.toBe(true);
	expect(cloud.puts.some(({ id }) => id === destinationId)).toBe(false);
	expect(cloud.scene(destinationId)).toEqual(destination);
	expect(cloud.paidRequests()).toBe(0);
});
