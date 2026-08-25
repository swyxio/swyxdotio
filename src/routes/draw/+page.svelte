<script>
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import 'tldraw/tldraw.css';

	/** @type {HTMLDivElement} */
	let canvas;

	onMount(() => {
		/** @type {import('react-dom/client').Root | undefined} */
		let root;
		let destroyed = false;

		async function mountEditor() {
			const [{ createElement }, { createRoot }, { Tldraw }] = await Promise.all([
				import('react'),
				import('react-dom/client'),
				import('tldraw')
			]);

			if (destroyed) return;

			root = createRoot(canvas);
			root.render(
				createElement(Tldraw, {
					persistenceKey: 'swyx-draw',
					colorScheme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
					...(env.PUBLIC_TLDRAW_LICENSE_KEY ? { licenseKey: env.PUBLIC_TLDRAW_LICENSE_KEY } : {})
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

<style>
	.draw-canvas {
		position: fixed;
		inset: 0;
		height: 100dvh;
		width: 100vw;
	}
</style>
