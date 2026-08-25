import { expect, test } from '@playwright/test';

/** @param {import('@playwright/test').Page} page */
async function pasteSelectedImage(page) {
	await page.goto('/draw');
	const drawingCanvas = page.locator('.draw-canvas canvas.excalidraw__canvas.interactive');
	await expect(drawingCanvas).toBeVisible();
	await drawingCanvas.click({ position: { x: 360, y: 280 } });
	await page.evaluate(async () => {
		const source = await fetch('/swyx-ski.jpeg').then((response) => response.blob());
		const transfer = new DataTransfer();
		transfer.items.add(new File([source], 'selected-image.jpg', { type: source.type }));
		document.dispatchEvent(
			new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer })
		);
	});
	const toolbox = page.getByRole('region', { name: 'Selected image tools' });
	await expect(toolbox).toBeVisible();
	await expect(toolbox.getByLabel('AI image toolbox')).toBeVisible();
	return toolbox;
}

/** @param {import('@playwright/test').Page} page */
async function selectedSceneImage(page) {
	return page.evaluate(() => {
		const scene =
			/** @type {{elements:{type:string,id:string,fileId:string,x:number,y:number,width:number,height:number}[],files:Record<string,{mimeType:string,dataURL:string}>}} */ (
				JSON.parse(localStorage.getItem('swyx-excalidraw') ?? '{"elements":[],"files":{}}')
			);
		const image = scene.elements.find((element) => element.type === 'image');
		if (!image) throw new Error('The selected scene image is missing.');
		return { ...image, mimeType: scene.files[image.fileId]?.mimeType };
	});
}

test('selected images expose private tools, exact model sizes, and disclosed fal uploads', async ({
	page
}) => {
	await page.goto('/draw');
	await expect(page.getByLabel('AI image toolbox')).toHaveCount(0);
	const toolbox = await pasteSelectedImage(page);

	await expect(toolbox.getByText('Runs privately on your device')).toBeVisible();
	await expect(toolbox.getByText('Uploads this image to fal.ai')).toBeVisible();
	await expect(toolbox.getByText('First use downloads ~13.8 MB.')).toBeVisible();
	await expect(toolbox.getByRole('button', { name: 'Magic Select', exact: true })).toBeVisible();
	await expect(toolbox.getByRole('button', { name: 'Magic Eraser', exact: true })).toBeVisible();
	await expect(toolbox.getByRole('button', { name: 'Depth Blur', exact: true })).toBeVisible();
	await expect(toolbox.getByRole('button', { name: 'Vectorize Image', exact: true })).toBeVisible();

	await toolbox.getByRole('button', { name: 'Magic Eraser', exact: true }).click();
	await expect(toolbox.getByText('First use downloads ~62.1 MB.')).toBeVisible();
	await expect(toolbox.getByLabel('Eraser size')).toBeVisible();

	await toolbox.getByRole('button', { name: 'Depth Blur', exact: true }).click();
	await expect(toolbox.getByText('First use downloads ~27.3 MB.')).toBeVisible();
	await expect(toolbox.getByLabel('Blur strength')).toBeVisible();
	await expect(toolbox.getByLabel('Focus depth')).toBeVisible();

	await toolbox.getByRole('button', { name: 'Vectorize Image', exact: true }).click();
	await expect(toolbox.getByText('No model download required.')).toBeVisible();

	await toolbox.getByRole('button', { name: 'Improve lighting' }).click();
	const prompt = toolbox.getByRole('textbox', { name: 'AI image editing prompt' });
	await expect(prompt).toHaveValue(/natural, balanced illumination/i);
	await prompt.fill('Use soft golden-hour lighting.');
	await expect(prompt).toHaveValue('Use soft golden-hour lighting.');
});

for (const fixture of [
	{ id: 'magic-select', label: 'Magic Select', mimeType: 'image/png' },
	{ id: 'magic-eraser', label: 'Magic Eraser', mimeType: 'image/png' },
	{ id: 'depth-blur', label: 'Depth Blur', mimeType: 'image/png' },
	{ id: 'vectorize', label: 'Vectorize Image', mimeType: 'image/svg+xml' }
]) {
	test(`${fixture.label} preserves selected image dimensions, geometry, and native undo`, async ({
		page
	}) => {
		await page.addInitScript(() => {
			/** @type {any} */ (globalThis).__SWYX_PROCESS_IMAGE_TOOL__ = async (
				/** @type {string} */ action,
				/** @type {Blob} */ source,
				/** @type {{onProgress:(value:{phase:'download'|'processing',progress:number,label:string})=>void,point:{x:number,y:number}}} */ options
			) => {
				/** @type {any} */ (globalThis).__SWYX_IMAGE_TOOL_CALL__ = {
					action,
					point: options.point
				};
				options.onProgress({ phase: 'download', progress: 0.45, label: 'Downloading test model' });
				await new Promise((resolve) => setTimeout(resolve, 45));
				const bitmap = await createImageBitmap(source);
				if (action === 'vectorize') {
					return new Blob(
						[
							`<svg xmlns="http://www.w3.org/2000/svg" width="${bitmap.width}" height="${bitmap.height}" viewBox="0 0 ${bitmap.width} ${bitmap.height}"><path d="M0 0L${bitmap.width} ${bitmap.height}" stroke="#123"/></svg>`
						],
						{ type: 'image/svg+xml' }
					);
				}
				const canvas = document.createElement('canvas');
				canvas.width = bitmap.width;
				canvas.height = bitmap.height;
				canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
				options.onProgress({ phase: 'processing', progress: 1, label: 'Editing test image' });
				return new Promise((resolve, reject) =>
					canvas.toBlob(
						(blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed.'))),
						'image/png'
					)
				);
			};
		});

		const toolbox = await pasteSelectedImage(page);
		const original = await selectedSceneImage(page);
		await toolbox.getByRole('button', { name: fixture.label, exact: true }).click();
		if (fixture.id === 'magic-eraser') {
			const preview = toolbox.getByRole('button', { name: 'Choose the area to erase' });
			await preview.click({ position: { x: 40, y: 30 } });
		}
		await toolbox.getByRole('button', { name: `Apply ${fixture.label}` }).click();
		await expect
			.poll(async () => (await selectedSceneImage(page)).fileId)
			.not.toBe(original.fileId);
		const result = await selectedSceneImage(page);
		expect(result.id).toBe(original.id);
		expect(result.x).toBe(original.x);
		expect(result.y).toBe(original.y);
		expect(result.width).toBe(original.width);
		expect(result.height).toBe(original.height);
		expect(result.mimeType).toBe(fixture.mimeType);
		expect(
			await page.evaluate(() => /** @type {any} */ (globalThis).__SWYX_IMAGE_TOOL_CALL__.action)
		).toBe(fixture.id);

		await page.getByRole('button', { name: 'Undo' }).click();
		await expect.poll(async () => (await selectedSceneImage(page)).fileId).toBe(original.fileId);
	});
}

test('local image editing failures remain visible without mutating the canvas', async ({
	page
}) => {
	await page.addInitScript(() => {
		/** @type {any} */ (globalThis).__SWYX_PROCESS_IMAGE_TOOL__ = async () => {
			throw new Error('The selected model could not be downloaded.');
		};
	});
	const toolbox = await pasteSelectedImage(page);
	const original = await selectedSceneImage(page);
	await toolbox.getByRole('button', { name: 'Apply Magic Select' }).click();
	await expect(toolbox.getByRole('alert')).toHaveText(
		'The selected model could not be downloaded.'
	);
	expect((await selectedSceneImage(page)).fileId).toBe(original.fileId);
});

test('prompt editing sends only image and editable prompt through the authenticated proxy', async ({
	page
}) => {
	/** @type {{image:string,prompt:string}|undefined} */
	let captured;
	await page.route('**/tools/api/draw/edit', async (route) => {
		captured = route.request().postDataJSON();
		await route.fulfill({
			json: { image: captured?.image, model: 'fal-ai/flux-2/edit' }
		});
	});
	const toolbox = await pasteSelectedImage(page);
	const original = await selectedSceneImage(page);
	await toolbox.getByRole('button', { name: 'Product mockup' }).click();
	await toolbox.getByRole('button', { name: 'Generate AI image edit' }).click();
	await expect.poll(async () => (await selectedSceneImage(page)).fileId).not.toBe(original.fileId);
	expect(captured?.prompt).toMatch(/studio product mockup/i);
	expect(captured?.image).toMatch(/^data:image\//);
	expect(Object.keys(captured ?? {}).sort()).toEqual(['image', 'prompt']);
	await expect(toolbox.getByText('AI edit applied')).toBeVisible();
});
