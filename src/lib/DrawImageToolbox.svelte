<script>
	import { DRAW_IMAGE_TOOLS, processImageTool } from '$lib/draw-image-tools.js';
	import { replaceDrawingImage } from '$lib/draw-image-scene.js';

	/**
	 * @typedef {import('@excalidraw/excalidraw/types').ExcalidrawImperativeAPI} DrawingEditor
	 * @typedef {'magic-select' | 'magic-eraser' | 'depth-blur' | 'vectorize'} ImageAction
	 */

	/** @type {{
	 *  editor: DrawingEditor,
	 *  imageId: string,
	 *  imageDataUrl: string,
	 *  updateElement: typeof import('@excalidraw/excalidraw').newElementWith,
	 *  captureUpdate: typeof import('@excalidraw/excalidraw').CaptureUpdateAction.IMMEDIATELY,
	 *  cloudAvailable?: boolean,
	 *  onCloudLimit?: () => void
	 * }} */
	let {
		editor,
		imageId,
		imageDataUrl,
		updateElement,
		captureUpdate,
		cloudAvailable = false,
		onCloudLimit
	} = $props();

	const PROMPT_PRESETS = [
		{
			label: 'Remove distractions',
			prompt:
				'Remove distracting objects and clutter while preserving the main subject and composition.'
		},
		{
			label: 'Sketch',
			prompt: 'Restyle this image as a clean, expressive hand-drawn pencil sketch.'
		},
		{
			label: 'Improve lighting',
			prompt:
				'Improve the lighting with natural, balanced illumination while preserving the subject.'
		},
		{
			label: 'Change background',
			prompt: 'Replace the background with a clean, complementary setting that suits the subject.'
		},
		{
			label: 'Product mockup',
			prompt: 'Turn this image into a polished studio product mockup with professional lighting.'
		}
	];

	/** @type {ImageAction} */
	let action = $state('magic-select');
	let imagePreview = $state('');
	let targetX = $state(0.5);
	let targetY = $state(0.5);
	let eraserRadius = $state(0.12);
	let blurStrength = $state(14);
	let focusDepth = $state(0.55);
	let prompt = $state('');
	let operationStatus = $state('');
	let operationProgress = $state(0);
	let operationError = $state('');
	let processing = $state(false);
	let processingFal = $state(false);
	/** @type {AbortController | undefined} */
	let operationAbort;
	const selectedTool = $derived(DRAW_IMAGE_TOOLS[action]);
	const needsTarget = $derived(action === 'magic-select' || action === 'magic-eraser');
	const downloadSize = $derived(
		selectedTool?.downloadBytes ? `~${(selectedTool.downloadBytes / 1_000_000).toFixed(1)} MB` : ''
	);

	$effect(() => {
		imagePreview = imageDataUrl;
		operationError = '';
		return () => operationAbort?.abort();
	});

	/** @param {Blob} blob */
	function readDataUrl(blob) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(/** @type {string} */ (reader.result));
			reader.onerror = () => reject(reader.error ?? new Error('Could not read the edited image.'));
			reader.readAsDataURL(blob);
		});
	}

	function selectedImage() {
		const image = editor
			.getSceneElements()
			.find((element) => element.id === imageId && element.type === 'image');
		if (!image || image.type !== 'image' || !image.fileId) {
			throw new Error('Select one canvas image before applying an edit.');
		}
		const file = editor.getFiles()[image.fileId];
		if (!file?.dataURL) throw new Error('The selected image could not be loaded.');
		return { image, file };
	}

	/**
	 * @param {{ phase: 'download' | 'processing', progress?: number, percent?: number, loaded?: number, total?: number, label?: string, message?: string }} update
	 */
	function updateProgress(update) {
		const progress =
			update.progress ??
			(update.percent === undefined ? undefined : update.percent / 100) ??
			(update.total ? (update.loaded ?? 0) / update.total : undefined);
		operationProgress =
			progress === undefined ? 0 : Math.round(Math.max(0, Math.min(1, progress)) * 100);
		operationStatus =
			update.label ??
			update.message ??
			(update.phase === 'download'
				? `Downloading ${downloadSize} model`
				: `Applying ${selectedTool?.label ?? 'image edit'}`);
	}

	/** @param {MouseEvent} event */
	function chooseTarget(event) {
		const bounds = /** @type {HTMLElement} */ (event.currentTarget).getBoundingClientRect();
		targetX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
		targetY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
	}

	/**
	 * @param {{ image: import('@excalidraw/excalidraw/element/types').ExcalidrawImageElement }} selected
	 * @param {string} dataURL
	 * @param {string} mimeType
	 * @param {string} success
	 */
	function insertEditedImage(selected, dataURL, mimeType, success) {
		if (!selected.image.fileId) throw new Error('The selected image is unavailable.');
		const result = replaceDrawingImage({
			editor,
			imageId: selected.image.id,
			sourceFileId: selected.image.fileId,
			dataURL,
			mimeType,
			updateElement,
			captureUpdate,
			cloudAvailable
		});
		imagePreview = result.dataURL;
		operationStatus = success;
		operationProgress = 100;
		if (result.exceedsCloudLimit) {
			onCloudLimit?.();
			operationError = 'Saved on this device only: image exceeds the 1.8 MB cloud limit.';
		}
	}

	async function applyLocalImageTool() {
		if (processing || processingFal) return;
		processing = true;
		operationProgress = 0;
		operationStatus = 'Preparing image';
		operationError = '';
		operationAbort = new AbortController();
		try {
			const selected = selectedImage();
			const source = await fetch(selected.file.dataURL).then((response) => response.blob());
			const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
			const browserTestProcessor = loopback
				? /** @type {any} */ (globalThis).__SWYX_PROCESS_IMAGE_TOOL__
				: undefined;
			const result = await (browserTestProcessor ?? processImageTool)(action, source, {
				point: { x: targetX, y: targetY },
				radius: eraserRadius,
				blur: blurStrength,
				focus: focusDepth,
				onProgress: updateProgress,
				signal: operationAbort.signal
			});
			operationAbort.signal.throwIfAborted();
			const dataURL = await readDataUrl(result);
			insertEditedImage(
				selected,
				dataURL,
				result.type || 'image/png',
				`${selectedTool?.label ?? 'Image edit'} applied`
			);
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				operationStatus = '';
			} else {
				operationError = error instanceof Error ? error.message : 'Could not edit the image.';
				operationStatus = '';
			}
		} finally {
			processing = false;
			operationAbort = undefined;
		}
	}

	async function applyFalEdit() {
		if (processing || processingFal || !prompt.trim()) return;
		processingFal = true;
		operationProgress = 0;
		operationStatus = 'Uploading the selected image to fal.ai';
		operationError = '';
		operationAbort = new AbortController();
		try {
			const selected = selectedImage();
			const response = await fetch('/tools/api/draw/edit', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ image: selected.file.dataURL, prompt: prompt.trim() }),
				signal: operationAbort.signal
			});
			const result = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(
					result.error ??
						(response.status === 401
							? 'Sign in to use cloud image editing.'
							: 'The cloud image edit could not be completed.')
				);
			}
			if (typeof result.image !== 'string' || !result.image.startsWith('data:image/')) {
				throw new Error('The image-editing service returned an invalid image.');
			}
			operationAbort.signal.throwIfAborted();
			const mimeType = result.image.slice(5, result.image.indexOf(';')) || 'image/png';
			insertEditedImage(selected, result.image, mimeType, 'AI edit applied');
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				operationStatus = '';
			} else {
				operationError = error instanceof Error ? error.message : 'Could not edit the image.';
				operationStatus = '';
			}
		} finally {
			processingFal = false;
			operationAbort = undefined;
		}
	}
</script>

<div class="image-toolbox" aria-label="AI image toolbox">
	<div class="toolbox-heading">
		<strong>Image toolbox</strong>
		<span>Runs privately on your device</span>
	</div>

	<div class="tool-grid" aria-label="On-device image actions">
		{#each Object.values(DRAW_IMAGE_TOOLS) as tool (tool.id)}
			<button
				type="button"
				class="tool-choice"
				class:active={action === tool.id}
				aria-pressed={action === tool.id}
				disabled={processing || processingFal}
				onclick={() => {
					action = /** @type {ImageAction} */ (tool.id);
					operationError = '';
				}}
			>
				{tool.label}
			</button>
		{/each}
	</div>

	{#if needsTarget && imagePreview}
		<button
			type="button"
			class="image-target"
			aria-label={action === 'magic-eraser'
				? 'Choose the area to erase'
				: 'Choose the subject to select'}
			disabled={processing || processingFal}
			onclick={chooseTarget}
		>
			<img src={imagePreview} alt="Selected canvas artwork" />
			<span class="target-marker" style="left: {targetX * 100}%; top: {targetY * 100}%"></span>
		</button>
		<p class="tool-hint">
			{action === 'magic-eraser'
				? 'Click the image to choose what to erase.'
				: 'Click the subject you want to isolate.'}
		</p>
	{/if}

	{#if action === 'magic-eraser'}
		<label class="tool-slider">
			<span>Eraser size</span>
			<input
				type="range"
				min="0.03"
				max="0.3"
				step="0.01"
				bind:value={eraserRadius}
				disabled={processing || processingFal}
			/>
		</label>
	{:else if action === 'depth-blur'}
		<label class="tool-slider">
			<span>Blur strength</span>
			<input
				type="range"
				min="2"
				max="30"
				step="1"
				bind:value={blurStrength}
				disabled={processing || processingFal}
			/>
		</label>
		<label class="tool-slider">
			<span>Focus depth</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				bind:value={focusDepth}
				disabled={processing || processingFal}
			/>
		</label>
	{/if}

	<div class="local-action-row">
		<span class="download-size">
			{downloadSize ? `First use downloads ${downloadSize}.` : 'No model download required.'}
		</span>
		{#if processing}
			<button type="button" class="secondary-action" onclick={() => operationAbort?.abort()}>
				Cancel
			</button>
		{:else}
			<button
				type="button"
				class="primary-action"
				aria-label="Apply {selectedTool?.label ?? 'image tool'}"
				disabled={processingFal}
				onclick={() => void applyLocalImageTool()}
			>
				Apply
			</button>
		{/if}
	</div>

	<div class="fal-edit">
		<div class="toolbox-heading">
			<strong>AI prompt edit</strong>
			<span>Uploads this image to fal.ai</span>
		</div>
		<textarea
			aria-label="AI image editing prompt"
			placeholder="Describe how you want to edit this image…"
			rows="2"
			maxlength="1000"
			bind:value={prompt}
			disabled={processing || processingFal}
		></textarea>
		<div class="prompt-presets" aria-label="Editable image prompt presets">
			{#each PROMPT_PRESETS as preset (preset.label)}
				<button
					type="button"
					disabled={processing || processingFal}
					onclick={() => (prompt = preset.prompt)}
				>
					{preset.label}
				</button>
			{/each}
		</div>
		<div class="fal-action-row">
			<span>Cloud processing · requires sign-in</span>
			{#if processingFal}
				<button type="button" class="secondary-action" onclick={() => operationAbort?.abort()}>
					Cancel
				</button>
			{:else}
				<button
					type="button"
					class="fal-action"
					aria-label="Generate AI image edit"
					disabled={processing || !prompt.trim()}
					onclick={() => void applyFalEdit()}
				>
					Generate
				</button>
			{/if}
		</div>
	</div>

	{#if processing || processingFal}
		<div class="operation-progress" aria-live="polite">
			<span>{operationStatus}{operationProgress ? ` · ${operationProgress}%` : ''}</span>
			<progress aria-label="Image editing progress" max="100" value={operationProgress || undefined}
			></progress>
		</div>
	{:else if operationError}
		<p class="operation-error" role="alert">{operationError}</p>
	{:else if operationStatus}
		<p class="operation-success" role="status">{operationStatus}</p>
	{/if}
</div>

<style>
	.image-toolbox {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid #ececf0;
	}

	.toolbox-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 11px;
	}

	.toolbox-heading span,
	.download-size,
	.fal-action-row > span,
	.tool-hint {
		color: #71717a;
		font-size: 10px;
	}

	.tool-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
		margin-top: 9px;
	}

	.tool-choice {
		min-height: 31px;
		border: 1px solid #e4e4e7;
		border-radius: 7px;
		background: #fff;
		color: #3f3f46;
		font-size: 10px;
		cursor: pointer;
	}

	.tool-choice.active {
		border-color: #aaa2ed;
		background: #f1efff;
		color: #5142ab;
	}

	.image-target {
		position: relative;
		display: block;
		width: 100%;
		height: 96px;
		margin-top: 9px;
		padding: 0;
		border: 1px solid #e4e4e7;
		border-radius: 7px;
		background: repeating-conic-gradient(#f4f4f5 0 25%, #fff 0 50%) 50% / 14px 14px;
		overflow: hidden;
		cursor: crosshair;
	}

	.image-target img {
		width: 100%;
		height: 100%;
		object-fit: fill;
	}

	.target-marker {
		position: absolute;
		width: 15px;
		height: 15px;
		transform: translate(-50%, -50%);
		border: 2px solid #fff;
		border-radius: 50%;
		background: #6554c0;
		box-shadow: 0 0 0 1px #6554c0;
		pointer-events: none;
	}

	.tool-hint {
		margin: 5px 0 0;
	}

	.tool-slider {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 9px;
		margin-top: 9px;
		color: #52525b;
		font-size: 10px;
	}

	.tool-slider input {
		width: 57%;
		accent-color: #6554c0;
	}

	.local-action-row,
	.fal-action-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-top: 9px;
	}

	.primary-action,
	.secondary-action,
	.fal-action {
		height: 30px;
		padding: 0 11px;
		border: 0;
		border-radius: 6px;
		background: #6554c0;
		color: #fff;
		font-size: 10px;
		font-weight: 550;
		cursor: pointer;
	}

	.secondary-action {
		background: #ecebf2;
		color: #27272a;
	}

	.fal-edit {
		margin-top: 12px;
		padding-top: 11px;
		border-top: 1px solid #ececf0;
	}

	.fal-edit textarea {
		box-sizing: border-box;
		width: 100%;
		margin-top: 8px;
		padding: 8px;
		border: 1px solid #dedee6;
		border-radius: 7px;
		background: #fff;
		color: #27272a;
		font: inherit;
		font-size: 11px;
		resize: vertical;
		outline-color: #7768e5;
	}

	.prompt-presets {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		margin-top: 6px;
	}

	.prompt-presets button {
		padding: 4px 7px;
		border: 1px solid #e8e8ed;
		border-radius: 999px;
		background: #fafafa;
		color: #52525b;
		font-size: 9px;
		cursor: pointer;
	}

	.operation-progress {
		display: grid;
		gap: 5px;
		margin-top: 9px;
		color: #52525b;
		font-size: 10px;
	}

	.operation-progress progress {
		width: 100%;
		height: 5px;
		accent-color: #6554c0;
	}

	.operation-error,
	.operation-success {
		margin: 8px 0 0;
		font-size: 10px;
		line-height: 1.45;
	}

	.operation-error {
		color: #c53434;
	}

	.operation-success {
		color: #328357;
	}

	button:disabled,
	textarea:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}
</style>
