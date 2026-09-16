<script>
	import { onMount } from 'svelte';

	/** @type {{ toc: import('@svelte-put/toc').Toc }} */
	let { toc } = $props();
	let isOpen = $state(false);
	let items = $derived([...toc.items.values()]);
	onMount(() => {
		isOpen = window.matchMedia('(min-width: 640px)').matches;
	});
</script>

{#if items.length > 1}
	<nav class="floating-toc" aria-label="Floating table of contents">
		<button
			class="toc-toggle"
			aria-expanded={isOpen}
			aria-controls="floating-toc-items"
			onclick={() => (isOpen = !isOpen)}
		>
			Table of Contents <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
		</button>
		{#if isOpen}
			<ul id="floating-toc-items">
				{#each items as item (item.id)}
					<li class:subheading={item.element.tagName === 'H3'}>
						<a
							href="#{item.id}"
							use:toc.actions.link={item}
							aria-current={toc.activeItem?.id === item.id ? 'location' : undefined}
						>
							{item.text}
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</nav>
{/if}

<style>
	.floating-toc {
		position: fixed;
		right: 1rem;
		bottom: 4.5rem;
		z-index: 30;
		width: min(13rem, calc(100vw - 2rem));
		padding: 0.75rem;
		border: 1px solid var(--page-border);
		border-radius: 0.5rem;
		background: var(--page-surface);
		box-shadow: 0 2px 12px rgb(0 0 0 / 0.08);
		font: 0.8rem/1.5 var(--font-body);
	}
	.toc-toggle {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		color: var(--page-link);
		font-weight: 600;
		text-align: left;
	}
	ul {
		max-height: min(20rem, 50vh);
		margin: 0.75rem 0 0;
		padding: 0;
		overflow-y: auto;
		list-style: none;
	}
	li + li {
		margin-top: 0.4rem;
	}
	.subheading {
		padding-left: 0.75rem;
	}
	a {
		display: block;
		color: var(--page-muted);
	}
	a:hover,
	a[aria-current='location'] {
		color: var(--page-link);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}
</style>
