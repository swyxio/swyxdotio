import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';
import { authenticateTools } from './helpers/tools-auth.js';
import {
	parseCreativeTranscript,
	chunkCreativeTranscript,
	validateCreativeQuotes
} from '../src/lib/draw-creative-sources.js';

const api = '/tools/api/draw/creative';
const logoPath = fileURLToPath(
	new URL('../static/assets/latent-space-hex-gradient.png', import.meta.url)
);
const logoName = 'latent-space-hex-gradient.png';
const portraitPath = fileURLToPath(new URL('../static/swyx.jpg', import.meta.url));

test.use({ actionTimeout: 15_000 });

/** @param {import('@playwright/test').Page} page */
async function signIn(page) {
	await page.goto('/tools');
	const identity = {
		id: `creative-test-${randomUUID()}`,
		email: 'creative-test@example.com',
		name: 'Creative browser test'
	};
	await authenticateTools(page, identity);
	await page.goto('/draw');
	await expect(page.locator('.draw-canvas')).toHaveAttribute(
		'data-storage-key',
		`swyx-excalidraw:google:${identity.id}`
	);
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toBeVisible();
	return identity;
}

/** @param {import('@playwright/test').Page} page */
async function openWorkspace(page) {
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toBeVisible();
	await expect(page.locator('.excalidraw')).toBeVisible();
	await page.keyboard.press('Control+k');
	const palette = page.getByRole('dialog', { name: 'Workspace commands' });
	await palette
		.getByRole('textbox', { name: 'Search components, presets, pages, and actions' })
		.fill('creative workspace');
	await palette.getByRole('button', { name: /Open assets and creative workspace/ }).click();
	const workspace = page.getByRole('dialog', { name: 'Creative workspace', exact: true });
	await expect(workspace).toBeVisible();
	await expect(workspace.getByText('Loading your private library…')).toHaveCount(0);
	return workspace;
}

/** @param {import('@playwright/test').Page} page @returns {Promise<{elements:any[],files:Record<string,unknown>}>} */
async function scene(page) {
	return page.evaluate(() => {
		const key = document.querySelector('.draw-canvas')?.getAttribute('data-storage-key');
		const saved = JSON.parse((key && localStorage.getItem(key)) || '{"elements":[],"files":{}}');
		return {
			elements: saved.elements.filter((/** @type {any} */ element) => !element.isDeleted),
			files: saved.files
		};
	});
}

/** @param {{elements:any[]}} drawing */
function content(drawing) {
	return drawing.elements.map(({ id, type, x, y, width, height, text, fileId, frameId }) => ({
		id,
		type,
		x,
		y,
		width,
		height,
		text,
		fileId,
		frameId
	}));
}

/** @param {import('@playwright/test').Page} page */
async function preventAi(page) {
	/** @type {string[]} */
	const requests = [];
	await page.route(/\/tools\/api\/draw\/(agent|edit|creative-source)(?:[/?]|$)/, async (route) => {
		if (route.request().method() === 'GET') return route.continue();
		requests.push(new URL(route.request().url()).pathname);
		await route.abort('blockedbyclient');
	});
	return requests;
}

/** @param {import('@playwright/test').Page} page @param {import('@playwright/test').Locator} button */
async function downloaded(page, button) {
	const event = page.waitForEvent('download');
	await button.click();
	const download = await event;
	const path = await download.path();
	if (!path) throw new Error('Expected an actual downloaded file.');
	return { name: download.suggestedFilename(), bytes: await readFile(path) };
}

/** @param {import('@playwright/test').Page} page @param {Buffer} png */
async function cornerAlpha(page, png) {
	return page.evaluate(async (encoded) => {
		const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
		const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Canvas unavailable.');
		context.drawImage(bitmap, 0, 0);
		bitmap.close();
		return context.getImageData(0, 0, 1, 1).data[3];
	}, png.toString('base64'));
}

test('private kits and real assets produce saved variants only on request, then native insertion and export', async ({
	page
}) => {
	test.setTimeout(120_000);
	const aiRequests = await preventAi(page);
	const user = await signIn(page);
	let workspace = await openWorkspace(page);
	await workspace.getByRole('button', { name: 'Compose', exact: true }).click();
	await workspace.getByRole('button', { name: 'Blank 1280 × 720', exact: true }).click();
	await expect(workspace).not.toBeVisible();
	await expect
		.poll(
			async () => (await scene(page)).elements.filter((element) => element.type === 'frame').length
		)
		.toBe(1);
	const baseline = content(await scene(page));
	// The existing canvas saves to cloud on a debounce. Verify durability before
	// this test deliberately reloads; localStorage alone is not cloud-save proof.
	await expect
		.poll(async () => {
			const index = await (await page.request.get('/tools/api/draw/pages')).json();
			if (!index.pages?.[0]) return false;
			const stored = await (
				await page.request.get(`/tools/api/draw/pages/${index.pages[0].id}`)
			).json();
			return (
				stored.scene?.elements?.some(
					(/** @type {{id:string}} */ element) => element.id === baseline[0].id
				) ?? false
			);
		})
		.toBe(true);
	workspace = await openWorkspace(page);

	await test.step('store real logo bytes and associate them with an immutable house revision', async () => {
		await expect(
			workspace.getByText('Private binary storage is not configured yet.', { exact: false })
		).toHaveCount(0);
		await workspace.getByRole('combobox', { name: 'Asset role' }).selectOption('logo');
		await workspace.getByLabel('Save asset', { exact: true }).setInputFiles(logoPath);
		const assetCard = workspace.locator('.asset-grid article').filter({ hasText: logoName });
		await expect(assetCard).toBeVisible();
		await expect
			.poll(() =>
				assetCard
					.getByRole('img', { name: logoName })
					.evaluate((image) => /** @type {HTMLImageElement} */ (image).naturalWidth)
			)
			.toBe(144);
		const original = await downloaded(
			page,
			assetCard.getByRole('button', { name: 'Original', exact: true })
		);
		expect(original.bytes.equals(await readFile(logoPath))).toBe(true);
		// Explicit local test upload of an already-public fixture, never a default user asset.
		await workspace.getByRole('combobox', { name: 'Asset role' }).selectOption('portrait');
		await workspace.getByLabel('Save asset', { exact: true }).setInputFiles(portraitPath);
		await expect(
			workspace.locator('.asset-grid article').filter({ hasText: 'swyx.jpg' })
		).toBeVisible();
		await workspace.getByRole('button', { name: 'Brand kits', exact: true }).click();
		await workspace.getByLabel('Kit name', { exact: true }).fill('Exact episode house');
		await workspace.getByRole('combobox', { name: 'Brand', exact: true }).selectOption('ls');
		await workspace
			.getByLabel('House prompt', { exact: true })
			.fill('PRIVATE HOUSE ONE: Keep one supported idea and complete coverage.');
		await workspace
			.getByRole('group', { name: 'Reusable assets (not automatically inserted)' })
			.getByLabel(logoName, { exact: true })
			.check();
		await workspace.getByRole('button', { name: 'Save new kit', exact: true }).click();
		await expect(workspace.getByRole('status')).toContainText('House revision 1 saved and active');
		await workspace
			.getByLabel('House prompt', { exact: true })
			.fill('PRIVATE HOUSE TWO: Preserve exact logos and editable text.');
		await workspace.getByRole('button', { name: 'Save house revision draft', exact: true }).click();
		await expect(workspace.getByRole('status')).toContainText('House revision 2 saved as a draft');
		const revisionOne = workspace
			.locator('details')
			.filter({ has: page.locator('summary').filter({ hasText: /^Revision 1(?: · active)?$/ }) });
		await expect(revisionOne.locator('summary')).toHaveText('Revision 1 · active');
		await revisionOne.locator('summary').click();
		await expect(revisionOne.locator('pre')).toHaveText(
			'PRIVATE HOUSE ONE: Keep one supported idea and complete coverage.'
		);
		const revisionTwo = workspace
			.locator('details')
			.filter({ has: page.locator('summary').filter({ hasText: /^Revision 2$/ }) });
		await revisionTwo.locator('summary').click();
		await revisionTwo.getByRole('button', { name: 'Use revision 2 as house default' }).click();
		await expect(workspace.getByRole('status')).toContainText(
			'House revision 2 is now the default'
		);
		await expect(revisionOne.locator('pre')).toHaveText(
			'PRIVATE HOUSE ONE: Keep one supported idea and complete coverage.'
		);
	});

	await test.step('reload persisted kit/assets, save a brief, compare four versions without changing artwork', async () => {
		await workspace.getByRole('button', { name: 'Close creative workspace' }).click();
		await page.reload();
		workspace = await openWorkspace(page);
		await expect(
			workspace.locator('.asset-grid article').filter({ hasText: logoName })
		).toBeVisible();
		await workspace.getByRole('button', { name: 'Compose', exact: true }).click();
		await workspace.getByLabel('Brief name', { exact: true }).fill('Source-grounded episode');
		await workspace
			.getByLabel('Video / episode title', { exact: true })
			.fill('An episode title that complements the hook');
		await workspace.getByLabel('Thumbnail hook', { exact: true }).fill('ONE REAL BET');
		await workspace
			.getByRole('combobox', { name: 'House brand kit' })
			.selectOption({ label: 'Exact episode house · house v2' });
		await workspace.getByRole('button', { name: 'Pin house revision', exact: true }).click();
		await expect(workspace).toContainText('Pinned house revision 2');
		await workspace
			.getByRole('group', { name: 'Exact logos', exact: true })
			.getByLabel(logoName, { exact: true })
			.check();
		await workspace
			.getByRole('group', { name: 'Real people / headshots', exact: true })
			.getByLabel('swyx.jpg', { exact: true })
			.check();
		await workspace.getByLabel('Exact display name · swyx.jpg', { exact: true }).fill('Swyx');
		await workspace.getByRole('button', { name: 'Save brief', exact: true }).click();
		await expect(workspace.getByRole('status')).toContainText('Brief saved privately');
		await workspace
			.getByRole('button', { name: 'Create 4 editable layouts · no AI cost', exact: true })
			.click();
		await expect(workspace.getByRole('status')).toContainText(
			'4 editable layouts saved. No image generation ran; the canvas is unchanged.'
		);
		await expect(workspace.locator('.version-grid > button')).toHaveCount(4);
		await expect(workspace.locator('.version-grid svg')).toHaveCount(4);
		await workspace
			.getByRole('heading', { name: 'Keep what works. Try another direction.' })
			.scrollIntoViewIfNeeded();
		await page.screenshot({ path: '/tmp/draw-creative-desktop.png' });
		expect(content(await scene(page))).toEqual(baseline);
		await workspace.getByText('Exact saved prompt', { exact: true }).click();
		await expect(workspace.locator('.version-detail pre')).toContainText('PRIVATE HOUSE TWO:');
		await expect(workspace.locator('.version-detail pre')).not.toContainText('PRIVATE HOUSE ONE:');
		const before = await workspace.locator('.version-grid > .chosen').getAttribute('aria-label');
		if (!before) throw new Error('Expected a labeled chosen version.');
		await workspace.getByRole('button', { name: 'Next →', exact: true }).click();
		await expect(workspace.locator('.version-grid > .chosen')).not.toHaveAttribute(
			'aria-label',
			before
		);
		await workspace
			.getByLabel('Feedback', { exact: true })
			.fill('Keep the exact logo; use a less literal metaphor next time.');
		await workspace.getByRole('combobox', { name: 'Feedback rating' }).selectOption('favorite');
		await workspace.getByRole('button', { name: 'Save feedback', exact: true }).click();
		await expect(workspace.getByRole('status')).toContainText(
			'Feedback saved. House defaults have not changed.'
		);
		await expect(workspace.locator('blockquote')).toContainText('Keep the exact logo');
		expect(content(await scene(page))).toEqual(baseline);
		const persisted = await page.request.get(`${api}/library`, {
			headers: { 'X-Tools-User': user.id }
		});
		expect(persisted.ok()).toBe(true);
		const library = /** @type {import('../src/lib/draw-creative-client').CreativeLibrary} */ (
			await persisted.json()
		);
		expect(library.records.compositions).toHaveLength(4);
		expect(new Set(library.records.compositions.map((item) => item.data.direction)).size).toBe(4);
		expect(
			library.records.compositions.every((item) => item.data.recipe.people[0]?.name === 'Swyx')
		).toBe(true);
		expect(library.records.feedback).toHaveLength(1);
		expect(library.records.kits[0].activeRevision).toBe(2);
	});

	await test.step('insert independent native text/logo layers and export real PNG/transparent/ZIP artifacts', async () => {
		await workspace
			.getByRole('button', { name: 'Insert editable composition', exact: true })
			.click();
		await expect(workspace).not.toBeVisible();
		await expect
			.poll(
				async () =>
					(await scene(page)).elements.filter((element) => element.type === 'frame').length
			)
			.toBe(2);
		const inserted = await scene(page);
		const frame = inserted.elements.find(
			(element) => element.type === 'frame' && element.customData?.creative?.role === 'artboard'
		);
		expect([frame.width, frame.height]).toEqual([1280, 720]);
		const children = inserted.elements.filter((element) => element.frameId === frame.id);
		expect(
			children.filter((element) => element.type === 'text').map((element) => element.originalText)
		).toContain('ONE REAL BET');
		expect(children.filter((element) => element.type === 'image')).toHaveLength(3);
		expect(
			children
				.filter((element) => element.customData?.creative?.role === 'person-name')
				.map((element) => element.originalText)
		).toEqual(['Swyx']);
		expect(
			content(inserted).filter((element) => baseline.some((previous) => previous.id === element.id))
		).toEqual(baseline);
		workspace = await openWorkspace(page);
		await workspace.getByRole('button', { name: 'Export', exact: true }).click();
		const normal = await downloaded(
			page,
			workspace.getByRole('button', { name: 'Download', exact: true })
		);
		expect(normal.name).toMatch(/\.png$/);
		expect([normal.bytes.readUInt32BE(16), normal.bytes.readUInt32BE(20)]).toEqual([1280, 720]);
		expect(await cornerAlpha(page, normal.bytes)).toBe(255);
		await workspace.getByRole('checkbox', { name: 'Transparent background (PNG / SVG)' }).check();
		const transparent = await downloaded(
			page,
			workspace.getByRole('button', { name: 'Download', exact: true })
		);
		expect(await cornerAlpha(page, transparent.bytes)).toBe(0);
		expect(content(await scene(page))).toEqual(content(inserted));
		await workspace.getByRole('combobox', { name: 'Scope', exact: true }).selectOption('campaign');
		const campaign = await downloaded(
			page,
			workspace.getByRole('button', { name: 'Download', exact: true })
		);
		expect(campaign.name).toBe('creative-campaign.zip');
		const archive = unzipSync(campaign.bytes);
		expect(Object.keys(archive).filter((name) => name.endsWith('.png'))).toHaveLength(2);
		expect(Object.keys(archive)).toHaveLength(3);
		const manifest = JSON.parse(new TextDecoder().decode(archive['manifest.json']));
		expect(manifest.files).toHaveLength(2);
		for (const file of manifest.files)
			expect(Object.keys(file).sort()).toEqual(['filename', 'frameId', 'height', 'width']);
		expect(new TextDecoder().decode(archive['manifest.json'])).not.toContain('PRIVATE HOUSE');
		await workspace.getByRole('button', { name: 'Back to canvas', exact: true }).click();
		await page.getByRole('button', { name: 'Undo', exact: true }).click();
		await expect.poll(async () => content(await scene(page))).toEqual(baseline);
		expect(aiRequests).toEqual([]);
	});
});

test('saved thumbnail versions open the shared composer with only explicitly selected references', async ({
	page
}) => {
	const paid = await preventAi(page);
	await signIn(page);
	const workspace = await openWorkspace(page);
	await workspace.getByLabel('Save asset', { exact: true }).setInputFiles(logoPath);
	await expect(workspace.getByRole('img', { name: logoName, exact: true })).toBeVisible();
	await workspace.getByRole('button', { name: 'Compose', exact: true }).click();
	await workspace.getByLabel('Brief name', { exact: true }).fill('Shared generation handoff');
	await workspace.getByLabel('Thumbnail hook', { exact: true }).fill('ONE CLEAR IDEA');
	await workspace
		.getByRole('button', { name: 'Create 4 editable layouts · no AI cost', exact: true })
		.click();
	await workspace.getByRole('button', { name: 'Open in shared Generate', exact: true }).click();
	const panel = page.getByRole('region', { name: 'Selected image tools' });
	const prompt = panel.getByRole('textbox', { name: 'AI image editing prompt' });
	await expect(workspace).not.toBeVisible();
	await expect(prompt).toHaveValue(/ONE CLEAR IDEA/);
	await expect(panel.getByRole('img', { name: 'Reference attached to this draft' })).toHaveCount(0);
	expect(paid).toEqual([]);
	expect((await scene(page)).elements).toEqual([]);

	await page.getByRole('button', { name: 'Open assets and creative workspace' }).click();
	await workspace.getByRole('button', { name: 'Compose', exact: true }).click();
	await workspace
		.getByRole('group', { name: 'References selected for a future model run' })
		.getByLabel(logoName, { exact: true })
		.check();
	await workspace
		.getByRole('button', { name: 'Create 4 editable layouts · no AI cost', exact: true })
		.click();
	page.once('dialog', (dialog) => dialog.accept());
	await workspace.getByRole('button', { name: 'Open in shared Generate', exact: true }).click();
	await expect(panel.getByRole('img', { name: 'Reference attached to this draft' })).toBeVisible();
	await expect(panel).toContainText('not uploaded until Generate');
	expect(paid).toEqual([]);
	expect((await scene(page)).elements).toEqual([]);

	await page.getByRole('button', { name: 'Open assets and creative workspace' }).click();
	await workspace.getByLabel('Save asset', { exact: true }).setInputFiles({
		name: 'second-reference.png',
		mimeType: 'image/png',
		buffer: await readFile(logoPath)
	});
	await expect(
		workspace.getByRole('img', { name: 'second-reference.png', exact: true })
	).toBeVisible();
	await workspace.getByRole('button', { name: 'Compose', exact: true }).click();
	await workspace
		.getByRole('group', { name: 'References selected for a future model run' })
		.getByLabel('second-reference.png', { exact: true })
		.check();
	await workspace
		.getByRole('button', { name: 'Create 4 editable layouts · no AI cost', exact: true })
		.click();
	await workspace.getByRole('button', { name: 'Open in shared Generate', exact: true }).click();
	await expect(workspace.getByRole('alert')).toContainText('currently accepts one reference image');
	await expect(workspace).toBeVisible();
	expect(paid).toEqual([]);
});

test('guest workspace does not request an account library and blank insertion is explicit and undoable', async ({
	page
}) => {
	const aiRequests = await preventAi(page);
	/** @type {string[]} */
	const privateRequests = [];
	page.on('request', (request) => {
		if (new URL(request.url()).pathname.startsWith(`${api}/`)) privateRequests.push(request.url());
	});
	await page.goto('/draw');
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toBeVisible();
	const before = content(await scene(page));
	const workspace = await openWorkspace(page);
	await expect(workspace.getByRole('link', { name: 'Sign in with Google' })).toHaveAttribute(
		'href',
		'/tools?next=/draw'
	);
	await expect(workspace.getByText('Guest · canvas tools remain available')).toBeVisible();
	await workspace.getByRole('button', { name: 'Brand kits', exact: true }).click();
	await expect(workspace.getByLabel('House prompt', { exact: true })).toHaveCount(0);
	await workspace.getByRole('button', { name: 'Versions', exact: true }).click();
	expect(content(await scene(page))).toEqual(before);
	expect(privateRequests).toEqual([]);
	await workspace.getByRole('button', { name: 'Create blank 1280 × 720', exact: true }).click();
	await expect(workspace).not.toBeVisible();
	await expect
		.poll(
			async () => (await scene(page)).elements.filter((element) => element.type === 'frame').length
		)
		.toBe(1);
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await expect.poll(async () => content(await scene(page))).toEqual(before);
	expect(aiRequests).toEqual([]);
});

test('390px creative workspace keeps forms, navigation, and dismiss controls inside the viewport', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await preventAi(page);
	await signIn(page);
	const workspace = await openWorkspace(page);
	for (const section of ['Assets', 'Brand kits', 'Sources', 'Compose', 'Versions', 'Export']) {
		await workspace.getByRole('button', { name: section, exact: true }).click();
		const bounds = await workspace.boundingBox();
		if (!bounds) throw new Error('Expected a visible workspace rectangle.');
		expect(bounds.x).toBeGreaterThanOrEqual(0);
		expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
		await expect(
			workspace.getByRole('button', { name: 'Close creative workspace' })
		).toBeInViewport();
		await expect(
			workspace.getByRole('button', { name: 'Back to canvas', exact: true })
		).toBeInViewport();
		if (section === 'Brand kits') await page.screenshot({ path: '/tmp/draw-creative-mobile.png' });
		const widths = await workspace
			.locator('main')
			.evaluate((main) => ({ scroll: main.scrollWidth, client: main.clientWidth }));
		expect(
			widths.scroll,
			`${section} must not horizontally overflow its main scrolling surface`
		).toBeLessThanOrEqual(widths.client + 1);
		if (section === 'Compose') {
			await workspace.getByLabel('Thumbnail hook', { exact: true }).fill('A PHONE-SIZE HOOK');
			await expect(
				workspace.getByRole('button', {
					name: 'Create 4 editable layouts · no AI cost',
					exact: true
				})
			).toBeEnabled();
		}
	}
	await page.keyboard.press('Escape');
	await expect(workspace).not.toBeVisible();
	await expect(page.getByRole('button', { name: 'Manage drawing pages' })).toBeVisible();
});

test('source workflow saves exact evidence, resumes bounded extraction, retains drafts, and saves channel URLs without lookup', async ({
	page
}) => {
	test.setTimeout(120_000);
	const unexpectedAi = await preventAi(page);
	/** @type {string[]} */
	const browserErrors = [];
	page.on('pageerror', (error) => browserErrors.push(error.message));
	/** @type {Array<Record<string, any>>} */
	const sourceRequests = [];
	/** @type {string[]} */
	const videoRequests = [];
	page.on('request', (request) => {
		const host = new URL(request.url()).hostname;
		if (/(^|\.)(youtube\.com|youtu\.be|ytimg\.com|googlevideo\.com)$/.test(host))
			videoRequests.push(request.url());
	});
	// Only editorial provider output is mocked. Every save below reaches the real local
	// account-scoped Durable Object; no paid AI or YouTube request can escape this route.
	await page.route('**/tools/api/draw/creative-source', async (route) => {
		const body = route.request().postDataJSON();
		sourceRequests.push(body);
		const source = parseCreativeTranscript(body.sourceText);
		const chunks = chunkCreativeTranscript(source);
		if (body.action === 'analyze') {
			const chunk = chunks[body.chunkIndex];
			const quotes =
				body.chunkIndex === 0
					? validateCreativeQuotes(
							[{ segmentId: chunk.segments[0].id, text: chunk.segments[0].text }],
							source,
							[chunk]
						)
					: [];
			await route.fulfill({
				json: {
					quotes,
					chunkIndex: chunk.index,
					coverage: {
						status: chunks.length === 1 ? 'complete' : 'partial',
						analyzedChunks: 1,
						totalChunks: chunks.length,
						startOffset: chunk.startOffset,
						endOffset: chunk.endOffset
					},
					model: 'mock-editorial-test',
					estimatedCostUsd: 0.05,
					costBasis: 'reservation',
					reviewRequired: true
				}
			});
			return;
		}
		if (body.action === 'titles') {
			await route.fulfill({
				json: {
					titles: [
						{
							id: 't0',
							title: 'Why reliable agents need explicit checkpoints',
							hook: 'INSPECT EVERY STEP',
							evidenceIds: body.evidence.map((/** @type {{id:string}} */ quote) => quote.id),
							provenance: 'generated',
							reviewRequired: true
						}
					],
					directions: [],
					coverage: { status: 'evidence-only', evidenceCount: body.evidence.length },
					model: 'mock-editorial-test',
					estimatedCostUsd: 0.05,
					costBasis: 'reservation',
					reviewRequired: true
				}
			});
			return;
		}
		await route.abort('blockedbyclient');
	});
	const user = await signIn(page);
	const before = content(await scene(page));
	let workspace = await openWorkspace(page);
	await workspace.getByRole('button', { name: 'Sources', exact: true }).click();
	const transcript = `WEBVTT\n\n00:01.000 --> 00:04.000\n<v Alice>Reliable agents need explicit checkpoints.</v>\n\n00:04.000 --> 00:08.000\n<v Bob>Small workflows are easier to inspect.</v>\n\n00:08.000 --> 00:40.000\n${'Context only. '.repeat(1050)}`;
	const chunks = chunkCreativeTranscript(parseCreativeTranscript(transcript));
	expect(chunks).toHaveLength(2);
	const [expectedQuote] = validateCreativeQuotes(
		[{ segmentId: chunks[0].segments[0].id, text: chunks[0].segments[0].text }],
		parseCreativeTranscript(transcript),
		[chunks[0]]
	);
	const readLibrary = async () => {
		const response = await page.request.get(`${api}/library`, {
			headers: { 'X-Tools-User': user.id }
		});
		expect(response.ok()).toBe(true);
		return response.json();
	};

	await test.step('typing and closing preserve a draft without extraction or canvas changes', async () => {
		await workspace.getByLabel('Brief name', { exact: true }).fill('Source editorial test');
		await workspace
			.getByLabel('Video / episode title', { exact: true })
			.fill('The original episode title');
		await workspace
			.getByLabel('Hints & constraints', { exact: true })
			.fill('Use only supported claims; keep Alice’s supplied name.');
		await workspace
			.getByLabel('Source video URL (including unlisted)', { exact: true })
			.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		await workspace.getByLabel('Transcript', { exact: true }).fill(transcript);
		await expect(workspace.getByRole('combobox', { name: 'Maximum chunks this run' })).toHaveValue(
			'4'
		);
		await workspace.getByRole('button', { name: 'Close creative workspace' }).click();
		workspace = await openWorkspace(page);
		await workspace.getByRole('button', { name: 'Sources', exact: true }).click();
		await expect(workspace.getByLabel('Transcript', { exact: true })).toHaveValue(transcript);
		await expect(workspace.getByLabel('Video / episode title', { exact: true })).toHaveValue(
			'The original episode title'
		);
		expect(sourceRequests).toEqual([]);
		await workspace.getByRole('button', { name: 'Save brief', exact: true }).click();
		await expect(workspace.getByRole('status')).toContainText('Brief saved privately');
		const stored = await readLibrary();
		expect(stored.records.briefs[0].data.transcript).toBe(transcript);
		expect(stored.records.briefs[0].data.analysis).toBeUndefined();
		expect(content(await scene(page))).toEqual(before);
	});

	await test.step('one explicit chunk persists partial coverage and exact unselected quotes', async () => {
		await workspace.getByRole('combobox', { name: 'Maximum chunks this run' }).selectOption('1');
		await expect(workspace).toContainText('This click: up to 1 requests · $0.05 reserved');
		await workspace.getByRole('button', { name: 'Extract quotes', exact: true }).click();
		await expect(workspace.getByRole('status')).toContainText('Evidence saved: 1/2 chunks');
		expect(sourceRequests.map((request) => [request.action, request.chunkIndex])).toEqual([
			['analyze', 0]
		]);
		const selected = workspace.getByRole('checkbox', {
			name: `Use quote ${expectedQuote.id} for titles`,
			exact: true
		});
		await expect(selected).not.toBeChecked();
		await expect(
			workspace.getByRole('button', { name: 'Suggest titles from selected quotes', exact: true })
		).toBeDisabled();
		await workspace.locator('summary').filter({ hasText: expectedQuote.text }).click();
		await expect(workspace).toContainText('Supplied speaker: Alice.');
		await expect(workspace).toContainText(
			`exact character span ${expectedQuote.startOffset}–${expectedQuote.endOffset}`
		);
		await expect(workspace).toContainText('00:00:01–00:00:04');
		const stored = await readLibrary();
		const analysis = stored.records.briefs[0].data.analysis;
		expect(analysis.quotes).toEqual([expectedQuote]);
		expect(analysis.chunks.map((/** @type {{status:string}} */ chunk) => chunk.status)).toEqual([
			'succeeded',
			'pending'
		]);
		expect(analysis.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
	});

	await test.step('reload resumes only pending chunks and selected evidence produces separate generated title options', async () => {
		await workspace.getByRole('button', { name: 'Close creative workspace' }).click();
		await page.reload();
		workspace = await openWorkspace(page);
		await workspace.getByRole('button', { name: 'Sources', exact: true }).click();
		await workspace
			.locator('aside')
			.getByRole('button', { name: /Source editorial test/ })
			.click();
		expect(browserErrors).toEqual([]);
		await expect(workspace).toContainText('Coverage: 1/2 chunks · partial');
		await workspace.getByRole('button', { name: 'Run next evidence batch', exact: true }).click();
		await expect(workspace.getByRole('status')).toContainText('Evidence saved: 2/2 chunks');
		expect(sourceRequests.map((request) => [request.action, request.chunkIndex])).toEqual([
			['analyze', 0],
			['analyze', 1]
		]);
		await workspace
			.getByRole('checkbox', { name: `Use quote ${expectedQuote.id} for titles`, exact: true })
			.check();
		await workspace
			.getByRole('button', { name: 'Suggest titles from selected quotes', exact: true })
			.click();
		await expect(workspace.locator('.title-option')).toHaveCount(1);
		await expect(workspace.locator('.title-option')).toContainText('Generated copy');
		await expect(workspace.locator('.title-option')).toContainText('Not a spoken quote.');
		await expect(workspace.locator('.title-option')).toContainText(expectedQuote.id);
		expect(sourceRequests[2].action).toBe('titles');
		expect(sourceRequests[2].evidence).toEqual([expectedQuote]);
		await workspace
			.getByRole('button', { name: 'Suggest titles from selected quotes', exact: true })
			.click();
		await expect(workspace.locator('.title-option')).toHaveCount(2);
		const saved = (await readLibrary()).records.briefs[0].data;
		expect(saved.analysis.titles).toHaveLength(2);
		expect(
			new Set(saved.analysis.titles.map((/** @type {{id:string}} */ title) => title.id)).size
		).toBe(2);
		expect(
			saved.analysis.titles.every(
				(/** @type {{provenance:string}} */ title) => title.provenance === 'generated'
			)
		).toBe(true);
		expect(saved.analysis.selectedQuoteIds).toEqual([expectedQuote.id]);
		await workspace.locator('.title-option').first().scrollIntoViewIfNeeded();
		await page.screenshot({ path: '/tmp/draw-creative-sources.png' });
		await workspace.getByRole('button', { name: 'Close creative workspace' }).click();
		workspace = await openWorkspace(page);
		await workspace.getByRole('button', { name: 'Sources', exact: true }).click();
		await expect(workspace.locator('.title-option')).toHaveCount(2);
		await expect(
			workspace.getByRole('checkbox', {
				name: `Use quote ${expectedQuote.id} for titles`,
				exact: true
			})
		).toBeChecked();
	});

	await test.step('changed source clears stale evidence and URL-only channel saving has no provider request', async () => {
		await workspace
			.getByLabel('Transcript', { exact: true })
			.fill('Alice: A different source must be reviewed independently.');
		await expect(workspace.locator('.title-option')).toHaveCount(0);
		await expect(
			workspace.getByRole('checkbox', {
				name: `Use quote ${expectedQuote.id} for titles`,
				exact: true
			})
		).toHaveCount(0);
		await expect(workspace).toContainText('Coverage: 0/1 chunks · partial');
		await expect(
			workspace.getByRole('button', { name: 'Suggest titles from selected quotes', exact: true })
		).toBeDisabled();
		await workspace.getByRole('button', { name: 'Save brief', exact: true }).click();
		await expect(workspace.getByRole('status')).toContainText('Brief saved privately');
		expect((await readLibrary()).records.briefs[0].data.analysis).toBeUndefined();
		await workspace.getByText('Saved channel references', { exact: true }).click();
		await workspace.getByLabel('YouTube channel', { exact: true }).fill('@LatentSpace');
		const requestsBefore = sourceRequests.length;
		await workspace.getByRole('button', { name: 'Save URL only · no lookup', exact: true }).click();
		await expect(workspace.getByRole('status')).toContainText('Channel URL saved without lookup');
		const stored = await readLibrary();
		expect(stored.records.channels).toHaveLength(1);
		expect(stored.records.channels[0].data.url).toBe('https://www.youtube.com/@LatentSpace');
		expect(stored.records.channels[0].data.references).toEqual([]);
		expect(sourceRequests).toHaveLength(requestsBefore);
		expect(videoRequests).toEqual([]);
		expect(unexpectedAi).toEqual([]);
		expect(browserErrors).toEqual([]);
		expect(content(await scene(page))).toEqual(before);
	});
});
