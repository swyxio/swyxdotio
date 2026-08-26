import { expect, test } from '@playwright/test';
import { authenticateTools, TEST_TOOLS_OWNER, TEST_TOOLS_MEMBER } from './helpers/tools-auth.js';

/** @param {import('@playwright/test').Request} request */
async function uploadedFalForm(request) {
	const body = request.postDataBuffer();
	const contentType = await request.headerValue('content-type');
	if (!body || !contentType?.startsWith('multipart/form-data;')) {
		throw new Error('The selected image must be uploaded as binary multipart data.');
	}
	const form = await new Response(new Uint8Array(body), {
		headers: { 'Content-Type': contentType }
	}).formData();
	const image = form.get('image');
	if (typeof image === 'string' || !image) throw new Error('The uploaded image must be a file.');
	const dataURL = `data:${image.type};base64,${Buffer.from(await image.arrayBuffer()).toString('base64')}`;
	return {
		image: dataURL,
		imageBytes: image.size,
		imageMimeType: image.type,
		prompt: String(form.get('prompt')),
		model: String(form.get('model')),
		settings: form.has('settings') ? JSON.parse(String(form.get('settings'))) : {},
		requestBytes: body.byteLength
	};
}

/** @param {import('@playwright/test').Page} page */
async function mockSignedInPersonalTools(page) {
	await page.route('**/tools/api/session', async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				json: {
					authenticated: true,
					user: { ...TEST_TOOLS_OWNER, isOwner: true },
					googleConfigured: true
				}
			});
			return;
		}
		await route.continue();
	});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ width: number, height: number, noisy?: boolean } | undefined} [generatedSize]
 */
async function pasteSelectedImage(page, generatedSize) {
	await page.goto('/draw');
	const drawingCanvas = page.locator('.draw-canvas canvas.excalidraw__canvas.interactive');
	await expect(drawingCanvas).toBeVisible();
	// Start drawing through the canvas outside the new starter cards.
	await drawingCanvas.click({ position: { x: 80, y: 170 } });
	await drawingCanvas.click({ position: { x: 360, y: 280 } });
	await page.evaluate(async (size) => {
		let source;
		if (size) {
			const canvas = new OffscreenCanvas(size.width, size.height);
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Could not prepare the large test image.');
			if (size.noisy) {
				const pixels = context.createImageData(size.width, size.height);
				let random = 1831565813;
				for (let index = 0; index < pixels.data.length; index += 4) {
					random ^= random << 13;
					random ^= random >>> 17;
					random ^= random << 5;
					pixels.data[index] = random & 255;
					pixels.data[index + 1] = (random >>> 8) & 255;
					pixels.data[index + 2] = (random >>> 16) & 255;
					pixels.data[index + 3] = 255;
				}
				context.putImageData(pixels, 0, 0);
			} else {
				context.fillStyle = '#d3e7fb';
				context.fillRect(0, 0, size.width, size.height);
			}
			source = await canvas.convertToBlob({ type: 'image/jpeg', quality: size.noisy ? 0.97 : 0.8 });
		} else {
			source = await fetch('/swyx-ski.jpeg').then((response) => response.blob());
		}
		const transfer = new DataTransfer();
		transfer.items.add(new File([source], 'selected-image.jpg', { type: source.type }));
		document.dispatchEvent(
			new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer })
		);
	}, generatedSize);
	const toolbox = page.getByRole('region', { name: 'Selected image tools' });
	await expect(toolbox).toBeVisible();
	await expect(toolbox.getByLabel('AI image toolbox')).toBeVisible();
	const collapsedBounds = await toolbox.boundingBox();
	if (!collapsedBounds) throw new Error('The image toolbox is not visible.');
	expect(collapsedBounds.height).toBeLessThan(180);
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scene =
					/** @type {{elements:{type:string,fileId?:string}[],files:Record<string,unknown>}} */ (
						JSON.parse(
							localStorage.getItem(
								document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
									'swyx-excalidraw:guest'
							) ?? '{"elements":[],"files":{}}'
						)
					);
				const image = scene.elements.find((element) => element.type === 'image');
				return Boolean(image?.fileId && scene.files[image.fileId]);
			})
		)
		.toBe(true);
	await expect(toolbox.getByRole('combobox', { name: 'Background removal model' })).toHaveCount(0);
	await expect(toolbox.getByRole('textbox', { name: 'AI image editing prompt' })).toHaveCount(0);
	await expect(toolbox.getByRole('button', { name: 'Choose the subject to select' })).toHaveCount(
		0
	);
	await toolbox.getByRole('button', { name: 'Magic Select', exact: true }).click();
	await expect(toolbox.getByRole('button', { name: 'Choose the subject to select' })).toBeVisible();
	return toolbox;
}

/** @param {import('@playwright/test').Page} page */
async function selectedSceneImage(page) {
	return page.evaluate(() => {
		const scene =
			/** @type {{elements:{type:string,id:string,fileId:string,x:number,y:number,width:number,height:number}[],files:Record<string,{mimeType:string,dataURL:string}>}} */ (
				JSON.parse(
					localStorage.getItem(
						document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
							'swyx-excalidraw:guest'
					) ?? '{"elements":[],"files":{}}'
				)
			);
		const image = scene.elements.find((element) => element.type === 'image');
		if (!image) throw new Error('The selected scene image is missing.');
		return { ...image, mimeType: scene.files[image.fileId]?.mimeType };
	});
}

/** @param {import('@playwright/test').Page} page */
async function commitSelectedImageForUndo(page) {
	const drawingCanvas = page.locator('.draw-canvas canvas.excalidraw__canvas.interactive');
	const bounds = await drawingCanvas.boundingBox();
	if (!bounds) throw new Error('The drawing canvas is not visible.');
	await page.mouse.move(bounds.x + 360, bounds.y + 280);
	await page.mouse.down();
	await page.mouse.move(bounds.x + 390, bounds.y + 300, { steps: 4 });
	await page.mouse.up();
	await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
}

/** @param {import('@playwright/test').Locator} toolbox @param {string} modelId */
async function chooseOnlyModel(toolbox, modelId) {
	const workflows = /** @type {Record<string, string>} */ ({
		'nano-banana-2': 'Nano Banana 2 · Balanced 1K edit',
		'gpt-image-2': 'GPT Image 2 · High-detail 1.5 MP edit',
		'seedream-5-pro': 'Seedream 5.0 Pro · Precise product 1K edit',
		'nano-banana-pro': 'Nano Banana Pro · Premium 1K edit',
		'flux-2': 'FLUX.2 [dev] · Budget 1 MP edit',
		'flux-klein-9b-generate': 'FLUX.2 [klein] 9B · Fast open-weight text to image',
		'grok-imagine-video': 'Grok Imagine Video · Budget 5-second image to video',
		'minimax-h3-video': 'MiniMax H3 · Open-weight 5-second 2K video',
		'seedance-2-video': 'Seedance 2.0 · Top-ranked 5-second 720p video',
		'veo-3-1-video': 'Veo 3.1 · Premium 4-second 720p video'
	});
	await toolbox.getByRole('button', { name: 'AI model and workflow selector' }).click();
	const folderLabel =
		modelId === 'flux-klein-9b-generate'
			? 'Text to image'
			: modelId === 'grok-imagine-video' || modelId.endsWith('-video')
				? 'Image to video'
				: 'Image editing';
	const folder = toolbox.locator(`.fal-model-folder[aria-label="${folderLabel} models"]`);
	if (!(await folder.evaluate((element) => element.hasAttribute('open')))) {
		await folder.locator('summary').click();
	}
	await folder.getByRole('button', { name: `Use only ${workflows[modelId]}` }).click();
}

test('selected images expose private tools, exact model sizes, and disclosed fal uploads', async ({
	page
}) => {
	await page.goto('/draw');
	await expect(page.getByLabel('AI image toolbox')).not.toBeVisible();
	const toolbox = await pasteSelectedImage(page);

	await expect(toolbox.getByText('Runs privately on your device')).toBeVisible();
	await expect(toolbox.getByText('Uploads the reference to fal')).toHaveCount(0);
	await expect(toolbox.getByText('First use downloads ~13.8 MB.')).toBeVisible();
	await expect(toolbox.getByRole('button', { name: 'Background', exact: true })).toBeVisible();
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

	await toolbox.getByRole('button', { name: 'AI prompt', exact: true }).click();
	await expect(toolbox.getByText('Uploads the reference to fal')).toBeVisible();
	await expect(toolbox.getByText(/Sign in required/)).toBeVisible();
	await expect(toolbox.getByRole('link', { name: 'Sign in to generate' })).toHaveAttribute(
		'href',
		'/tools?next=/draw'
	);
	await expect(toolbox.getByRole('button', { name: 'Generate AI image edit' })).toHaveCount(0);
	await expect(toolbox.getByText('Runs privately on your device')).toHaveCount(0);
	await expect(toolbox.getByText('No model download required.')).toHaveCount(0);
	const modelPicker = toolbox.getByRole('button', { name: 'AI model and workflow selector' });
	await expect(toolbox.getByText('Models and workflows')).toBeVisible();
	await expect(modelPicker).toContainText('Nano Banana 2');
	await modelPicker.click();
	const workflowFolders = toolbox.locator('.fal-model-folder');
	await expect(workflowFolders).toHaveCount(3);
	await expect(workflowFolders.nth(0).locator('summary')).toContainText('Text to image');
	await expect(workflowFolders.nth(0).locator('summary')).toContainText('0 / 2');
	await expect(workflowFolders.nth(1).locator('summary')).toContainText('Image editing');
	await expect(workflowFolders.nth(1).locator('summary')).toContainText('1 / 12');
	await expect(workflowFolders.nth(1)).toHaveAttribute('open', '');
	await expect(workflowFolders.nth(2).locator('summary')).toContainText('Image to video');
	await expect(workflowFolders.nth(2).locator('summary')).toContainText('0 / 12');
	await expect(toolbox.getByRole('checkbox')).toHaveCount(12);
	const imageEditing = workflowFolders.nth(1);
	const openEditors = imageEditing.getByRole('region', {
		name: 'Open weights Image editing models'
	});
	const closedEditors = imageEditing.getByRole('region', {
		name: 'Closed models Image editing models'
	});
	await expect(openEditors.getByText('Open weights', { exact: true })).toBeVisible();
	expect(
		await toolbox
			.locator('.fal-model-cards')
			.evaluate((element) => getComputedStyle(element).overflowY)
	).toBe('auto');
	expect(
		await imageEditing
			.locator('.fal-model-folder-cards')
			.evaluate((element) => getComputedStyle(element).overflowY)
	).toBe('visible');
	expect(await openEditors.evaluate((element) => getComputedStyle(element).overflowY)).toBe(
		'visible'
	);
	await closedEditors.getByText('Closed models', { exact: true }).scrollIntoViewIfNeeded();
	await expect(closedEditors.getByText('Closed models', { exact: true })).toBeVisible();
	await expect(openEditors.getByRole('checkbox')).toHaveCount(5);
	await expect(closedEditors.getByRole('checkbox')).toHaveCount(7);
	await openEditors
		.getByRole('button', { name: 'Select all Open weights Image editing models' })
		.click();
	await expect(imageEditing.locator('summary')).toContainText('6 / 12');
	await closedEditors
		.getByRole('button', { name: 'Select no Closed models Image editing models' })
		.click();
	await expect(imageEditing.locator('summary')).toContainText('5 / 12');
	await imageEditing.getByRole('button', { name: 'Select no Image editing models' }).click();
	await expect(imageEditing.locator('summary')).toContainText('0 / 12');
	await expect(imageEditing).toHaveAttribute('open', '');
	await imageEditing.getByRole('button', { name: 'Select all Image editing models' }).click();
	await expect(imageEditing.locator('summary')).toContainText('12 / 12');
	await workflowFolders.nth(0).locator('summary').click();
	await workflowFolders.nth(2).locator('summary').click();
	const videoModels = workflowFolders.nth(2);
	await expect(
		videoModels
			.getByRole('region', { name: 'Open weights Image to video models' })
			.getByRole('checkbox')
	).toHaveCount(1);
	await expect(
		videoModels
			.getByRole('region', { name: 'Closed models Image to video models' })
			.getByRole('checkbox')
	).toHaveCount(11);
	await expect(toolbox.getByRole('checkbox')).toHaveCount(26);
	await expect(toolbox.locator('.fal-model-card').first()).toContainText('~$0.006');
	await expect(toolbox.locator('.fal-model-card').last()).toContainText('$1.60');
	await expect(toolbox.getByText('Up to 16 reference images')).toBeVisible();
	await toolbox.getByRole('button', { name: 'Select all', exact: true }).click();
	await expect(toolbox.getByText('Cheapest first · 26 selected')).toBeVisible();
	await expect(workflowFolders.nth(0).locator('summary')).toContainText('2 / 2');
	await expect(workflowFolders.nth(1).locator('summary')).toContainText('12 / 12');
	await expect(workflowFolders.nth(2).locator('summary')).toContainText('12 / 12');
	await toolbox.getByRole('button', { name: 'Use only Nano Banana 2 · Balanced 1K edit' }).click();
	await expect(toolbox.getByText('fal top pick')).toBeVisible();
	await chooseOnlyModel(toolbox, 'gpt-image-2');
	await expect(toolbox.getByText('AA #3', { exact: true })).toBeVisible();
	await expect(toolbox.getByText('~$0.219 total · 1 generation')).toBeVisible();
	await toolbox.getByRole('button', { name: 'Improve lighting' }).click();
	const prompt = toolbox.getByRole('textbox', { name: 'AI image editing prompt' });
	await expect(prompt).toHaveValue(/natural, balanced illumination/i);
	await prompt.fill('Use soft golden-hour lighting.');
	await expect(prompt).toHaveValue('Use soft golden-hour lighting.');

	await toolbox.getByRole('button', { name: 'Background', exact: true }).click();
	await expect(toolbox.getByRole('combobox', { name: 'Background removal model' })).toBeVisible();
	await expect(toolbox.getByRole('textbox', { name: 'AI image editing prompt' })).toHaveCount(0);
});

test('the selected image chooser stays compact and never stretches previews on narrow screens', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const toolbox = await pasteSelectedImage(page);
	const preview = toolbox.getByAltText('Selected canvas artwork');
	await expect(preview).toBeVisible();
	expect(await preview.evaluate((image) => getComputedStyle(image).objectFit)).toBe('contain');
	const localBounds = await toolbox.boundingBox();
	if (!localBounds) throw new Error('The local image toolbox is not visible.');
	expect(localBounds.x).toBeGreaterThanOrEqual(0);
	expect(localBounds.x + localBounds.width).toBeLessThanOrEqual(390);
	expect(localBounds.height).toBeLessThan(360);

	await toolbox.getByRole('button', { name: 'AI prompt', exact: true }).click();
	await expect(toolbox.getByRole('textbox', { name: 'AI image editing prompt' })).toBeVisible();
	await expect(preview).toHaveCount(0);
	await expect(toolbox.getByRole('combobox', { name: 'Background removal model' })).toHaveCount(0);
	const cloudBounds = await toolbox.boundingBox();
	if (!cloudBounds) throw new Error('The cloud image toolbox is not visible.');
	// The shared composer can use the available height, while leaving both
	// native toolbar and bottom canvas controls accessible.
	expect(cloudBounds.y).toBeGreaterThanOrEqual(126);
	expect(cloudBounds.y + cloudBounds.height).toBeLessThanOrEqual(844 - 68);
	const signIn = toolbox.getByRole('link', { name: 'Sign in to generate' });
	await signIn.scrollIntoViewIfNeeded();
	await expect(signIn).toBeInViewport();
	expect(
		await signIn.evaluate((element) => {
			let scrollers = 0;
			for (let node = element.parentElement; node; node = node.parentElement) {
				if (
					/(auto|scroll)/.test(getComputedStyle(node).overflowY) &&
					node.scrollHeight > node.clientHeight
				)
					scrollers++;
			}
			return scrollers;
		})
	).toBe(1);
});

test('model discovery filters workflows and dismisses cleanly without losing a batch', async ({
	page
}) => {
	const toolbox = await pasteSelectedImage(page);
	await toolbox.getByRole('button', { name: 'AI prompt', exact: true }).click();
	const picker = toolbox.getByRole('button', { name: 'AI model and workflow selector' });
	await picker.click();
	const search = toolbox.getByRole('searchbox', { name: 'Search AI models' });
	await expect(search).toBeFocused();

	await search.fill('minimax open video');
	await expect(toolbox.locator('.fal-model-folder')).toHaveCount(1);
	const videoFolder = toolbox.locator('.fal-model-folder[aria-label="Image to video models"]');
	await expect(videoFolder).toHaveAttribute('open', '');
	await expect(videoFolder.getByRole('checkbox')).toHaveCount(1);
	await expect(toolbox.getByText('1 matching · 1 selected')).toBeVisible();
	await search.press('Enter');
	await expect(picker).toContainText('MiniMax H3');
	await expect(search).toHaveCount(0);
	await expect(picker).toBeFocused();

	await picker.click();
	await expect(videoFolder).toHaveAttribute('open', '');
	await expect(
		toolbox.locator('.fal-model-folder[aria-label="Image editing models"]')
	).not.toHaveAttribute('open', '');
	const reopenedSearch = toolbox.getByRole('searchbox', { name: 'Search AI models' });
	await reopenedSearch.fill('grok video');
	await expect(toolbox.getByText('2 matching · 1 selected')).toBeVisible();
	await toolbox.getByRole('button', { name: 'Select results', exact: true }).click();
	await expect(toolbox.getByText('2 matching · 3 selected')).toBeVisible();
	await reopenedSearch.press('Escape');
	await expect(picker).toBeFocused();
	const selected = toolbox.locator('[aria-label="Selected AI models"]');
	await expect(selected.getByRole('button')).toHaveCount(3);
	await selected
		.getByRole('button', { name: 'Remove Grok Imagine Video 1.5 from selected models' })
		.click();
	await expect(toolbox.getByText(/2 generations/)).toBeVisible();

	await picker.click();
	await toolbox.getByRole('textbox', { name: 'AI image editing prompt' }).click();
	await expect(toolbox.getByRole('searchbox', { name: 'Search AI models' })).toHaveCount(0);
	await expect(toolbox).toBeVisible();

	await picker.click();
	const emptySearch = toolbox.getByRole('searchbox', { name: 'Search AI models' });
	await emptySearch.fill('no provider exists');
	await expect(toolbox.getByText('No models match “no provider exists”.')).toBeVisible();
	await expect(toolbox.getByRole('button', { name: 'Select results', exact: true })).toBeDisabled();
});

test('generation presets and accessible actions follow the selected workflow', async ({ page }) => {
	await mockSignedInPersonalTools(page);
	const toolbox = await pasteSelectedImage(page);
	await toolbox.getByRole('button', { name: 'AI prompt', exact: true }).click();
	const prompt = toolbox.getByRole('textbox', { name: 'AI image editing prompt' });
	await expect(toolbox.getByRole('button', { name: 'Improve lighting' })).toBeVisible();
	await expect(toolbox.getByRole('button', { name: 'Camera orbit' })).toHaveCount(0);

	await chooseOnlyModel(toolbox, 'flux-klein-9b-generate');
	await expect(prompt).toHaveAttribute('placeholder', 'Describe the image you want to create…');
	await expect(toolbox.getByRole('button', { name: 'Remove distractions' })).toHaveCount(0);
	await toolbox.getByRole('button', { name: 'YouTube thumbnail' }).click();
	await expect(prompt).toHaveValue(/thumbnail/i);
	await expect(toolbox.getByRole('button', { name: 'Generate AI image' })).toBeEnabled();

	await chooseOnlyModel(toolbox, 'grok-imagine-video');
	await expect(prompt).toHaveAttribute(
		'placeholder',
		'Describe the motion, camera movement, and sound…'
	);
	await expect(toolbox.getByRole('button', { name: 'Sketch' })).toHaveCount(0);
	await expect(toolbox.getByRole('button', { name: 'Animate subject' })).toBeVisible();
	await expect(toolbox.getByRole('button', { name: 'Talking portrait' })).toBeVisible();
	await toolbox.getByRole('button', { name: 'Camera orbit' }).click();
	await expect(prompt).toHaveValue(/orbit/i);
	await expect(toolbox.getByRole('button', { name: 'Generate AI video' })).toBeEnabled();
});

test('the image toolbox minimizes without deselecting artwork or losing the active draft', async ({
	page
}) => {
	const toolbox = await pasteSelectedImage(page);
	await toolbox.getByRole('button', { name: 'AI prompt', exact: true }).click();
	await chooseOnlyModel(toolbox, 'flux-2');
	const prompt = toolbox.getByRole('textbox', { name: 'AI image editing prompt' });
	await prompt.fill('Keep this workflow and prompt while I inspect the canvas');
	const original = await selectedSceneImage(page);

	await toolbox.getByRole('button', { name: 'Minimize image tools' }).click();
	await expect(toolbox).toBeVisible();
	await expect(prompt).not.toBeVisible();
	await expect(
		toolbox.getByRole('button', { name: 'Magic Select', exact: true })
	).not.toBeVisible();
	const collapsedBounds = await toolbox.boundingBox();
	if (!collapsedBounds) throw new Error('The minimized toolbox is not visible.');
	expect(collapsedBounds.height).toBeLessThan(65);
	expect((await selectedSceneImage(page)).fileId).toBe(original.fileId);

	await toolbox.getByRole('button', { name: 'Expand image tools' }).click();
	await expect(prompt).toHaveValue('Keep this workflow and prompt while I inspect the canvas');
	await expect(
		toolbox.getByRole('button', { name: 'AI model and workflow selector' })
	).toContainText('FLUX.2 [dev]');
});

test('the floating image toolbox can be dragged without losing the selected tool', async ({
	page
}) => {
	const toolbox = await pasteSelectedImage(page);
	const start = await toolbox.boundingBox();
	const handle = await toolbox.getByRole('button', { name: 'Move image tools' }).boundingBox();
	if (!start || !handle) throw new Error('The draggable image toolbox is not visible.');
	await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
	await page.mouse.down();
	await page.mouse.move(handle.x + handle.width / 2 - 110, handle.y + handle.height / 2 + 90, {
		steps: 6
	});
	await page.mouse.up();
	const moved = await toolbox.boundingBox();
	if (!moved) throw new Error('The toolbox disappeared after being dragged.');
	expect(moved.x).toBeLessThan(start.x - 90);
	expect(moved.y).toBeGreaterThan(start.y + 70);
	await expect(toolbox.getByRole('button', { name: 'Magic Select', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(toolbox.getByRole('button', { name: 'Choose the subject to select' })).toBeVisible();
});

test('reselecting an image restores the AI prompt, selected workflow, and drafted text', async ({
	page
}) => {
	const toolbox = await pasteSelectedImage(page);
	await toolbox.getByRole('button', { name: 'AI prompt', exact: true }).click();
	await chooseOnlyModel(toolbox, 'flux-2');
	await toolbox.getByRole('textbox', { name: 'AI image editing prompt' }).fill('Keep this draft');

	const canvas = page.locator('.draw-canvas canvas.excalidraw__canvas.interactive');
	const bounds = await canvas.boundingBox();
	if (!bounds) throw new Error('The drawing canvas is not visible.');
	await canvas.click({ position: { x: bounds.width / 2, y: bounds.height - 120 } });
	await expect(toolbox).not.toBeVisible();
	await canvas.click({ position: { x: 360, y: 280 } });

	await expect(toolbox).toBeVisible();
	await expect(toolbox.getByRole('button', { name: 'AI prompt', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(toolbox.getByRole('textbox', { name: 'AI image editing prompt' })).toHaveValue(
		'Keep this draft'
	);
	await expect(
		toolbox.getByRole('button', { name: 'AI model and workflow selector' })
	).toContainText('FLUX.2 [dev]');
});

test('the active drawing is persisted once without exhausting storage on a duplicate page copy', async ({
	page
}) => {
	/** @type {string[]} */
	const storageErrors = [];
	page.on('console', (message) => {
		if (message.text().includes('Could not save the drawing locally.')) {
			storageErrors.push(message.text());
		}
	});
	await page.addInitScript(() => {
		const originalSetItem = Storage.prototype.setItem;
		Storage.prototype.setItem = function (/** @type {string} */ key, /** @type {string} */ value) {
			if (
				key ===
				(document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
					'swyx-excalidraw:guest') +
					':default'
			) {
				throw new DOMException('The storage quota has been exceeded.', 'QuotaExceededError');
			}
			return originalSetItem.call(this, key, value);
		};
	});

	await pasteSelectedImage(page);
	const persisted = await page.evaluate(() => {
		const metadata = JSON.parse(
			localStorage.getItem(
				(document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
					'swyx-excalidraw:guest') + ':pages'
			) ?? '{}'
		);
		const scene = JSON.parse(
			localStorage.getItem(
				document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
					'swyx-excalidraw:guest'
			) ?? '{"elements":[]}'
		);
		return {
			imageCount: scene.elements.filter(
				(/** @type {{type:string}} */ element) => element.type === 'image'
			).length,
			duplicate: localStorage.getItem(
				`${document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') || 'swyx-excalidraw:guest'}:${metadata.activePageId}`
			)
		};
	});

	expect(persisted).toEqual({ imageCount: 1, duplicate: null });
	expect(storageErrors).toEqual([]);
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
		await commitSelectedImageForUndo(page);
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

test('the real local vectorization worker generates compact SVG without model downloads', async ({
	page
}) => {
	/** @type {string[]} */
	const remoteModelRequests = [];
	page.on('request', (request) => {
		if (new URL(request.url()).hostname === 'huggingface.co')
			remoteModelRequests.push(request.url());
	});
	const toolbox = await pasteSelectedImage(page);
	const original = await selectedSceneImage(page);
	await toolbox.getByRole('button', { name: 'Vectorize Image', exact: true }).click();
	await toolbox.getByRole('button', { name: 'Apply Vectorize Image' }).click();
	await expect.poll(async () => (await selectedSceneImage(page)).fileId).not.toBe(original.fileId);

	const vector = await page.evaluate(async () => {
		const scene =
			/** @type {{elements:{type:string,fileId:string}[],files:Record<string,{mimeType:string,dataURL:string}>}} */ (
				JSON.parse(
					localStorage.getItem(
						document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
							'swyx-excalidraw:guest'
					) ?? '{"elements":[],"files":{}}'
				)
			);
		const image = scene.elements.find((element) => element.type === 'image');
		if (!image) throw new Error('Vector image is missing.');
		const asset = scene.files[image.fileId];
		const markup = await fetch(asset.dataURL).then((response) => response.text());
		return { mimeType: asset.mimeType, markup };
	});
	expect(vector.mimeType).toBe('image/svg+xml');
	expect(vector.markup).toContain('<path');
	expect(vector.markup).not.toContain('<image');
	expect(remoteModelRequests).toEqual([]);
});

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

test('large transparent image edits preserve dimensions and synchronize under the real cloud limit', async ({
	page
}) => {
	test.setTimeout(45_000);
	await page.addInitScript(() => {
		/** @type {any} */ (globalThis).__SWYX_PROCESS_IMAGE_TOOL__ = async (
			/** @type {string} */ _action,
			/** @type {Blob} */ source
		) => {
			const bitmap = await createImageBitmap(source);
			const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Could not prepare the generated image.');
			const pixels = context.createImageData(bitmap.width, bitmap.height);
			let random = 1831565813;
			for (let index = 0; index < pixels.data.length; index += 4) {
				random ^= random << 13;
				random ^= random >>> 17;
				random ^= random << 5;
				pixels.data[index] = random & 255;
				pixels.data[index + 1] = (random >>> 8) & 255;
				pixels.data[index + 2] = (random >>> 16) & 255;
				pixels.data[index + 3] = index < bitmap.width * 4 ? 0 : 255;
			}
			context.putImageData(pixels, 0, 0);
			const result = await canvas.convertToBlob({ type: 'image/png' });
			/** @type {any} */ (globalThis).__SWYX_GENERATED_IMAGE_BYTES__ = result.size;
			return result;
		};
	});
	await page.goto('/draw');
	const origin = new URL(page.url()).origin;
	await authenticateTools(page);
	const create = await page.request.post(`${origin}/tools/api/draw/pages`, {
		headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id },
		data: { name: `Image optimization ${Date.now()}` }
	});
	expect(create.ok()).toBe(true);
	const cloudPage = await create.json();
	await page.reload();
	await expect(page.locator('.draw-canvas')).toHaveAttribute(
		'data-storage-key',
		`swyx-excalidraw:google:${TEST_TOOLS_OWNER.id}`
	);
	await page.evaluate((drawingPage) => {
		localStorage.setItem(
			(document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
				'swyx-excalidraw:guest') + ':pages',
			JSON.stringify({ pages: [drawingPage], activePageId: drawingPage.id })
		);
	}, cloudPage);

	try {
		const toolbox = await pasteSelectedImage(page, { width: 1200, height: 1000 });
		const original = await selectedSceneImage(page);
		await toolbox.getByRole('button', { name: 'Apply Magic Select' }).click();
		await expect
			.poll(async () => (await selectedSceneImage(page)).fileId)
			.not.toBe(original.fileId);
		const edited = await selectedSceneImage(page);
		expect(edited.mimeType).toBe('image/webp');
		expect(edited.width).toBe(original.width);
		expect(edited.height).toBe(original.height);
		expect(
			await page.evaluate(() => /** @type {any} */ (globalThis).__SWYX_GENERATED_IMAGE_BYTES__)
		).toBeGreaterThan(1_800_000);
		await expect
			.poll(
				async () => {
					const response = await page.request.get(`${origin}/tools/api/draw/pages/${cloudPage.id}`);
					if (!response.ok()) return '';
					const drawing = await response.json();
					return drawing.scene?.elements?.find(
						(/** @type {{ type: string }} */ element) => element.type === 'image'
					)?.fileId;
				},
				{ timeout: 15_000 }
			)
			.toBe(edited.fileId);
		await page.getByRole('button', { name: 'Manage drawing pages' }).click();
		await expect(page.getByText('Saved to cloud')).toBeVisible();

		const persisted = await page.request.get(`${origin}/tools/api/draw/pages/${cloudPage.id}`);
		expect(persisted.ok()).toBe(true);
		const saved = await persisted.json();
		expect(new TextEncoder().encode(JSON.stringify(saved.scene)).byteLength).toBeLessThan(
			1_800_000
		);
		expect(saved.scene.files[edited.fileId].mimeType).toBe('image/webp');
		const dimensions = await page.evaluate(async (dataURL) => {
			const bitmap = await createImageBitmap(
				await fetch(dataURL).then((response) => response.blob())
			);
			const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Could not inspect the synchronized image.');
			context.drawImage(bitmap, 0, 0);
			return {
				width: bitmap.width,
				height: bitmap.height,
				firstPixelAlpha: context.getImageData(0, 0, 1, 1).data[3]
			};
		}, saved.scene.files[edited.fileId].dataURL);
		expect(dimensions).toEqual({ width: 1200, height: 1000, firstPixelAlpha: 0 });
	} finally {
		const remove = await page.request.delete(`${origin}/tools/api/draw/pages/${cloudPage.id}`, {
			headers: { Origin: origin, 'X-Tools-User': TEST_TOOLS_OWNER.id }
		});
		expect(remove.ok()).toBe(true);
	}
});

test('selecting multiple models generates once per model from the same source image', async ({
	page
}) => {
	await mockSignedInPersonalTools(page);
	/** @type {Awaited<ReturnType<typeof uploadedFalForm>>[]} */
	const captured = [];
	/** @type {string[]} */
	let outputImages = [];
	await page.route('**/tools/api/draw/edit**', async (route) => {
		if (route.request().method() === 'POST') {
			const request = await uploadedFalForm(route.request());
			captured.push(request);
			await route.fulfill({
				status: 202,
				json: { requestId: `batch-${captured.length - 1}`, model: request.model }
			});
			return;
		}
		const index = Number(
			new URL(route.request().url()).searchParams.get('requestId')?.split('-').at(-1)
		);
		await route.fulfill({ json: { status: 'COMPLETED', image: outputImages[index] } });
	});
	const toolbox = await pasteSelectedImage(page);
	outputImages = await page.evaluate(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 128;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('A canvas context is required.');
		return ['#bc364b', '#476fc1'].map((color) => {
			context.fillStyle = color;
			context.fillRect(0, 0, canvas.width, canvas.height);
			return canvas.toDataURL('image/png');
		});
	});
	await toolbox.getByRole('button', { name: 'AI prompt', exact: true }).click();
	await toolbox.getByRole('button', { name: 'AI model and workflow selector' }).click();
	await toolbox.getByRole('checkbox', { name: 'FLUX.2 [dev] · Budget 1 MP edit' }).check();
	await expect(toolbox.getByText('Cheapest first · 2 selected')).toBeVisible();
	await toolbox.getByRole('button', { name: 'AI model and workflow selector' }).click();
	await expect(toolbox.getByText('~$0.104 total · 2 generations')).toBeVisible();
	await toolbox
		.getByRole('textbox', { name: 'AI image editing prompt' })
		.fill('Compare model outputs');
	await toolbox.getByRole('button', { name: 'Generate AI image edit' }).click();
	const history = toolbox.getByRole('region', { name: 'Generated images from this session' });
	await expect(history.locator('.generation-card')).toHaveCount(3);
	expect(captured.map((request) => request.model)).toEqual(['flux-2', 'nano-banana-2']);
	expect(captured[0]?.image).toBe(captured[1]?.image);
	await expect(history.getByText('Original', { exact: true })).toBeVisible();
	await expect(history.locator('.generation-card').getByText('FLUX.2 [dev]')).toBeVisible();
	await expect(history.locator('.generation-card').getByText('Nano Banana 2')).toBeVisible();
	await expect(toolbox.getByText('Generated 2 of 2 results')).toBeVisible();
});

test('text-to-image never uploads the selected image and generated video stays outside the canvas', async ({
	page
}) => {
	await mockSignedInPersonalTools(page);
	/** @type {{model: string, hasImage: boolean}[]} */
	const requests = [];
	let generatedImage = '';
	const videoUrl = 'https://v3b.fal.media/files/example/generated.mp4';
	await page.route('https://v3b.fal.media/**', (route) =>
		route.fulfill({ status: 200, contentType: 'video/mp4', body: Buffer.alloc(0) })
	);
	await page.route('**/tools/api/draw/edit**', async (route) => {
		if (route.request().method() === 'POST') {
			const body = route.request().postDataBuffer();
			const contentType = await route.request().headerValue('content-type');
			if (!body || !contentType) throw new Error('A multipart request is required.');
			const form = await new Response(new Uint8Array(body), {
				headers: { 'Content-Type': contentType }
			}).formData();
			const model = String(form.get('model'));
			requests.push({ model, hasImage: form.has('image') });
			await route.fulfill({ status: 202, json: { requestId: model, model } });
			return;
		}
		const model = new URL(route.request().url()).searchParams.get('model');
		await route.fulfill({
			json:
				model === 'grok-imagine-video'
					? { status: 'COMPLETED', video: videoUrl }
					: { status: 'COMPLETED', image: generatedImage }
		});
	});
	const toolbox = await pasteSelectedImage(page);
	const original = await selectedSceneImage(page);
	generatedImage = await page.evaluate(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 128;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('A canvas context is required.');
		context.fillStyle = '#7a4fc2';
		context.fillRect(0, 0, 128, 128);
		return canvas.toDataURL('image/png');
	});
	await toolbox.getByRole('button', { name: 'AI prompt', exact: true }).click();
	await chooseOnlyModel(toolbox, 'flux-klein-9b-generate');
	await expect(toolbox.getByText('Prompt only · no image upload')).toBeVisible();
	await toolbox
		.getByRole('textbox', { name: 'AI image editing prompt' })
		.fill('Create an alpine landscape');
	await toolbox.getByRole('button', { name: 'Generate AI image' }).click();
	await expect(toolbox.getByAltText('Generated preview')).toHaveAttribute('src', generatedImage);
	expect((await selectedSceneImage(page)).fileId).toBe(original.fileId);
	expect(requests[0]).toEqual({ model: 'flux-klein-9b-generate', hasImage: false });

	const beforeVideo = await selectedSceneImage(page);
	await chooseOnlyModel(toolbox, 'grok-imagine-video');
	await expect(toolbox.getByText('Uploads the reference to fal')).toBeVisible();
	await expect(
		toolbox.getByRole('spinbutton', { name: 'Generation confirmation threshold' })
	).toHaveValue('0.25');
	const confirmation = page.waitForEvent('dialog');
	const submitted = toolbox.getByRole('button', { name: 'Generate AI video' }).click();
	const dialog = await confirmation;
	expect(dialog.type()).toBe('confirm');
	expect(dialog.message()).toContain('approximately $0.252');
	expect(requests).toHaveLength(1);
	await dialog.accept();
	await submitted;
	await expect(toolbox.getByRole('region', { name: 'Generated video preview' })).toBeVisible();
	await expect(toolbox.getByRole('link', { name: 'Download video' })).toHaveAttribute(
		'href',
		videoUrl
	);
	expect(requests[1]).toEqual({ model: 'grok-imagine-video', hasImage: true });
	expect((await selectedSceneImage(page)).fileId).toBe(beforeVideo.fileId);
	expect(
		await page.evaluate(() =>
			localStorage.getItem(
				document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
					'swyx-excalidraw:guest'
			)
		)
	).not.toContain(videoUrl);
});

test('each selected modality exposes supported model settings, accurate pricing, and reproducible video history', async ({
	page
}) => {
	await mockSignedInPersonalTools(page);
	/** @type {Awaited<ReturnType<typeof uploadedFalForm>> | undefined} */
	let uploaded;
	const videoUrl = 'https://storage.googleapis.com/falserverless/model_tests/generated.mp4';
	await page.route('https://storage.googleapis.com/falserverless/**', (route) =>
		route.fulfill({ status: 200, contentType: 'video/mp4', body: Buffer.alloc(0) })
	);
	await page.route('**/tools/api/draw/edit**', async (route) => {
		if (route.request().method() === 'POST') {
			uploaded = await uploadedFalForm(route.request());
			await route.fulfill({
				status: 202,
				json: { requestId: 'configured-veo', model: uploaded.model }
			});
			return;
		}
		await route.fulfill({ json: { status: 'COMPLETED', video: videoUrl } });
	});
	const toolbox = await pasteSelectedImage(page);
	await toolbox.getByRole('button', { name: 'AI prompt', exact: true }).click();
	const imageSettings = toolbox.getByRole('region', { name: 'Image editing settings' });
	await expect(imageSettings.getByLabel('Image editing Resolution')).toHaveValue('1k');
	await expect(imageSettings.getByLabel('Image editing Aspect ratio')).toHaveValue('auto');
	await expect(imageSettings.getByLabel('Image editing Output format')).toHaveValue('webp');
	await expect(imageSettings.getByLabel('Image editing Seed')).toHaveAttribute(
		'placeholder',
		'Random'
	);
	await imageSettings.getByLabel('Image editing Resolution').selectOption('2k');
	await expect(toolbox.getByText('~$0.12 total · 1 generation')).toBeVisible();

	await chooseOnlyModel(toolbox, 'gpt-image-2');
	await expect(imageSettings.getByLabel('Image editing Quality')).toHaveValue('high');
	await imageSettings.getByLabel('Image editing Quality').selectOption('low');
	await expect(toolbox.getByText('~$0.015 total · 1 generation')).toBeVisible();
	await expect(imageSettings.getByLabel('Image editing Seed')).toHaveCount(0);

	await chooseOnlyModel(toolbox, 'minimax-h3-video');
	const videoSettings = toolbox.getByRole('region', { name: 'Image to video settings' });
	await expect(videoSettings.getByLabel('Image to video Resolution')).toHaveValue('2k');
	await expect(videoSettings.getByLabel('Image to video Prompt expansion')).toHaveValue('balanced');
	await expect(videoSettings.getByLabel('Image to video Generate audio')).toHaveCount(0);
	await expect(toolbox.getByText('Arena #1 · AA #2', { exact: true })).toBeVisible();

	await chooseOnlyModel(toolbox, 'seedance-2-video');
	await expect(videoSettings.getByLabel('Image to video Generate audio')).toBeChecked();
	await expect(videoSettings.getByLabel('Image to video Seed')).toHaveCount(0);
	await expect(toolbox.getByText('AA #1 · Arena #3', { exact: true })).toBeVisible();

	await chooseOnlyModel(toolbox, 'veo-3-1-video');
	await expect(videoSettings.getByLabel('Image to video Duration')).toHaveValue('4');
	await expect(videoSettings.getByLabel('Image to video Resolution')).toHaveValue('720p');
	await expect(videoSettings.getByLabel('Image to video Generate audio')).toBeChecked();
	await videoSettings.getByLabel('Image to video Duration').selectOption('6');
	await videoSettings.getByLabel('Image to video Resolution').selectOption('1080p');
	await videoSettings.getByLabel('Image to video Generate audio').uncheck();
	await videoSettings.getByLabel('Image to video Seed').fill('42');
	await expect(toolbox.getByText('~$1.2 total · 1 generation')).toBeVisible();
	await toolbox
		.getByRole('textbox', { name: 'AI image editing prompt' })
		.fill('Slow cinematic camera orbit');
	const generateVideo = toolbox.getByRole('button', { name: 'Generate AI video' });
	await expect(generateVideo).toBeDisabled();
	await toolbox.getByRole('spinbutton', { name: 'Run spending limit' }).fill('2');
	const confirmation = page.waitForEvent('dialog');
	const submitted = generateVideo.click();
	const dialog = await confirmation;
	expect(dialog.type()).toBe('confirm');
	expect(dialog.message()).toContain('approximately $1.200');
	expect(uploaded).toBeUndefined();
	await dialog.accept();
	await submitted;
	await expect(toolbox.getByRole('region', { name: 'Generated video preview' })).toBeVisible();
	expect(uploaded?.model).toBe('veo-3-1-video');
	expect(uploaded?.settings).toEqual({
		duration: '6s',
		resolution: '1080p',
		generate_audio: false,
		seed: 42
	});
	const history = toolbox.getByRole('region', { name: 'Generated images from this session' });
	await expect(history.locator('.generation-card')).toHaveCount(2);
	await expect(history.getByRole('region', { name: 'Selected generation details' })).toContainText(
		'Slow cinematic camera orbit'
	);
	for (const setting of [
		'Duration: 6 seconds',
		'Resolution: 1080p',
		'Generate audio: Off',
		'Seed: 42'
	]) {
		await expect(history.getByLabel('Generation model settings')).toContainText(setting);
	}
	await videoSettings.getByLabel('Image to video Duration').selectOption('8');
	await videoSettings.getByLabel('Image to video Generate audio').check();
	await history
		.getByRole('button', { name: /Use generation \d+: Slow cinematic camera orbit/ })
		.click();
	await expect(videoSettings.getByLabel('Image to video Duration')).toHaveValue('8');
	await expect(videoSettings.getByLabel('Image to video Generate audio')).toBeChecked();
	await history.getByRole('button', { name: 'Restore reference image, prompt, and model' }).click();
	await expect(videoSettings.getByLabel('Image to video Duration')).toHaveValue('6');
	await expect(videoSettings.getByLabel('Image to video Generate audio')).not.toBeChecked();
	await expect(videoSettings.getByLabel('Image to video Seed')).toHaveValue('42');
	await expect
		.poll(() =>
			page.evaluate(async () => {
				const database = await new Promise((resolve, reject) => {
					const request = indexedDB.open('swyx-draw-generation-history');
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => reject(request.error);
				});
				const record = await new Promise((resolve, reject) => {
					const request = /** @type {IDBDatabase} */ (database)
						.transaction('drawing-pages')
						.objectStore('drawing-pages')
						.get(
							(document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest') + ':default'
						);
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => reject(request.error);
				});
				return /** @type {any} */ (record)?.generations?.find(
					(/** @type {any} */ generation) => generation.modelId === 'veo-3-1-video'
				)?.modelSettings;
			})
		)
		.toMatchObject({
			duration: '6s',
			resolution: '1080p',
			generate_audio: false,
			seed: 42
		});
});

test('prompt editing shows progress, retains session generations, and restores them for local tools', async ({
	page
}) => {
	await mockSignedInPersonalTools(page);
	await page.addInitScript(() => {
		/** @type {any} */ (globalThis).__SWYX_PROCESS_IMAGE_TOOL__ = async (
			/** @type {string} */ _action,
			/** @type {Blob} */ source
		) => source;
	});
	/** @type {Awaited<ReturnType<typeof uploadedFalForm>>[]} */
	const captured = [];
	/** @type {string[]} */
	let outputImages = [];
	/** @type {(() => void) | undefined} */
	let continueFirstGeneration;
	const firstGenerationReady = new Promise((resolve) => {
		continueFirstGeneration = () => resolve(undefined);
	});
	let firstGenerationPolls = 0;
	await page.route('**/tools/api/draw/edit**', async (route) => {
		if (route.request().method() === 'POST') {
			const request = await uploadedFalForm(route.request());
			captured.push(request);
			await route.fulfill({
				status: 202,
				json: {
					requestId: `generation-${captured.length - 1}`,
					model: request.model,
					status: 'IN_QUEUE',
					queuePosition: 2
				}
			});
			return;
		}
		const generationIndex = Number(
			new URL(route.request().url()).searchParams.get('requestId')?.split('-').at(-1)
		);
		if (generationIndex === 0 && firstGenerationPolls++ === 0) {
			await route.fulfill({ json: { status: 'IN_QUEUE', queuePosition: 2 } });
			return;
		}
		if (generationIndex === 0 && firstGenerationPolls === 2) {
			await route.fulfill({ json: { status: 'IN_PROGRESS', message: 'Denoising pass 2 of 8' } });
			return;
		}
		if (generationIndex === 0) await firstGenerationReady;
		await route.fulfill({
			json: {
				status: 'COMPLETED',
				image: outputImages[generationIndex],
				model: 'fal-ai/flux-2/edit'
			}
		});
	});
	const toolbox = await pasteSelectedImage(page);
	const original = await selectedSceneImage(page);
	const originalDataURL = await page.evaluate(() => {
		const scene =
			/** @type {{elements:{type:string,fileId:string}[],files:Record<string,{dataURL:string}>}} */ (
				JSON.parse(
					localStorage.getItem(
						document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
							'swyx-excalidraw:guest'
					) ?? '{"elements":[],"files":{}}'
				)
			);
		const image = scene.elements.find((element) => element.type === 'image');
		return image ? scene.files[image.fileId].dataURL : '';
	});
	outputImages = await page.evaluate(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 460;
		canvas.height = 460;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Could not create mocked generated images.');
		return ['#e45757', '#5076de'].map((color) => {
			context.fillStyle = color;
			context.fillRect(0, 0, canvas.width, canvas.height);
			return canvas.toDataURL('image/png');
		});
	});
	await toolbox.getByRole('button', { name: 'AI prompt', exact: true }).click();
	await chooseOnlyModel(toolbox, 'seedream-5-pro');
	await toolbox.getByRole('button', { name: 'Product mockup' }).click();
	const promptInput = toolbox.getByRole('textbox', { name: 'AI image editing prompt' });
	await expect(toolbox.getByRole('button', { name: 'Generate AI image edit' })).toHaveAttribute(
		'aria-keyshortcuts',
		'Meta+Enter Control+Enter'
	);
	await promptInput.press('Meta+Enter');
	await expect(toolbox.getByRole('progressbar', { name: 'AI generation progress' })).toBeVisible();
	await expect(
		toolbox.getByRole('region', { name: 'Generation queue' }).getByText(/Queued · 2 ahead/)
	).toBeVisible();
	await expect(
		toolbox.getByRole('region', { name: 'Generation queue' }).getByText(/Denoising pass 2 of 8/)
	).toBeVisible();
	await expect(
		toolbox.getByText('Your result will replace the selected image and stay in history.')
	).toBeVisible();
	const drawingCanvas = page.locator('.draw-canvas canvas.excalidraw__canvas.interactive');
	const drawingBounds = await drawingCanvas.boundingBox();
	if (!drawingBounds) throw new Error('The drawing canvas is not visible.');
	await drawingCanvas.click({
		position: { x: drawingBounds.width - 40, y: drawingBounds.height - 120 },
		force: true
	});
	await expect(toolbox.getByRole('progressbar', { name: 'AI generation progress' })).toBeVisible();
	continueFirstGeneration?.();
	await expect.poll(async () => (await selectedSceneImage(page)).fileId).not.toBe(original.fileId);
	expect(captured[0]?.prompt).toMatch(/studio product mockup/i);
	expect(captured[0]?.image).toMatch(/^data:image\//);
	expect(captured[0]?.imageBytes).toBeLessThan(captured[0]?.image.length ?? 0);
	expect(captured[0]?.model).toBe('seedream-5-pro');
	expect(captured[0]?.requestBytes).toBeLessThan(12_000_000);
	await expect(toolbox.getByText('Generated 1 of 1 results')).toBeVisible();
	const history = toolbox.getByRole('region', { name: 'Generated images from this session' });
	await expect(history.locator('.generation-card')).toHaveCount(2);
	await expect(history.getByText('Original', { exact: true })).toBeVisible();
	await expect(history.locator('.generation-card').getByText('Seedream 5.0 Pro')).toBeVisible();
	const generationDetails = history.getByRole('region', { name: 'Selected generation details' });
	await expect(generationDetails.getByLabel('Generation prompt')).toContainText(
		'studio product mockup'
	);
	await expect(generationDetails).toContainText('ByteDance · Precise product 1K edit');
	await expect(generationDetails.getByAltText('Reference image 1')).toHaveAttribute(
		'src',
		originalDataURL
	);
	await expect(generationDetails.getByLabel('Generation history')).toHaveText(
		'Original → Seedream 5.0 Pro'
	);
	await expect
		.poll(async () =>
			page.evaluate(async () => {
				const database = await new Promise((resolve, reject) => {
					const request = indexedDB.open('swyx-draw-generation-history');
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => reject(request.error);
				});
				const record = await new Promise((resolve, reject) => {
					const request = /** @type {IDBDatabase} */ (database)
						.transaction('drawing-pages')
						.objectStore('drawing-pages')
						.get(
							(document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest') + ':default'
						);
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => reject(request.error);
				});
				return /** @type {any} */ (record)?.generations?.find(
					(/** @type {any} */ entry) => entry.modelId === 'seedream-5-pro'
				);
			})
		)
		.toMatchObject({
			modelId: 'seedream-5-pro',
			adapterId: 'fal',
			modelKind: 'image-edit',
			modelWorkflow: 'Precise product 1K edit',
			modelSettings: { image_size: 'auto_1K', output_format: 'jpeg' },
			referenceImages: [
				{
					dataURL: originalDataURL,
					mimeType: originalDataURL.slice(5, originalDataURL.indexOf(';'))
				}
			]
		});
	expect(
		await page.evaluate(() =>
			localStorage.getItem(
				document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
					'swyx-excalidraw:guest'
			)
		)
	).not.toContain('bytedance/seedream/v5/pro/edit');

	await promptInput.fill('A second variation');
	await promptInput.press('Control+Enter');
	await expect(history.locator('.generation-card')).toHaveCount(3);
	await expect(generationDetails.getByLabel('Generation history')).toHaveText(
		'Original → Seedream 5.0 Pro → Seedream 5.0 Pro'
	);
	const latest = await selectedSceneImage(page);
	await history.getByRole('button', { name: /Use generation \d+: Original image/ }).click();
	expect((await selectedSceneImage(page)).fileId).toBe(latest.fileId);
	await generationDetails
		.getByRole('button', { name: 'Replace selected image', exact: true })
		.click();
	await expect.poll(async () => (await selectedSceneImage(page)).fileId).not.toBe(latest.fileId);
	await expect(toolbox.getByText(/Generation restored — Undo available/)).toBeVisible();
	const restoredOriginal = await page.evaluate(() => {
		const scene =
			/** @type {{elements:{type:string,fileId:string}[],files:Record<string,{dataURL:string}>}} */ (
				JSON.parse(
					localStorage.getItem(
						document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
							'swyx-excalidraw:guest'
					) ?? '{"elements":[],"files":{}}'
				)
			);
		const image = scene.elements.find((element) => element.type === 'image');
		return image ? scene.files[image.fileId].dataURL : '';
	});
	expect(restoredOriginal).toBe(originalDataURL);
	const originalRestored = await selectedSceneImage(page);
	await history.getByRole('button', { name: /Use generation 2:.*studio product mockup/i }).click();
	expect((await selectedSceneImage(page)).fileId).toBe(originalRestored.fileId);
	await expect(promptInput).toHaveValue('A second variation');
	await generationDetails
		.getByRole('button', { name: 'Replace selected image', exact: true })
		.click();
	await expect
		.poll(async () => (await selectedSceneImage(page)).fileId)
		.not.toBe(originalRestored.fileId);
	const restored = await page.evaluate(() => {
		const scene =
			/** @type {{elements:{type:string,fileId:string}[],files:Record<string,{dataURL:string}>}} */ (
				JSON.parse(
					localStorage.getItem(
						document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
							'swyx-excalidraw:guest'
					) ?? '{"elements":[],"files":{}}'
				)
			);
		const image = scene.elements.find((element) => element.type === 'image');
		return image ? scene.files[image.fileId].dataURL : '';
	});
	expect(restored).toBe(outputImages[0]);
	await expect(promptInput).toHaveValue('A second variation');
	const generationsBeforeRecipe = captured.length;
	await generationDetails
		.getByRole('button', { name: 'Restore reference image, prompt, and model' })
		.click();
	await expect(
		toolbox.getByText(/Recipe restored — edit it, then generate when ready/)
	).toBeVisible();
	expect(
		await page.evaluate(() => {
			const scene = /** @type {any} */ (
				JSON.parse(
					localStorage.getItem(
						document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
							'swyx-excalidraw:guest'
					) ?? '{}'
				)
			);
			const image = scene.elements.find((/** @type {any} */ element) => element.type === 'image');
			return scene.files[image.fileId].dataURL;
		})
	).toBe(outputImages[0]);
	await expect(toolbox.getByAltText('Reference attached to this draft')).toHaveAttribute(
		'src',
		originalDataURL
	);
	await expect(promptInput).toHaveValue(/studio product mockup/i);
	await expect(
		toolbox.getByRole('button', { name: 'AI model and workflow selector' })
	).toContainText('Seedream 5.0 Pro');
	expect(captured).toHaveLength(generationsBeforeRecipe);
	await history.getByRole('button', { name: /Use generation 2:.*studio product mockup/i }).click();
	await toolbox.getByRole('button', { name: 'Magic Select', exact: true }).click();
	await expect(history.locator('.generation-card')).toHaveCount(3);
	const selectedGeneration = await selectedSceneImage(page);
	await toolbox.getByRole('button', { name: 'Apply Magic Select' }).click();
	await expect
		.poll(async () => (await selectedSceneImage(page)).fileId)
		.not.toBe(selectedGeneration.fileId);

	await page.reload();
	const restoredCanvas = page.locator('.draw-canvas canvas.excalidraw__canvas.interactive');
	await expect(restoredCanvas).toBeVisible();
	await restoredCanvas.click({ position: { x: 360, y: 280 }, force: true });
	const restoredHistory = page
		.getByLabel('AI image toolbox')
		.getByRole('region', { name: 'Generated images from this session' });
	await expect(restoredHistory.locator('.generation-card')).toHaveCount(3);
	await expect(
		restoredHistory.getByRole('region', { name: 'Selected generation details' })
	).toContainText('studio product mockup');
	await expect(restoredHistory.getByAltText('Reference image 1')).toHaveAttribute(
		'src',
		originalDataURL
	);
});

for (const model of [
	{ id: 'nano-banana-2', mimeType: 'image/webp', maxPixels: 1_048_576 },
	{ id: 'gpt-image-2', mimeType: 'image/webp', maxPixels: 1_572_864 },
	{ id: 'seedream-5-pro', mimeType: 'image/jpeg', maxPixels: 1_048_576 },
	{ id: 'nano-banana-pro', mimeType: 'image/webp', maxPixels: 1_048_576 },
	{ id: 'flux-2', mimeType: 'image/webp', maxPixels: 1_048_576 }
]) {
	test(`${model.id} automatically downsizes oversized references to its documented model budget`, async ({
		page
	}) => {
		await mockSignedInPersonalTools(page);
		await page.addInitScript(() => {
			/** @type {any} */ (globalThis).__SWYX_PROCESS_IMAGE_TOOL__ = async (
				/** @type {string} */ _action,
				/** @type {Blob} */ source
			) => new Blob([source, new Uint8Array(1_400_000)], { type: source.type });
		});
		/** @type {Awaited<ReturnType<typeof uploadedFalForm>> | undefined} */
		let uploaded;
		let requestBytes = 0;
		await page.route('**/tools/api/draw/edit**', async (route) => {
			if (route.request().method() === 'POST') {
				uploaded = await uploadedFalForm(route.request());
				requestBytes = uploaded.requestBytes;
				await route.fulfill({
					status: 202,
					json: { requestId: 'optimized-job', model: model.id, status: 'IN_QUEUE' }
				});
				return;
			}
			await route.fulfill({
				json: { status: 'COMPLETED', image: uploaded?.image, model: model.id }
			});
		});
		const toolbox = await pasteSelectedImage(page, { width: 2400, height: 1600, noisy: true });
		const imported = await selectedSceneImage(page);
		await toolbox.getByRole('button', { name: 'Apply Magic Select' }).click();
		await expect
			.poll(async () => (await selectedSceneImage(page)).fileId)
			.not.toBe(imported.fileId);
		const original = await selectedSceneImage(page);
		const originalBytes = await page.evaluate(() => {
			const scene =
				/** @type {{elements:{type:string,fileId:string}[],files:Record<string,{dataURL:string}>}} */ (
					JSON.parse(
						localStorage.getItem(
							document.querySelector('.draw-canvas')?.getAttribute('data-storage-key') ||
								'swyx-excalidraw:guest'
						) ?? '{"elements":[],"files":{}}'
					)
				);
			const image = scene.elements.find((element) => element.type === 'image');
			return image ? new TextEncoder().encode(scene.files[image.fileId].dataURL).byteLength : 0;
		});
		expect(originalBytes).toBeGreaterThan(1_900_000);
		await toolbox.getByRole('button', { name: 'AI prompt', exact: true }).click();
		await chooseOnlyModel(toolbox, model.id);
		await expect(toolbox.getByText(/Large images automatically fit/)).toBeVisible();
		await toolbox
			.getByRole('textbox', { name: 'AI image editing prompt' })
			.fill('Preserve the entire image');
		await toolbox.getByRole('button', { name: 'Generate AI image edit' }).click();
		await expect
			.poll(async () => (await selectedSceneImage(page)).fileId)
			.not.toBe(original.fileId);
		expect(requestBytes).toBeLessThan(12_000_000);
		expect(requestBytes).toBeLessThan((uploaded?.image.length ?? 0) + 1000);
		expect(uploaded?.model).toBe(model.id);
		expect(uploaded?.imageMimeType).toBe(model.mimeType);
		expect(uploaded?.image.startsWith(`data:${model.mimeType};base64,`)).toBe(true);
		const dimensions = await page.evaluate(async (image) => {
			if (!image) throw new Error('No optimized image was uploaded.');
			const bitmap = await createImageBitmap(
				await fetch(image).then((response) => response.blob())
			);
			return { width: bitmap.width, height: bitmap.height };
		}, uploaded?.image);
		expect(dimensions.width * dimensions.height).toBeLessThanOrEqual(model.maxPixels);
		expect(dimensions.width).toBeLessThanOrEqual(2048);
		expect(dimensions.height).toBeLessThanOrEqual(2048);
		expect(Math.abs(dimensions.width / dimensions.height - 1.5)).toBeLessThan(0.01);
		const result = await selectedSceneImage(page);
		expect(result.width).toBe(original.width);
		expect(result.height).toBe(original.height);
	});
}

test('the drawing AI action shares the Google owner session', async ({ page }) => {
	let toolbox = await pasteSelectedImage(page);
	await toolbox.getByRole('button', { name: 'AI prompt', exact: true }).click();
	const signIn = toolbox.getByRole('link', { name: 'Sign in to generate' });
	await expect(signIn).toBeVisible();
	await expect(toolbox.getByText(/Sign in required/)).toBeVisible();

	await signIn.click();
	await expect(page).toHaveURL(/\/tools\?next=(?:%2F|\/)draw$/);
	await expect(page.getByRole('link', { name: 'Sign in with Google' })).toHaveAttribute(
		'href',
		'/tools/auth/google?next=%2Fdraw'
	);
	await authenticateTools(page);
	await page.goto('/draw');
	await expect(page).toHaveURL(/\/draw$/);

	const status = await page.request.get(`${new URL(page.url()).origin}/tools/api/session`);
	expect(status.ok()).toBe(true);
	expect(await status.json()).toMatchObject({
		authenticated: true,
		user: { id: TEST_TOOLS_OWNER.id, isOwner: true }
	});
	expect(status.headers()['cache-control']).toContain('no-store');

	toolbox = await pasteSelectedImage(page);
	await toolbox.getByRole('button', { name: 'AI prompt', exact: true }).click();
	await expect(toolbox.getByText(/Funded by swyx.io/)).toBeVisible();
	await expect(toolbox.getByRole('button', { name: 'Generate AI image edit' })).toBeVisible();
	await expect(toolbox.getByRole('link', { name: 'Sign in to generate' })).toHaveCount(0);
});
