<script>
	import { onMount, tick } from 'svelte';
	import '@excalidraw/excalidraw/index.css';
	import { DRAW_MEME_TEMPLATES, fetchMemeTemplates, searchMemeTemplates } from '$lib/draw-memes.js';
	import { orderRecentDrawingPages, searchWorkspaceCommands } from '$lib/draw-workspace.js';
	import { DEFAULT_DRAW_FAL_MODEL, getDrawFalModel } from '$lib/draw-fal-models.js';
	import {
		loadDrawingGenerationHistory,
		saveDrawingGenerationHistory
	} from '$lib/draw-generation-history.js';
	import {
		executeDrawingAgentCommand,
		captureVisibleDrawingViewport
	} from '$lib/draw-agent-tools.js';
	import { processImageTool } from '$lib/draw-image-tools.js';
	import { prepareDrawingFalImage } from '$lib/draw-fal-image.js';
	import { runDrawingFalGeneration } from '$lib/draw-fal-queue.js';
	import { optimizeDrawingImageForCloud, replaceDrawingImage } from '$lib/draw-image-scene.js';
	import {
		createDrawingDesign,
		DRAW_DESIGN_FORMATS,
		DRAW_DESIGN_TEMPLATES,
		getDrawingDesignFormat,
		getDrawingDesignTemplate
	} from '$lib/draw-designs.js';
	import DrawAgent from '$lib/DrawAgent.svelte';
	import DrawImageToolbox from '$lib/DrawImageToolbox.svelte';

	const STORAGE_KEY = 'swyx-excalidraw';
	const PAGE_STORAGE_KEY = `${STORAGE_KEY}:pages`;
	const LIBRARY_STORAGE_KEY = `${STORAGE_KEY}:library`;
	const INSTALLED_LIBRARY_STORAGE_KEY = `${LIBRARY_STORAGE_KEY}:installed-defaults`;
	const BACKGROUND_MODE_STORAGE_KEY = `${STORAGE_KEY}:background-mode`;
	const PAGE_API = '/tools/api/draw/pages';
	const SAVE_DELAY = 800;
	const MAX_CLOUD_SCENE_BYTES = 1_800_000;
	const BACKGROUND_MODES = [
		{ id: 'portrait-fast', label: 'Portrait · fast', size: '~6.6 MB' },
		{ id: 'general-fast', label: 'General · fast', size: '~42 MB' },
		{ id: 'general-balanced', label: 'General · balanced', size: '~85 MB' },
		{ id: 'general-maximum', label: 'General · maximum', size: '~176 MB' }
	];

	/**
	 * @typedef {{ id: string, name: string, updatedAt?: string | number }} DrawingPage
	 * @typedef {{ elements?: readonly import('@excalidraw/excalidraw/element/types').ExcalidrawElement[], appState?: Record<string, any>, files?: import('@excalidraw/excalidraw/types').BinaryFiles }} DrawingScene
	 * @typedef {{ id: string, label: string, description?: string, category: string, keywords?: string | string[], run: () => void | Promise<void> }} WorkspaceCommand
	 * @typedef {import('$lib/draw-generation-history.js').DrawingImageGeneration} DrawingImageGeneration
	 */

	/** @type {HTMLDivElement} */
	let canvas;
	/** @type {import('@excalidraw/excalidraw/types').ExcalidrawImperativeAPI | null} */
	let editor = $state.raw(null);
	/** @type {typeof import('@excalidraw/excalidraw').convertToExcalidrawElements | null} */
	let convertElements = null;
	/** @type {typeof import('@excalidraw/excalidraw').newElementWith | null} */
	let updateElement = $state.raw(null);
	/** @type {typeof import('@excalidraw/excalidraw').CaptureUpdateAction.IMMEDIATELY | null} */
	let captureImmediately = $state(null);
	/** @type {typeof import('@excalidraw/excalidraw').exportToBlob | undefined} */
	let exportToBlob;
	/** @type {typeof import('@excalidraw/excalidraw').exportToSvg | undefined} */
	let exportToSvg;
	/** @type {typeof import('$lib/draw-presets.js').DRAW_PRESETS} */
	let presets = $state([]);
	/** @type {typeof import('$lib/draw-ui-components.js').DRAW_UI_COMPONENTS} */
	let uiComponents = $state([]);
	/** @type {typeof import('$lib/draw-ui-components.js').createDrawUiComponent | undefined} */
	let createUiComponent;
	/** @type {'presets' | 'designs' | 'components' | 'memes'} */
	let workspaceSection = $state('presets');
	let selectedArtboardId = $state('');
	/** @type {import('@excalidraw/excalidraw/element/types').ExcalidrawFrameElement | undefined} */
	let selectedArtboard = $state(undefined);
	let designStatus = $state('');
	let isExportingDesign = $state(false);
	let componentQuery = $state('');
	let memeQuery = $state('');
	let memeTemplates = $state(DRAW_MEME_TEMPLATES);
	let isLoadingMemeCatalog = $state(false);
	let isInsertingMeme = $state(false);
	let memeError = $state('');
	let isCommandPaletteOpen = $state(false);
	let commandQuery = $state('');
	let highlightedCommandIndex = $state(0);
	/** @type {HTMLInputElement | undefined} */
	let commandInput = $state();
	/** @type {HTMLElement | null} */
	let commandPreviousFocus = null;
	/** @type {DrawingPage[]} */
	let pages = $state([]);
	let activePageId = $state('');
	let isPageMenuOpen = $state(false);
	let renamingPageId = $state('');
	let pageNameDraft = $state('');
	let cloudAvailable = $state(false);
	let toolsAuthenticated = $state(false);
	let needsSignIn = $state(false);
	/** @type {'local' | 'saving' | 'saved' | 'error'} */
	let saveStatus = $state('local');
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let saveTimer;
	/** @type {{ pageId: string, scene: DrawingScene } | undefined} */
	let pendingSave;
	let isSwitchingPage = false;
	let isLibraryOpen = $state(false);
	let selectedImageId = $state('');
	let selectedImageDataUrl = $state('');
	let imageToolAction = $state(
		/** @type {'magic-select' | 'magic-eraser' | 'depth-blur' | 'vectorize' | 'background' | 'fal' | null} */ (
			null
		)
	);
	let imageToolPrompt = $state('');
	let imageToolStatus = $state('');
	let imageToolModelIds = $state([DEFAULT_DRAW_FAL_MODEL.id]);
	let imageToolGenerationParameters = $state(
		/** @type {Record<string, Record<string, unknown>>} */ ({})
	);
	let processingImage = $state(/** @type {{ id: string, dataURL: string } | null} */ (null));
	let imageGenerations = $state(/** @type {DrawingImageGeneration[]} */ ([]));
	let imageToolsPosition = $state(/** @type {{ x: number, y: number } | null} */ (null));
	/** @type {{ pointerId: number, x: number, y: number, left: number, top: number, width: number } | undefined} */
	let imageToolsDrag;
	let backgroundMode = $state('portrait-fast');
	let backgroundStatus = $state('');
	let backgroundProgress = $state(0);
	let backgroundError = $state('');
	let isRemovingBackground = $state(false);
	/** @type {AbortController | undefined} */
	let backgroundAbort;
	const activePage = $derived(pages.find((page) => page.id === activePageId));
	const activeImageToolId = $derived(processingImage?.id ?? selectedImageId);
	const activeImageToolDataUrl = $derived(processingImage?.dataURL ?? selectedImageDataUrl);
	const activeBackgroundMode = $derived(
		BACKGROUND_MODES.find((mode) => mode.id === backgroundMode) ?? BACKGROUND_MODES[0]
	);

	/** @param {PointerEvent} event */
	function startDraggingImageTools(event) {
		if (event.button !== 0 && event.pointerType !== 'touch') return;
		const handle = /** @type {HTMLElement} */ (event.currentTarget);
		const panel = handle.closest('.image-tools');
		if (!(panel instanceof HTMLElement)) return;
		const bounds = panel.getBoundingClientRect();
		imageToolsDrag = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			left: bounds.left,
			top: bounds.top,
			width: bounds.width
		};
		handle.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	/** @param {PointerEvent} event */
	function moveImageTools(event) {
		if (!imageToolsDrag || imageToolsDrag.pointerId !== event.pointerId) return;
		imageToolsPosition = {
			x: Math.max(
				8,
				Math.min(
					window.innerWidth - imageToolsDrag.width - 8,
					imageToolsDrag.left + event.clientX - imageToolsDrag.x
				)
			),
			y: Math.max(
				8,
				Math.min(window.innerHeight - 140, imageToolsDrag.top + event.clientY - imageToolsDrag.y)
			)
		};
	}

	/** @param {PointerEvent} event */
	function finishDraggingImageTools(event) {
		if (imageToolsDrag?.pointerId === event.pointerId) imageToolsDrag = undefined;
	}

	/** @param {DrawingImageGeneration} generation */
	function rememberImageGeneration(generation) {
		const history = [generation, ...imageGenerations];
		const originals = history.filter((image) => image.modelLabel === 'Original');
		const generated = history.filter((image) => image.modelLabel !== 'Original');
		imageGenerations = [
			...generated.slice(0, Math.max(1, 32 - originals.length)),
			...originals
		].slice(0, 32);
		void saveDrawingGenerationHistory(activePageId, $state.snapshot(imageGenerations)).catch(
			(error) => {
				console.warn('Generation history could not be saved on this device.', error);
			}
		);
	}

	$effect(() => {
		const pageId = activePageId;
		if (!pageId) return;
		imageGenerations = [];
		let cancelled = false;
		void loadDrawingGenerationHistory(pageId)
			.then((history) => {
				if (cancelled || activePageId !== pageId) return;
				const pending = imageGenerations;
				const pendingIds = new Set(pending.map((generation) => generation.id));
				imageGenerations = [
					...pending,
					...history.filter((generation) => !pendingIds.has(generation.id))
				].slice(0, 32);
			})
			.catch((error) => {
				console.warn('Generation history could not be loaded from this device.', error);
			});
		return () => {
			cancelled = true;
		};
	});

	/** @param {boolean} active */
	function updateImageGenerationState(active) {
		processingImage = active ? { id: selectedImageId, dataURL: selectedImageDataUrl } : null;
	}
	const recentPages = $derived(orderRecentDrawingPages(pages, activePageId));
	const filteredComponents = $derived(
		searchWorkspaceCommands(
			uiComponents.map((component) => ({ ...component, label: component.title })),
			componentQuery,
			{ limit: 100 }
		)
	);
	const filteredComponentCategories = $derived(
		Array.from(new Set(filteredComponents.map((component) => component.category)))
	);
	const filteredMemeTemplates = $derived(
		searchMemeTemplates(memeQuery, memeQuery.trim() ? memeTemplates : DRAW_MEME_TEMPLATES)
	);
	const workspaceCommands = $derived.by(() => {
		/** @type {WorkspaceCommand[]} */
		const commands = [
			{
				id: 'action-new-page',
				label: 'Create new page',
				description: 'Start a fresh drawing',
				category: 'Actions',
				keywords: ['new', 'drawing', 'document'],
				run: () => createPage()
			},
			{
				id: 'action-import-image',
				label: 'Import screenshot or image',
				description: 'Choose an image, or paste one with ⌘V',
				category: 'Actions',
				keywords: ['upload', 'paste', 'picture', 'photo', 'screenshot'],
				run: () => editor?.setActiveTool({ type: 'image', insertOnCanvasDirectly: true })
			},
			{
				id: 'action-browse-designs',
				label: 'Browse branded design templates',
				description: 'Thumbnails, speaker cards, blog banners, and slides',
				category: 'Actions',
				keywords: ['canva', 'thumbnail', 'youtube', 'brand', 'artboard'],
				run: () => openWorkspaceSection('designs')
			},
			{
				id: 'action-duplicate-page',
				label: 'Duplicate current drawing page',
				description: 'Keep an editable copy for another variant',
				category: 'Actions',
				keywords: ['copy', 'variant', 'canva', 'version'],
				run: () => duplicatePage()
			},
			{
				id: 'action-browse-components',
				label: 'Browse UI components',
				description: 'Open the hand-drawn wireframing kit',
				category: 'Actions',
				keywords: ['wireframe', 'interface', 'kit'],
				run: () => openWorkspaceSection('components')
			},
			{
				id: 'action-browse-memes',
				label: 'Browse meme templates',
				description: 'Add a popular meme image to your drawing',
				category: 'Actions',
				keywords: ['imgflip', 'image', 'reaction', 'template'],
				run: () => openWorkspaceSection('memes')
			}
		];

		commands.push(
			...DRAW_DESIGN_TEMPLATES.map((design) => ({
				id: `design-${design.id}`,
				label: design.label,
				description: design.description,
				category: 'Designs',
				keywords: [
					'canva',
					'thumbnail',
					'youtube',
					'speaker',
					'brand',
					design.format,
					design.brand
				],
				run: async () => {
					await insertDesign(design.id);
				}
			})),
			...uiComponents.map((component) => ({
				id: `component-${component.id}`,
				label: component.title,
				description: component.description,
				category: 'Components',
				keywords: [component.category, ...(component.keywords ?? [])],
				run: () => insertUiComponent(component.id)
			})),
			...presets.map((preset) => ({
				id: `preset-${preset.id}`,
				label: preset.label,
				description: preset.description,
				category: 'Presets',
				keywords: ['framework', 'diagram', 'template'],
				run: () => insertPreset(preset)
			})),
			...recentPages.map((page) => ({
				id: `page-${page.id}`,
				label: page.name,
				description: page.id === activePageId ? 'Current page' : 'Open saved drawing',
				category: 'Pages',
				keywords: ['drawing', 'document', 'recent'],
				run: () => switchPage(page)
			})),
			...memeTemplates.map((meme) => ({
				id: `meme-${meme.id}`,
				label: meme.name,
				description: 'Insert meme template',
				category: 'Memes',
				keywords: ['meme', 'imgflip', ...(meme.keywords ?? [])],
				run: () => insertMemeTemplate(meme)
			}))
		);
		return commands;
	});
	const matchingCommands = $derived(searchWorkspaceCommands(workspaceCommands, commandQuery));

	/** @param {string} key */
	function readStorage(key) {
		try {
			const value = localStorage.getItem(key);
			return value ? JSON.parse(value) : undefined;
		} catch {
			return undefined;
		}
	}

	/**
	 * @param {typeof import('$lib/draw-library.js')} library
	 */
	function restoreDrawingLibrary(library) {
		const storedItems = readStorage(LIBRARY_STORAGE_KEY);
		const installedDefaults = readStorage(INSTALLED_LIBRARY_STORAGE_KEY);
		const restored = library.prepareDrawingLibrary({
			savedItems: Array.isArray(storedItems) ? storedItems : [],
			installedDefaultIds: Array.isArray(installedDefaults) ? installedDefaults : []
		});

		try {
			localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(restored.libraryItems));
			localStorage.setItem(
				INSTALLED_LIBRARY_STORAGE_KEY,
				JSON.stringify(restored.installedDefaultIds)
			);
		} catch (error) {
			console.error('Could not remember installed drawing libraries.', error);
		}

		return restored.libraryItems;
	}

	/** @param {import('@excalidraw/excalidraw/types').LibraryItems} libraryItems */
	function saveDrawingLibrary(libraryItems) {
		try {
			localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(libraryItems));
		} catch (error) {
			console.error('Could not save drawing libraries locally.', error);
		}
	}

	function storePages() {
		try {
			localStorage.setItem(PAGE_STORAGE_KEY, JSON.stringify({ pages, activePageId }));
		} catch (error) {
			console.error('Could not save drawing pages locally.', error);
		}
	}

	/** @param {string} id */
	function restorePageScene(id) {
		return /** @type {DrawingScene | undefined} */ (
			readStorage(`${STORAGE_KEY}:${id}`) ?? readStorage(STORAGE_KEY)
		);
	}

	/**
	 * @param {string} path
	 * @param {RequestInit} [options]
	 */
	async function requestPage(path, options = {}) {
		const response = await fetch(`${PAGE_API}${path}`, {
			...options,
			cache: 'no-store',
			headers: { 'Content-Type': 'application/json', ...options.headers }
		});
		if (
			response.status === 401 ||
			response.status === 403 ||
			!response.headers.get('content-type')?.includes('application/json')
		) {
			needsSignIn = true;
			throw new Error('Sign in to synchronize your drawings.');
		}
		if (!response.ok) throw new Error(`Drawing request failed (${response.status}).`);
		return response.json();
	}

	/** @param {DrawingPage[]} nextPages */
	function setPages(nextPages) {
		pages = nextPages;
		storePages();
	}

	async function loadInitialPage() {
		const stored = /** @type {{ pages?: DrawingPage[], activePageId?: string } | undefined} */ (
			readStorage(PAGE_STORAGE_KEY)
		);
		const previousScene = /** @type {DrawingScene | undefined} */ (readStorage(STORAGE_KEY));

		try {
			const result = await requestPage('');
			cloudAvailable = true;
			needsSignIn = false;
			pages = result.pages ?? [];

			if (pages.length === 0) {
				const firstPage = await requestPage('', {
					method: 'POST',
					body: JSON.stringify({ name: 'Page 1' })
				});
				pages = [firstPage];
				if (previousScene?.elements?.length) {
					await requestPage(`/${encodeURIComponent(firstPage.id)}`, {
						method: 'PUT',
						body: JSON.stringify({ scene: previousScene })
					});
				}
			}

			const rememberedPageId = stored?.activePageId ?? result.activePageId;
			activePageId = pages.some((page) => page.id === rememberedPageId)
				? /** @type {string} */ (rememberedPageId)
				: pages[0].id;
			storePages();
			const currentPage = await requestPage(`/${encodeURIComponent(activePageId)}`);
			saveStatus = 'saved';
			return currentPage.scene ?? previousScene;
		} catch (error) {
			cloudAvailable = false;
			saveStatus = 'local';
			if (!needsSignIn) console.warn('Drawing pages are using browser-only storage.', error);
			pages = stored?.pages?.length ? stored.pages : [{ id: 'default', name: 'Page 1' }];
			activePageId = pages.some((page) => page.id === stored?.activePageId)
				? /** @type {string} */ (stored?.activePageId)
				: pages[0].id;
			storePages();
			return restorePageScene(activePageId);
		}
	}

	async function flushPendingSave() {
		if (saveTimer) clearTimeout(saveTimer);
		const saving = pendingSave;
		pendingSave = undefined;
		if (!cloudAvailable || !saving) return;

		saveStatus = 'saving';
		try {
			const savedPage = await requestPage(`/${encodeURIComponent(saving.pageId)}`, {
				method: 'PUT',
				body: JSON.stringify({ scene: saving.scene })
			});
			setPages(
				pages.map((page) =>
					page.id === saving.pageId
						? { ...page, name: savedPage.name ?? page.name, updatedAt: savedPage.updatedAt }
						: page
				)
			);
			if (!pendingSave) saveStatus = 'saved';
		} catch (error) {
			saveStatus = 'error';
			console.error('Could not synchronize the drawing.', error);
		}
	}

	/** @param {DrawingPage} page */
	async function switchPage(page) {
		if (!editor || page.id === activePageId) {
			isPageMenuOpen = false;
			return;
		}

		isSwitchingPage = true;
		backgroundAbort?.abort();
		await flushPendingSave();
		try {
			const response = cloudAvailable
				? await requestPage(`/${encodeURIComponent(page.id)}`)
				: undefined;
			const scene = /** @type {DrawingScene} */ (
				response?.scene ?? readStorage(`${STORAGE_KEY}:${page.id}`) ?? { elements: [], files: {} }
			);
			if (!cloudAvailable) {
				const previousScene = localStorage.getItem(STORAGE_KEY);
				if (previousScene !== null) {
					localStorage.removeItem(STORAGE_KEY);
					try {
						localStorage.setItem(`${STORAGE_KEY}:${activePageId}`, previousScene);
					} catch (error) {
						localStorage.setItem(STORAGE_KEY, previousScene);
						throw error;
					}
				}
			}
			activePageId = page.id;
			storePages();
			localStorage.removeItem(`${STORAGE_KEY}:${page.id}`);
			localStorage.setItem(STORAGE_KEY, JSON.stringify(scene));
			editor.updateScene({
				elements: scene.elements ?? [],
				appState: { ...scene.appState, selectedElementIds: {} }
			});
			if (scene.files) editor.addFiles(Object.values(scene.files));
			isPageMenuOpen = false;
		} catch (error) {
			saveStatus = 'error';
			console.error('Could not open the drawing page.', error);
		} finally {
			isSwitchingPage = false;
		}
	}

	async function createPage() {
		const name = `Page ${pages.length + 1}`;
		try {
			const page = /** @type {DrawingPage} */ (
				cloudAvailable
					? await requestPage('', { method: 'POST', body: JSON.stringify({ name }) })
					: { id: crypto.randomUUID(), name, updatedAt: Date.now() }
			);
			setPages([...pages, page]);
			await switchPage(page);
		} catch (error) {
			saveStatus = 'error';
			console.error('Could not create a drawing page.', error);
		}
	}

	async function duplicatePage() {
		if (!editor || !activePage) return;
		await flushPendingSave();
		const source = {
			elements: editor.getSceneElementsIncludingDeleted(),
			appState: { viewBackgroundColor: editor.getAppState().viewBackgroundColor },
			files: filesUsedByScene(editor.getSceneElementsIncludingDeleted(), editor.getFiles())
		};
		const name = `${activePage.name} copy`.slice(0, 120);
		try {
			const page = /** @type {DrawingPage} */ (
				cloudAvailable
					? await requestPage('', { method: 'POST', body: JSON.stringify({ name }) })
					: { id: crypto.randomUUID(), name, updatedAt: Date.now() }
			);
			if (cloudAvailable) {
				await requestPage(`/${encodeURIComponent(page.id)}`, {
					method: 'PUT',
					body: JSON.stringify({ scene: source })
				});
			} else {
				localStorage.setItem(`${STORAGE_KEY}:${page.id}`, JSON.stringify(source));
			}
			setPages([...pages, page]);
			await switchPage(page);
		} catch (error) {
			saveStatus = 'error';
			console.error('Could not duplicate the drawing page.', error);
		}
	}

	/** @param {DrawingPage} page */
	function startRenaming(page) {
		renamingPageId = page.id;
		pageNameDraft = page.name;
	}

	/** @param {HTMLInputElement} input */
	function focusPageName(input) {
		input.focus();
		input.select();
	}

	async function finishRenaming() {
		const pageId = renamingPageId;
		const name = pageNameDraft.trim();
		renamingPageId = '';
		if (!pageId || !name) return;
		try {
			if (cloudAvailable) {
				await requestPage(`/${encodeURIComponent(pageId)}`, {
					method: 'PUT',
					body: JSON.stringify({ name })
				});
			}
			setPages(pages.map((page) => (page.id === pageId ? { ...page, name } : page)));
		} catch (error) {
			saveStatus = 'error';
			console.error('Could not rename the drawing page.', error);
		}
	}

	/** @param {string} id @param {string} name */
	async function renamePageFromAgent(id, name) {
		if (cloudAvailable) {
			await requestPage(`/${encodeURIComponent(id)}`, {
				method: 'PUT',
				body: JSON.stringify({ name })
			});
		}
		setPages(pages.map((page) => (page.id === id ? { ...page, name } : page)));
	}

	/**
	 * @param {string} action
	 * @param {Record<string, string | number>} options
	 * @param {{ signal: AbortSignal, onProgress: (message: string) => void, reserveSpending: (amount: number, label: string) => void, getBudget: () => string | undefined, updateBudget: (token: string, spendingUsd: number) => void }} operation
	 */
	async function applyAgentImageTool(action, options, operation) {
		if (!editor || !updateElement || !captureImmediately)
			throw new Error('The drawing editor is unavailable.');
		const requestedId = typeof options.id === 'string' ? options.id : selectedImageId;
		const selected = editor
			.getSceneElements()
			.find((element) => element.id === requestedId && element.type === 'image');
		if (!selected || selected.type !== 'image' || !selected.fileId) {
			throw new Error('Select one canvas image or supply --id ELEMENT_ID.');
		}
		const sourceFile = editor.getFiles()[selected.fileId];
		if (!sourceFile?.dataURL) throw new Error('The selected image could not be loaded.');
		editor.updateScene({ appState: { selectedElementIds: { [selected.id]: true } } });
		await tick();
		operation.signal.throwIfAborted();
		if (action === 'background') {
			const abort = () => backgroundAbort?.abort();
			operation.signal.addEventListener('abort', abort, { once: true });
			try {
				operation.onProgress('Removing the image background on your device');
				await removeSelectedImageBackground();
				if (backgroundError) throw new Error(backgroundError);
				return { action, imageId: selected.id, local: true };
			} finally {
				operation.signal.removeEventListener('abort', abort);
			}
		}
		let dataURL;
		let mimeType;
		/** @type {typeof import('$lib/draw-fal-models.js').DRAW_FAL_MODELS[number] | undefined} */
		let model;
		/** @type {DrawingImageGeneration | undefined} */
		let sourceGeneration;
		if (action === 'fal') {
			model = getDrawFalModel(options.model ?? DEFAULT_DRAW_FAL_MODEL.id);
			if (!model) throw new Error('Choose one of the available fal image models.');
			const imagePrompt = typeof options.prompt === 'string' ? options.prompt.trim() : '';
			if (!imagePrompt) throw new Error('Cloud image editing requires --prompt TEXT.');
			operation.reserveSpending(model.priceUsd, model.label);
			sourceGeneration = imageGenerations.find(
				(generation) => generation.dataURL === sourceFile.dataURL
			);
			if (!sourceGeneration) {
				sourceGeneration = {
					id: crypto.randomUUID(),
					dataURL: sourceFile.dataURL,
					mimeType: sourceFile.mimeType,
					prompt: 'Original image',
					modelLabel: 'Original',
					createdAt: Date.now()
				};
				rememberImageGeneration(sourceGeneration);
			}
			const prepared =
				model.kind === 'text-to-image'
					? undefined
					: await prepareDrawingFalImage({
							dataURL: sourceFile.dataURL,
							prompt: imagePrompt,
							model,
							signal: operation.signal,
							onProgress: operation.onProgress
						});
			const generationModel = model;
			const agentBudget = operation.getBudget();
			if (!agentBudget) throw new Error('The assistant spending authorization is unavailable.');
			const generated = await runDrawingFalGeneration({
				image: prepared?.blob,
				prompt: imagePrompt,
				model: model.id,
				signal: operation.signal,
				providerSafetyDefaults: true,
				agentBudget,
				onBudget: operation.updateBudget,
				cancelOnAbort: true,
				onProgress: (progress) =>
					operation.onProgress(
						progress.message ??
							`${progress.status.replaceAll('_', ' ').toLowerCase()} · ${generationModel.label}`
					)
			});
			if (model.kind === 'image-to-video') {
				rememberImageGeneration({
					id: crypto.randomUUID(),
					dataURL: generated.video,
					mimeType: 'video/mp4',
					prompt: imagePrompt,
					modelLabel: model.label,
					createdAt: Date.now(),
					modelId: model.id,
					modelEndpoint: model.model,
					modelProvider: model.provider,
					modelKind: model.kind,
					modelWorkflow: model.workflow,
					modelSettings: { ...model.settings },
					parentGenerationId: sourceGeneration.id,
					referenceImages: [
						{
							dataURL: sourceFile.dataURL,
							mimeType: sourceFile.mimeType,
							generationId: sourceGeneration.id
						}
					]
				});
				return {
					action,
					imageId: selected.id,
					model: model.id,
					estimatedUsd: model.priceUsd,
					video: true
				};
			}
			dataURL = generated.image;
			mimeType = dataURL.slice(5, dataURL.indexOf(';')) || 'image/png';
		} else {
			const source = await fetch(sourceFile.dataURL).then((response) => response.blob());
			const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
			const browserTestProcessor = loopback
				? /** @type {any} */ (globalThis).__SWYX_PROCESS_IMAGE_TOOL__
				: undefined;
			const edited = await (browserTestProcessor ?? processImageTool)(
				/** @type {'magic-select' | 'magic-eraser' | 'depth-blur' | 'vectorize'} */ (action),
				source,
				{
					point: { x: Number(options.x ?? 0.5), y: Number(options.y ?? 0.5) },
					radius: Number(options.radius ?? 0.12),
					blur: Number(options.blur ?? 14),
					focus: Number(options.focus ?? 0.55),
					signal: operation.signal,
					onProgress: (
						/** @type {import('$lib/draw-image-tools.js').DrawImageToolProgress} */ progress
					) =>
						operation.onProgress(
							progress.label ?? progress.message ?? `${action} ${progress.phase}`
						)
				}
			);
			dataURL = await readBlobDataUrl(edited);
			mimeType = edited.type || 'image/png';
		}
		if (cloudAvailable) {
			const optimized = await optimizeDrawingImageForCloud({
				editor,
				imageId: selected.id,
				sourceFileId: selected.fileId,
				dataURL,
				mimeType,
				signal: operation.signal,
				onOptimize: () => operation.onProgress('Optimizing the edited image for cloud sync')
			});
			dataURL = optimized.dataURL;
			mimeType = optimized.mimeType;
		}
		operation.signal.throwIfAborted();
		const updated = replaceDrawingImage({
			editor,
			imageId: selected.id,
			sourceFileId: selected.fileId,
			dataURL,
			mimeType,
			updateElement,
			captureUpdate: captureImmediately,
			cloudAvailable
		});
		if (updated.exceedsCloudLimit) saveStatus = 'error';
		if (model) {
			rememberImageGeneration({
				id: crypto.randomUUID(),
				dataURL: updated.dataURL,
				mimeType: updated.mimeType,
				prompt: String(options.prompt),
				modelLabel: model.label,
				createdAt: Date.now(),
				modelId: model.id,
				modelEndpoint: model.model,
				modelProvider: model.provider,
				modelKind: model.kind,
				modelWorkflow: model.workflow,
				modelSettings: { ...model.settings },
				parentGenerationId: sourceGeneration?.id,
				referenceImages:
					model.kind === 'text-to-image'
						? []
						: [
								{
									dataURL: sourceFile.dataURL,
									mimeType: sourceFile.mimeType,
									...(sourceGeneration ? { generationId: sourceGeneration.id } : {})
								}
							]
			});
		}
		return {
			action,
			imageId: selected.id,
			local: action !== 'fal',
			cloudSyncable: !updated.exceedsCloudLimit,
			...(model ? { model: model.id, estimatedUsd: model.priceUsd } : {})
		};
	}

	/**
	 * @param {string[]} args
	 * @param {{ signal: AbortSignal, onProgress: (message: string) => void, reserveSpending: (amount: number, label: string) => void, getBudget: () => string | undefined, updateBudget: (token: string, spendingUsd: number) => void }} operation
	 */
	async function executeAgentCommand(args, operation) {
		operation.signal.throwIfAborted();
		return executeDrawingAgentCommand(args, {
			editor,
			convertElements,
			updateElement,
			captureUpdate: captureImmediately,
			pageId: activePageId,
			pages,
			presets,
			components: uiComponents,
			commands: workspaceCommands,
			createPage,
			switchPage,
			renamePage: renamePageFromAgent,
			insertPreset,
			insertComponent: insertUiComponent,
			insertDesign,
			duplicateDesign,
			resizeDesign,
			exportDesign,
			image: (action, options) => applyAgentImageTool(action, options, operation)
		});
	}

	async function loadOfficialBrandLogo() {
		if (!editor) throw new Error('The drawing editor is unavailable.');
		const fileId = /** @type {import('@excalidraw/excalidraw/element/types').FileId} */ (
			'latent-space-official-hex'
		);
		if (editor.getFiles()[fileId]) return fileId;
		const response = await fetch('/assets/latent-space-hex-gradient.png', { cache: 'force-cache' });
		if (!response.ok) throw new Error('The official Latent Space logo could not be loaded.');
		const image = await response.blob();
		const dataURL = /** @type {import('@excalidraw/excalidraw/types').DataURL} */ (
			await readBlobDataUrl(image)
		);
		editor.addFiles([
			{
				id: fileId,
				mimeType: 'image/png',
				dataURL,
				created: Date.now(),
				lastRetrieved: Date.now()
			}
		]);
		return fileId;
	}

	/** @param {readonly import('@excalidraw/excalidraw/element/types').ExcalidrawElement[]} elements */
	function focusDesignArtboard(elements) {
		if (!editor) return;
		const narrow = window.innerWidth < 650;
		if (narrow && isLibraryOpen) {
			editor.updateScene({ appState: { openSidebar: null } });
		}
		editor.scrollToContent(elements, {
			fitToViewport: true,
			viewportZoomFactor: narrow ? 0.88 : 0.9,
			animate: false,
			canvasOffsets: {
				left: narrow ? 16 : 210,
				right: !narrow && isLibraryOpen ? 320 : 20,
				top: narrow ? 120 : 75,
				bottom: narrow ? 155 : 145
			}
		});
	}

	/** @param {string} templateId @param {Record<string, string>} [options] */
	async function insertDesign(templateId, options = {}) {
		if (!editor || !convertElements || !captureImmediately)
			throw new Error('The drawing canvas is not ready.');
		const template = getDrawingDesignTemplate(templateId);
		if (!template) throw new Error('Choose one of the available design templates.');
		const existing = editor.getSceneElementsIncludingDeleted();
		const visible = existing.filter((element) => !element.isDeleted);
		const x = visible.length
			? Math.max(...visible.map((element) => element.x + element.width)) + 120
			: 0;
		const y = visible.length ? Math.min(...visible.map((element) => element.y)) : 0;
		const logoFileId =
			template.brand === 'latent-space' ? await loadOfficialBrandLogo() : undefined;
		const design = createDrawingDesign(templateId, { ...options, x, y, logoFileId });
		const elements = convertElements(
			/** @type {import('@excalidraw/excalidraw/data/transform').ExcalidrawElementSkeleton[]} */ (
				design.elements
			),
			{ regenerateIds: true }
		);
		const frame = elements.find((element) => element.type === 'frame');
		if (!frame) throw new Error('The design artboard could not be created.');
		editor.updateScene({
			elements: [...existing, ...elements],
			appState: { selectedElementIds: { [frame.id]: true } },
			captureUpdate: captureImmediately
		});
		selectedArtboardId = frame.id;
		designStatus = `${design.format.width} × ${design.format.height} artboard created`;
		focusDesignArtboard(elements);
		return {
			frameId: frame.id,
			template: template.id,
			name: frame.name,
			width: frame.width,
			height: frame.height,
			elements: elements.length
		};
	}

	/** @param {string} frameId @param {string} [name] */
	function duplicateDesign(frameId, name) {
		if (!editor || !convertElements || !captureImmediately)
			throw new Error('The drawing canvas is not ready.');
		const existing = editor.getSceneElementsIncludingDeleted();
		const frame = existing.find(
			(element) => element.id === frameId && element.type === 'frame' && !element.isDeleted
		);
		if (!frame || frame.type !== 'frame') throw new Error('Choose an existing design artboard.');
		const children = existing.filter(
			(element) => !element.isDeleted && element.frameId === frame.id
		);
		const nextX =
			Math.max(
				...existing
					.filter((element) => !element.isDeleted)
					.map((element) => element.x + element.width)
			) + 100;
		const dx = nextX - frame.x;
		const skeletons = children.map(({ index, version, versionNonce, seed, ...element }) => ({
			...element,
			x: element.x + dx,
			frameId: null
		}));
		skeletons.push(
			/** @type {any} */ ({
				id: frame.id,
				type: 'frame',
				x: frame.x + dx,
				y: frame.y,
				width: frame.width,
				height: frame.height,
				name: name?.trim().slice(0, 100) || `${frame.name ?? 'Design'} · Variant`,
				children: children.map((element) => element.id)
			})
		);
		const copied = convertElements(/** @type {any} */ (skeletons), { regenerateIds: true });
		const nextFrame = copied.find((element) => element.type === 'frame');
		if (!nextFrame) throw new Error('The design artboard could not be duplicated.');
		editor.updateScene({
			elements: [...existing, ...copied],
			appState: { selectedElementIds: { [nextFrame.id]: true } },
			captureUpdate: captureImmediately
		});
		selectedArtboardId = nextFrame.id;
		designStatus = 'Editable artboard duplicated';
		focusDesignArtboard(copied);
		return {
			frameId: nextFrame.id,
			sourceFrameId: frame.id,
			name: nextFrame.name,
			width: nextFrame.width,
			height: nextFrame.height
		};
	}

	/** @param {string} frameId @param {string} formatId */
	function resizeDesign(frameId, formatId) {
		if (!editor || !updateElement || !captureImmediately)
			throw new Error('The drawing canvas is not ready.');
		const format = getDrawingDesignFormat(formatId);
		if (!format) throw new Error('Choose a supported artboard format.');
		const existing = editor.getSceneElementsIncludingDeleted();
		const frame = existing.find(
			(element) => element.id === frameId && element.type === 'frame' && !element.isDeleted
		);
		if (!frame || frame.type !== 'frame') throw new Error('Choose an existing design artboard.');
		const mutate = updateElement;
		const scale = Math.min(format.width / frame.width, format.height / frame.height);
		const insetX = (format.width - frame.width * scale) / 2;
		const insetY = (format.height - frame.height * scale) / 2;
		const resized = existing.map((element) => {
			if (element.id === frame.id)
				return mutate(element, { width: format.width, height: format.height });
			if (element.frameId !== frame.id || element.isDeleted) return element;
			const background =
				element.x === frame.x &&
				element.y === frame.y &&
				element.width === frame.width &&
				element.height === frame.height;
			/** @type {Record<string, any>} */
			const changes = background
				? { x: frame.x, y: frame.y, width: format.width, height: format.height }
				: {
						x: frame.x + insetX + (element.x - frame.x) * scale,
						y: frame.y + insetY + (element.y - frame.y) * scale,
						width: element.width * scale,
						height: element.height * scale
					};
			if (element.type === 'text')
				changes.fontSize = Math.max(10, Math.round(element.fontSize * scale));
			if ((element.type === 'arrow' || element.type === 'line') && element.points) {
				changes.points = element.points.map(([x, y]) => [x * scale, y * scale]);
			}
			return mutate(element, changes);
		});
		editor.updateScene({
			elements: resized,
			appState: { selectedElementIds: { [frame.id]: true } },
			captureUpdate: captureImmediately
		});
		designStatus = `Resized to ${format.width} × ${format.height}`;
		focusDesignArtboard(
			resized.filter((element) => element.id === frame.id || element.frameId === frame.id)
		);
		return { frameId: frame.id, format: format.id, width: format.width, height: format.height };
	}

	/** @param {string} frameId @param {'png' | 'jpg' | 'svg'} format @param {number} [scale] */
	async function exportDesign(frameId, format, scale = 1) {
		if (!editor || !exportToBlob || !exportToSvg)
			throw new Error('The drawing export is not ready.');
		const frame = editor
			.getSceneElements()
			.find((element) => element.id === frameId && element.type === 'frame');
		if (!frame || frame.type !== 'frame') throw new Error('Choose an existing design artboard.');
		isExportingDesign = true;
		try {
			const elements = editor
				.getSceneElements()
				.filter((element) => element.id === frame.id || element.frameId === frame.id);
			const options = {
				elements,
				files: editor.getFiles(),
				exportingFrame: frame,
				exportPadding: 0,
				appState: { ...editor.getAppState(), exportBackground: true, exportEmbedScene: false }
			};
			const blob =
				format === 'svg'
					? new Blob([new XMLSerializer().serializeToString(await exportToSvg(options))], {
							type: 'image/svg+xml'
						})
					: await exportToBlob({
							...options,
							mimeType: format === 'jpg' ? 'image/jpeg' : 'image/png',
							quality: 0.92,
							getDimensions: (/** @type {number} */ width, /** @type {number} */ height) => ({
								width: Math.round(width * scale),
								height: Math.round(height * scale),
								scale
							})
						});
			const url = URL.createObjectURL(blob);
			const download = document.createElement('a');
			download.href = url;
			download.download = `${
				(frame.name ?? 'design')
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, '') || 'design'
			}.${format}`;
			document.body.append(download);
			download.click();
			download.remove();
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
			designStatus = `Downloaded ${format.toUpperCase()} · ${frame.width * scale} × ${frame.height * scale}`;
			return {
				exported: true,
				format,
				filename: download.download,
				width: frame.width * scale,
				height: frame.height * scale
			};
		} finally {
			isExportingDesign = false;
		}
	}

	/** @param {DrawingPage} page */
	async function deletePage(page) {
		if (pages.length < 2) return;
		try {
			if (page.id === activePageId) {
				const replacement = pages.find((candidate) => candidate.id !== page.id);
				if (replacement) await switchPage(replacement);
			}
			if (cloudAvailable) {
				await requestPage(`/${encodeURIComponent(page.id)}`, { method: 'DELETE' });
			}
			localStorage.removeItem(`${STORAGE_KEY}:${page.id}`);
			setPages(pages.filter((candidate) => candidate.id !== page.id));
			isPageMenuOpen = true;
		} catch (error) {
			saveStatus = 'error';
			console.error('Could not delete the drawing page.', error);
		}
	}

	/** @param {typeof presets[number]} preset */
	function insertPreset(preset) {
		if (!editor || !convertElements) return;

		const existingElements = editor.getSceneElements();
		const offsetX =
			existingElements.length > 0
				? Math.max(...existingElements.map((element) => element.x + element.width)) + 180
				: 0;
		const offsetY =
			existingElements.length > 0 ? Math.min(...existingElements.map((element) => element.y)) : 0;
		const skeletons = preset.createShapes().map((shape) => ({
			...shape,
			x: (shape.x ?? 0) + offsetX,
			y: (shape.y ?? 0) + offsetY
		}));
		const shapes = convertElements(
			/** @type {import('@excalidraw/excalidraw/data/transform').ExcalidrawElementSkeleton[]} */ (
				skeletons
			),
			{ regenerateIds: true }
		);

		editor.updateScene({
			elements: [...existingElements, ...shapes],
			appState: {
				selectedElementIds: Object.fromEntries(shapes.map((shape) => [shape.id, true]))
			}
		});
		editor.scrollToContent(shapes, { fitToContent: true, animate: true, duration: 260 });
	}

	/** @param {string} componentId */
	function insertUiComponent(componentId) {
		if (!editor || !convertElements || !createUiComponent) return;
		const existingElements = editor.getSceneElements();
		const state = editor.getAppState();
		const centerX = state.width / (2 * state.zoom.value) - state.scrollX;
		const centerY = state.height / (2 * state.zoom.value) - state.scrollY;
		const skeletons = createUiComponent(componentId, centerX - 140, centerY - 65);
		if (!skeletons.length) return;
		const shapes = convertElements(
			/** @type {import('@excalidraw/excalidraw/data/transform').ExcalidrawElementSkeleton[]} */ (
				skeletons
			),
			{ regenerateIds: true }
		);
		editor.updateScene({
			elements: [...existingElements, ...shapes],
			appState: {
				selectedElementIds: Object.fromEntries(shapes.map((shape) => [shape.id, true]))
			},
			...(captureImmediately ? { captureUpdate: captureImmediately } : {})
		});
		editor.scrollToContent(shapes, { fitToContent: false, animate: true, duration: 180 });
	}

	/** @param {'presets' | 'designs' | 'components' | 'memes'} section */
	function openWorkspaceSection(section) {
		workspaceSection = section;
		isPageMenuOpen = false;
		editor?.updateScene({ appState: { openSidebar: { name: 'default', tab: 'workspace' } } });
		if (section === 'memes') void loadMemeCatalog();
	}

	async function loadMemeCatalog() {
		if (isLoadingMemeCatalog || memeTemplates.length > DRAW_MEME_TEMPLATES.length) return;
		isLoadingMemeCatalog = true;
		memeError = '';
		try {
			const currentTemplates = await fetchMemeTemplates();
			const byId = new Map(
				[...DRAW_MEME_TEMPLATES, ...currentTemplates].map((template) => [template.id, template])
			);
			memeTemplates = [...byId.values()];
		} catch (error) {
			memeError = 'More templates could not be loaded. Popular templates remain available.';
			console.warn('Could not load current Imgflip meme templates.', error);
		} finally {
			isLoadingMemeCatalog = false;
		}
	}

	/** @param {typeof DRAW_MEME_TEMPLATES[number]} template */
	async function insertMemeTemplate(template) {
		if (!editor || !convertElements || !captureImmediately || isInsertingMeme) return;
		isInsertingMeme = true;
		memeError = '';
		try {
			const { insertMemeImage } = await import('$lib/draw-meme-image.js');
			await insertMemeImage(editor, template, { convertElements, captureImmediately });
		} catch (error) {
			memeError = error instanceof Error ? error.message : 'The meme image could not be added.';
		} finally {
			isInsertingMeme = false;
		}
	}

	/** @param {HTMLElement} node */
	function mountWorkspacePanel(node) {
		node.hidden = true;
		const attach = () => {
			const host = canvas?.querySelector('[data-swyx-workspace-panel]');
			if (host && node.parentNode !== host) host.appendChild(node);
			node.hidden = !host;
		};
		const observer = new MutationObserver(attach);
		observer.observe(canvas, { childList: true, subtree: true });
		attach();
		return { destroy: () => observer.disconnect() };
	}

	/** @param {string} [query] */
	function openCommandPalette(query = '') {
		commandPreviousFocus =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		commandQuery = query;
		highlightedCommandIndex = 0;
		isPageMenuOpen = false;
		isCommandPaletteOpen = true;
		void tick().then(() => commandInput?.focus());
	}

	function closeCommandPalette() {
		isCommandPaletteOpen = false;
		commandQuery = '';
		highlightedCommandIndex = 0;
		if (commandPreviousFocus?.isConnected) commandPreviousFocus.focus();
		commandPreviousFocus = null;
	}

	/** @param {WorkspaceCommand | undefined} command */
	function runWorkspaceCommand(command) {
		if (!command) return;
		closeCommandPalette();
		void command.run();
	}

	/** @param {KeyboardEvent} event */
	function handleCommandKeys(event) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeCommandPalette();
			return;
		}
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!matchingCommands.length) return;
			const direction = event.key === 'ArrowDown' ? 1 : -1;
			highlightedCommandIndex =
				(highlightedCommandIndex + direction + matchingCommands.length) % matchingCommands.length;
			void tick().then(() =>
				document.getElementById(`workspace-command-${highlightedCommandIndex}`)?.scrollIntoView({
					block: 'nearest'
				})
			);
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			runWorkspaceCommand(matchingCommands[highlightedCommandIndex]);
		}
	}

	/** @param {Blob} blob */
	function readBlobDataUrl(blob) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(/** @type {string} */ (reader.result));
			reader.onerror = () => reject(reader.error ?? new Error('Could not read the image.'));
			reader.readAsDataURL(blob);
		});
	}

	/**
	 * @param {readonly import('@excalidraw/excalidraw/element/types').ExcalidrawElement[]} elements
	 * @param {import('@excalidraw/excalidraw/types').BinaryFiles} files
	 */
	function filesUsedByScene(elements, files) {
		const referencedFiles = new Set(
			/** @type {string[]} */ (
				elements.flatMap((element) =>
					element.type === 'image' && !element.isDeleted && element.fileId ? [element.fileId] : []
				)
			)
		);
		return Object.fromEntries(
			Object.entries(files).filter(([fileId]) => referencedFiles.has(fileId))
		);
	}

	/**
	 * @param {{ phase: 'download' | 'processing', progress?: number, percent?: number, loaded?: number, total?: number, label?: string, message?: string }} update
	 */
	function updateBackgroundProgress(update) {
		const progress =
			update.progress ??
			(update.percent === undefined ? undefined : update.percent / 100) ??
			(update.total ? (update.loaded ?? 0) / update.total : undefined);
		backgroundProgress =
			progress === undefined ? 0 : Math.round(Math.max(0, Math.min(1, progress)) * 100);
		backgroundStatus =
			update.label ??
			update.message ??
			(update.phase === 'download'
				? `Downloading ${activeBackgroundMode.size} model`
				: 'Removing background');
	}

	async function removeSelectedImageBackground() {
		if (!editor || !updateElement || !captureImmediately || !selectedImageId) return;
		const image = editor
			.getSceneElements()
			.find((element) => element.id === selectedImageId && element.type === 'image');
		if (!image || image.type !== 'image' || !image.fileId) return;
		const sourceFile = editor.getFiles()[image.fileId];
		if (!sourceFile?.dataURL) {
			backgroundError = 'The selected image could not be loaded.';
			return;
		}
		isRemovingBackground = true;
		backgroundProgress = 0;
		backgroundStatus = 'Preparing image';
		backgroundError = '';
		backgroundAbort = new AbortController();

		try {
			const sourceBlob = await fetch(sourceFile.dataURL).then((response) => response.blob());
			const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
			const browserTestRemover = loopback
				? /** @type {any} */ (globalThis).__SWYX_REMOVE_IMAGE_BACKGROUND__
				: undefined;
			const removeImageBackground =
				browserTestRemover ??
				(await import('$lib/image-background-removal.js')).removeImageBackground;
			const transparentImage = await removeImageBackground(sourceBlob, {
				mode: backgroundMode,
				onProgress: updateBackgroundProgress,
				signal: backgroundAbort.signal
			});
			backgroundAbort.signal.throwIfAborted();
			const dataURL = /** @type {import('@excalidraw/excalidraw/types').DataURL} */ (
				await readBlobDataUrl(transparentImage)
			);
			const fileId = /** @type {import('@excalidraw/excalidraw/element/types').FileId} */ (
				crypto.randomUUID()
			);
			/** @type {import('@excalidraw/excalidraw/types').BinaryFileData} */
			const processedFile = {
				id: fileId,
				mimeType: 'image/png',
				dataURL,
				created: Date.now(),
				lastRetrieved: Date.now()
			};
			const currentElements = editor.getSceneElementsIncludingDeleted();
			const currentImage = currentElements.find((element) => element.id === image.id);
			if (!currentImage || currentImage.type !== 'image' || currentImage.fileId !== image.fileId) {
				throw new Error('The selected image changed before processing finished.');
			}
			const replacement = updateElement(currentImage, { fileId, status: 'saved' });
			const nextElements = currentElements.map((element) =>
				element.id === currentImage.id ? replacement : element
			);
			const nextFiles = filesUsedByScene(nextElements, {
				...editor.getFiles(),
				[fileId]: processedFile
			});

			let exceedsCloudLimit = false;
			if (cloudAvailable) {
				const estimatedScene = JSON.stringify({
					elements: nextElements,
					appState: { viewBackgroundColor: editor.getAppState().viewBackgroundColor },
					files: nextFiles
				});
				exceedsCloudLimit =
					new TextEncoder().encode(estimatedScene).byteLength > MAX_CLOUD_SCENE_BYTES;
			}

			editor.addFiles([processedFile]);
			editor.updateScene({
				elements: nextElements,
				appState: { selectedElementIds: { [replacement.id]: true } },
				captureUpdate: captureImmediately
			});
			backgroundStatus = 'Background removed';
			backgroundProgress = 100;
			if (exceedsCloudLimit) {
				saveStatus = 'error';
				backgroundError = 'Saved on this device only: image exceeds the 1.8 MB cloud limit.';
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				backgroundStatus = '';
			} else {
				backgroundError =
					error instanceof Error ? error.message : 'Could not remove the background.';
				backgroundStatus = '';
			}
		} finally {
			isRemovingBackground = false;
			backgroundAbort = undefined;
		}
	}

	function cancelBackgroundRemoval() {
		backgroundAbort?.abort();
	}

	/** @param {Event} event */
	function changeBackgroundMode(event) {
		backgroundMode = /** @type {HTMLSelectElement} */ (event.currentTarget).value;
		backgroundError = '';
		try {
			localStorage.setItem(BACKGROUND_MODE_STORAGE_KEY, JSON.stringify(backgroundMode));
		} catch (error) {
			console.error('Could not remember the background-removal model.', error);
		}
	}

	/**
	 * @param {readonly import('@excalidraw/excalidraw/element/types').ExcalidrawElement[]} elements
	 * @param {import('@excalidraw/excalidraw/types').AppState} appState
	 * @param {import('@excalidraw/excalidraw/types').BinaryFiles} files
	 */
	function saveScene(elements, appState, files) {
		const nextLibraryOpen = appState.openSidebar?.name === 'default';
		if (isLibraryOpen !== nextLibraryOpen) isLibraryOpen = nextLibraryOpen;
		if (!activePageId || isSwitchingPage) return;
		const selectedIds = Object.entries(appState.selectedElementIds)
			.filter(([, selected]) => selected)
			.map(([id]) => id);
		const selectedElement =
			selectedIds.length === 1
				? elements.find((element) => element.id === selectedIds[0])
				: undefined;
		const nextSelectedArtboardId =
			selectedElement?.type === 'frame' ? selectedElement.id : (selectedElement?.frameId ?? '');
		if (selectedArtboardId !== nextSelectedArtboardId) {
			selectedArtboardId = nextSelectedArtboardId;
			if (!nextSelectedArtboardId) designStatus = '';
		}
		const nextSelectedArtboard = elements.find(
			(element) => element.id === nextSelectedArtboardId && element.type === 'frame'
		);
		selectedArtboard = nextSelectedArtboard?.type === 'frame' ? nextSelectedArtboard : undefined;
		const selected =
			selectedIds.length === 1
				? elements.find((element) => element.id === selectedIds[0] && element.type === 'image')
				: undefined;
		const nextSelectedImageId = selected?.id ?? '';
		const nextSelectedImageDataUrl =
			selected?.type === 'image' && selected.fileId ? (files[selected.fileId]?.dataURL ?? '') : '';
		if (selectedImageDataUrl !== nextSelectedImageDataUrl) {
			selectedImageDataUrl = nextSelectedImageDataUrl;
		}
		if (selectedImageId !== nextSelectedImageId) {
			selectedImageId = nextSelectedImageId;
			backgroundError = '';
			if (!isRemovingBackground) backgroundStatus = '';
		}
		/** @type {DrawingScene} */
		const scene = {
			elements,
			appState: {
				viewBackgroundColor: appState.viewBackgroundColor,
				scrollX: appState.scrollX,
				scrollY: appState.scrollY,
				zoom: appState.zoom
			},
			files: filesUsedByScene(elements, files)
		};
		try {
			const serialized = JSON.stringify(scene);
			localStorage.removeItem(`${STORAGE_KEY}:${activePageId}`);
			if (localStorage.getItem(STORAGE_KEY) !== serialized) {
				localStorage.setItem(STORAGE_KEY, serialized);
			}
		} catch (error) {
			console.error('Could not save the drawing locally.', error);
		}
		if (cloudAvailable) {
			const sceneBytes = new TextEncoder().encode(JSON.stringify(scene)).byteLength;
			if (sceneBytes > MAX_CLOUD_SCENE_BYTES) {
				if (saveTimer) clearTimeout(saveTimer);
				pendingSave = undefined;
				saveStatus = 'error';
				return;
			}
			pendingSave = { pageId: activePageId, scene };
			if (saveTimer) clearTimeout(saveTimer);
			saveTimer = setTimeout(() => void flushPendingSave(), SAVE_DELAY);
		}
	}

	onMount(() => {
		/** @type {ReturnType<typeof import('react-dom/client').createRoot> | undefined} */
		let root;
		let destroyed = false;
		void fetch('/tools/api/session', { credentials: 'same-origin', cache: 'no-store' })
			.then((response) => (response.ok ? response.json() : undefined))
			.then((session) => {
				if (!destroyed) toolsAuthenticated = session?.authenticated === true;
			})
			.catch(() => {});

		async function mountEditor() {
			const [
				{ createElement, useState },
				{ createRoot },
				{
					Excalidraw,
					DefaultSidebar,
					Sidebar,
					convertToExcalidrawElements,
					useHandleLibrary,
					newElementWith,
					CaptureUpdateAction,
					exportToBlob: excalidrawExportToBlob,
					exportToSvg: excalidrawExportToSvg
				},
				{ DRAW_PRESETS },
				components,
				drawingLibrary,
				initialScene
			] = await Promise.all([
				import('react'),
				import('react-dom/client'),
				import('@excalidraw/excalidraw'),
				import('$lib/draw-presets.js'),
				import('$lib/draw-ui-components.js'),
				import('$lib/draw-library.js'),
				loadInitialPage()
			]);

			if (destroyed) return;

			convertElements = convertToExcalidrawElements;
			updateElement = newElementWith;
			captureImmediately = CaptureUpdateAction.IMMEDIATELY;
			exportToBlob = excalidrawExportToBlob;
			exportToSvg = excalidrawExportToSvg;
			presets = DRAW_PRESETS;
			uiComponents = components.DRAW_UI_COMPONENTS;
			createUiComponent = components.createDrawUiComponent;
			const savedBackgroundMode = readStorage(BACKGROUND_MODE_STORAGE_KEY);
			if (BACKGROUND_MODES.some((mode) => mode.id === savedBackgroundMode)) {
				backgroundMode = savedBackgroundMode;
			}
			const initialLibraryItems = restoreDrawingLibrary(drawingLibrary);
			const libraryAdapter = {
				load() {
					const savedItems = readStorage(LIBRARY_STORAGE_KEY);
					return { libraryItems: Array.isArray(savedItems) ? savedItems : initialLibraryItems };
				},
				/** @param {{ libraryItems: import('@excalidraw/excalidraw/types').LibraryItems }} data */
				save({ libraryItems }) {
					saveDrawingLibrary(libraryItems);
				}
			};

			function DrawingEditor() {
				const [currentEditor, setCurrentEditor] = useState(
					/** @type {import('@excalidraw/excalidraw/types').ExcalidrawImperativeAPI | null} */ (
						null
					)
				);
				useHandleLibrary({ excalidrawAPI: currentEditor, adapter: libraryAdapter });

				return createElement(
					Excalidraw,
					{
						initialData: initialScene,
						theme: 'light',
						onChange: saveScene,
						onLibraryChange: saveDrawingLibrary,
						excalidrawAPI: (
							/** @type {import('@excalidraw/excalidraw/types').ExcalidrawImperativeAPI} */ instance
						) => {
							editor = instance;
							setCurrentEditor(instance);
						}
					},
					createElement(
						DefaultSidebar,
						null,
						createElement(
							Sidebar.Tab,
							{ tab: 'workspace', className: 'swyx-workspace-sidebar-tab' },
							createElement('div', { 'data-swyx-workspace-panel': true })
						)
					),
					createElement(
						DefaultSidebar.TabTriggers,
						null,
						createElement(
							Sidebar.TabTrigger,
							{
								tab: 'workspace',
								'aria-label': 'Templates, components, and memes',
								title: 'Drawing presets, UI components, and meme templates'
							},
							createElement(
								'svg',
								{
									'aria-hidden': true,
									viewBox: '0 0 20 20',
									width: 20,
									height: 20,
									fill: 'none'
								},
								createElement('path', {
									d: 'M4 4h5v5H4V4Zm7 0h5v5h-5V4ZM4 11h5v5H4v-5Zm9.5 0v5m-2.5-2.5h5',
									stroke: 'currentColor',
									strokeWidth: 1.6,
									strokeLinecap: 'round',
									strokeLinejoin: 'round'
								})
							)
						)
					)
				);
			}

			root = createRoot(canvas);
			root.render(createElement(DrawingEditor));
		}

		void mountEditor();
		const saveWhenHidden = () => {
			if (document.visibilityState === 'hidden') void flushPendingSave();
		};
		/** @param {KeyboardEvent} event */
		const openCommandsFromKeyboard = (event) => {
			if (event.key.toLowerCase() !== 'k') return;
			if (!event.metaKey && !event.ctrlKey) return;
			event.preventDefault();
			event.stopPropagation();
			if (isCommandPaletteOpen) closeCommandPalette();
			else openCommandPalette();
		};
		document.addEventListener('visibilitychange', saveWhenHidden);
		window.addEventListener('keydown', openCommandsFromKeyboard, { capture: true });

		return () => {
			destroyed = true;
			backgroundAbort?.abort();
			document.removeEventListener('visibilitychange', saveWhenHidden);
			window.removeEventListener('keydown', openCommandsFromKeyboard, { capture: true });
			void flushPendingSave();
			root?.unmount();
		};
	});
</script>

<svelte:head>
	<title>Draw · swyx.io</title>
	<meta name="robots" content="noindex, nofollow, noarchive" />
	<meta
		name="description"
		content="A fullscreen drawing canvas with organized pages and automatic saving."
	/>
</svelte:head>

<div class="draw-canvas" role="application" aria-label="Drawing canvas" bind:this={canvas}></div>

{#if editor && activePageId}
	<DrawAgent
		authenticated={toolsAuthenticated}
		pageId={activePageId}
		executeCommand={executeAgentCommand}
		captureViewport={() => captureVisibleDrawingViewport(canvas)}
	/>
{/if}

{#if selectedArtboard && !selectedImageId}
	<section class="artboard-toolbar" aria-label="Selected design artboard">
		<div class="artboard-summary">
			<strong>{selectedArtboard.name ?? 'Design artboard'}</strong>
			<span>{Math.round(selectedArtboard.width)} × {Math.round(selectedArtboard.height)}</span>
		</div>
		<label class="artboard-format">
			<span class="sr-only">Resize design artboard</span>
			<select
				aria-label="Resize design artboard"
				value={DRAW_DESIGN_FORMATS.find(
					(format) =>
						format.width === selectedArtboard?.width && format.height === selectedArtboard?.height
				)?.id ?? ''}
				onchange={(event) =>
					resizeDesign(
						selectedArtboardId,
						/** @type {HTMLSelectElement} */ (event.currentTarget).value
					)}
			>
				{#each DRAW_DESIGN_FORMATS as format (format.id)}
					<option value={format.id}>{format.label}</option>
				{/each}
			</select>
		</label>
		<button
			type="button"
			class="artboard-action"
			aria-label="Duplicate design artboard"
			onclick={() => duplicateDesign(selectedArtboardId)}>Duplicate</button
		>
		<button
			type="button"
			class="artboard-export"
			disabled={isExportingDesign}
			aria-label="Download design as PNG"
			onclick={() => void exportDesign(selectedArtboardId, 'png')}>PNG</button
		>
		<button
			type="button"
			class="artboard-action"
			disabled={isExportingDesign}
			aria-label="Download design as JPG"
			onclick={() => void exportDesign(selectedArtboardId, 'jpg')}>JPG</button
		>
		<button
			type="button"
			class="artboard-action"
			disabled={isExportingDesign}
			aria-label="Download design as SVG"
			onclick={() => void exportDesign(selectedArtboardId, 'svg')}>SVG</button
		>
	</section>
	{#if designStatus}<div class="artboard-status" role="status">{designStatus}</div>{/if}
{/if}

{#if activeImageToolId || isRemovingBackground}
	<section
		class="image-tools"
		aria-label="Selected image tools"
		style:left={imageToolsPosition ? `${imageToolsPosition.x}px` : undefined}
		style:top={imageToolsPosition ? `${imageToolsPosition.y}px` : undefined}
		style:transform={imageToolsPosition ? 'none' : undefined}
		style:max-height={imageToolsPosition
			? `calc(100dvh - ${imageToolsPosition.y + 12}px)`
			: undefined}
		onpointermove={moveImageTools}
		onpointerup={finishDraggingImageTools}
		onpointercancel={finishDraggingImageTools}
	>
		{#if editor && updateElement && captureImmediately && activeImageToolId}
			<DrawImageToolbox
				{editor}
				imageId={activeImageToolId}
				imageDataUrl={activeImageToolDataUrl}
				bind:action={imageToolAction}
				bind:prompt={imageToolPrompt}
				bind:operationStatus={imageToolStatus}
				bind:selectedFalModelIds={imageToolModelIds}
				bind:generationParameters={imageToolGenerationParameters}
				{updateElement}
				captureUpdate={captureImmediately}
				{cloudAvailable}
				authenticated={toolsAuthenticated}
				backgroundProcessing={isRemovingBackground}
				generations={imageGenerations}
				onGeneration={rememberImageGeneration}
				onProcessingChange={updateImageGenerationState}
				onDragStart={startDraggingImageTools}
				onCloudLimit={() => (saveStatus = 'error')}
			>
				{#snippet backgroundControls()}
					<div class="image-tool-controls">
						<select
							class="background-mode-select"
							aria-label="Background removal model"
							value={backgroundMode}
							disabled={isRemovingBackground}
							onchange={changeBackgroundMode}
						>
							{#each BACKGROUND_MODES as mode (mode.id)}
								<option value={mode.id}>{mode.label} ({mode.size})</option>
							{/each}
						</select>

						{#if isRemovingBackground}
							<button type="button" class="cancel-background" onclick={cancelBackgroundRemoval}>
								Cancel
							</button>
						{:else}
							<button
								type="button"
								class="remove-background"
								aria-label="Remove image background"
								onclick={() => void removeSelectedImageBackground()}
							>
								Remove background
							</button>
						{/if}
					</div>

					{#if isRemovingBackground}
						<div class="background-progress" aria-live="polite">
							<span>{backgroundStatus}{backgroundProgress ? ` · ${backgroundProgress}%` : ''}</span>
							<progress
								aria-label="Background removal progress"
								max="100"
								value={backgroundProgress || undefined}
							></progress>
						</div>
					{:else if backgroundError}
						<p class="background-error" role="alert">{backgroundError}</p>
					{:else if backgroundMode !== 'portrait-fast'}
						<p class="background-download-warning">
							First use downloads {activeBackgroundMode.size}.
						</p>
					{:else if backgroundStatus}
						<p class="background-success" role="status">{backgroundStatus}</p>
					{/if}
				{/snippet}
			</DrawImageToolbox>
		{/if}
	</section>
{/if}

{#if pages.length > 0}
	<div class="page-picker">
		<button
			type="button"
			class="page-toggle"
			aria-label="Manage drawing pages"
			aria-expanded={isPageMenuOpen}
			aria-controls="drawing-pages"
			disabled={!editor}
			onclick={() => {
				isPageMenuOpen = !isPageMenuOpen;
			}}
		>
			<svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
				<path
					d="M5 3.75h7l3.25 3.25v9.25H5V3.75Zm7 0V7h3.25"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<span>{activePage?.name ?? 'Pages'}</span>
			<svg class="page-chevron" aria-hidden="true" viewBox="0 0 20 20" fill="none">
				<path
					d="m6.5 8 3.5 3.5L13.5 8"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>

		{#if isPageMenuOpen}
			<section id="drawing-pages" class="page-menu" aria-label="Drawing pages">
				<div class="page-heading">
					<strong>Recent pages</strong>
					<span class="save-status" data-status={saveStatus}>
						{#if saveStatus === 'saving'}Saving…{:else if saveStatus === 'saved'}Saved to cloud{:else if saveStatus === 'error'}Saved
							on this device{:else}Saved on this device{/if}
					</span>
				</div>

				{#each recentPages as page (page.id)}
					<div class="page-row" class:active={page.id === activePageId}>
						{#if renamingPageId === page.id}
							<input
								class="page-name-input"
								aria-label="Page name"
								bind:value={pageNameDraft}
								use:focusPageName
								onblur={() => void finishRenaming()}
								onkeydown={(/** @type {KeyboardEvent} */ event) => {
									if (event.key === 'Enter') void finishRenaming();
									if (event.key === 'Escape') renamingPageId = '';
								}}
							/>
						{:else}
							<button
								type="button"
								class="page-option"
								aria-current={page.id === activePageId ? 'page' : undefined}
								onclick={() => void switchPage(page)}
							>
								{page.name}
							</button>
							<button
								type="button"
								class="page-action"
								aria-label="Rename {page.name}"
								onclick={() => startRenaming(page)}
							>
								<svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
									<path
										d="m12.4 5 2.6 2.6m-9.3 5.8-.7 2.5 2.5-.7 8-8a1.8 1.8 0 0 0-2.6-2.5l-7.2 8.7Z"
										stroke="currentColor"
										stroke-width="1.4"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</button>
							{#if page.id === activePageId}
								<button
									type="button"
									class="page-action"
									aria-label="Duplicate {page.name}"
									onclick={() => void duplicatePage()}
								>
									<svg aria-hidden="true" viewBox="0 0 20 20" fill="none"
										><path
											d="M7 4.5h8.5V13H13m-9 3h8.5V7.5H4V16Z"
											stroke="currentColor"
											stroke-width="1.4"
											stroke-linejoin="round"
										/></svg
									>
								</button>
							{/if}
							{#if pages.length > 1}
								<button
									type="button"
									class="page-action delete-page"
									aria-label="Delete {page.name}"
									onclick={() => void deletePage(page)}
								>
									<svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
										<path
											d="M5.5 6h9m-7.5 0-.5 9h7l-.5-9M8 6V4.5h4V6"
											stroke="currentColor"
											stroke-width="1.4"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</button>
							{/if}
						{/if}
					</div>
				{/each}

				<button type="button" class="add-page" onclick={() => void createPage()}>
					<svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
						<path
							d="M10 4.5v11m-5.5-5.5h11"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
						/>
					</svg>
					New page
				</button>

				{#if needsSignIn}
					<a class="sync-link" href="/tools?next=/draw">Sign in to sync across devices</a>
				{/if}
			</section>
		{/if}
	</div>
{/if}

{#if editor && presets.length > 0 && !isLibraryOpen}
	<button
		type="button"
		class="compact-library-toggle"
		aria-label="Open drawing templates and library"
		title="Open presets, components, and meme templates"
		onclick={() => openWorkspaceSection('presets')}
	>
		<svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
			<path
				d="M4 4h5v5H4V4Zm7 0h5v5h-5V4ZM4 11h5v5H4v-5Zm9.5 0v5m-2.5-2.5h5"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		<span>Templates</span>
	</button>
{/if}

{#if presets.length > 0 && uiComponents.length > 0}
	<section
		class="workspace-library"
		aria-label="Drawing templates, components, and memes"
		use:mountWorkspacePanel
	>
		<div class="workspace-sections" role="tablist" aria-label="Template categories">
			{#each [{ id: 'presets', label: 'Presets' }, { id: 'designs', label: 'Design' }, { id: 'components', label: 'Components' }, { id: 'memes', label: 'Memes' }] as section (section.id)}
				<button
					type="button"
					class="workspace-section"
					class:active={workspaceSection === section.id}
					role="tab"
					aria-selected={workspaceSection === section.id}
					onclick={() =>
						openWorkspaceSection(
							/** @type {'presets' | 'designs' | 'components' | 'memes'} */ (section.id)
						)}
				>
					{section.label}
				</button>
			{/each}
		</div>

		{#if workspaceSection === 'presets'}
			<section id="drawing-presets" class="workspace-content" aria-label="Drawing presets">
				<div class="preset-heading">
					<strong>Start with a framework</strong>
					<span>Every shape stays editable.</span>
				</div>
				{#each presets as preset (preset.id)}
					<button
						type="button"
						class="preset-option"
						aria-label="Insert {preset.label} preset"
						onclick={() => insertPreset(preset)}
					>
						<svg class="preset-preview" aria-hidden="true" viewBox="0 0 56 42" fill="none">
							{#if preset.id.includes('quadrant') || preset.id.includes('matrix')}
								<rect x="8" y="5" width="19" height="15" rx="2" fill="#e14d2a" opacity=".8" />
								<rect x="29" y="5" width="19" height="15" rx="2" fill="#f7c845" />
								<rect x="8" y="22" width="19" height="15" rx="2" fill="#155f9b" opacity=".8" />
								<rect x="29" y="22" width="19" height="15" rx="2" fill="#346b4e" opacity=".8" />
							{:else if preset.id.includes('scatter') || preset.id.includes('axis')}
								<path d="M8 5v30h40" stroke="#10243b" stroke-width="1.5" />
								<circle cx="16" cy="27" r="3" fill="#155f9b" />
								<circle cx="25" cy="19" r="3" fill="#e14d2a" />
								<circle cx="32" cy="24" r="3" fill="#f7c845" />
								<circle cx="40" cy="11" r="3" fill="#346b4e" />
							{:else if preset.id.includes('growth')}
								<path d="M8 5v30h40" stroke="#10243b" stroke-width="1.5" />
								<path d="M12 31c14-1 23-6 34-23" stroke="#e14d2a" stroke-width="2.5" />
								<path d="M12 29c13-3 22-9 34-11" stroke="#155f9b" stroke-width="2.5" />
							{:else if preset.id.includes('curve') || preset.id.includes('adoption')}
								<path d="M8 5v30h40" stroke="#10243b" stroke-width="1.5" />
								<path d="M12 31c18 0 12-21 34-21" stroke="#346b4e" stroke-width="3" />
							{:else if preset.id.includes('career') || preset.id.includes('stair') || preset.id.includes('ladder')}
								<path d="M8 34h10v-8h10v-8h10v-8h10" stroke="#155f9b" stroke-width="3" />
								<circle cx="13" cy="29" r="2" fill="#e14d2a" />
								<circle cx="43" cy="5" r="2" fill="#f7c845" />
							{:else if preset.id.includes('funnel')}
								<path d="M6 7h44l-5 8H11L6 7Z" fill="#155f9b" />
								<path d="M12 17h32l-5 8H17l-5-8Z" fill="#f7c845" />
								<path d="M18 27h20l-5 8H23l-5-8Z" fill="#e14d2a" />
							{:else if preset.id.includes('venn')}
								<circle cx="23" cy="20" r="12" fill="#155f9b" opacity=".65" />
								<circle cx="34" cy="20" r="12" fill="#e14d2a" opacity=".65" />
							{:else if preset.id.includes('flywheel') || preset.id.includes('cycle')}
								<path
									d="M28 7a14 14 0 0 1 13 9m1 4a14 14 0 0 1-10 14m-5 1a14 14 0 0 1-12-10m-1-5A14 14 0 0 1 24 8"
									stroke="#155f9b"
									stroke-width="3"
								/>
								<circle cx="28" cy="7" r="3" fill="#e14d2a" />
								<circle cx="41" cy="19" r="3" fill="#f7c845" />
								<circle cx="29" cy="34" r="3" fill="#346b4e" />
							{:else}
								<rect x="7" y="8" width="19" height="26" rx="3" fill="#155f9b" opacity=".8" />
								<rect x="30" y="8" width="19" height="26" rx="3" fill="#e14d2a" opacity=".8" />
							{/if}
						</svg>
						<span class="preset-copy">
							<strong>{preset.label}</strong>
							<span>{preset.description}</span>
						</span>
					</button>
				{/each}
			</section>
		{:else if workspaceSection === 'designs'}
			<section
				id="drawing-designs"
				class="workspace-content design-content"
				aria-label="Branded design templates"
			>
				<div class="component-heading">
					<strong>Create a real design</strong>
					<span>Editable artboards, brand assets, and exact export sizes.</span>
				</div>
				{#each DRAW_DESIGN_TEMPLATES as design (design.id)}
					<button
						type="button"
						class="design-option"
						aria-label="Insert {design.label} design"
						onclick={() => void insertDesign(design.id)}
					>
						<div class="design-preview" style:background={design.background}>
							<div class="design-preview-copy">
								<span style:background={design.accent}></span>
								<strong
									>{design.brand === 'latent-space'
										? 'YOUR NEXT\nBIG IDEA'
										: design.brand === 'ai-engineer'
											? 'AI ENGINEER'
											: 'THE IDEA\nTHAT MATTERS'}</strong
								>
							</div>
							<div class="design-preview-portrait" style:border-color={design.accent}></div>
						</div>
						<strong>{design.label}</strong>
						<span>{design.description}</span>
						<span class="design-dimensions"
							>{getDrawingDesignFormat(design.format)?.width} × {getDrawingDesignFormat(
								design.format
							)?.height}</span
						>
					</button>
				{/each}
			</section>
		{:else if workspaceSection === 'components'}
			<section id="drawing-components" class="workspace-content" aria-label="UI components">
				<div class="component-heading">
					<strong>Sketch an interface</strong>
					<span>Hand-drawn, editable components.</span>
				</div>
				<input
					class="component-search"
					aria-label="Search UI components"
					placeholder="Search components…"
					bind:value={componentQuery}
				/>
				{#if filteredComponents.length === 0}
					<p class="component-empty">No matching components.</p>
				{:else}
					{#each filteredComponentCategories as category (category)}
						<div class="component-category">{category}</div>
						{#each filteredComponents.filter((component) => component.category === category) as component (component.id)}
							<button
								type="button"
								class="component-option"
								aria-label="Insert {component.title} component"
								onclick={() => insertUiComponent(component.id)}
							>
								<strong>{component.title}</strong>
								<span>{component.description}</span>
							</button>
						{/each}
					{/each}
				{/if}
			</section>
		{:else}
			<section class="workspace-content meme-content" aria-label="Meme templates">
				<div class="component-heading">
					<strong>Popular meme templates</strong>
					<span>Click a template to add it to your canvas.</span>
				</div>
				<input
					class="component-search"
					aria-label="Search meme templates"
					placeholder="Search meme templates…"
					bind:value={memeQuery}
				/>
				{#if memeError}<p class="meme-error" role="alert">{memeError}</p>{/if}
				{#if isLoadingMemeCatalog}<p class="meme-status">Loading more templates…</p>{/if}
				{#if filteredMemeTemplates.length === 0}
					<p class="component-empty">No matching meme templates.</p>
				{:else}
					<div class="meme-grid">
						{#each filteredMemeTemplates as meme (meme.id)}
							<button
								type="button"
								class="meme-option"
								aria-label="Insert {meme.name} meme template"
								disabled={isInsertingMeme}
								onclick={() => void insertMemeTemplate(meme)}
							>
								<img src={meme.url} alt="" loading="lazy" />
								<span>{meme.name}</span>
							</button>
						{/each}
					</div>
				{/if}
				<div class="meme-attribution">
					<a href="https://imgflip.com/memetemplates" target="_blank" rel="noreferrer">
						Templates via Imgflip
					</a>
					<a
						href="https://imgflip.com/memetemplates?search={encodeURIComponent(memeQuery)}"
						target="_blank"
						rel="noreferrer"
					>
						Search more ↗
					</a>
				</div>
			</section>
		{/if}
	</section>
{/if}

{#if isCommandPaletteOpen}
	<button
		type="button"
		class="command-backdrop"
		aria-label="Close command palette"
		onclick={closeCommandPalette}
	></button>
	<dialog open class="command-palette" aria-modal="true" aria-label="Workspace commands">
		<div class="command-input-wrap">
			<svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
				<path
					d="m14.2 14.2 3 3M8.8 15a6.2 6.2 0 1 0 0-12.4A6.2 6.2 0 0 0 8.8 15Z"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
				/>
			</svg>
			<input
				bind:this={commandInput}
				class="command-input"
				aria-label="Search components, presets, pages, and actions"
				aria-activedescendant={matchingCommands.length
					? `workspace-command-${highlightedCommandIndex}`
					: undefined}
				aria-controls="workspace-command-results"
				placeholder="Search components, presets, pages, actions…"
				bind:value={commandQuery}
				oninput={() => (highlightedCommandIndex = 0)}
				onkeydown={handleCommandKeys}
			/>
			<kbd>esc</kbd>
		</div>
		<div id="workspace-command-results" class="command-results">
			{#if matchingCommands.length === 0}
				<p class="command-empty">No matches for “{commandQuery}”.</p>
			{:else}
				{#each matchingCommands as command, index (command.id)}
					{#if index === 0 || matchingCommands[index - 1]?.category !== command.category}
						<div class="command-category">{command.category}</div>
					{/if}
					<button
						id="workspace-command-{index}"
						type="button"
						class="command-option"
						class:highlighted={highlightedCommandIndex === index}
						onmouseenter={() => (highlightedCommandIndex = index)}
						onclick={() => runWorkspaceCommand(command)}
					>
						<strong>{command.label}</strong>
						{#if command.description}<span>{command.description}</span>{/if}
					</button>
				{/each}
			{/if}
		</div>
		<div class="command-footer"><kbd>↑↓</kbd> navigate <kbd>↵</kbd> select</div>
	</dialog>
{/if}

<style>
	.draw-canvas {
		position: fixed;
		inset: 0;
		height: 100dvh;
		width: 100vw;
	}

	.image-tools {
		position: fixed;
		top: 72px;
		left: 50%;
		z-index: 1001;
		width: min(405px, calc(100vw - 28px));
		max-height: calc(100dvh - 95px);
		padding: 12px;
		transform: translateX(-50%);
		border: 1px solid rgb(0 0 0 / 9%);
		border-radius: 12px;
		background: #fff;
		box-shadow: 0 8px 25px rgb(0 0 0 / 12%);
		color: #1d1d1d;
		font-family:
			Inter,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		overflow-y: auto;
	}

	.artboard-toolbar {
		position: fixed;
		left: 50%;
		bottom: 76px;
		z-index: 34;
		display: flex;
		align-items: center;
		gap: 7px;
		max-width: calc(100vw - 24px);
		padding: 8px 10px;
		transform: translateX(-50%);
		border: 1px solid #e3e2eb;
		border-radius: 11px;
		background: #fff;
		box-shadow: 0 9px 30px #2423351c;
		color: #292833;
		font-family: system-ui, sans-serif;
	}
	.artboard-summary {
		display: grid;
		gap: 2px;
		min-width: 102px;
		padding-right: 8px;
		border-right: 1px solid #eeedf2;
	}
	.artboard-summary strong {
		max-width: 164px;
		overflow: hidden;
		font-size: 11px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.artboard-summary span {
		color: #737180;
		font-size: 10px;
	}
	.artboard-format select,
	.artboard-action,
	.artboard-export {
		height: 30px;
		padding: 0 8px;
		border: 0;
		border-radius: 6px;
		background: #f3f2f7;
		color: #454452;
		font-size: 10px;
		cursor: pointer;
	}
	.artboard-export {
		background: #6554c0;
		color: #fff;
		font-weight: 650;
	}
	.artboard-status {
		position: fixed;
		bottom: 133px;
		left: 50%;
		z-index: 34;
		padding: 5px 9px;
		transform: translateX(-50%);
		border-radius: 6px;
		background: #f0faf1;
		color: #28713a;
		font:
			10px system-ui,
			sans-serif;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}

	.image-tool-controls {
		display: flex;
		gap: 8px;
	}

	.background-mode-select {
		flex: 1;
		min-width: 0;
		height: 35px;
		padding: 0 7px;
		border: 1px solid #dedee6;
		border-radius: 7px;
		background: #fff;
		color: #27272a;
		font-size: 11px;
	}

	.remove-background,
	.cancel-background {
		flex: none;
		height: 35px;
		padding: 0 10px;
		border: 0;
		border-radius: 7px;
		background: #6554c0;
		color: #fff;
		font-size: 11px;
		font-weight: 550;
		cursor: pointer;
	}

	.cancel-background {
		background: #ecebf2;
		color: #27272a;
	}

	.background-progress {
		display: grid;
		gap: 6px;
		margin-top: 9px;
		color: #52525b;
		font-size: 11px;
	}

	.background-progress progress {
		width: 100%;
		height: 5px;
		accent-color: #6554c0;
	}

	.background-download-warning,
	.background-error,
	.background-success {
		margin: 8px 0 0;
		font-size: 11px;
		line-height: 1.45;
	}

	.background-download-warning {
		color: #8b6400;
	}

	.background-error {
		color: #c53434;
	}

	.background-success {
		color: #328357;
	}

	.page-picker {
		position: fixed;
		top: 12px;
		left: 66px;
		z-index: 1000;
		font-family:
			Inter,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		color: #1d1d1d;
	}

	.page-toggle,
	.compact-library-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 38px;
		padding: 0 12px;
		border: 1px solid rgb(0 0 0 / 8%);
		border-radius: 9px;
		background: #fff;
		box-shadow: 0 2px 5px rgb(0 0 0 / 10%);
		color: inherit;
		font-size: 13px;
		font-weight: 550;
		cursor: pointer;
	}

	.compact-library-toggle {
		display: none;
		position: fixed;
		z-index: 1000;
	}

	.page-toggle {
		max-width: min(180px, calc(100vw - 140px));
	}

	.command-input-wrap kbd,
	.command-footer kbd {
		padding: 2px 4px;
		border: 1px solid #e7e7eb;
		border-radius: 4px;
		background: #f8f8fa;
		color: #71717a;
		font-family: inherit;
		font-size: 10px;
	}

	.page-toggle span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.page-toggle:disabled {
		cursor: wait;
		opacity: 0.65;
	}

	.page-toggle svg,
	.compact-library-toggle svg,
	.page-action svg,
	.add-page svg {
		flex: none;
		width: 17px;
		height: 17px;
	}

	.page-toggle .page-chevron {
		width: 14px;
		height: 14px;
	}

	.page-menu {
		width: min(310px, calc(100vw - 84px));
		max-height: min(610px, calc(100dvh - 75px));
		margin-top: 8px;
		padding: 6px;
		border: 1px solid rgb(0 0 0 / 8%);
		border-radius: 12px;
		background: #fff;
		box-shadow: 0 12px 32px rgb(0 0 0 / 13%);
		overflow-y: auto;
	}

	.page-menu {
		width: min(290px, calc(100vw - 84px));
		min-width: 230px;
	}

	.workspace-library {
		color: #27272a;
		font-family:
			Inter,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
	}

	.workspace-sections {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 3px;
		margin: 7px 9px 5px;
		padding: 3px;
		border-radius: 8px;
		background: #f2f1f6;
	}

	.workspace-section {
		min-width: 0;
		min-height: 33px;
		padding: 5px 4px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: #666574;
		font-size: 9.5px;
		font-weight: 550;
		white-space: nowrap;
		cursor: pointer;
	}

	.workspace-section.active {
		background: #fff;
		box-shadow: 0 1px 3px rgb(0 0 0 / 9%);
		color: #4e40ae;
	}

	.workspace-content {
		max-height: calc(100dvh - 150px);
		padding: 0 6px 12px;
		overflow-y: auto;
	}

	.preset-heading,
	.page-heading,
	.component-heading {
		display: grid;
		gap: 4px;
		padding: 11px 11px 12px;
		border-bottom: 1px solid rgb(0 0 0 / 7%);
		margin-bottom: 5px;
		font-size: 13px;
	}

	.preset-heading span,
	.preset-option span,
	.page-heading span,
	.component-heading span {
		color: #71717a;
		font-size: 12px;
		line-height: 1.4;
	}

	.save-status[data-status='saved'] {
		color: #328357;
	}

	.save-status[data-status='saving'] {
		color: #7359d8;
	}

	.save-status[data-status='error'] {
		color: #bd5b18;
	}

	.page-row {
		display: flex;
		align-items: center;
		min-height: 38px;
		padding: 2px 4px;
		border-radius: 7px;
	}

	.page-row.active {
		background: #f0efff;
	}

	.page-option {
		flex: 1;
		min-width: 0;
		padding: 7px;
		border: 0;
		background: transparent;
		color: inherit;
		font-size: 13px;
		overflow: hidden;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
		cursor: pointer;
	}

	.page-name-input {
		width: 100%;
		padding: 6px 7px;
		border: 1px solid #7768e5;
		border-radius: 5px;
		background: transparent;
		color: inherit;
		font-size: 13px;
		outline: none;
	}

	.page-action {
		display: grid;
		flex: none;
		width: 29px;
		height: 29px;
		place-items: center;
		border: 0;
		border-radius: 5px;
		background: transparent;
		color: #71717a;
		cursor: pointer;
	}

	.page-action:hover,
	.page-action:focus-visible {
		background: rgb(0 0 0 / 7%);
		color: #1d1d1d;
		outline: none;
	}

	.delete-page:hover,
	.delete-page:focus-visible {
		color: #c53434;
	}

	.add-page {
		display: flex;
		align-items: center;
		width: 100%;
		gap: 8px;
		margin-top: 5px;
		padding: 9px 7px;
		border: 0;
		border-top: 1px solid rgb(0 0 0 / 7%);
		background: transparent;
		color: #5b4ccc;
		font-size: 13px;
		font-weight: 550;
		text-align: left;
		cursor: pointer;
	}

	.sync-link {
		display: block;
		padding: 9px 7px;
		border-top: 1px solid rgb(0 0 0 / 7%);
		color: #5b4ccc;
		font-size: 12px;
		text-decoration: none;
	}

	.sync-link:hover,
	.sync-link:focus-visible {
		text-decoration: underline;
	}

	.preset-option {
		display: flex;
		align-items: center;
		width: 100%;
		gap: 10px;
		padding: 7px 8px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: inherit;
		font-size: 13px;
		text-align: left;
		cursor: pointer;
	}

	.design-content {
		display: grid;
		gap: 9px;
	}
	.design-option {
		display: grid;
		gap: 5px;
		padding: 7px;
		border: 1px solid #edecf1;
		border-radius: 9px;
		background: #fff;
		color: #292833;
		text-align: left;
		cursor: pointer;
	}
	.design-option:hover,
	.design-option:focus-visible {
		border-color: #988de7;
		outline: none;
	}
	.design-option > strong {
		font-size: 12px;
	}
	.design-option > span {
		color: #747383;
		font-size: 10px;
		line-height: 1.4;
	}
	.design-option > .design-dimensions {
		color: #6252bb;
		font-weight: 600;
	}
	.design-preview {
		display: flex;
		justify-content: space-between;
		align-items: center;
		min-height: 91px;
		padding: 12px;
		border-radius: 6px;
	}
	.design-preview-copy {
		display: grid;
		gap: 8px;
	}
	.design-preview-copy > span {
		width: 22px;
		height: 3px;
	}
	.design-preview-copy > strong {
		color: #fff;
		font-size: 11px;
		line-height: 1.14;
		white-space: pre-line;
	}
	.design-preview-portrait {
		width: 49px;
		height: 61px;
		border: 1px dashed;
		background: #ffffff0b;
	}

	.preset-preview {
		flex: none;
		width: 56px;
		height: 42px;
		border-radius: 6px;
		background: #fff9ea;
	}

	.preset-copy {
		display: grid;
		gap: 3px;
	}

	.preset-copy strong {
		color: inherit;
		font-size: 13px;
	}

	.preset-option:hover,
	.preset-option:focus-visible,
	.component-option:hover,
	.component-option:focus-visible {
		background: #f3f3f5;
		outline: none;
	}

	.component-search {
		width: calc(100% - 12px);
		margin: 6px;
		padding: 8px 10px;
		border: 1px solid #e4e4e7;
		border-radius: 7px;
		background: #fff;
		color: #27272a;
		font-size: 12px;
		outline-color: #7768e5;
	}

	.component-category,
	.command-category {
		padding: 12px 9px 5px;
		color: #71717a;
		font-size: 10px;
		font-weight: 650;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.component-option {
		display: grid;
		width: 100%;
		gap: 3px;
		padding: 8px 9px;
		border: 0;
		border-radius: 7px;
		background: transparent;
		color: #27272a;
		text-align: left;
		cursor: pointer;
	}

	.component-option strong,
	.command-option strong {
		font-size: 12px;
		font-weight: 550;
	}

	.component-option span,
	.command-option span {
		color: #71717a;
		font-size: 11px;
	}

	.component-empty,
	.command-empty {
		padding: 20px 10px;
		color: #71717a;
		font-size: 13px;
		text-align: center;
	}

	.meme-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
		padding: 5px;
	}

	.meme-option {
		display: grid;
		gap: 6px;
		padding: 5px;
		border: 1px solid #e9e9ee;
		border-radius: 8px;
		background: #fff;
		color: #30303a;
		text-align: left;
		cursor: pointer;
	}

	.meme-option:hover,
	.meme-option:focus-visible {
		border-color: #9a8bec;
		outline: none;
	}

	.meme-option:disabled {
		cursor: wait;
		opacity: 0.65;
	}

	.meme-option img {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 5px;
		background: #f4f4f6;
		object-fit: contain;
	}

	.meme-option span {
		overflow: hidden;
		font-size: 10px;
		line-height: 1.3;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meme-error,
	.meme-status {
		margin: 5px 8px 8px;
		color: #71717a;
		font-size: 11px;
	}

	.meme-error {
		color: #c53434;
	}

	.meme-attribution {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		margin-top: 8px;
		padding: 9px 5px 2px;
		border-top: 1px solid #ededf0;
	}

	.meme-attribution a {
		color: #6554c0;
		font-size: 10px;
		text-decoration: none;
	}

	.meme-attribution a:hover,
	.meme-attribution a:focus-visible {
		text-decoration: underline;
	}

	:global(.swyx-workspace-sidebar-tab) {
		width: 100%;
	}

	.command-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1100;
		border: 0;
		background: rgb(17 17 24 / 34%);
	}

	.command-palette {
		position: fixed;
		top: min(19vh, 155px);
		left: 50%;
		z-index: 1101;
		width: min(560px, calc(100vw - 28px));
		max-height: min(590px, calc(100dvh - 180px));
		margin: 0;
		padding: 0;
		transform: translateX(-50%);
		border: 1px solid rgb(0 0 0 / 9%);
		border-radius: 13px;
		background: #fff;
		box-shadow: 0 24px 75px rgb(0 0 0 / 22%);
		color: #27272a;
		font-family:
			Inter,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		overflow: hidden;
	}

	.command-input-wrap {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 15px;
		border-bottom: 1px solid #ededf0;
	}

	.command-input-wrap svg {
		flex: none;
		width: 18px;
		height: 18px;
		color: #71717a;
	}

	.command-input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font-size: 15px;
		outline: none;
	}

	.command-results {
		max-height: min(430px, calc(100dvh - 280px));
		padding: 4px 7px 9px;
		overflow-y: auto;
	}

	.command-option {
		display: grid;
		width: 100%;
		gap: 3px;
		padding: 9px 10px;
		border: 0;
		border-radius: 7px;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	.command-option.highlighted,
	.command-option:hover {
		background: #f0efff;
	}

	.command-footer {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 9px 12px;
		border-top: 1px solid #ededf0;
		color: #71717a;
		font-size: 10px;
	}

	.command-footer kbd + kbd {
		margin-left: 8px;
	}

	@media (max-width: 960px) {
		.page-picker {
			top: 72px;
			left: 12px;
		}

		.compact-library-toggle {
			top: 72px;
			right: 64px;
			display: flex;
			min-height: 40px;
		}

		.page-toggle {
			min-height: 40px;
		}

		.page-menu {
			max-height: calc(100dvh - 135px);
		}

		.image-tools {
			top: 126px;
		}
	}

	@media (max-width: 600px) {
		.artboard-toolbar {
			right: 10px;
			left: 10px;
			bottom: 78px;
			max-width: none;
			overflow-x: auto;
			transform: none;
		}
		.artboard-summary {
			min-width: 86px;
		}
		.artboard-summary strong {
			max-width: 96px;
		}
		.image-tools {
			top: 124px;
			max-height: min(420px, calc(100dvh - 150px));
		}

		.page-picker {
			top: 70px;
			left: 10px;
		}

		.compact-library-toggle {
			top: 70px;
			right: 59px;
		}

		.page-toggle {
			height: 40px;
			padding: 0 10px;
			max-width: min(180px, calc(100vw - 125px));
		}

		.page-menu {
			width: min(260px, calc(100vw - 24px));
			min-width: 0;
		}

		.command-palette {
			top: 11vh;
		}
	}
</style>
