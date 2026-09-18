<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	let Dialog: typeof import('./SearchDialog.svelte').default | undefined;
	let opened = false;
	let launching = false;
	let origin: HTMLElement | null = null;
	export async function open() {
		if (
			opened ||
			launching ||
			document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')
		)
			return;
		launching = true;
		origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		try {
			Dialog = (await import('./SearchDialog.svelte')).default;
			opened = true;
			await tick();
		} catch {
			await goto('/search');
		} finally {
			launching = false;
		}
	}
	function close() {
		opened = false;
		origin?.focus({ preventScroll: true });
	}
	onMount(() => {
		function shortcut(event: KeyboardEvent) {
			if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey) return;
			const target = event.target;
			if (
				target instanceof Element &&
				target.closest(
					'input, textarea, select, [contenteditable], [role="textbox"], [role="combobox"]'
				)
			)
				return;
			if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
			if (
				(event.key === '/' && !event.metaKey && !event.ctrlKey && !event.shiftKey) ||
				((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')
			) {
				event.preventDefault();
				void open();
			}
		}
		window.addEventListener('keydown', shortcut, true);
		return () => window.removeEventListener('keydown', shortcut, true);
	});
</script>

{#if opened && Dialog}<svelte:component this={Dialog} onClose={close} />{/if}
