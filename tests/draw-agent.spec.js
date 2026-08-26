import { expect, test } from '@playwright/test';

/** @param {import('@playwright/test').Page} page */
async function authenticate(page) {
	const origin = new URL(page.url()).origin;
	const response = await page.request.post(`${origin}/tools/api/session`, {
		headers: { Origin: origin },
		data: { password: 'draw-test-password' }
	});
	expect(response.ok()).toBe(true);
	await page.reload();
}

test('drawing assistant and model endpoint require the existing private tools session', async ({
	page
}) => {
	await page.goto('/draw');
	await page.getByRole('button', { name: 'Open drawing assistant' }).click();
	await expect(page.getByRole('link', { name: 'Sign in to use the assistant' })).toHaveAttribute(
		'href',
		'/tools?next=/draw'
	);
	const response = await page.request.post('/tools/api/draw/agent', {
		headers: { Origin: new URL(page.url()).origin },
		data: { messages: [{ role: 'user', content: 'Read private drawing' }] }
	});
	expect(response.status()).toBe(401);
	expect(response.headers()['cache-control']).toContain('no-store');
});

test('authenticated floating assistant uses viewport vision, sandboxed commands, undo, and drawing-local history', async ({
	page
}) => {
	await page.goto('/draw');
	await authenticate(page);
	/** @type {any[]} */
	const requests = [];
	await page.route('**/tools/api/draw/agent', async (route) => {
		requests.push(route.request().postDataJSON());
		await route.fulfill({
			json:
				requests.length === 1
					? {
							content: '',
							budget: 'signed-first-round',
							spendingUsd: 0.0004,
							toolCalls: [
								{
									id: 'call_draw',
									type: 'function',
									function: {
										name: 'canvas_bash',
										arguments: JSON.stringify({
											command:
												'draw add \'{"type":"rectangle","x":120,"y":160,"width":220,"height":110,"backgroundColor":"#dbeafa"}\''
										})
									}
								}
							]
						}
					: {
							content: 'Added a blue rectangle and checked the visible canvas.',
							toolCalls: [],
							budget: 'signed-second-round',
							spendingUsd: 0.0008
						}
		});
	});

	await page.getByRole('button', { name: 'Open drawing assistant' }).click();
	const assistant = page.getByRole('region', { name: 'Drawing assistant' });
	await expect(assistant).toBeVisible();
	await expect(assistant).toContainText('screenshots are sent to Cloudflare AI');
	await expect(assistant.getByRole('combobox', { name: 'Assistant spending limit' })).toHaveValue(
		'1'
	);
	const composer = page.getByRole('textbox', { name: 'Message drawing assistant' });
	await composer.fill('Add a blue rectangle');
	await composer.press('Control+Enter');
	await expect(assistant).toContainText('Added a blue rectangle and checked the visible canvas.', {
		timeout: 20_000
	});
	expect(requests).toHaveLength(2);
	expect(requests[0].budgetCap).toBe(1);
	expect(requests[1].budget).toBe('signed-first-round');
	await expect(assistant).toContainText('$0.0008 used');
	expect(requests[0].screenshot).toMatch(/^data:image\/webp;base64,/);
	expect(requests[1].messages.some((/** @type {any} */ message) => message.role === 'tool')).toBe(
		true
	);
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene = /** @type {{ elements: any[] }} */ (
					JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
				);
				return scene.elements.some(
					(/** @type {any} */ element) => element.type === 'rectangle' && element.width === 220
				);
			})
		)
		.toBe(true);
	const addedElementId = await page.evaluate(() => {
		const scene = JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}');
		return scene.elements.findLast(
			(/** @type {any} */ element) => element.type === 'rectangle' && element.width === 220
		)?.id;
	});
	expect(addedElementId).toBeTruthy();
	const history = await page.evaluate(() => {
		const key = Object.keys(localStorage).find((entry) =>
			entry.startsWith('swyx-excalidraw:assistant:')
		);
		return key ? (localStorage.getItem(key) ?? '') : '';
	});
	expect(history).toContain('Add a blue rectangle');
	expect(history).toContain('draw add');
	expect(history).not.toContain('data:image/');
	expect(history).not.toContain('signed-first-round');

	await assistant.getByRole('button', { name: 'Minimize drawing assistant' }).click();
	await expect(page.getByRole('button', { name: 'Open drawing assistant' })).toBeVisible();
	await page.keyboard.press('Control+j');
	await expect(assistant).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('button', { name: 'Open drawing assistant' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
	await page.getByRole('button', { name: 'Undo' }).click();
	await expect
		.poll(() =>
			page.evaluate((expectedId) => {
				const scene = JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}');
				return scene.elements.some(
					(/** @type {any} */ element) => element.id === expectedId && !element.isDeleted
				);
			}, addedElementId)
		)
		.toBe(false);
	await page.reload();
	await page.getByRole('button', { name: 'Open drawing assistant' }).click();
	await expect(page.getByRole('region', { name: 'Drawing assistant' })).toContainText(
		'Added a blue rectangle'
	);
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Clear assistant conversation' }).click();
	await expect(page.getByRole('region', { name: 'Drawing assistant' })).toContainText(
		'What should we draw?'
	);
	expect(
		await page.evaluate(() =>
			Object.keys(localStorage).some((key) => key.startsWith('swyx-excalidraw:assistant:'))
		)
	).toBe(false);
});

test('essay workflows prepare requests, protect drafts and preserve bound copies through the real command bridge', async ({
	page
}) => {
	await page.goto('/draw');
	await authenticate(page);
	await page.getByRole('checkbox', { name: 'Library' }).check({ force: true });
	await page.getByRole('tab', { name: 'Templates, components, and memes' }).click();
	await page.getByRole('button', { name: 'Insert Claim, evidence, objection preset' }).click();
	/** @returns {Promise<{ elements: any[] }>} */
	const readScene = () =>
		page.evaluate(() => JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}'));
	await expect.poll(async () => (await readScene()).elements.length).toBeGreaterThan(8);
	const before = (await readScene()).elements;
	let calls = 0;
	await page.route('**/tools/api/draw/agent', async (route) => {
		calls++;
		await route.fulfill({
			json:
				calls === 1
					? {
							content: '',
							toolCalls: [
								{
									id: 'duplicate_figure',
									type: 'function',
									function: {
										name: 'canvas_bash',
										arguments: JSON.stringify({ command: 'draw duplicate --dx 1300 --dy 0' })
									}
								}
							]
						}
					: { content: 'The editable copy is ready for review.', toolCalls: [] }
		});
	});
	await page.getByRole('button', { name: 'Notes → diagram', exact: true }).click();
	const assistant = page.getByRole('region', { name: 'Drawing assistant' });
	const composer = assistant.getByRole('textbox', { name: 'Message drawing assistant' });
	await expect(composer).toHaveValue(/My notes:/);
	await composer.fill('My original essay notes must remain intact.');
	await assistant.getByRole('button', { name: 'Try Make this essay-ready workflow' }).click();
	await expect(composer).toHaveValue('My original essay notes must remain intact.');
	await assistant.getByRole('button', { name: 'Keep draft', exact: true }).click();
	await assistant.getByRole('button', { name: 'Try Make this essay-ready workflow' }).click();
	await assistant.getByRole('button', { name: 'Use suggestion instead' }).click();
	await expect(composer).toHaveValue(/Duplicate the selected figure/);
	expect(calls).toBe(0);
	await assistant.getByRole('button', { name: 'Send', exact: true }).click();
	await expect(assistant).toContainText('The editable copy is ready for review.', {
		timeout: 20000
	});
	const after = (await readScene()).elements;
	for (const original of before)
		expect(after.find((element) => element.id === original.id)).toEqual(original);
	const originalIds = new Set(before.map((element) => element.id));
	const copies = after.filter((element) => !originalIds.has(element.id));
	const copyIds = new Set(copies.map((element) => element.id));
	expect(copies.length).toBe(before.length);
	for (const edge of copies.filter((element) => element.type === 'arrow')) {
		expect(copyIds.has(edge.startBinding.elementId)).toBe(true);
		expect(copyIds.has(edge.endBinding.elementId)).toBe(true);
	}
	for (const label of copies.filter((element) => element.type === 'text' && element.containerId)) {
		expect(copyIds.has(label.containerId)).toBe(true);
	}
	await assistant.getByRole('button', { name: 'Minimize drawing assistant' }).click();
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await expect
		.poll(async () => (await readScene()).elements.filter((element) => !element.isDeleted).length)
		.toBe(before.length);
});

test('assistant retries the last request after a temporary authenticated model failure', async ({
	page
}) => {
	await page.goto('/draw');
	await authenticate(page);
	let attempts = 0;
	await page.route('**/tools/api/draw/agent', async (route) => {
		attempts++;
		await route.fulfill(
			attempts === 1
				? { status: 502, json: { error: 'The drawing assistant could not complete this step.' } }
				: { json: { content: 'Recovered and reviewed the canvas.', toolCalls: [] } }
		);
	});
	await page.getByRole('button', { name: 'Open drawing assistant' }).click();
	await page.getByRole('textbox', { name: 'Message drawing assistant' }).fill('Check the diagram');
	await page.getByRole('button', { name: 'Send' }).click();
	const assistant = page.getByRole('region', { name: 'Drawing assistant' });
	await expect(assistant).toContainText('could not complete this step');
	await assistant.getByRole('button', { name: 'Retry' }).click();
	await expect(assistant).toContainText('Recovered and reviewed the canvas.');
	expect(attempts).toBe(2);
});

test('assistant sandbox cannot execute network, JavaScript, or host-shell commands', async ({
	page
}) => {
	await page.goto('/draw');
	await authenticate(page);
	/** @type {any[]} */
	const requests = [];
	await page.route('**/tools/api/draw/agent', async (route) => {
		requests.push(route.request().postDataJSON());
		await route.fulfill({
			json:
				requests.length === 1
					? {
							content: '',
							toolCalls: [
								{
									id: 'call_isolation',
									type: 'function',
									function: {
										name: 'canvas_bash',
										arguments: JSON.stringify({ command: 'curl https://example.com' })
									}
								}
							]
						}
					: {
							content: 'Network access is unavailable in the local drawing sandbox.',
							toolCalls: []
						}
		});
	});
	await page.getByRole('button', { name: 'Open drawing assistant' }).click();
	await page
		.getByRole('textbox', { name: 'Message drawing assistant' })
		.fill('Check sandbox isolation');
	await page.getByRole('button', { name: 'Send' }).click();
	await expect(page.getByRole('region', { name: 'Drawing assistant' })).toContainText(
		'Network access is unavailable',
		{ timeout: 20_000 }
	);
	const toolResult = requests[1].messages.find(
		(/** @type {any} */ message) => message.role === 'tool'
	);
	expect(JSON.parse(toolResult.content).stderr).toMatch(/not found|unknown command/i);
});

test('assistant arranges shapes and connects them with native Excalidraw arrow bindings', async ({
	page
}) => {
	await page.goto('/draw');
	await authenticate(page);
	const markerColor = `#${crypto.randomUUID().replaceAll('-', '').slice(0, 6)}`;
	let round = 0;
	await page.route('**/tools/api/draw/agent', async (route) => {
		round++;
		const script =
			round === 1
				? `draw add '[{"type":"rectangle","x":100,"y":140,"width":110,"height":65,"strokeColor":"${markerColor}"},{"type":"rectangle","x":330,"y":190,"width":110,"height":65,"strokeColor":"${markerColor}"}]' && draw align top`
				: `ids=$(draw list --selected); first=$(echo "$ids" | jq -r '.[0].id'); second=$(echo "$ids" | jq -r '.[1].id'); draw connect "$first" "$second" --label next`;
		await route.fulfill({
			json:
				round <= 2
					? {
							content: '',
							toolCalls: [
								{
									id: `call_${round}`,
									type: 'function',
									function: { name: 'canvas_bash', arguments: JSON.stringify({ command: script }) }
								}
							]
						}
					: { content: 'Aligned the shapes and connected them.', toolCalls: [] }
		});
	});
	await page.getByRole('button', { name: 'Open drawing assistant' }).click();
	await page
		.getByRole('textbox', { name: 'Message drawing assistant' })
		.fill('Draw a connected diagram');
	await page.getByRole('button', { name: 'Send' }).click();
	await expect(page.getByRole('region', { name: 'Drawing assistant' })).toContainText(
		'Aligned the shapes and connected them.',
		{ timeout: 20_000 }
	);
	await expect
		.poll(() =>
			page.evaluate((color) => {
				const scene = /** @type {{ elements: any[] }} */ (
					JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
				);
				const rectangles = scene.elements.filter(
					(element) =>
						element.type === 'rectangle' &&
						element.width === 110 &&
						element.height === 65 &&
						element.strokeColor === color &&
						!element.isDeleted
				);
				const connector = scene.elements.find(
					(element) => element.type === 'arrow' && !element.isDeleted
				);
				return {
					y: rectangles.map((element) => element.y),
					start: connector?.startBinding?.elementId,
					end: connector?.endBinding?.elementId,
					ids: rectangles.map((element) => element.id)
				};
			}, markerColor)
		)
		.toMatchObject({ y: [140, 140] });
	const scene = /** @type {{ elements: any[] }} */ (
		await page.evaluate(() =>
			JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[]}')
		)
	);
	const rectangles = scene.elements.filter(
		(element) =>
			element.type === 'rectangle' &&
			element.width === 110 &&
			element.height === 65 &&
			element.strokeColor === markerColor &&
			!element.isDeleted
	);
	const connector = scene.elements.find(
		(element) =>
			element.type === 'arrow' &&
			element.startBinding?.elementId === rectangles[0].id &&
			!element.isDeleted
	);
	expect(
		connector,
		JSON.stringify({
			rectangles,
			arrows: scene.elements.filter((element) => element.type === 'arrow')
		})
	).toBeTruthy();
	expect(connector.startBinding.elementId).toBe(rectangles[0].id);
	expect(connector.endBinding.elementId).toBe(rectangles[1].id);
	expect(scene.elements.some((element) => element.type === 'text' && element.text === 'next')).toBe(
		true
	);
});
