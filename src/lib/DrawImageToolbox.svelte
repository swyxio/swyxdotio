<script>
	import { DRAW_IMAGE_TOOLS, processImageTool } from '$lib/draw-image-tools.js';
	import { prepareDrawingFalImage } from '$lib/draw-fal-image.js';
	import { runDrawingFalGeneration } from '$lib/draw-fal-queue.js';
	import { optimizeDrawingImageForCloud, replaceDrawingImage } from '$lib/draw-image-scene.js';
	import { DEFAULT_DRAW_FAL_MODEL, DRAW_FAL_MODELS } from '$lib/draw-fal-models.js';

	/**
	 * @typedef {import('@excalidraw/excalidraw/types').ExcalidrawImperativeAPI} DrawingEditor
	 * @typedef {'magic-select' | 'magic-eraser' | 'depth-blur' | 'vectorize'} ImageAction
	 * @typedef {{ id: string, dataURL: string, mimeType: string, prompt: string, modelLabel: string, createdAt: number }} ImageGeneration
	 */

	/** @type {{
	 *  editor: DrawingEditor,
	 *  imageId: string,
	 *  imageDataUrl: string,
	 *  action?: ImageAction | 'background' | 'fal' | null,
	 *  prompt?: string,
	 *  operationStatus?: string,
	 *  selectedFalModelIds?: string[],
	 *  updateElement: typeof import('@excalidraw/excalidraw').newElementWith,
	 *  captureUpdate: typeof import('@excalidraw/excalidraw').CaptureUpdateAction.IMMEDIATELY,
	 *  cloudAvailable?: boolean,
	 *  authenticated?: boolean,
	 *  onCloudLimit?: () => void,
	 *  backgroundProcessing?: boolean,
	 *  backgroundControls?: import('svelte').Snippet,
	 *  generations?: ImageGeneration[],
	 *  onGeneration?: (generation: ImageGeneration) => void,
	 *  onProcessingChange?: (processing: boolean) => void,
	 *  onDragStart?: (event: PointerEvent) => void
	 * }} */
	let {
		editor,
		imageId,
		imageDataUrl,
		action = $bindable(null),
		prompt = $bindable(''),
		operationStatus = $bindable(''),
		selectedFalModelIds = $bindable([DEFAULT_DRAW_FAL_MODEL.id]),
		updateElement,
		captureUpdate,
		cloudAvailable = false,
		authenticated = false,
		onCloudLimit,
		backgroundProcessing = false,
		backgroundControls,
		generations = [],
		onGeneration,
		onProcessingChange,
		onDragStart
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
	const FAL_WORKFLOW_FOLDERS = /** @type {const} */ ([
		{ kind: 'text-to-image', label: 'Text to image' },
		{ kind: 'image-edit', label: 'Image editing' },
		{ kind: 'image-to-video', label: 'Image to video' }
	]);

	let imagePreview = $state('');
	let targetX = $state(0.5);
	let targetY = $state(0.5);
	let targetMarkerX = $state(0.5);
	let targetMarkerY = $state(0.5);
	let eraserRadius = $state(0.12);
	let blurStrength = $state(14);
	let focusDepth = $state(0.55);
	let modelPickerOpen = $state(false);
	let activeVideoGenerationId = $state('');
	let operationProgress = $state(0);
	let operationError = $state('');
	let processing = $state(false);
	let processingFal = $state(false);
	/** @type {AbortController | undefined} */
	let operationAbort;
	/** @type {{ requestId: string, model: string } | undefined} */
	let activeFalJob;
	const selectedTool = $derived(
		action && action !== 'background' && action !== 'fal' ? DRAW_IMAGE_TOOLS[action] : undefined
	);
	const needsTarget = $derived(action === 'magic-select' || action === 'magic-eraser');
	const orderedFalModels = $derived(
		[...DRAW_FAL_MODELS].sort((left, right) => left.priceUsd - right.priceUsd)
	);
	const falWorkflowFolders = $derived(
		FAL_WORKFLOW_FOLDERS.map((folder) => ({
			...folder,
			models: orderedFalModels.filter((model) => model.kind === folder.kind)
		})).filter((folder) => folder.models.length > 0)
	);
	const selectedFalModels = $derived(
		orderedFalModels.filter((model) => selectedFalModelIds.includes(model.id))
	);
	const selectedFalModel = $derived(selectedFalModels[0] ?? DEFAULT_DRAW_FAL_MODEL);
	const estimatedFalCost = $derived(
		selectedFalModels.reduce((total, model) => total + model.priceUsd, 0)
	);
	const uploadsSelectedImage = $derived(
		selectedFalModels.some((model) => model.kind !== 'text-to-image')
	);
	const activeVideoGeneration = $derived(
		generations.find((generation) => generation.id === activeVideoGenerationId)
	);
	const downloadSize = $derived(
		selectedTool?.downloadBytes ? `~${(selectedTool.downloadBytes / 1_000_000).toFixed(1)} MB` : ''
	);

	$effect(() => {
		imagePreview = imageDataUrl;
		operationError = '';
	});

	$effect(() => {
		return () => operationAbort?.abort();
	});

	/** @param {typeof DRAW_FAL_MODELS[number]} model */
	function modelReferenceNote(model) {
		if (model.referenceImages === 0) return 'Prompt only · no image upload';
		if (model.referenceImages === 1) return '1 reference image';
		if (model.referenceImages === null) return 'Multiple reference images';
		return `Up to ${model.referenceImages} reference images`;
	}

	/** @param {string} modelId */
	function toggleFalModel(modelId) {
		selectedFalModelIds = selectedFalModelIds.includes(modelId)
			? selectedFalModelIds.filter((id) => id !== modelId)
			: [...selectedFalModelIds, modelId];
	}

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
		const container = /** @type {HTMLElement} */ (event.currentTarget);
		const bounds = container.getBoundingClientRect();
		const image = container.querySelector('img');
		if (!image?.naturalWidth || !image.naturalHeight) return;
		const scale = Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
		const imageWidth = image.naturalWidth * scale;
		const imageHeight = image.naturalHeight * scale;
		const imageLeft = (bounds.width - imageWidth) / 2;
		const imageTop = (bounds.height - imageHeight) / 2;
		targetX = Math.min(1, Math.max(0, (event.clientX - bounds.left - imageLeft) / imageWidth));
		targetY = Math.min(1, Math.max(0, (event.clientY - bounds.top - imageTop) / imageHeight));
		targetMarkerX = (imageLeft + targetX * imageWidth) / bounds.width;
		targetMarkerY = (imageTop + targetY * imageHeight) / bounds.height;
	}

	/**
	 * @param {{ image: import('@excalidraw/excalidraw/element/types').ExcalidrawImageElement }} selected
	 * @param {string} dataURL
	 * @param {string} mimeType
	 * @param {string} success
	 */
	async function insertEditedImage(selected, dataURL, mimeType, success) {
		if (!selected.image.fileId) throw new Error('The selected image is unavailable.');
		if (cloudAvailable) {
			const optimized = await optimizeDrawingImageForCloud({
				editor,
				imageId: selected.image.id,
				sourceFileId: selected.image.fileId,
				dataURL,
				mimeType,
				signal: operationAbort?.signal,
				onOptimize: () => {
					operationStatus = 'Optimizing image for cloud sync';
				}
			});
			dataURL = optimized.dataURL;
			mimeType = optimized.mimeType;
		}
		operationAbort?.signal.throwIfAborted();
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
		return result;
	}

	async function applyLocalImageTool() {
		if (processing || processingFal || !selectedTool) return;
		const selectedAction = /** @type {ImageAction} */ (action);
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
			const result = await (browserTestProcessor ?? processImageTool)(selectedAction, source, {
				point: { x: targetX, y: targetY },
				radius: eraserRadius,
				blur: blurStrength,
				focus: focusDepth,
				onProgress: updateProgress,
				signal: operationAbort.signal
			});
			operationAbort.signal.throwIfAborted();
			const dataURL = await readDataUrl(result);
			await insertEditedImage(
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
		if (
			processing ||
			processingFal ||
			!authenticated ||
			!prompt.trim() ||
			!selectedFalModels.length
		)
			return;
		const generationPrompt = prompt.trim();
		const generationModels = [...selectedFalModels];
		processingFal = true;
		onProcessingChange?.(true);
		modelPickerOpen = false;
		operationProgress = 0;
		operationStatus = `Generating with ${generationModels[0].label}`;
		operationError = '';
		const generationAbort = new AbortController();
		operationAbort = generationAbort;
		try {
			const source = selectedImage();
			let originalRemembered = generations.some((entry) => entry.dataURL === source.file.dataURL);
			/** @type {string[]} */
			const failures = [];
			let completed = 0;
			for (const [index, generationModel] of generationModels.entries()) {
				generationAbort.signal.throwIfAborted();
				const prefix =
					generationModels.length > 1 ? `${index + 1}/${generationModels.length} · ` : '';
				operationStatus = `${prefix}Generating with ${generationModel.label}`;
				try {
					const prepared =
						generationModel.kind === 'text-to-image'
							? undefined
							: await prepareDrawingFalImage({
									dataURL: source.file.dataURL,
									prompt: generationPrompt,
									model: generationModel,
									signal: generationAbort.signal,
									onProgress: (message) => {
										operationStatus = `${prefix}${message}`;
									}
								});
					const result = await runDrawingFalGeneration({
						image: prepared?.blob,
						prompt: generationPrompt,
						model: generationModel.id,
						signal: generationAbort.signal,
						onProgress: (update) => {
							if (update.requestId)
								activeFalJob = { requestId: update.requestId, model: generationModel.id };
							const elapsedSeconds = Math.floor((update.elapsedMs ?? 0) / 1000);
							const elapsed = elapsedSeconds >= 5 ? ` · ${elapsedSeconds}s elapsed` : '';
							if (update.status === 'UPLOADING') {
								operationStatus =
									generationModel.kind === 'text-to-image'
										? `${prefix}Sending prompt to ${generationModel.label}`
										: `${prefix}Uploading optimized image to ${generationModel.label}`;
							} else if (update.status === 'IN_QUEUE') {
								const position = update.queuePosition;
								operationStatus =
									typeof position === 'number' && Number.isSafeInteger(position) && position > 0
										? `${prefix}Waiting for ${generationModel.label} · ${position} ahead${elapsed}`
										: `${prefix}Waiting for ${generationModel.label}${elapsed}`;
							} else {
								operationStatus = `${prefix}${update.message || `Generating with ${generationModel.label}`}${elapsed}`;
							}
						}
					});
					generationAbort.signal.throwIfAborted();
					if (!originalRemembered) {
						onGeneration?.({
							id: crypto.randomUUID(),
							dataURL: source.file.dataURL,
							mimeType: source.file.mimeType,
							prompt: 'Original image',
							modelLabel: 'Original',
							createdAt: Date.now()
						});
						originalRemembered = true;
					}
					if (generationModel.kind === 'image-to-video') {
						const id = crypto.randomUUID();
						onGeneration?.({
							id,
							dataURL: result.video,
							mimeType: 'video/mp4',
							prompt: generationPrompt,
							modelLabel: generationModel.label,
							createdAt: Date.now()
						});
						activeVideoGenerationId = id;
						operationStatus = 'Video generated — preview or download below';
					} else {
						operationStatus = `${prefix}Preparing your generated image`;
						const mimeType = result.image.slice(5, result.image.indexOf(';')) || 'image/png';
						const edited = await insertEditedImage(
							selectedImage(),
							result.image,
							mimeType,
							'AI edit applied'
						);
						onGeneration?.({
							id: crypto.randomUUID(),
							dataURL: edited.dataURL,
							mimeType: edited.mimeType,
							prompt: generationPrompt,
							modelLabel: generationModel.label,
							createdAt: Date.now()
						});
					}
					completed += 1;
					operationProgress = Math.round((completed / generationModels.length) * 100);
					activeFalJob = undefined;
				} catch (error) {
					if (error instanceof Error && error.name === 'AbortError') throw error;
					failures.push(
						`${generationModel.label}: ${error instanceof Error ? error.message : 'Generation failed'}`
					);
				}
			}
			if (failures.length) operationError = failures.join(' · ');
			if (generationModels.length > 1 && completed)
				operationStatus = `Generated ${completed} of ${generationModels.length} results`;
			if (!completed && failures.length) operationStatus = '';
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') operationStatus = '';
			else {
				operationError = error instanceof Error ? error.message : 'Could not edit the image.';
				operationStatus = '';
			}
		} finally {
			processingFal = false;
			onProcessingChange?.(false);
			operationAbort = undefined;
			activeFalJob = undefined;
		}
	}

	function cancelFalGeneration() {
		const job = activeFalJob;
		operationAbort?.abort();
		if (!job) return;
		const query = new URLSearchParams(job);
		void fetch(`/tools/api/draw/edit?${query}`, {
			method: 'DELETE',
			credentials: 'same-origin'
		}).catch(() => {});
	}

	/** @param {ImageGeneration} generation */
	async function restoreGeneration(generation) {
		if (processing || processingFal || backgroundProcessing) return;
		if (generation.mimeType.startsWith('video/')) {
			activeVideoGenerationId = generation.id;
			operationError = '';
			operationStatus = 'Video ready — preview or download below';
			return;
		}
		activeVideoGenerationId = '';
		processing = true;
		operationProgress = 0;
		operationError = '';
		operationStatus = 'Restoring generated image';
		operationAbort = new AbortController();
		try {
			const restoredLabel =
				generation.modelLabel === 'Original' ? 'Original image restored' : 'Generation restored';
			await insertEditedImage(
				selectedImage(),
				generation.dataURL,
				generation.mimeType,
				`${restoredLabel} — choose any tool to edit it`
			);
		} catch (error) {
			if (!(error instanceof Error && error.name === 'AbortError')) {
				operationError = error instanceof Error ? error.message : 'Could not restore the image.';
			}
		} finally {
			processing = false;
			operationAbort = undefined;
		}
	}
</script>

<div class="image-toolbox" aria-label="AI image toolbox">
	<button
		type="button"
		class="toolbox-heading drag-handle"
		aria-label="Move image tools"
		onpointerdown={(event) => onDragStart?.(event)}
	>
		<strong>Image tools</strong>
		<span>
			{action === 'fal'
				? uploadsSelectedImage
					? 'Uploads this image to fal.ai'
					: 'Prompt only · no image upload'
				: action
					? 'Runs privately on your device'
					: 'Choose a tool'}
		</span>
	</button>

	<div class="tool-grid" aria-label="Image editing tools">
		<button
			type="button"
			class="tool-choice"
			class:active={action === 'background'}
			aria-pressed={action === 'background'}
			disabled={processing || processingFal}
			onclick={() => {
				action = 'background';
				operationError = '';
			}}
		>
			Background
		</button>
		{#each Object.values(DRAW_IMAGE_TOOLS) as tool (tool.id)}
			<button
				type="button"
				class="tool-choice"
				class:active={action === tool.id}
				aria-pressed={action === tool.id}
				disabled={processing || processingFal || backgroundProcessing}
				onclick={() => {
					action = /** @type {ImageAction} */ (tool.id);
					operationError = '';
				}}
			>
				{tool.label}
			</button>
		{/each}
		<button
			type="button"
			class="tool-choice cloud-tool"
			class:active={action === 'fal'}
			aria-pressed={action === 'fal'}
			disabled={processing || processingFal || backgroundProcessing}
			onclick={() => {
				action = 'fal';
				operationError = '';
			}}
		>
			AI prompt
		</button>
	</div>

	{#if action === 'background'}
		<div class="active-tool-panel">
			{@render backgroundControls?.()}
		</div>
	{:else if selectedTool}
		<div class="active-tool-panel">
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
					<span
						class="target-marker"
						style="left: {targetMarkerX * 100}%; top: {targetMarkerY * 100}%"
					></span>
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
		</div>
	{:else if action === 'fal'}
		<div class="fal-edit active-tool-panel">
			{#if processingFal}
				<div class="fal-generation-progress" role="status" aria-live="polite">
					<strong>{operationStatus}</strong>
					<span>Your result will appear on the canvas and in session history.</span>
					<progress
						aria-label="AI generation progress"
						max="100"
						value={operationProgress || undefined}
					></progress>
				</div>
			{/if}
			<div class="fal-model-picker">
				<label for="drawing-ai-workflow">Models and workflows</label>
				<button
					id="drawing-ai-workflow"
					type="button"
					class="fal-model-toggle"
					aria-label="AI model and workflow selector"
					aria-expanded={modelPickerOpen}
					aria-controls="drawing-ai-models"
					disabled={processing || processingFal}
					onclick={() => (modelPickerOpen = !modelPickerOpen)}
				>
					<span>
						{selectedFalModels.length === 1
							? `${selectedFalModels[0].label} · ${selectedFalModels[0].workflow}`
							: selectedFalModels.length
								? `${selectedFalModels.length} models selected`
								: 'Select one or more models'}
					</span>
					<span aria-hidden="true">{modelPickerOpen ? '▴' : '▾'}</span>
				</button>
				{#if modelPickerOpen}
					<div id="drawing-ai-models" class="fal-model-menu" aria-label="Available AI models">
						<div class="fal-model-menu-heading">
							<span>Cheapest first · {selectedFalModels.length} selected</span>
							<button
								type="button"
								class="fal-model-select-all"
								onclick={() => {
									selectedFalModelIds =
										selectedFalModels.length === orderedFalModels.length
											? []
											: orderedFalModels.map((model) => model.id);
								}}
							>
								{selectedFalModels.length === orderedFalModels.length ? 'Clear all' : 'Select all'}
							</button>
						</div>
						<div class="fal-model-cards">
							{#each falWorkflowFolders as folder (folder.kind)}
								<details
									class="fal-model-folder"
									aria-label="{folder.label} models"
									open={folder.kind === 'image-edit'}
								>
									<summary class="fal-model-folder-heading">
										<strong>{folder.label}</strong>
										<span>
											{folder.models.filter((model) => selectedFalModelIds.includes(model.id))
												.length}
											/ {folder.models.length}
										</span>
									</summary>
									<div class="fal-model-folder-cards">
										{#each folder.models as model (model.id)}
											<div
												class="fal-model-card"
												class:selected={selectedFalModelIds.includes(model.id)}
											>
												<label class="fal-model-option">
													<input
														type="checkbox"
														aria-label="{model.label} · {model.workflow}"
														checked={selectedFalModelIds.includes(model.id)}
														onchange={() => toggleFalModel(model.id)}
													/>
													<span class="fal-model-copy">
														<span class="fal-model-card-title">
															<strong>{model.label}</strong>
															<span>{model.price}</span>
														</span>
														<span>{model.workflow}</span>
														<span>{modelReferenceNote(model)} · {model.badge}</span>
													</span>
												</label>
												<button
													type="button"
													class="fal-model-only"
													aria-label="Use only {model.label} · {model.workflow}"
													onclick={() => {
														selectedFalModelIds = [model.id];
														modelPickerOpen = false;
													}}
												>
													Only
												</button>
											</div>
										{/each}
									</div>
								</details>
							{/each}
						</div>
					</div>
				{/if}
				{#if selectedFalModels.length === 1}
					<div class="fal-model-detail">
						<span>{selectedFalModel.description}</span>
						<strong>{selectedFalModel.badge}</strong>
					</div>
				{/if}
				<p class="fal-upload-hint">
					{authenticated ? 'Signed in · ' : 'Sign in required · '}
					{uploadsSelectedImage
						? 'Large images automatically fit each model’s limits and the secure upload limit.'
						: 'Text-to-image workflows only send your prompt; the selected image is not uploaded.'}
				</p>
			</div>
			<textarea
				aria-label="AI image editing prompt"
				placeholder="Describe how you want to edit this image…"
				rows="2"
				maxlength="1000"
				bind:value={prompt}
				disabled={processing || processingFal}
				onkeydown={(event) => {
					if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey) || event.isComposing) {
						return;
					}
					event.preventDefault();
					void applyFalEdit();
				}}
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
				<span>
					{selectedFalModels.length
						? `~$${estimatedFalCost.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} total · ${selectedFalModels.length} ${selectedFalModels.length === 1 ? 'generation' : 'generations'}`
						: 'Select at least one model'}
				</span>
				{#if processingFal}
					<button type="button" class="secondary-action" onclick={cancelFalGeneration}>
						Cancel
					</button>
				{:else if !authenticated}
					<a class="fal-action fal-sign-in" href="/tools?next=/draw">Sign in to generate</a>
				{:else}
					<button
						type="button"
						class="fal-action"
						aria-label="Generate AI image edit"
						aria-keyshortcuts="Meta+Enter Control+Enter"
						disabled={processing || !prompt.trim() || !selectedFalModels.length}
						onclick={() => void applyFalEdit()}
					>
						Generate <kbd aria-hidden="true">⌘↵</kbd>
					</button>
				{/if}
			</div>
		</div>
	{/if}

	{#if activeVideoGeneration}
		<section class="video-generation" aria-label="Generated video preview">
			<div class="history-heading">
				<strong>{activeVideoGeneration.modelLabel}</strong>
				<a href={activeVideoGeneration.dataURL} target="_blank" rel="noreferrer">Download video</a>
			</div>
			<!-- svelte-ignore a11y_media_has_caption (generated clips do not include transcript tracks) -->
			<!-- svelte-ignore a11y_media_has_caption (Generated video providers do not supply caption tracks.) -->
			<video
				src={activeVideoGeneration.dataURL}
				controls
				playsinline
				preload="metadata"
				aria-label="Generated video"
			></video>
			<p>Video stays outside the canvas and cloud drawing sync.</p>
		</section>
	{/if}

	{#if generations.length}
		<section class="generation-history" aria-label="Generated images from this session">
			<div class="history-heading">
				<strong>Recent generations</strong>
				<span>Click to restore and edit</span>
			</div>
			<div class="generation-list">
				{#each generations as generation, index (generation.id)}
					<button
						type="button"
						class="generation-card"
						class:current={imagePreview === generation.dataURL ||
							activeVideoGenerationId === generation.id}
						aria-label="Use generation {index + 1}: {generation.prompt}"
						aria-pressed={imagePreview === generation.dataURL ||
							activeVideoGenerationId === generation.id}
						disabled={processing || processingFal || backgroundProcessing}
						onclick={() => void restoreGeneration(generation)}
					>
						{#if generation.mimeType.startsWith('video/')}
							<video src={generation.dataURL} muted playsinline preload="metadata"></video>
						{:else}
							<img src={generation.dataURL} alt="" />
						{/if}
						<span>{generation.modelLabel}</span>
					</button>
				{/each}
			</div>
		</section>
	{/if}

	{#if processing && !processingFal}
		<div class="operation-progress" aria-live="polite">
			<span>{operationStatus}{operationProgress ? ` · ${operationProgress}%` : ''}</span>
			<progress aria-label="Image editing progress" max="100" value={operationProgress || undefined}
			></progress>
		</div>
	{:else if !processingFal && operationError}
		<p class="operation-error" role="alert">{operationError}</p>
	{:else if !processingFal && operationStatus}
		<p class="operation-success" role="status">{operationStatus}</p>
	{/if}
</div>

<style>
	.image-toolbox {
		min-width: 0;
	}

	.toolbox-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 11px;
	}

	.drag-handle {
		width: 100%;
		padding: 2px 0;
		border: 0;
		background: transparent;
		color: inherit;
		cursor: grab;
		touch-action: none;
	}

	.drag-handle:active {
		cursor: grabbing;
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
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
		margin-top: 9px;
	}

	.tool-choice {
		min-height: 34px;
		padding: 0 5px;
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

	.cloud-tool {
		border-style: dashed;
	}

	.active-tool-panel {
		margin-top: 12px;
		padding-top: 11px;
		border-top: 1px solid #ececf0;
	}

	.image-target {
		position: relative;
		display: block;
		width: 100%;
		height: 112px;
		margin-top: 0;
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
		object-fit: contain;
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

	.fal-action kbd {
		margin-left: 4px;
		font: inherit;
		font-size: 9px;
		opacity: 0.8;
	}

	.fal-sign-in {
		display: inline-flex;
		align-items: center;
		white-space: nowrap;
		text-decoration: none;
	}

	.fal-model-picker {
		margin-top: 0;
	}

	.fal-model-picker > label {
		display: block;
		margin-bottom: 5px;
		color: #52525b;
		font-size: 10px;
		font-weight: 550;
	}

	.fal-generation-progress {
		display: grid;
		gap: 5px;
		margin-bottom: 10px;
		padding: 9px;
		border: 1px solid #ded9ff;
		border-radius: 8px;
		background: #f7f5ff;
		color: #5142ab;
		font-size: 10px;
	}

	.fal-generation-progress span {
		color: #71717a;
		font-size: 9px;
	}

	.fal-generation-progress progress {
		width: 100%;
		height: 5px;
		accent-color: #6554c0;
	}

	.fal-model-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		width: 100%;
		height: 34px;
		padding: 0 8px;
		border: 1px solid #dedee6;
		border-radius: 7px;
		background: #fff;
		color: #27272a;
		font-size: 10px;
		text-align: left;
		cursor: pointer;
	}

	.fal-model-toggle > span:first-child {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.fal-model-menu {
		margin-top: 5px;
		padding: 7px;
		border: 1px solid #dedee6;
		border-radius: 8px;
		background: #fff;
	}

	.fal-model-menu-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 2px 6px;
		color: #71717a;
		font-size: 9px;
	}

	.fal-model-select-all,
	.fal-model-only {
		padding: 3px 5px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: #6554c0;
		font-size: 9px;
		cursor: pointer;
	}

	.fal-model-cards {
		display: grid;
		gap: 4px;
		max-height: 285px;
		overflow-y: auto;
	}

	.fal-model-folder {
		border: 1px solid #ececf0;
		border-radius: 7px;
	}

	.fal-model-folder-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px;
		color: #3f3f46;
		font-size: 9px;
		list-style: none;
		cursor: pointer;
	}

	.fal-model-folder-heading::-webkit-details-marker {
		display: none;
	}

	.fal-model-folder-heading strong::before {
		margin-right: 6px;
		color: #6554c0;
		content: '▸';
	}

	.fal-model-folder[open] .fal-model-folder-heading strong::before {
		content: '▾';
	}

	.fal-model-folder-heading > span {
		color: #71717a;
	}

	.fal-model-folder-cards {
		display: grid;
		gap: 5px;
		max-height: 165px;
		padding: 0 6px 6px;
		overflow-y: auto;
	}

	.fal-model-card {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 7px;
		border: 1px solid #ececf0;
		border-radius: 7px;
		background: #fff;
	}

	.fal-model-card.selected {
		border-color: #aaa2ed;
		background: #f7f5ff;
	}

	.fal-model-option {
		display: flex;
		flex: 1;
		align-items: flex-start;
		gap: 7px;
		min-width: 0;
		cursor: pointer;
	}

	.fal-model-option input {
		margin: 2px 0 0;
		accent-color: #6554c0;
	}

	.fal-model-copy {
		display: grid;
		flex: 1;
		gap: 2px;
		min-width: 0;
		color: #71717a;
		font-size: 8px;
	}

	.fal-model-card-title {
		display: flex;
		justify-content: space-between;
		gap: 5px;
		color: #27272a;
		font-size: 9px;
	}

	.fal-model-card-title > span {
		flex: none;
		color: #5142ab;
		font-weight: 600;
	}

	.fal-model-detail {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		margin-top: 5px;
		color: #71717a;
		font-size: 9px;
	}

	.fal-model-detail strong {
		flex: none;
		color: #6554c0;
		font-weight: 600;
	}

	.fal-upload-hint {
		margin: 5px 0 0;
		color: #71717a;
		font-size: 9px;
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

	.generation-history {
		margin-top: 12px;
		padding-top: 11px;
		border-top: 1px solid #ececf0;
	}

	.history-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 10px;
	}

	.history-heading span {
		color: #71717a;
		font-size: 9px;
	}

	.generation-list {
		display: flex;
		gap: 7px;
		margin-top: 8px;
		padding-bottom: 3px;
		overflow-x: auto;
	}

	.generation-card {
		flex: 0 0 84px;
		padding: 4px;
		border: 1px solid #e4e4e7;
		border-radius: 7px;
		background: #fff;
		color: #52525b;
		text-align: left;
		cursor: pointer;
	}

	.generation-card.current {
		border-color: #aaa2ed;
		background: #f7f5ff;
	}

	.generation-card img,
	.generation-card video {
		display: block;
		width: 100%;
		height: 49px;
		border-radius: 4px;
		background: repeating-conic-gradient(#f4f4f5 0 25%, #fff 0 50%) 50% / 10px 10px;
		object-fit: contain;
	}

	.video-generation {
		margin-top: 11px;
		padding-top: 10px;
		border-top: 1px solid #ececf0;
	}

	.video-generation video {
		display: block;
		width: 100%;
		max-height: 180px;
		margin-top: 7px;
		border-radius: 7px;
		background: #18181b;
	}

	.video-generation a {
		color: #6554c0;
		font-size: 9px;
	}

	.video-generation p {
		margin: 5px 0 0;
		color: #71717a;
		font-size: 9px;
	}

	.generation-card span {
		display: block;
		margin-top: 4px;
		overflow: hidden;
		font-size: 8px;
		text-overflow: ellipsis;
		white-space: nowrap;
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
