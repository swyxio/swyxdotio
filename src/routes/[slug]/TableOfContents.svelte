<script>
	import { onMount } from 'svelte';

	/** @type {{ toc: import('@svelte-put/toc').Toc, hasSections: boolean }} */
	let { toc, hasSections } = $props();
	let isOpen = $state(false);
	let items = $derived([...toc.items.values()]);
	let activeId = $state('');
	let updateFrame = 0;

	function scheduleActiveUpdate() {
		if (updateFrame) return;
		updateFrame = requestAnimationFrame(() => {
			updateFrame = 0;
			const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
			if (maxScroll > 0 && window.scrollY >= maxScroll - 1) {
				activeId = items.at(-1)?.id ?? '';
				return;
			}
			let current = items[0]?.id ?? '';
			for (const item of items) {
				if (item.element.getBoundingClientRect().top > 80) break;
				current = item.id;
			}
			activeId = current;
		});
	}

	$effect(() => {
		items;
		isOpen;
		scheduleActiveUpdate();
	});

	$effect(() => {
		if (!toc.root) return;
		const observer = new ResizeObserver(scheduleActiveUpdate);
		observer.observe(toc.root);
		return () => observer.disconnect();
	});

	onMount(() => {
		isOpen = window.matchMedia('(min-width: 1200px)').matches;
		window.addEventListener('scroll', scheduleActiveUpdate, { passive: true });
		window.addEventListener('resize', scheduleActiveUpdate);
		return () => {
			window.removeEventListener('scroll', scheduleActiveUpdate);
			window.removeEventListener('resize', scheduleActiveUpdate);
			cancelAnimationFrame(updateFrame);
		};
	});
</script>

<svelte:head>
	<noscript
		><style>
			.floating-toc {
				display: none !important;
			}
		</style></noscript
	>
</svelte:head>

{#if hasSections}
	<nav class="floating-toc" aria-label="Table of contents">
		<button
			class="toc-toggle"
			aria-expanded={isOpen}
			aria-controls="floating-toc-items"
			onclick={() => (isOpen = !isOpen)}
		>
			Table of Contents <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
		</button>
		<ul id="floating-toc-items" hidden={!isOpen}>
			{#each items as item (item.id)}
				<li class:subheading={item.element.tagName === 'H3'}>
					<a href="#{item.id}" aria-current={activeId === item.id ? 'location' : undefined}>
						{item.text}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	.floating-toc {
		position: fixed;
		right: max(1.25rem, calc((100vw - 72.5rem) / 2));
		top: min(9rem, 20vh);
		z-index: 30;
		display: flex;
		flex-direction: column;
		width: min(13rem, calc(100vw - 2rem));
		max-height: calc(100vh - min(9rem, 20vh) - 1rem);
		padding: 0;
		font: 0.8rem/1.5 var(--font-body);
	}
	.toc-toggle {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		min-height: 44px;
		color: var(--page-link);
		font-weight: 600;
		text-align: left;
	}
	ul {
		min-height: 0;
		max-height: min(20rem, 50vh);
		margin: 0.75rem 0 0;
		padding: 0;
		overflow-y: auto;
		list-style: none;
	}
	li + li {
		margin-top: 0.15rem;
	}
	.subheading {
		padding-left: 0.75rem;
	}
	a {
		display: block;
		padding: 0.3rem 0.6rem;
		border-radius: 0.3rem;
		color: var(--page-muted);
		text-decoration: none;
		transition:
			color 150ms,
			background-color 150ms,
			box-shadow 150ms;
	}
	a:hover {
		background: var(--page-row-hover);
		color: var(--page-text);
	}
	a[aria-current='location'] {
		background: var(--page-accent-soft);
		box-shadow: inset 3px 0 var(--page-accent);
		color: var(--page-link);
		font-weight: 600;
	}
	a:focus-visible {
		outline: 2px solid var(--page-link);
		outline-offset: -2px;
	}
	@media (max-width: 1199px) {
		.floating-toc {
			position: static;
			max-height: none;
			width: min(calc(100% - 2 * var(--site-gutter)), var(--reading-max-width));
			margin: 1.25rem auto;
			border-top: 1px solid var(--page-border);
			border-bottom: 1px solid var(--page-border);
			padding: 0.15rem 0;
		}
		ul {
			margin: 0 0 0.6rem;
			max-height: none;
		}
	}
</style>
