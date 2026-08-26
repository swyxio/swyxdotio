<script>
	import { blurDrawingInput, canAutofocusDrawingInput } from '$lib/draw-focus.js';
	import { tick } from 'svelte';
	import ToolsAiNotice from '$lib/ToolsAiNotice.svelte';
	import { recordToolActivity } from '$lib/tools-activity-client.js';
	import { DRAW_IMAGE_TOOLS, processImageTool } from '$lib/draw-image-tools.js';
	import {
		createDrawingGenerationRun,
		runDrawingGenerationBatch
	} from '$lib/draw-generation-batch.js';
	import { estimateToolsMediaReservation } from '$lib/tools-ai-policy.js';
	import DrawGenerationLibrary from '$lib/DrawGenerationLibrary.svelte';
	import { optimizeDrawingImageForCloud, replaceDrawingImage } from '$lib/draw-image-scene.js';
	import {
		DEFAULT_DRAW_GENERATION_MODEL,
		DEFAULT_DRAW_TEXT_TO_IMAGE_MODEL,
		DRAW_GENERATION_MODELS,
		estimateDrawGenerationModelCost,
		getDrawGenerationModelOverrides,
		getDrawGenerationModelParameters,
		resolveDrawGenerationModelSettings
	} from '$lib/draw-generation-models.js';

	/**
	 * @typedef {import('@excalidraw/excalidraw/types').ExcalidrawImperativeAPI} DrawingEditor
	 * @typedef {'magic-select' | 'magic-eraser' | 'depth-blur' | 'vectorize'} ImageAction
	 * @typedef {import('$lib/draw-generation-history.js').DrawingImageGeneration} ImageGeneration
	 */

	/** @type {{
	 *  editor: DrawingEditor,
	 *  storageKey: string,
	 *  pageKey: string,
	 *  historyError?: string,
	 *  minimized?: boolean,
	 *  onInsert: (generations: ImageGeneration[], board?: boolean) => Promise<void>,
	 *  imageId?: string,
	 *  imageDataUrl?: string,
	 *  action?: ImageAction | 'background' | 'generate' | null,
	 *  prompt?: string,
	 *  operationStatus?: string,
	 *  selectedModelIds?: string[],
	 *  generationParameters?: Record<string, Record<string, unknown>>,
	 *  updateElement: typeof import('@excalidraw/excalidraw').newElementWith,
	 *  captureUpdate: typeof import('@excalidraw/excalidraw').CaptureUpdateAction.IMMEDIATELY,
	 *  cloudAvailable?: boolean,
	 *  authenticated?: boolean,
	 *  userId?: string,
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
		storageKey,
		pageKey,
		historyError = '',
		minimized: toolboxMinimized = $bindable(false),
		onInsert,
		imageId = '',
		imageDataUrl = '',
		action = $bindable(null),
		prompt = $bindable(''),
		operationStatus = $bindable(''),
		selectedModelIds = $bindable([DEFAULT_DRAW_GENERATION_MODEL.id]),
		generationParameters = $bindable({}),
		updateElement,
		captureUpdate,
		cloudAvailable = false,
		authenticated = false,
		userId,
		onCloudLimit,
		backgroundProcessing = false,
		backgroundControls,
		generations = [],
		onGeneration,
		onProcessingChange,
		onDragStart
	} = $props();

	const IMAGE_EDIT_PROMPT_PRESETS = [
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
	const VIDEO_PROMPT_PRESETS = [
		{
			label: 'Animate subject',
			prompt:
				'Animate the main subject with subtle, natural movement while preserving their identity, clothing, and surroundings.'
		},
		{
			label: 'Camera orbit',
			prompt:
				'Slowly orbit the camera around the subject with cinematic, physically realistic movement and stable composition.'
		},
		{
			label: 'Talking portrait',
			prompt:
				'The subject looks into the camera and speaks naturally, with realistic facial expressions and synchronized audio.'
		},
		{
			label: 'Slow motion',
			prompt:
				'Bring the scene to life in smooth cinematic slow motion, preserving the subject and original visual style.'
		},
		{
			label: 'Product reveal',
			prompt:
				'Reveal the product with a slow premium camera push, elegant lighting changes, and crisp commercial motion.'
		}
	];
	const TEXT_TO_IMAGE_PROMPT_PRESETS = [
		{
			label: 'Product hero',
			prompt:
				'Create a premium studio product photograph with dramatic lighting, a clean background, and clear negative space.'
		},
		{
			label: 'YouTube thumbnail',
			prompt:
				'Create a bold, high-contrast YouTube thumbnail composition with one clear focal point and room for a short headline.'
		},
		{
			label: 'Illustration',
			prompt:
				'Create a polished editorial illustration with a distinctive visual style, intentional composition, and rich color.'
		},
		{
			label: 'Cinematic scene',
			prompt:
				'Create a cinematic, photorealistic scene with compelling depth, atmospheric lighting, and careful composition.'
		}
	];
	const WORKFLOW_FOLDERS = /** @type {const} */ ([
		{ kind: 'text-to-image', label: 'Text to image' },
		{ kind: 'image-edit', label: 'Image editing' },
		{ kind: 'image-to-video', label: 'Image to video' }
	]);
	const WEIGHT_GROUPS = /** @type {const} */ ([
		{ weights: 'open', label: 'Open weights' },
		{ weights: 'closed', label: 'Closed models' }
	]);

	let imagePreview = $state('');
	let previewGenerationId = $state('');
	let attachedReference = $state(
		/** @type {{dataURL:string,mimeType:string,generationId?:string}|null} */ (null)
	);
	let useCanvasReference = $state(true);
	let destination = $state('replace');
	let generationContext = $state(/** @type {Record<string,unknown>|undefined} */ (undefined));
	let remixParentId = $state(/** @type {string|undefined} */ (undefined));
	let runLimitUsd = $state(1);
	let confirmationThreshold = $state(0.25);
	let generationJobs = $state(
		/** @type {import('$lib/draw-generation-batch.js').DrawingGenerationJob[]} */ ([])
	);
	let lastRun = $state(
		/** @type {import('$lib/draw-generation-batch.js').DrawingGenerationRun|undefined} */ (
			undefined
		)
	);
	let comparisonIds = $state(/** @type {string[]} */ ([]));
	let qualityNote = $state('');
	let generationConfigured = false;
	let toolboxRoot = $state(/** @type {HTMLDivElement | undefined} */ (undefined));
	$effect(() => {
		if (toolboxMinimized) blurDrawingInput(toolboxRoot);
	});
	/** @type {HTMLElement | undefined} */
	let historySection = $state();
	$effect(() => {
		if (action === 'generate') generationConfigured = true;
	});
	/** @type {AbortController|undefined} */
	let generationAbort;
	const activeReference = $derived(
		attachedReference ??
			(useCanvasReference && imageDataUrl
				? { dataURL: imageDataUrl, mimeType: imageDataUrl.slice(5, imageDataUrl.indexOf(';')) }
				: null)
	);
	const comparisonImages = $derived(
		generations.filter(
			(entry) => comparisonIds.includes(entry.id) && entry.mimeType.startsWith('image/')
		)
	);

	/** Shared launcher. Options are only applied by an explicit starter/remix action.
	 * @param {{prompt?:string,modelIds?:string[],referenceImages?:import('$lib/draw-generation-history.js').DrawingGenerationReference[],context?:Record<string,unknown>}} [options]
	 */
	export function openGeneration(options) {
		if (options && (options.referenceImages?.length ?? 0) > 1) {
			operationError =
				'This composer currently accepts one reference image. Choose one before opening the recipe.';
			return false;
		}
		if (options && processingGeneration) {
			operationError = 'Finish or cancel this batch before opening a different recipe.';
			return false;
		}
		if (
			options &&
			prompt.trim() &&
			!confirm('Replace the current generation draft? Existing results and canvas stay unchanged.')
		)
			return false;
		if (options) {
			prompt = options.prompt ?? '';
			selectedModelIds = options.modelIds?.length
				? options.modelIds.filter((id) => DRAW_GENERATION_MODELS.some((model) => model.id === id))
				: [
						options.referenceImages?.length
							? DEFAULT_DRAW_GENERATION_MODEL.id
							: DEFAULT_DRAW_TEXT_TO_IMAGE_MODEL.id
					];
			attachedReference = options.referenceImages?.[0]
				? structuredClone($state.snapshot(options.referenceImages[0]))
				: null;
			generationContext = options.context
				? structuredClone($state.snapshot(options.context))
				: undefined;
			useCanvasReference = false;
			destination = 'preview';
		}

		action = 'generate';
		toolboxMinimized = false;
		if (
			!generationConfigured &&
			!options &&
			!prompt.trim() &&
			!attachedReference &&
			!processingGeneration
		) {
			selectedModelIds = [DEFAULT_DRAW_TEXT_TO_IMAGE_MODEL.id];
			useCanvasReference = false;
			destination = 'preview';
		}
		generationConfigured = true;
		return true;
	}

	/** Open the existing history view without submitting or changing a recipe. */
	export async function openHistory() {
		action = 'generate';
		toolboxMinimized = false;
		await tick();
		if (historySection) historySection.scrollIntoView({ block: 'start' });
		else operationStatus = 'No generations on this page yet. Results will appear here after a run.';
	}

	/** @param {File|undefined} file */
	async function attachFile(file) {
		if (!file) return;
		try {
			if (!/^image\/(png|jpeg|webp|avif|gif)$/.test(file.type) || file.size > 16_000_000)
				throw new Error('Choose a PNG, JPEG, WebP, AVIF or GIF under 16 MB.');
			attachedReference = { dataURL: await readDataUrl(file), mimeType: file.type };
			useCanvasReference = false;
			destination = 'preview';
			operationError = '';
		} catch (failure) {
			operationError = failure instanceof Error ? failure.message : 'Could not attach image.';
		}
	}

	/** @param {ClipboardEvent} event */
	function pasteReference(event) {
		const file = Array.from(event.clipboardData?.files ?? []).find((entry) =>
			entry.type.startsWith('image/')
		);
		if (!file) return;
		event.preventDefault();
		event.stopPropagation();
		void attachFile(file);
	}

	let targetX = $state(0.5);
	let targetY = $state(0.5);
	let targetMarkerX = $state(0.5);
	let targetMarkerY = $state(0.5);
	let eraserRadius = $state(0.12);
	let blurStrength = $state(14);
	let focusDepth = $state(0.55);
	let modelPickerOpen = $state(false);
	let modelSearchQuery = $state('');
	let expandedModelWorkflowKinds = $state(/** @type {string[]} */ ([]));
	let modelPickerRoot = $state(/** @type {HTMLDivElement | null} */ (null));
	let modelPickerButton = $state(/** @type {HTMLButtonElement | null} */ (null));
	let modelSearchInput = $state(/** @type {HTMLInputElement | null} */ (null));
	let activeVideoGenerationId = $state('');
	let operationProgress = $state(0);
	let operationError = $state('');
	let processing = $state(false);
	let processingGeneration = $state(false);
	/** @type {AbortController | undefined} */
	let operationAbort;

	const selectedTool = $derived(
		action && action !== 'background' && action !== 'generate'
			? DRAW_IMAGE_TOOLS[action]
			: undefined
	);
	const needsTarget = $derived(action === 'magic-select' || action === 'magic-eraser');
	const orderedModels = $derived(
		[...DRAW_GENERATION_MODELS].sort((left, right) => left.priceUsd - right.priceUsd)
	);
	const visibleModels = $derived.by(() => {
		const search = modelSearchQuery.trim().toLowerCase();
		if (!search) return orderedModels;
		const terms = search.split(/\s+/);
		return orderedModels.filter((model) => {
			const workflow = WORKFLOW_FOLDERS.find((folder) => folder.kind === model.kind)?.label;
			const searchable = [
				model.label,
				model.provider,
				model.workflow,
				model.description,
				model.badge,
				model.weights === 'open' ? 'open weights' : 'closed models',
				workflow
			]
				.join(' ')
				.toLowerCase();
			return terms.every((term) => searchable.includes(term));
		});
	});
	const workflowFolders = $derived(
		WORKFLOW_FOLDERS.map((folder) => {
			const models = visibleModels.filter((model) => model.kind === folder.kind);
			return {
				...folder,
				models,
				groups: WEIGHT_GROUPS.map((group) => ({
					...group,
					models: models.filter((model) => model.weights === group.weights)
				})).filter((group) => group.models.length > 0)
			};
		}).filter((folder) => folder.models.length > 0)
	);
	const selectedModels = $derived(
		orderedModels.filter((model) => selectedModelIds.includes(model.id))
	);
	const selectedModel = $derived(selectedModels[0] ?? DEFAULT_DRAW_GENERATION_MODEL);
	const selectedWorkflowKind = $derived(
		selectedModels.length > 0 &&
			selectedModels.every((model) => model.kind === selectedModels[0].kind)
			? selectedModels[0].kind
			: null
	);
	const activePromptPresets = $derived(
		selectedWorkflowKind === 'image-to-video'
			? VIDEO_PROMPT_PRESETS
			: selectedWorkflowKind === 'text-to-image'
				? TEXT_TO_IMAGE_PROMPT_PRESETS
				: IMAGE_EDIT_PROMPT_PRESETS
	);
	const generationButtonLabel = $derived(
		selectedWorkflowKind === 'image-to-video'
			? 'Generate AI video'
			: selectedWorkflowKind === 'text-to-image'
				? 'Generate AI image'
				: 'Generate AI image edit'
	);
	const selectedWorkflowParameters = $derived.by(() => {
		return WORKFLOW_FOLDERS.flatMap((folder) => {
			const models = selectedModels.filter((model) => model.kind === folder.kind);
			if (!models.length) return [];
			/** @type {Map<string, import('$lib/draw-generation-models.js').DrawingGenerationParameter>} */
			const parameters = new Map();
			for (const model of models) {
				for (const parameter of getDrawGenerationModelParameters(model)) {
					const existing = parameters.get(parameter.key);
					if (!existing) {
						parameters.set(parameter.key, {
							...parameter,
							options: [...(parameter.options ?? [])]
						});
						continue;
					}
					if (!parameter.options || !existing.options) continue;
					const options = [...existing.options];
					for (const option of parameter.options) {
						if (
							!options.some(
								(candidate) =>
									parameterChoice(parameter.key, candidate) ===
									parameterChoice(parameter.key, option)
							)
						) {
							options.push(option);
						}
					}
					if (parameter.key === 'duration') {
						options.sort(
							(left, right) =>
								Number.parseInt(String(left), 10) - Number.parseInt(String(right), 10)
						);
					}
					parameters.set(parameter.key, { ...existing, options });
				}
			}
			return [{ ...folder, models, parameters: [...parameters.values()] }];
		});
	});
	const estimatedCost = $derived(
		selectedModels.reduce(
			(total, model) =>
				total + estimateDrawGenerationModelCost(model, effectiveModelSettings(model)),
			0
		)
	);
	const reservationTotal = $derived(
		selectedModels.reduce(
			(total, model) =>
				total +
				estimateToolsMediaReservation(
					estimateDrawGenerationModelCost(model, effectiveModelSettings(model))
				),
			0
		)
	);
	const uploadsSelectedImage = $derived(
		selectedModels.some((model) => model.kind !== 'text-to-image')
	);
	const previewRecords = $derived(
		lastRun?.pageKey === pageKey
			? [
					...generations,
					...generationJobs.flatMap((job) => (job.generation ? [job.generation] : []))
				]
			: generations
	);
	const activeVideoGeneration = $derived(
		previewRecords.find((generation) => generation.id === activeVideoGenerationId)
	);
	const activeGeneration = $derived(
		previewRecords.find((generation) => generation.id === previewGenerationId) ??
			activeVideoGeneration ??
			generations.find((generation) => generation.dataURL === imagePreview)
	);
	const activeGenerationSettings = $derived.by(() => {
		if (!activeGeneration?.modelId || !activeGeneration.modelSettings) return [];
		const model = DRAW_GENERATION_MODELS.find((entry) => entry.id === activeGeneration.modelId);
		if (!model) return [];
		return getDrawGenerationModelParameters(model).flatMap((parameter) => {
			const value = activeGeneration.modelSettings?.[parameter.key];
			if (value === undefined) return [];
			return [
				`${parameter.label}: ${
					typeof value === 'boolean'
						? value
							? 'On'
							: 'Off'
						: parameterOptionLabel(parameter.key, /** @type {string | number} */ (value))
				}`
			];
		});
	});
	const activeGenerationLineage = $derived.by(() => {
		if (!activeGeneration) return [];
		/** @type {ImageGeneration[]} */
		const lineage = [];
		/** @type {ImageGeneration | undefined} */
		let current = activeGeneration;
		const visited = new Set();
		while (current && !visited.has(current.id)) {
			visited.add(current.id);
			lineage.unshift(current);
			current = current.parentGenerationId
				? generations.find((generation) => generation.id === current?.parentGenerationId)
				: undefined;
		}
		return lineage;
	});
	const downloadSize = $derived(
		selectedTool?.downloadBytes ? `~${(selectedTool.downloadBytes / 1_000_000).toFixed(1)} MB` : ''
	);

	$effect(() => {
		if (selectedWorkflowKind !== 'image-edit') destination = 'preview';
	});

	$effect(() => {
		imagePreview = imageDataUrl;
		operationError = '';
	});

	$effect(() => {
		return () => {
			operationAbort?.abort();
			generationAbort?.abort();
		};
	});

	/** @param {typeof DRAW_GENERATION_MODELS[number]} model */
	function modelReferenceNote(model) {
		if (model.referenceImages === 0) return 'Prompt only · no image upload';
		if (model.referenceImages === 1) return '1 reference image';
		if (model.referenceImages === null) return 'Multiple reference images';
		return `Up to ${model.referenceImages} reference images`;
	}

	/** @param {boolean} open @param {boolean} [restoreFocus] */
	function setModelPickerOpen(open, restoreFocus = false) {
		if (open) {
			expandedModelWorkflowKinds = selectedModels.length
				? [...new Set(selectedModels.map((model) => model.kind))]
				: ['image-edit'];
		}
		modelPickerOpen = open;
		if (!open) modelSearchQuery = '';
		void tick().then(() => {
			if (open && modelPickerOpen && canAutofocusDrawingInput()) modelSearchInput?.focus();
			if (!open && restoreFocus) modelPickerButton?.focus();
		});
	}

	/** @param {PointerEvent} event */
	function dismissModelPickerOutside(event) {
		if (!modelPickerOpen || !(event.target instanceof Node)) return;
		if (!modelPickerRoot?.contains(event.target)) setModelPickerOpen(false);
	}

	/** @param {KeyboardEvent} event */
	function handleModelPickerKeys(event) {
		if (!modelPickerOpen) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			setModelPickerOpen(false, true);
			return;
		}
		if (event.key === 'Enter' && event.target === modelSearchInput && visibleModels.length === 1) {
			event.preventDefault();
			selectedModelIds = [visibleModels[0].id];
			setModelPickerOpen(false, true);
		}
	}

	/** @param {string} key @param {unknown} value */
	function parameterChoice(key, value) {
		if (key === 'duration') return String(value).replace(/s$/i, '');
		return String(value).toLowerCase();
	}

	/** @param {typeof DRAW_GENERATION_MODELS[number]} model */
	function effectiveModelSettings(model) {
		return resolveDrawGenerationModelSettings(
			model,
			getDrawGenerationModelOverrides(model, generationParameters[model.kind] ?? {})
		);
	}

	/**
	 * @param {{ kind: string, models: readonly (typeof DRAW_GENERATION_MODELS)[number][] }} folder
	 * @param {import('$lib/draw-generation-models.js').DrawingGenerationParameter} parameter
	 */
	function parameterCurrentValue(folder, parameter) {
		const selected = generationParameters[folder.kind]?.[parameter.key];
		if (selected !== undefined) return selected;
		const model = folder.models.find((entry) =>
			getDrawGenerationModelParameters(entry).some((candidate) => candidate.key === parameter.key)
		);
		const defaults = /** @type {Record<string, unknown>} */ (model?.settings ?? {});
		return defaults[parameter.key] ?? parameter.options?.[0] ?? '';
	}

	/** @param {string} kind @param {string} key @param {string | number | boolean | undefined} value */
	function updateGenerationParameter(kind, key, value) {
		const next = { ...(generationParameters[kind] ?? {}) };
		if (value === undefined) delete next[key];
		else next[key] = value;
		generationParameters = { ...generationParameters, [kind]: next };
	}

	/** @param {string} key @param {string | number} value */
	function parameterOptionLabel(key, value) {
		if (key === 'duration') return `${String(value).replace(/s$/i, '')} seconds`;
		if (key === 'aspect_ratio' && value === 'auto') return 'Match image';
		if (key === 'image_size') {
			return String(value)
				.replace(/^auto$/, 'Match image')
				.replace(/^auto_/, 'Auto ')
				.replace(/_/g, ' ')
				.replace(/\b\w/g, (letter) => letter.toUpperCase());
		}
		if (key === 'output_format') return String(value).toUpperCase();
		return String(value);
	}

	/** @param {string} modelId */
	function toggleModel(modelId) {
		selectedModelIds = selectedModelIds.includes(modelId)
			? selectedModelIds.filter((id) => id !== modelId)
			: [...selectedModelIds, modelId];
	}

	/** @param {readonly (typeof DRAW_GENERATION_MODELS)[number][]} models @param {boolean} selected */
	function selectModels(models, selected) {
		const ids = /** @type {Set<string>} */ (new Set(models.map((model) => model.id)));
		selectedModelIds = selected
			? [...new Set([...selectedModelIds, ...ids])]
			: selectedModelIds.filter((id) => !ids.has(id));
	}

	/** @param {MouseEvent} event @param {readonly (typeof DRAW_GENERATION_MODELS)[number][]} models @param {boolean} selected */
	function selectFolderModels(event, models, selected) {
		event.preventDefault();
		event.stopPropagation();
		selectModels(models, selected);
	}

	/** @param {ImageGeneration} generation */
	function restoreGenerationSettings(generation) {
		if (generation.modelLabel === 'Original') return;
		prompt = generation.prompt;
		if (
			generation.modelId &&
			DRAW_GENERATION_MODELS.some((model) => model.id === generation.modelId)
		) {
			selectedModelIds = [generation.modelId];
			const model = DRAW_GENERATION_MODELS.find((entry) => entry.id === generation.modelId);
			if (model && generation.modelSettings) {
				generationParameters = {
					...generationParameters,
					[model.kind]: getDrawGenerationModelOverrides(model, generation.modelSettings)
				};
			}
		}
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
	 * @param {AbortSignal} [signal]
	 */
	async function insertEditedImage(
		selected,
		dataURL,
		mimeType,
		success,
		signal = operationAbort?.signal
	) {
		const originPage = pageKey;
		const originUser = userId;
		if (!selected.image.fileId) throw new Error('The selected image is unavailable.');
		if (cloudAvailable) {
			const optimized = await optimizeDrawingImageForCloud({
				editor,
				imageId: selected.image.id,
				sourceFileId: selected.image.fileId,
				dataURL,
				mimeType,
				signal,
				onOptimize: () => {
					operationStatus = 'Optimizing image for cloud sync';
				}
			});
			dataURL = optimized.dataURL;
			mimeType = optimized.mimeType;
		}
		signal?.throwIfAborted();
		if (pageKey !== originPage || userId !== originUser)
			throw new DOMException('The drawing changed before the edit completed.', 'AbortError');
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
		if (processing || processingGeneration || !selectedTool) return;
		const selectedAction = /** @type {ImageAction} */ (action);
		const activityUser = userId;
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
			void recordToolActivity(activityUser, `draw.image.${selectedAction}`);
		} catch (error) {
			void recordToolActivity(
				activityUser,
				`draw.image.${selectedAction}`,
				error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'failed'
			);
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

	/** @param {boolean} [retryFailed] */
	async function applyGeneration(retryFailed = false) {
		if (processing || processingGeneration || !authenticated) return;
		operationError = '';
		try {
			const retry = retryFailed && lastRun ? $state.snapshot(lastRun) : undefined;
			if (!retry && (!prompt.trim() || !selectedModels.length)) return;
			const source =
				!retry && activeReference ? structuredClone($state.snapshot(activeReference)) : null;
			const sourceGeneration = source
				? generations.find((entry) => entry.dataURL === source.dataURL)
				: undefined;
			const originalId = sourceGeneration?.id ?? (source ? crypto.randomUUID() : undefined);
			const recipes = retry
				? retry.jobs.filter((job) => job.status === 'failed').map((job) => job.recipe)
				: selectedModels.map((model) => ({
						id: crypto.randomUUID(),
						prompt: prompt.trim(),
						modelId: model.id,
						adapterId: model.adapter,
						modelSettings: getDrawGenerationModelOverrides(
							model,
							generationParameters[model.kind] ?? {}
						),
						referenceImages:
							model.kind === 'text-to-image'
								? []
								: source
									? [{ ...source, generationId: originalId }]
									: [],
						context: generationContext ? $state.snapshot(generationContext) : undefined,
						parentGenerationId:
							remixParentId ?? (model.kind !== 'text-to-image' ? originalId : undefined)
					}));
			if (!recipes.length) return;
			const run = createDrawingGenerationRun({
				pageKey,
				recipes,
				limitUsd: retry?.limitUsd ?? Number(runLimitUsd),
				id: retry?.id
			});
			const estimate = recipes.reduce((total, recipe) => {
				const model = DRAW_GENERATION_MODELS.find((entry) => entry.id === recipe.modelId);
				return (
					total +
					(model
						? estimateDrawGenerationModelCost(
								model,
								effectiveSettingsForRecipe(model, recipe.modelSettings)
							)
						: 0)
				);
			}, 0);
			if (
				estimate >= Number(confirmationThreshold) &&
				!confirm(
					`Generate ${recipes.length} result(s) for approximately $${estimate.toFixed(3)}? Funded by swyx.io. This is an estimate, not final provider billing. References will be sent to the selected providers.`
				)
			)
				return;
			const replacement =
				!retry &&
				destination === 'replace' &&
				useCanvasReference &&
				!attachedReference &&
				imageId &&
				selectedWorkflowKind === 'image-edit'
					? selectedImage()
					: undefined;
			if (
				source &&
				!sourceGeneration &&
				!retry &&
				originalId &&
				recipes.some((recipe) => recipe.referenceImages.length)
			)
				onGeneration?.({
					id: originalId,
					dataURL: source.dataURL,
					mimeType: source.mimeType,
					prompt: 'Original image',
					modelLabel: 'Original',
					createdAt: Date.now()
				});
			lastRun = run;
			generationJobs = run.jobs.map((job) => ({ ...job }));
			processingGeneration = true;
			onProcessingChange?.(true);
			modelPickerOpen = false;
			operationProgress = 0;
			operationStatus = 'Preparing generation';
			const abort = new AbortController();
			generationAbort = abort;
			const originPageKey = pageKey;
			const originUser = userId;
			let targetFileId = replacement?.image.fileId;
			await runDrawingGenerationBatch({
				run,
				userId,
				signal: abort.signal,
				concurrency: replacement ? 1 : 2,
				onJob(job) {
					if (pageKey !== originPageKey || userId !== originUser) {
						abort.abort();
						return;
					}
					generationJobs = generationJobs.map((entry) => (entry.id === job.id ? job : entry));
					operationStatus = job.message;
					operationProgress = Math.round(
						(generationJobs.filter((entry) => entry.status === 'completed').length /
							generationJobs.length) *
							100
					);
				},
				async onResult(generation) {
					if (pageKey !== originPageKey || userId !== originUser || abort.signal.aborted) return;
					onGeneration?.(generation);
					previewGenerationId = generation.id;
					comparisonIds = [...comparisonIds, generation.id];
					if (generation.mimeType.startsWith('video/')) activeVideoGenerationId = generation.id;
					else {
						activeVideoGenerationId = '';
						imagePreview = generation.dataURL;
						if (replacement && targetFileId) {
							try {
								const current = editor
									.getSceneElements()
									.find(
										(element) => element.id === replacement.image.id && element.type === 'image'
									);
								if (!current || current.type !== 'image' || current.fileId !== targetFileId)
									throw new Error(
										'Target changed; your result is in history. Add it to the canvas explicitly.'
									);
								const replaced = await insertEditedImage(
									{ image: current },
									generation.dataURL,
									generation.mimeType,
									'AI edit applied',
									abort.signal
								);
								targetFileId = replaced.fileId;
							} catch (failure) {
								operationError =
									failure instanceof Error
										? failure.message
										: 'Generated image could not replace the selection.';
							}
						}
					}
				}
			});
			const completed = generationJobs.filter((job) => job.status === 'completed').length;
			operationStatus = `Generated ${completed} of ${generationJobs.length} results`;
		} catch (failure) {
			operationError = failure instanceof Error ? failure.message : 'Could not generate.';
		} finally {
			processingGeneration = false;
			generationAbort = undefined;
			onProcessingChange?.(false);
		}
	}

	/** @param {typeof DRAW_GENERATION_MODELS[number]} model @param {Record<string,unknown>} settings */
	function effectiveSettingsForRecipe(model, settings) {
		return resolveDrawGenerationModelSettings(model, settings);
	}

	export function cancelGeneration() {
		generationAbort?.abort();
		operationStatus = 'Stopped waiting; submitted jobs may still finish or incur charges.';
	}

	/** Preview is presentation only, never a canvas mutation. @param {ImageGeneration} generation */
	function restoreGeneration(generation) {
		previewGenerationId = generation.id;
		activeVideoGenerationId = generation.mimeType.startsWith('video/') ? generation.id : '';
		if (!activeVideoGenerationId) imagePreview = generation.dataURL;
		qualityNote = generation.qualityNote ?? '';
		operationError = '';
	}

	/** Remix snapshots the recipe, never runs or changes the canvas. @param {ImageGeneration} generation */
	function restoreGenerationRecipe(generation) {
		if (processingGeneration) return;
		restoreGenerationSettings(generation);
		attachedReference = generation.referenceImages?.[0]
			? structuredClone($state.snapshot(generation.referenceImages[0]))
			: null;
		useCanvasReference = false;
		destination = 'preview';
		remixParentId = generation.id;
		generationContext = generation.context
			? structuredClone($state.snapshot(generation.context))
			: undefined;
		action = 'generate';
		operationStatus = 'Recipe restored — edit it, then generate when ready';
	}

	/** @param {ImageGeneration[]} images @param {boolean} [board] */
	async function addGenerations(images, board = false) {
		if (processing) return;
		processing = true;
		operationError = '';
		try {
			await onInsert(images, board);
			operationStatus = board
				? 'Comparison board added — Undo available'
				: 'Image added — Undo available';
		} catch (failure) {
			operationError = failure instanceof Error ? failure.message : 'Could not insert image.';
		} finally {
			processing = false;
		}
	}

	/** @param {ImageGeneration} generation */
	async function replaceWithGeneration(generation) {
		if (processing || processingGeneration) return;
		processing = true;
		try {
			await insertEditedImage(
				selectedImage(),
				generation.dataURL,
				generation.mimeType,
				'Generation restored — Undo available'
			);
		} catch (failure) {
			operationError = failure instanceof Error ? failure.message : 'Could not replace image.';
		} finally {
			processing = false;
		}
	}
</script>

<svelte:window
	onpointerdown={dismissModelPickerOutside}
	onkeydown={(event) => {
		const pickerWasOpen = modelPickerOpen;
		handleModelPickerKeys(event);
		if (event.key === 'Escape' && !pickerWasOpen && !event.defaultPrevented) {
			toolboxMinimized = true;
		}
	}}
/>

<div
	class="image-toolbox"
	class:minimized={toolboxMinimized}
	aria-label="AI image toolbox"
	bind:this={toolboxRoot}
>
	<div class="toolbox-heading">
		<button
			type="button"
			class="drag-handle"
			aria-label="Move image tools"
			onpointerdown={(event) => onDragStart?.(event)}
		>
			<strong>{imageId ? 'Image tools' : 'Generate'}</strong>
			<span>
				{action === 'generate'
					? uploadsSelectedImage
						? `Uploads the reference to ${[...new Set(selectedModels.map((model) => model.transportLabel))].join(', ')}`
						: 'Prompt only · no image upload'
					: action
						? 'Runs privately on your device'
						: 'Choose a tool'}
			</span>
		</button>
		<button
			type="button"
			class="toolbox-minimize"
			aria-label={toolboxMinimized ? 'Expand image tools' : 'Minimize image tools'}
			aria-expanded={!toolboxMinimized}
			onclick={() => {
				toolboxMinimized = !toolboxMinimized;
				if (toolboxMinimized) setModelPickerOpen(false);
			}}
		>
			{toolboxMinimized ? '+' : '−'}
		</button>
	</div>

	<div class="tool-grid" aria-label="Image editing tools">
		<button
			type="button"
			class="tool-choice"
			class:active={action === 'background'}
			aria-pressed={action === 'background'}
			disabled={processing || !imageId}
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
				disabled={processing || backgroundProcessing || !imageId}
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
			class:active={action === 'generate'}
			aria-pressed={action === 'generate'}
			disabled={processing || backgroundProcessing}
			onclick={() => {
				action = 'generate';
				if (imageId && !attachedReference && !prompt.trim()) {
					useCanvasReference = true;
					destination = 'replace';
				}
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
					disabled={processing || processingGeneration}
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
						disabled={processing || processingGeneration}
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
						disabled={processing || processingGeneration}
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
						disabled={processing || processingGeneration}
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
						disabled={processingGeneration}
						onclick={() => void applyLocalImageTool()}
					>
						Apply
					</button>
				{/if}
			</div>
		</div>
	{:else if action === 'generate'}
		<div class="fal-edit active-tool-panel">
			<textarea
				aria-label="AI image editing prompt"
				onpaste={pasteReference}
				placeholder={selectedWorkflowKind === 'image-to-video'
					? 'Describe the motion, camera movement, and sound…'
					: selectedWorkflowKind === 'text-to-image'
						? 'Describe the image you want to create…'
						: 'Describe how you want to edit this image…'}
				rows="3"
				maxlength="1000"
				bind:value={prompt}
				disabled={processing || processingGeneration}
				onkeydown={(event) => {
					if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey) || event.isComposing) {
						return;
					}
					event.preventDefault();
					void applyGeneration();
				}}
			></textarea>
			<div
				class="prompt-presets"
				aria-label={selectedWorkflowKind === 'image-to-video'
					? 'Editable video prompt presets'
					: selectedWorkflowKind === 'text-to-image'
						? 'Editable image generation prompt presets'
						: 'Editable image prompt presets'}
			>
				{#each activePromptPresets as preset (preset.label)}
					<button
						type="button"
						disabled={processing || processingGeneration}
						onclick={() => (prompt = preset.prompt)}
					>
						{preset.label}
					</button>
				{/each}
			</div>
			<div class="generation-reference">
				<div class="reference-actions">
					<label class="attach-reference"
						>Attach reference<input
							type="file"
							accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
							aria-label="Attach generation reference"
							disabled={processingGeneration}
							onchange={(event) => {
								void attachFile(event.currentTarget.files?.[0]);
								event.currentTarget.value = '';
							}}
						/></label
					>
					<button
						type="button"
						disabled={!imageId || processingGeneration}
						onclick={() => {
							attachedReference = null;
							useCanvasReference = true;
						}}>Use selected image</button
					>
					{#if activeReference}<button
							type="button"
							disabled={processingGeneration}
							onclick={() => {
								attachedReference = null;
								useCanvasReference = false;
							}}>Remove reference</button
						>{/if}
				</div>
				{#if activeReference}
					<img src={activeReference.dataURL} alt="Reference attached to this draft" />
					<span
						>{uploadsSelectedImage
							? 'Reference ready · not uploaded until Generate'
							: 'Reference retained in draft · not sent to text-to-image models'}</span
					>
				{:else}<span>No reference. Text-to-image needs only your prompt.</span>{/if}
				<label
					>Image destination <select
						aria-label="Generation output destination"
						bind:value={destination}
						disabled={processingGeneration}
						><option value="preview">Preview first</option><option
							value="replace"
							disabled={!imageId ||
								!useCanvasReference ||
								!!attachedReference ||
								selectedWorkflowKind !== 'image-edit'}
							>Replace selected image (Undo available)</option
						></select
					></label
				>
			</div>

			{#if processingGeneration}
				<div class="fal-generation-progress" role="status" aria-live="polite">
					<strong>{operationStatus}</strong>
					<span>
						{selectedWorkflowKind === 'image-to-video'
							? 'Your video will appear below and in device history, not on the canvas.'
							: selectedWorkflowKind === null
								? 'Images and videos appear in Preview. Completed results stay in device history.'
								: destination === 'replace' && selectedWorkflowKind === 'image-edit'
									? 'Your result will replace the selected image and stay in history.'
									: 'Your result will appear in Preview and history. Add it to the canvas when ready.'}
					</span>
					<progress
						aria-label="AI generation progress"
						max="100"
						value={operationProgress || undefined}
					></progress>
				</div>
			{/if}
			<div class="fal-model-picker" bind:this={modelPickerRoot}>
				<label for="drawing-ai-workflow">Models and workflows</label>
				<button
					id="drawing-ai-workflow"
					type="button"
					class="fal-model-toggle"
					aria-label="AI model and workflow selector"
					aria-expanded={modelPickerOpen}
					aria-controls="drawing-ai-models"
					disabled={processing || processingGeneration}
					bind:this={modelPickerButton}
					onclick={() => setModelPickerOpen(!modelPickerOpen)}
				>
					<span>
						{selectedModels.length === 1
							? `${selectedModels[0].label} · ${selectedModels[0].workflow}`
							: selectedModels.length
								? `${selectedModels.length} models selected`
								: 'Select one or more models'}
					</span>
					<span aria-hidden="true">{modelPickerOpen ? '▴' : '▾'}</span>
				</button>
				{#if modelPickerOpen}
					<div id="drawing-ai-models" class="fal-model-menu" aria-label="Available AI models">
						<div class="fal-model-search">
							<input
								type="search"
								aria-label="Search AI models"
								placeholder="Search models, providers, or rankings"
								bind:value={modelSearchQuery}
								bind:this={modelSearchInput}
							/>
							{#if modelSearchQuery}
								<button
									type="button"
									aria-label="Clear AI model search"
									onclick={() => {
										modelSearchQuery = '';
										modelSearchInput?.focus();
									}}>×</button
								>
							{/if}
						</div>
						<div class="fal-model-menu-heading">
							<span>
								{modelSearchQuery.trim()
									? `${visibleModels.length} matching · ${selectedModels.length} selected`
									: `Cheapest first · ${selectedModels.length} selected`}
							</span>
							<button
								type="button"
								class="fal-model-select-all"
								disabled={visibleModels.length === 0}
								onclick={() =>
									selectModels(
										visibleModels,
										!visibleModels.every((model) => selectedModelIds.includes(model.id))
									)}
							>
								{visibleModels.length > 0 &&
								visibleModels.every((model) => selectedModelIds.includes(model.id))
									? modelSearchQuery.trim()
										? 'Clear results'
										: 'Clear all'
									: modelSearchQuery.trim()
										? 'Select results'
										: 'Select all'}
							</button>
						</div>
						<div class="fal-model-cards">
							{#if visibleModels.length === 0}
								<p class="fal-model-empty">No models match “{modelSearchQuery.trim()}”.</p>
							{/if}
							{#each workflowFolders as folder (folder.kind)}
								<details
									class="fal-model-folder"
									aria-label="{folder.label} models"
									open={Boolean(modelSearchQuery.trim()) ||
										expandedModelWorkflowKinds.includes(folder.kind)}
								>
									<summary class="fal-model-folder-heading">
										<strong>{folder.label}</strong>
										<span class="fal-folder-controls">
											<span>
												{folder.models.filter((model) => selectedModelIds.includes(model.id))
													.length}
												/ {folder.models.length}
											</span>
											<button
												type="button"
												class="fal-model-select-all"
												aria-label="Select all {folder.label} models"
												onclick={(event) => selectFolderModels(event, folder.models, true)}
												>All</button
											>
											<button
												type="button"
												class="fal-model-select-all"
												aria-label="Select no {folder.label} models"
												onclick={(event) => selectFolderModels(event, folder.models, false)}
												>None</button
											>
										</span>
									</summary>
									<div class="fal-model-folder-cards">
										{#each folder.groups as group (group.weights)}
											<section
												class="fal-model-weight-group"
												aria-label="{group.label} {folder.label} models"
											>
												<div class="fal-model-weight-heading">
													<strong>{group.label}</strong>
													<span class="fal-folder-controls">
														<span>
															{group.models.filter((model) => selectedModelIds.includes(model.id))
																.length}
															/ {group.models.length}
														</span>
														<button
															type="button"
															class="fal-model-select-all"
															aria-label="Select all {group.label} {folder.label} models"
															onclick={() => selectModels(group.models, true)}>All</button
														>
														<button
															type="button"
															class="fal-model-select-all"
															aria-label="Select no {group.label} {folder.label} models"
															onclick={() => selectModels(group.models, false)}>None</button
														>
													</span>
												</div>
												{#each group.models as model (model.id)}
													<div
														class="fal-model-card"
														class:selected={selectedModelIds.includes(model.id)}
													>
														<label class="fal-model-option">
															<input
																type="checkbox"
																aria-label="{model.label} · {model.workflow}"
																checked={selectedModelIds.includes(model.id)}
																onchange={() => toggleModel(model.id)}
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
																selectedModelIds = [model.id];
																setModelPickerOpen(false);
															}}
														>
															Only
														</button>
													</div>
												{/each}
											</section>
										{/each}
									</div>
								</details>
							{/each}
						</div>
					</div>
				{/if}
				{#if !modelPickerOpen && selectedModels.length > 1}
					<div class="selected-model-chips" aria-label="Selected AI models">
						{#each selectedModels.slice(0, 4) as model (model.id)}
							<button
								type="button"
								aria-label="Remove {model.label} from selected models"
								disabled={processing || processingGeneration}
								onclick={() => toggleModel(model.id)}
							>
								{model.label} <span aria-hidden="true">×</span>
							</button>
						{/each}
						{#if selectedModels.length > 4}
							<button
								type="button"
								aria-label="Show all selected AI models"
								onclick={() => setModelPickerOpen(true)}
							>
								+{selectedModels.length - 4} more
							</button>
						{/if}
					</div>
				{/if}
				{#if selectedModels.length === 1}
					<div class="fal-model-detail">
						<span>{selectedModel.description}</span>
						<strong>{selectedModel.badge}</strong>
					</div>
				{/if}
				<p class="fal-upload-hint">
					{authenticated ? 'Funded by swyx.io · ' : 'Sign in required · '}
					{uploadsSelectedImage
						? 'Large images automatically fit each model’s limits and the secure upload limit.'
						: 'Text-to-image workflows only send your prompt; no reference image is uploaded.'}
				</p>
			</div>
			<ToolsAiNotice />
			{#each selectedWorkflowParameters as folder (folder.kind)}
				{#if folder.parameters.length}
					<section class="fal-parameter-group" aria-label="{folder.label} settings">
						<div class="fal-parameter-heading">
							<strong>{folder.label} settings</strong>
							{#if folder.models.length > 1}
								<span>Compatible models only</span>
							{/if}
						</div>
						<div class="fal-parameter-grid">
							{#each folder.parameters as parameter (parameter.key)}
								{#if parameter.type === 'boolean'}
									<label class="fal-parameter-toggle">
										<input
											type="checkbox"
											aria-label="{folder.label} {parameter.label}"
											checked={parameterCurrentValue(folder, parameter) === true}
											disabled={processing || processingGeneration}
											onchange={(event) =>
												updateGenerationParameter(
													folder.kind,
													parameter.key,
													event.currentTarget.checked
												)}
										/>
										<span>{parameter.label}</span>
									</label>
								{:else if parameter.type === 'seed'}
									<label class="fal-parameter-field">
										<span>{parameter.label}</span>
										<input
											type="number"
											aria-label="{folder.label} {parameter.label}"
											min="0"
											max="2147483647"
											step="1"
											placeholder="Random"
											value={parameterCurrentValue(folder, parameter)}
											disabled={processing || processingGeneration}
											oninput={(event) =>
												updateGenerationParameter(
													folder.kind,
													parameter.key,
													event.currentTarget.value === ''
														? undefined
														: Number(event.currentTarget.value)
												)}
										/>
									</label>
								{:else}
									<label class="fal-parameter-field">
										<span>{parameter.label}</span>
										<select
											aria-label="{folder.label} {parameter.label}"
											value={parameterChoice(
												parameter.key,
												parameterCurrentValue(folder, parameter)
											)}
											disabled={processing || processingGeneration}
											onchange={(event) =>
												updateGenerationParameter(
													folder.kind,
													parameter.key,
													parameter.options?.find(
														(option) =>
															parameterChoice(parameter.key, option) === event.currentTarget.value
													)
												)}
										>
											{#each parameter.options ?? [] as option (parameterChoice(parameter.key, option))}
												<option value={parameterChoice(parameter.key, option)}>
													{parameterOptionLabel(parameter.key, option)}
												</option>
											{/each}
										</select>
									</label>
								{/if}
							{/each}
						</div>
					</section>
				{/if}
			{/each}
			<div class="generation-budget">
				<label
					>Run reservation limit ($)<input
						aria-label="Run spending limit"
						type="number"
						min="0.05"
						max="20"
						step="0.05"
						bind:value={runLimitUsd}
						disabled={processingGeneration}
					/></label
				>
				<label
					>Confirm estimates above ($)<input
						aria-label="Generation confirmation threshold"
						type="number"
						min="0"
						max="20"
						step="0.05"
						bind:value={confirmationThreshold}
						disabled={processingGeneration}
					/></label
				>
				<p>
					Reserves ~${reservationTotal.toFixed(3)} against the run limit. Estimates are not final provider
					billing. Account/site limits also apply.
				</p>
				{#each [...new Set(selectedModels.map((model) => model.disclosure))] as disclosure}<p>
						{disclosure}
					</p>{/each}
			</div>
			<div class="fal-action-row">
				<span>
					{selectedModels.length
						? `~$${estimatedCost.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} total · ${selectedModels.length} ${selectedModels.length === 1 ? 'generation' : 'generations'}`
						: 'Select at least one model'}
				</span>
				{#if processingGeneration}
					<button type="button" class="secondary-action" onclick={cancelGeneration}>
						Cancel
					</button>
				{:else if !authenticated}
					<a class="fal-action fal-sign-in" href="/tools?next=/draw">Sign in to generate</a>
				{:else}
					<button
						type="button"
						class="fal-action"
						aria-label={generationButtonLabel}
						aria-keyshortcuts="Meta+Enter Control+Enter"
						disabled={processing ||
							!prompt.trim() ||
							!selectedModels.length ||
							(uploadsSelectedImage && !activeReference) ||
							reservationTotal > Number(runLimitUsd)}
						onclick={() => void applyGeneration()}
					>
						{selectedWorkflowKind === 'image-to-video'
							? 'Generate video'
							: selectedWorkflowKind === 'text-to-image'
								? 'Generate image'
								: 'Generate'} <kbd aria-hidden="true">⌘↵</kbd>
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
				preload="none"
				aria-label="Generated video"
			></video>
			<p>Video stays outside the canvas and cloud drawing sync.</p>
		</section>
	{/if}

	{#if previewRecords.length}
		<section
			class="generation-history"
			aria-label="Generated images from this session"
			bind:this={historySection}
		>
			<div class="history-heading">
				<strong>Recent generations / Compare</strong>
				<span>On this device · this page · up to 32 entries</span>
			</div>
			<div class="generation-list">
				{#each generations as generation, index (generation.id)}
					<div class="generation-choice">
						<button
							type="button"
							class="generation-card"
							class:current={imagePreview === generation.dataURL ||
								activeVideoGenerationId === generation.id}
							aria-label="Use generation {index + 1}: {generation.prompt}"
							aria-pressed={imagePreview === generation.dataURL ||
								activeVideoGenerationId === generation.id}
							disabled={processing || processingGeneration || backgroundProcessing}
							onclick={() => void restoreGeneration(generation)}
						>
							{#if generation.mimeType.startsWith('video/')}
								<span class="video-placeholder">Video · click to preview</span>
							{:else}
								<img src={generation.dataURL} alt="" />
							{/if}
							<span>{generation.modelLabel}</span>
						</button>
						{#if generation.mimeType.startsWith('image/') && generation.modelLabel !== 'Original'}
							<label class="compare-select"
								><input
									type="checkbox"
									aria-label={`Compare ${generation.modelLabel} ${index + 1}`}
									checked={comparisonIds.includes(generation.id)}
									onchange={(event) => {
										comparisonIds = event.currentTarget.checked
											? [...comparisonIds, generation.id]
											: comparisonIds.filter((id) => id !== generation.id);
									}}
								/> Compare</label
							>
						{/if}
					</div>
				{/each}
			</div>
			<button
				class="generation-recreate"
				type="button"
				disabled={processing || !comparisonImages.length}
				onclick={() => addGenerations(comparisonImages, true)}
				>Add comparison board ({comparisonImages.length})</button
			>
			{#if activeGeneration}
				<section class="generation-recipe" aria-label="Selected generation details">
					<div class="generation-recipe-heading">
						<strong>{activeGeneration.modelLabel}</strong>
						<span>{new Date(activeGeneration.createdAt).toLocaleString()}</span>
					</div>
					{#if activeGeneration.modelWorkflow}
						<div class="generation-recipe-meta">
							{activeGeneration.modelProvider} · {activeGeneration.modelWorkflow}
						</div>
					{/if}
					{#if activeGeneration.mimeType.startsWith('image/')}
						<img
							class="generation-preview"
							src={activeGeneration.dataURL}
							alt="Generated preview"
						/>
					{/if}
					<div class="generation-metrics">
						{activeGeneration.adapterId ??
							'Provider recorded in recipe'}{activeGeneration.elapsedMs !== undefined
							? ` · ${(activeGeneration.elapsedMs / 1000).toFixed(1)}s end-to-end`
							: ''}{activeGeneration.estimatedUsd !== undefined
							? ` · ~$${activeGeneration.estimatedUsd.toFixed(3)} estimated`
							: ''}
					</div>
					<div class="generation-prompt" aria-label="Generation prompt">
						{activeGeneration.prompt}
					</div>
					{#if activeGenerationSettings.length}
						<div class="generation-settings" aria-label="Generation model settings">
							{#each activeGenerationSettings as setting (setting)}
								<span>{setting}</span>
							{/each}
						</div>
					{/if}
					{#if activeGeneration.referenceImages?.length}
						<div class="generation-references" aria-label="Generation reference images">
							<strong
								>Reference {activeGeneration.referenceImages.length === 1
									? 'image'
									: 'images'}</strong
							>
							{#each activeGeneration.referenceImages as reference, index (reference.dataURL)}
								<img src={reference.dataURL} alt="Reference image {index + 1}" />
							{/each}
						</div>
					{:else if activeGeneration.modelKind === 'text-to-image'}
						<div class="generation-recipe-meta">Prompt only · no reference image</div>
					{/if}
					{#if activeGenerationLineage.length > 1}
						<div class="generation-lineage" aria-label="Generation history">
							{activeGenerationLineage.map((entry) => entry.modelLabel).join(' → ')}
						</div>
					{/if}
					{#if activeGeneration.modelLabel !== 'Original'}<button
							type="button"
							class="generation-recreate"
							aria-label="Restore reference image, prompt, and model"
							disabled={processing || processingGeneration || backgroundProcessing}
							onclick={() => void restoreGenerationRecipe(activeGeneration)}
						>
							Remix prompt, references & settings
						</button>{/if}
					{#if activeGeneration.mimeType.startsWith('image/')}
						<div class="reference-actions">
							<button
								type="button"
								disabled={processing}
								onclick={() => addGenerations([activeGeneration])}>Add to canvas</button
							><button
								type="button"
								disabled={!imageId || processing || processingGeneration}
								onclick={() => replaceWithGeneration(activeGeneration)}
								>Replace selected image</button
							><a download="generation.png" href={activeGeneration.dataURL}>Download image</a>
						</div>
					{/if}
					<label class="quality-note"
						>Personal quality note<input
							aria-label="Generation quality note"
							maxlength="500"
							bind:value={qualityNote}
						/><button
							type="button"
							onclick={() => {
								onGeneration?.({ ...activeGeneration, qualityNote: qualityNote.trim() });
								operationStatus = 'Quality note saved on this device';
							}}>Save note</button
						></label
					>
				</section>
			{/if}
		</section>
	{/if}

	{#if generationJobs.length && lastRun?.pageKey === pageKey}
		<section class="generation-queue" aria-label="Generation queue" aria-live="polite">
			<strong
				>{processingGeneration ? 'Generating' : 'Latest batch'} · {generationJobs.filter(
					(job) => job.status === 'completed'
				).length}/{generationJobs.length}</strong
			>
			{#each generationJobs as job (job.id)}<div class="queue-job">
					<strong
						>{DRAW_GENERATION_MODELS.find((model) => model.id === job.recipe.modelId)?.label ??
							job.recipe.modelId}</strong
					><span
						>{job.message}{job.elapsedMs ? ` · ${(job.elapsedMs / 1000).toFixed(1)}s` : ''}</span
					>{#if job.generation}<button
							type="button"
							onclick={() => job.generation && restoreGeneration(job.generation)}
							>Preview result</button
						>{/if}
				</div>{/each}
			{#if processingGeneration}<button type="button" onclick={cancelGeneration}
					>Cancel remaining jobs</button
				>{:else if generationJobs.some((job) => job.status === 'failed')}<button
					type="button"
					onclick={() => applyGeneration(true)}>Retry failed jobs (same run budget)</button
				>{/if}
		</section>
	{/if}
	{#if action === 'generate'}<div class="saved-generation-panel">
			<DrawGenerationLibrary
				{storageKey}
				{userId}
				{prompt}
				reference={activeReference}
				generation={activeGeneration}
				onModifier={(text) => {
					prompt = `${prompt.trim()}\n${text}`.trim().slice(0, 1000);
				}}
				onReference={(reference) => {
					attachedReference = reference;
					useCanvasReference = false;
					destination = 'preview';
					action = 'generate';
				}}
				onRemix={restoreGenerationRecipe}
			/>
		</div>{/if}
	{#if historyError}<p class="operation-error" role="alert">{historyError}</p>{/if}

	{#if processing && !processingGeneration}
		<div class="operation-progress" aria-live="polite">
			<span>{operationStatus}{operationProgress ? ` · ${operationProgress}%` : ''}</span>
			<progress aria-label="Image editing progress" max="100" value={operationProgress || undefined}
			></progress>
		</div>
	{:else if !processingGeneration && operationError}
		<p class="operation-error" role="alert">{operationError}</p>
	{:else if !processingGeneration && operationStatus}
		<p class="operation-success" role="status">{operationStatus}</p>
	{/if}
</div>

<style>
	.generation-reference {
		display: grid;
		gap: 7px;
		padding: 9px;
		border: 1px dashed #cbd5e1;
		border-radius: 8px;
		margin: 10px 0;
		font-size: 11px;
	}
	.generation-reference img {
		max-height: 85px;
		max-width: 100%;
		object-fit: contain;
		justify-self: start;
	}
	.reference-actions {
		display: flex;
		gap: 5px;
		flex-wrap: wrap;
		align-items: center;
	}
	.reference-actions button,
	.attach-reference,
	.generation-queue button,
	.quality-note button {
		padding: 5px 7px;
		border: 1px solid #cbd5e1;
		border-radius: 5px;
		background: white;
		font-size: 11px;
		cursor: pointer;
	}
	.attach-reference input {
		width: 1px;
		height: 1px;
		position: absolute;
		opacity: 0;
	}
	.attach-reference:focus-within {
		outline: 2px solid #6366f1;
	}
	.generation-reference select {
		display: block;
		width: 100%;
		margin-top: 4px;
		padding: 5px;
	}
	.generation-budget {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 7px;
		font-size: 11px;
		margin: 10px 0;
	}
	.generation-budget label,
	.quality-note {
		display: grid;
		gap: 4px;
	}
	.generation-budget input,
	.quality-note input {
		min-width: 0;
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 4px;
		padding: 5px;
	}
	.generation-budget p {
		grid-column: 1 / -1;
		margin: 0;
		color: #64748b;
		line-height: 1.45;
	}
	.generation-choice {
		min-width: 0;
	}
	.generation-preview {
		width: 100%;
		max-height: 240px;
		object-fit: contain;
		background: #f1f5f9;
		border-radius: 6px;
	}
	.compare-select,
	.generation-metrics,
	.video-placeholder {
		font-size: 10px;
		color: #64748b;
	}
	.generation-queue {
		margin-top: 12px;
		padding-top: 10px;
		border-top: 1px solid #e2e8f0;
		font-size: 12px;
	}
	.queue-job {
		display: grid;
		gap: 3px;
		padding: 7px 0;
		font-size: 11px;
	}
	.queue-job span {
		color: #64748b;
		overflow-wrap: anywhere;
	}
	.quality-note {
		font-size: 11px;
		margin-top: 8px;
	}

	.image-toolbox {
		min-width: 0;
	}

	.image-toolbox.minimized > :not(.toolbox-heading) {
		display: none;
	}

	.toolbox-heading {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 2px 0;
		background: #fff;
		font-size: 11px;
	}

	.drag-handle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
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

	.toolbox-minimize {
		flex: none;
		width: 25px;
		height: 25px;
		padding: 0;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: #71717a;
		font-size: 16px;
		cursor: pointer;
	}

	.toolbox-minimize:hover,
	.toolbox-minimize:focus-visible {
		background: #f4f4f5;
		color: #3f3f46;
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

	.fal-parameter-group {
		margin: 8px 0;
		padding: 8px;
		border: 1px solid #ededf1;
		border-radius: 8px;
		background: #fcfcfd;
	}

	.fal-parameter-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 7px;
		font-size: 9px;
	}

	.fal-parameter-heading strong {
		color: #3f3f46;
		font-weight: 550;
	}

	.fal-parameter-heading > span {
		color: #71717a;
	}

	.fal-parameter-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(108px, 1fr));
		gap: 7px;
	}

	.fal-parameter-field {
		display: grid;
		gap: 3px;
		min-width: 0;
		color: #52525b;
		font-size: 9px;
	}

	.fal-parameter-field select,
	.fal-parameter-field input {
		width: 100%;
		min-width: 0;
		height: 28px;
		padding: 0 6px;
		border: 1px solid #dedee6;
		border-radius: 6px;
		background: #fff;
		color: #27272a;
		font: inherit;
	}

	.fal-parameter-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		min-height: 28px;
		align-self: end;
		color: #52525b;
		font-size: 9px;
	}

	.fal-parameter-toggle input {
		accent-color: #6554c0;
	}

	.generation-settings {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.generation-settings span {
		padding: 3px 6px;
		border: 1px solid #e8e8ed;
		border-radius: 999px;
		background: #fafafa;
		color: #52525b;
		font-size: 9px;
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

	.fal-model-search {
		position: relative;
		margin-bottom: 7px;
	}

	.fal-model-search input {
		box-sizing: border-box;
		width: 100%;
		height: 31px;
		padding: 0 27px 0 8px;
		border: 1px solid #e3e3e9;
		border-radius: 6px;
		background: #fff;
		color: #27272a;
		font: inherit;
		font-size: 10px;
		outline-color: #7768e5;
	}

	.fal-model-search button {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 22px;
		height: 22px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: #71717a;
		font-size: 15px;
		cursor: pointer;
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

	.fal-model-empty {
		margin: 0;
		padding: 14px 5px;
		color: #71717a;
		font-size: 10px;
		text-align: center;
	}

	.selected-model-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		margin-top: 7px;
	}

	.selected-model-chips button {
		max-width: 100%;
		padding: 4px 7px;
		border: 1px solid #ded9ff;
		border-radius: 999px;
		background: #f7f5ff;
		color: #5142ab;
		font-size: 9px;
		cursor: pointer;
	}

	.selected-model-chips button span {
		font-size: 11px;
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

	.fal-folder-controls {
		display: flex;
		align-items: center;
		gap: 3px;
		white-space: nowrap;
	}

	.fal-model-folder-cards {
		display: grid;
		gap: 5px;
		padding: 0 6px 6px;
	}

	.fal-model-weight-group {
		display: grid;
		gap: 5px;
	}

	.fal-model-weight-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		padding: 3px 1px;
		background: #fff;
		color: #71717a;
		font-size: 8px;
	}

	.fal-model-weight-heading > strong {
		color: #52525b;
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

	.generation-card img {
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

	.generation-recipe {
		display: grid;
		gap: 6px;
		margin-top: 8px;
		padding: 8px;
		border: 1px solid #ececf0;
		border-radius: 7px;
		background: #fafafa;
		font-size: 9px;
	}

	.generation-recipe-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 7px;
	}

	.generation-recipe-heading > span,
	.generation-recipe-meta,
	.generation-lineage {
		color: #71717a;
		font-size: 8px;
	}

	.generation-prompt {
		padding: 7px;
		border: 1px solid #e8e8ed;
		border-radius: 5px;
		background: #fff;
		color: #3f3f46;
		line-height: 1.45;
		overflow-wrap: anywhere;
	}

	.generation-references {
		display: flex;
		align-items: center;
		gap: 7px;
		color: #52525b;
	}

	.generation-references img {
		width: 42px;
		height: 34px;
		border: 1px solid #e4e4e7;
		border-radius: 4px;
		background: repeating-conic-gradient(#f4f4f5 0 25%, #fff 0 50%) 50% / 8px 8px;
		object-fit: contain;
	}

	.generation-recreate {
		justify-self: start;
		padding: 5px 8px;
		border: 1px solid #ded9ff;
		border-radius: 5px;
		background: #f5f3ff;
		color: #5142ab;
		font: inherit;
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
