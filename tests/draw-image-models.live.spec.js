import { expect, test } from '@playwright/test';

test.describe('real private image-model inference', () => {
	test.skip(
		process.env.DRAW_LIVE_MODELS !== '1',
		'Set DRAW_LIVE_MODELS=1 to download public model weights and run real local inference.'
	);
	test.describe.configure({ mode: 'serial', timeout: 300_000 });

	for (const tool of [
		{ id: 'magic-select', label: 'Magic Select', model: 'slimsam-77-uniform' },
		{ id: 'depth-blur', label: 'Depth Blur', model: 'depth-anything-v2-small' },
		{ id: 'magic-eraser', label: 'Magic Eraser', model: 'lama_512_int8.onnx' }
	]) {
		test(`${tool.label} downloads public weights and edits entirely on-device`, async ({
			page
		}) => {
			/** @type {{ url: string, method: string }[]} */
			const networkRequests = [];
			page.on('request', (request) => {
				const hostname = new URL(request.url()).hostname;
				if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
					networkRequests.push({ url: request.url(), method: request.method() });
				}
			});
			await page.route('**/tools/api/draw/edit', (route) => route.abort());
			await page.goto('/tools/draw');
			const canvas = page.locator('.draw-canvas canvas.excalidraw__canvas.interactive');
			await expect(canvas).toBeVisible();
			await canvas.click({ position: { x: 360, y: 280 } });
			await page.evaluate(async () => {
				const source = await fetch('/swyx-ski.jpeg').then((response) => response.blob());
				const clipboard = new DataTransfer();
				clipboard.items.add(new File([source], 'local-model-smoke.jpg', { type: source.type }));
				document.dispatchEvent(
					new ClipboardEvent('paste', {
						bubbles: true,
						cancelable: true,
						clipboardData: clipboard
					})
				);
			});

			const toolbox = page.getByRole('region', { name: 'Selected image tools' });
			await expect(toolbox.getByRole('button', { name: tool.label, exact: true })).toBeVisible();
			const original = await page.evaluate(() => {
				const scene = /** @type {{ elements: { type: string, fileId: string }[] }} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[]}'
					)
				);
				return scene.elements.find((element) => element.type === 'image')?.fileId;
			});
			if (!original) throw new Error('The input image was not fully loaded.');
			await toolbox.getByRole('button', { name: tool.label, exact: true }).click();
			await toolbox.getByRole('button', { name: `Apply ${tool.label}` }).click();

			const result = await Promise.race([
				page
					.waitForFunction(
						(sourceFileId) => {
							const scene = /** @type {{ elements: { type: string, fileId: string }[] }} */ (
								JSON.parse(
									localStorage.getItem(
										document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
											'swyx-excalidraw:guest'
									) ?? '{"elements":[]}'
								)
							);
							const image = scene.elements.find((element) => element.type === 'image');
							return image?.fileId && image.fileId !== sourceFileId ? image.fileId : undefined;
						},
						original,
						{ timeout: 270_000 }
					)
					.then(() => 'success'),
				toolbox
					.getByRole('alert')
					.waitFor({ state: 'visible', timeout: 270_000 })
					.then(async () => {
						throw new Error(
							`${tool.label} failed: ${await toolbox.getByRole('alert').innerText()}`
						);
					})
			]);
			expect(result).toBe('success');
			expect(networkRequests.some((request) => request.url.includes(tool.model))).toBe(true);
			expect(networkRequests.every((request) => ['GET', 'HEAD'].includes(request.method))).toBe(
				true
			);
			expect(networkRequests.some((request) => request.url.includes('fal.run'))).toBe(false);
		});
	}
});
