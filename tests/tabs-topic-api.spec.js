import { expect, test } from '@playwright/test';
import { authenticateTools, TEST_TOOLS_OWNER } from './helpers/tools-auth.js';

test.use({ baseURL: process.env.TABS_TEST_BASE_URL || 'http://127.0.0.1:4173' });

test('topic edits are private, batch-scoped, validated, and preserve other changes', async ({
	page
}) => {
	const suffix = crypto.randomUUID();
	const url = `https://example.test/${suffix}`;
	const tabs = [{ title: 'An interesting page', url }];
	const guest = await page.request.patch('/tools/tabs/api/batches/missing/items/missing', {
		data: { topic: 'A topic' }
	});
	expect(guest.status()).toBe(401);
	await page.goto('/tools');
	const origin = await authenticateTools(page);
	const headers = { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id };
	/** @param {string} name */
	const createBatch = async (name) => {
		const response = await page.request.post('/tools/tabs/api/batches', {
			headers,
			data: { name, tabs }
		});
		expect(response.status()).toBe(201);
		return (await response.json()).batch;
	};
	const first = await createBatch(`Topics one ${suffix}`);
	const second = await createBatch(`Topics two ${suffix}`);
	/** @param {{id: string}} batch */
	const readBatch = async (batch) => {
		const response = await page.request.get(`/tools/tabs/api/batches/${batch.id}`, { headers });
		expect(response.status()).toBe(200);
		return response.json();
	};
	const firstItem = (await readBatch(first)).items[0];
	const secondItem = (await readBatch(second)).items[0];
	expect(firstItem.id).toBe(secondItem.id);
	const path = `/tools/tabs/api/batches/${first.id}/items/${firstItem.id}`;

	const before = await page.request.patch(path, {
		headers,
		data: { status: 'followup', note: 'Keep this note' }
	});
	expect(before.status()).toBe(200);
	const updated = await page.request.patch(path, {
		headers,
		data: { topic: '  Cats & behavior  ', expectedTopic: firstItem.group }
	});
	expect(updated.status()).toBe(200);
	expect(await updated.json()).toMatchObject({
		topic: 'Cats & behavior',
		status: 'followup',
		note: 'Keep this note'
	});
	expect((await readBatch(first)).items[0]).toMatchObject({
		group: 'Cats & behavior',
		status: 'followup',
		note: 'Keep this note',
		url
	});
	expect((await readBatch(second)).items[0]).toMatchObject({
		group: secondItem.group,
		status: 'unread',
		note: ''
	});

	const stale = await page.request.patch(path, {
		headers,
		data: { topic: 'Old regroup', expectedTopic: firstItem.group }
	});
	expect(stale.status()).toBe(409);
	for (const topic of ['', '   ', 'x'.repeat(101), 'Invalid\nname', 42, null]) {
		const invalid = await page.request.patch(path, { headers, data: { topic } });
		expect(invalid.status()).toBe(400);
	}
	const missingTopic = await page.request.patch(path, {
		headers,
		data: { note: 'Do not save', expectedTopic: 'Cats & behavior' }
	});
	expect(missingTopic.status()).toBe(400);

	const [topicEdit, noteEdit] = await Promise.all([
		page.request.patch(path, {
			headers,
			data: { topic: 'Behavior', expectedTopic: 'Cats & behavior' }
		}),
		page.request.patch(path, { headers, data: { note: 'Updated concurrently' } })
	]);
	expect(topicEdit.status()).toBe(200);
	expect(noteEdit.status()).toBe(200);
	expect((await readBatch(first)).items[0]).toMatchObject({
		group: 'Behavior',
		status: 'followup',
		note: 'Updated concurrently'
	});

	const missing = await page.request.patch(`/tools/tabs/api/batches/${first.id}/items/missing`, {
		headers,
		data: { topic: 'No such page' }
	});
	expect(missing.status()).toBe(404);
	const crossOrigin = await page.request.patch(path, {
		headers: { ...headers, Origin: 'https://example.test' },
		data: { topic: 'Rejected' }
	});
	expect(crossOrigin.status()).toBe(403);
});
