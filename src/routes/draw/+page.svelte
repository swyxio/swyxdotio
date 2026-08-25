<script>
	import { onMount } from 'svelte';
	import '@excalidraw/excalidraw/index.css';

	const STORAGE_KEY = 'swyx-excalidraw';

	/** @type {HTMLDivElement} */
	let canvas;
	/** @type {import('@excalidraw/excalidraw/types').ExcalidrawImperativeAPI | null} */
	let editor = $state.raw(null);
	/** @type {typeof import('@excalidraw/excalidraw').convertToExcalidrawElements | null} */
	let convertElements = null;
	/** @type {typeof import('$lib/draw-presets.js').DRAW_PRESETS} */
	let presets = $state([]);
	let isPresetMenuOpen = $state(false);

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

	function restoreScene() {
		try {
			const storedScene = localStorage.getItem(STORAGE_KEY);
			return storedScene ? JSON.parse(storedScene) : undefined;
		} catch {
			return undefined;
		}
	}

	/**
	 * @param {readonly import('@excalidraw/excalidraw/element/types').ExcalidrawElement[]} elements
	 * @param {import('@excalidraw/excalidraw/types').AppState} appState
	 * @param {import('@excalidraw/excalidraw/types').BinaryFiles} files
	 */
	function saveScene(elements, appState, files) {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					elements,
					appState: {
						viewBackgroundColor: appState.viewBackgroundColor,
						scrollX: appState.scrollX,
						scrollY: appState.scrollY,
						zoom: appState.zoom
					},
					files
				})
			);
		} catch (error) {
			console.error('Could not save the drawing locally.', error);
		}
	}

	onMount(() => {
		/** @type {ReturnType<typeof import('react-dom/client').createRoot> | undefined} */
		let root;
		let destroyed = false;

		async function mountEditor() {
			const [
				{ createElement },
				{ createRoot },
				{ Excalidraw, convertToExcalidrawElements },
				{ DRAW_PRESETS }
			] = await Promise.all([
				import('react'),
				import('react-dom/client'),
				import('@excalidraw/excalidraw'),
				import('$lib/draw-presets.js')
			]);

			if (destroyed) return;

			convertElements = convertToExcalidrawElements;
			presets = DRAW_PRESETS;
			root = createRoot(canvas);
			root.render(
				createElement(Excalidraw, {
					initialData: restoreScene(),
					theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
					onChange: saveScene,
					excalidrawAPI: (
						/** @type {import('@excalidraw/excalidraw/types').ExcalidrawImperativeAPI} */ instance
					) => {
						editor = instance;
					}
				})
			);
		}

		void mountEditor();

		return () => {
			destroyed = true;
			root?.unmount();
		};
	});
</script>

<svelte:head>
	<title>Draw · swyx.io</title>
	<meta name="description" content="A fullscreen drawing canvas that saves in your browser." />
</svelte:head>

<div class="draw-canvas" role="application" aria-label="Drawing canvas" bind:this={canvas}></div>

{#if presets.length > 0}
	<div class="preset-picker">
		<button
			type="button"
			class="preset-toggle"
			aria-label="Browse drawing presets"
			aria-expanded={isPresetMenuOpen}
			aria-controls="drawing-presets"
			disabled={!editor}
			onclick={() => (isPresetMenuOpen = !isPresetMenuOpen)}
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

<style>
	.draw-canvas {
		position: fixed;
		inset: 0;
		height: 100dvh;
		width: 100vw;
	}

	.preset-picker {
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

	.preset-toggle {
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

	.preset-toggle:disabled {
		cursor: wait;
		opacity: 0.65;
	}

	.preset-toggle svg {
		width: 17px;
		height: 17px;
	}

	.preset-menu {
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

	.preset-heading {
		display: grid;
		gap: 4px;
		padding: 11px 11px 12px;
		border-bottom: 1px solid rgb(0 0 0 / 7%);
		margin-bottom: 5px;
		font-size: 13px;
	}

	.preset-heading span,
	.preset-option span {
		color: #71717a;
		font-size: 12px;
		line-height: 1.4;
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
	.preset-option:focus-visible {
		background: #f3f3f5;
		outline: none;
	}

	:global(html.dark) .preset-picker {
		color: #eee;
	}

	:global(html.dark) .preset-toggle,
	:global(html.dark) .preset-menu {
		border-color: rgb(255 255 255 / 10%);
		background: #262626;
	}

	:global(html.dark) .preset-heading {
		border-color: rgb(255 255 255 / 9%);
	}

	:global(html.dark) .preset-heading span,
	:global(html.dark) .preset-option span {
		color: #a1a1aa;
	}

	:global(html.dark) .preset-option:hover,
	:global(html.dark) .preset-option:focus-visible {
		background: #333;
	}

	@media (max-width: 600px) {
		.preset-picker {
			top: 10px;
			left: 58px;
		}

		.preset-toggle {
			height: 36px;
			padding: 0 10px;
		}
	}
</style>
