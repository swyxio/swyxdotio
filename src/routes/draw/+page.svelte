<script>
	import { onMount, tick } from 'svelte';
	import '@excalidraw/excalidraw/index.css';
	import { orderRecentDrawingPages, searchWorkspaceCommands } from '$lib/draw-workspace.js';
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
	/** @type {typeof import('$lib/draw-presets.js').DRAW_PRESETS} */
	let presets = $state([]);
	/** @type {typeof import('$lib/draw-ui-components.js').DRAW_UI_COMPONENTS} */
	let uiComponents = $state([]);
	/** @type {typeof import('$lib/draw-ui-components.js').createDrawUiComponent | undefined} */
	let createUiComponent;
	let isPresetMenuOpen = $state(false);
	let isComponentMenuOpen = $state(false);
	let componentQuery = $state('');
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
	let needsSignIn = $state(false);
	/** @type {'local' | 'saving' | 'saved' | 'error'} */
	let saveStatus = $state('local');
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let saveTimer;
	/** @type {{ pageId: string, scene: DrawingScene } | undefined} */
	let pendingSave;
	let isSwitchingPage = false;
	let selectedImageId = $state('');
	let backgroundMode = $state('portrait-fast');
	let backgroundStatus = $state('');
	let backgroundProgress = $state(0);
	let backgroundError = $state('');
	let isRemovingBackground = $state(false);
	/** @type {AbortController | undefined} */
	let backgroundAbort;
	const activePage = $derived(pages.find((page) => page.id === activePageId));
	const activeBackgroundMode = $derived(
		BACKGROUND_MODES.find((mode) => mode.id === backgroundMode) ?? BACKGROUND_MODES[0]
	);
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
				id: 'action-browse-components',
				label: 'Browse UI components',
				description: 'Open the hand-drawn wireframing kit',
				category: 'Actions',
				keywords: ['wireframe', 'interface', 'kit'],
				run: () => {
					isComponentMenuOpen = true;
				}
			}
		];

		commands.push(
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
			activePageId = page.id;
			storePages();
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
		isPresetMenuOpen = false;
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
		isComponentMenuOpen = false;
		componentQuery = '';
	}

	/** @param {string} [query] */
	function openCommandPalette(query = '') {
		commandPreviousFocus =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		commandQuery = query;
		highlightedCommandIndex = 0;
		isPresetMenuOpen = false;
		isPageMenuOpen = false;
		isComponentMenuOpen = false;
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
		if (!activePageId || isSwitchingPage) return;
		const selectedIds = Object.entries(appState.selectedElementIds)
			.filter(([, selected]) => selected)
			.map(([id]) => id);
		const selected =
			selectedIds.length === 1
				? elements.find((element) => element.id === selectedIds[0] && element.type === 'image')
				: undefined;
		const nextSelectedImageId = selected?.id ?? '';
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
			localStorage.setItem(STORAGE_KEY, serialized);
			localStorage.setItem(`${STORAGE_KEY}:${activePageId}`, serialized);
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

		async function mountEditor() {
			const [
				{ createElement, useState },
				{ createRoot },
				{
					Excalidraw,
					convertToExcalidrawElements,
					useHandleLibrary,
					newElementWith,
					CaptureUpdateAction
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

				return createElement(Excalidraw, {
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
				});
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
	<meta
		name="description"
		content="A fullscreen drawing canvas with organized pages and automatic saving."
	/>
</svelte:head>

<div class="draw-canvas" role="application" aria-label="Drawing canvas" bind:this={canvas}></div>

{#if selectedImageId || isRemovingBackground}
	<section class="image-tools" aria-label="Selected image tools">
		<div class="image-tool-heading">
			<svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
				<path
					d="m10 2.5 1.6 4.2L16 8.3l-4.4 1.6L10 14l-1.6-4.1L4 8.3l4.4-1.6L10 2.5Zm5.2 9.5.9 2.3 2.4.9-2.4.9-.9 2.4-.9-2.4-2.3-.9 2.3-.9.9-2.3Z"
					stroke="currentColor"
					stroke-width="1.3"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<strong>Background</strong>
			<span>Processed privately on your device</span>
		</div>

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
			<p class="background-download-warning">First use downloads {activeBackgroundMode.size}.</p>
		{:else if backgroundStatus}
			<p class="background-success" role="status">{backgroundStatus}</p>
		{/if}

		{#if editor && updateElement && captureImmediately && selectedImageId}
			<DrawImageToolbox
				{editor}
				imageId={selectedImageId}
				{updateElement}
				captureUpdate={captureImmediately}
				{cloudAvailable}
				onCloudLimit={() => (saveStatus = 'error')}
			/>
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
				isPresetMenuOpen = false;
				isComponentMenuOpen = false;
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

{#if uiComponents.length > 0}
	<div class="component-picker">
		<button
			type="button"
			class="component-toggle"
			aria-label="Browse UI components"
			aria-expanded={isComponentMenuOpen}
			aria-controls="drawing-components"
			title="Browse hand-drawn UI components (⌘K)"
			disabled={!editor}
			onclick={() => {
				isComponentMenuOpen = !isComponentMenuOpen;
				isPresetMenuOpen = false;
				isPageMenuOpen = false;
				componentQuery = '';
			}}
		>
			<svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
				<path
					d="M4.2 4.5h11.6v11H4.2v-11Zm0 3.5h11.6M8 8v7.5"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<span>Components</span>
			<kbd>⌘K</kbd>
		</button>

		{#if isComponentMenuOpen}
			<section id="drawing-components" class="component-menu" aria-label="UI components">
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
		{/if}
	</div>
{/if}

{#if presets.length > 0}
	<div class="preset-picker">
		<button
			type="button"
			class="preset-toggle"
			aria-label="Browse drawing presets"
			aria-expanded={isPresetMenuOpen}
			aria-controls="drawing-presets"
			disabled={!editor}
			onclick={() => {
				isPresetMenuOpen = !isPresetMenuOpen;
				isPageMenuOpen = false;
				isComponentMenuOpen = false;
			}}
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
			<span>Presets</span>
		</button>

		{#if isPresetMenuOpen}
			<section id="drawing-presets" class="preset-menu" aria-label="Drawing presets">
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
		{/if}
	</div>
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

	.image-tool-heading {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-bottom: 10px;
		font-size: 12px;
	}

	.image-tool-heading svg {
		width: 17px;
		height: 17px;
		color: #6554c0;
	}

	.image-tool-heading span {
		margin-left: auto;
		color: #71717a;
		font-size: 10px;
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

	.preset-picker,
	.page-picker,
	.component-picker {
		position: fixed;
		top: 12px;
		z-index: 1000;
		font-family:
			Inter,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		color: #1d1d1d;
	}

	.preset-picker {
		left: 66px;
	}

	.page-picker {
		left: 337px;
	}

	.component-picker {
		left: 173px;
	}

	.preset-toggle,
	.page-toggle,
	.component-toggle {
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

	.page-toggle {
		max-width: min(185px, calc(100vw - 369px));
	}

	.component-toggle kbd,
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

	.preset-toggle:disabled,
	.page-toggle:disabled,
	.component-toggle:disabled {
		cursor: wait;
		opacity: 0.65;
	}

	.preset-toggle svg,
	.page-toggle svg,
	.component-toggle svg,
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

	.preset-menu,
	.page-menu,
	.component-menu {
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
		width: min(290px, calc(100vw - 188px));
		min-width: 230px;
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

	.component-menu {
		width: min(330px, calc(100vw - 188px));
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

	@media (max-width: 600px) {
		.image-tools {
			top: 63px;
		}

		.image-tool-heading span {
			font-size: 9px;
		}

		.preset-picker,
		.page-picker,
		.component-picker {
			top: 10px;
		}

		.preset-picker {
			left: 58px;
		}

		.component-picker {
			left: 159px;
		}

		.page-picker {
			left: 288px;
		}

		.preset-toggle,
		.page-toggle,
		.component-toggle {
			height: 36px;
			padding: 0 10px;
		}

		.component-toggle kbd {
			display: none;
		}

		.page-toggle {
			max-width: calc(100vw - 299px);
		}

		.page-menu {
			position: relative;
			left: min(0px, calc(100vw - 570px));
			width: min(260px, calc(100vw - 24px));
			min-width: 0;
		}

		.component-menu {
			position: relative;
			left: min(0px, calc(100vw - 495px));
			width: min(325px, calc(100vw - 24px));
		}

		.command-palette {
			top: 11vh;
		}
	}

	@media (max-width: 410px) {
		.component-toggle span {
			display: none;
		}

		.page-picker {
			left: 212px;
		}

		.page-toggle {
			max-width: calc(100vw - 225px);
		}
	}
</style>
