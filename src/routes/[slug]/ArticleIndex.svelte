<script>
	import { FEATURED_ESSAYS } from '$lib/featured-essays';

	/** @type {{ slug: string, neighbors: { newer: { slug: string, title: string }[], older: { slug: string, title: string }[] } }} */
	export let data;
	let open = false;
	let pinned = false;
	let hovering = false;
	let dismissed = false;
	/** @type {HTMLElement} */
	let root;
	/** @type {HTMLButtonElement} */
	let toggle;
	$: featured = FEATURED_ESSAYS.filter((essay) => essay.href !== `/${data.slug}`).slice(0, 5);

	function enter() {
		if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
		hovering = true;
		if (!dismissed) open = true;
	}
	function leave() {
		hovering = false;
		dismissed = false;
		if (!pinned && !root.contains(document.activeElement)) open = false;
	}
	function toggleIndex() {
		if (pinned) {
			pinned = false;
			open = false;
			dismissed = hovering;
		} else {
			pinned = true;
			open = true;
			dismissed = false;
		}
	}
	/** @param {KeyboardEvent} event */
	function keydown(event) {
		if (!open || event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
		if (
			event.target instanceof Element &&
			event.target.closest('dialog, [role="dialog"][aria-modal="true"]')
		)
			return;
		open = false;
		pinned = false;
		dismissed = hovering;
		toggle.focus();
	}
	/** @param {MouseEvent} event */
	function outsideClick(event) {
		if (open && event.target instanceof Node && !root.contains(event.target)) {
			open = false;
			pinned = false;
			dismissed = hovering;
		}
	}
	/** @param {FocusEvent} event */
	function focusout(event) {
		if (
			!pinned &&
			!hovering &&
			!(event.relatedTarget instanceof Node && root.contains(event.relatedTarget))
		) {
			open = false;
		}
	}
</script>

<svelte:window on:keydown={keydown} on:click={outsideClick} />
<nav
	class="article-index"
	aria-label="Explore writing"
	bind:this={root}
	on:mouseenter={enter}
	on:mouseleave={leave}
	on:focusout={focusout}
>
	<button
		class="index-toggle"
		bind:this={toggle}
		aria-expanded={open}
		aria-controls="article-index-panel"
		on:click={toggleIndex}
	>
		<span aria-hidden="true">←</span> index
		<span class="toggle-mark" aria-hidden="true">{open ? '−' : '+'}</span>
	</button>
	<div id="article-index-panel" class:open class="index-panel" inert={!open}>
		<div class="index-content">
			<p class="index-label">Explore</p>
			<a href="/ideas">All writing <span aria-hidden="true">↗</span></a>
			<a href="/ideas#ideas-results">Writing by date <span aria-hidden="true">↗</span></a>
			<a href="/">Home <span aria-hidden="true">↗</span></a>
			<p class="index-label">Featured reads</p>
			{#each featured as essay (essay.href)}
				<a href={essay.href}>{essay.title}</a>
			{/each}
			{#if data.neighbors.newer.length || data.neighbors.older.length}
				<p class="index-label">Nearby in time</p>
				{#each data.neighbors.newer as post (post.slug)}
					<a href="/{post.slug}"><span class="direction">Newer</span>{post.title}</a>
				{/each}
				{#each data.neighbors.older as post (post.slug)}
					<a href="/{post.slug}"><span class="direction">Older</span>{post.title}</a>
				{/each}
			{/if}
		</div>
	</div>
</nav>

<style>
	.article-index {
		position: relative;
		z-index: 35;
		width: min(calc(100% - 2 * var(--site-gutter)), var(--reading-max-width));
		margin: 1.25rem auto -0.75rem;
		font-family: var(--font-body);
	}
	.index-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		min-height: 44px;
		color: var(--page-muted);
		font: italic 1rem/1.4 var(--font-display);
		cursor: pointer;
	}
	.index-toggle:hover,
	.index-toggle[aria-expanded='true'] {
		color: var(--page-link);
	}
	.toggle-mark {
		font: 400 0.9rem/1 var(--font-body);
	}
	.index-panel {
		position: static;
		width: 100%;
		max-height: 0;
		overflow: hidden;
		opacity: 0;
		visibility: hidden;
		transition:
			max-height 220ms ease,
			opacity 180ms ease,
			visibility 180ms;
	}
	.index-panel.open {
		max-height: min(70vh, 38rem);
		overflow-y: auto;
		opacity: 1;
		visibility: visible;
	}

	.index-content {
		padding: 0 0 0.75rem;
	}
	.index-label {
		margin: 0.8rem 0 0.3rem;
		padding: 0 0.45rem;
		color: var(--page-muted);
		font: 600 0.7rem/1.4 var(--font-body);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.index-label:first-child {
		margin-top: 0.15rem;
	}
	.index-content a {
		display: block;
		padding: 0.35rem 0.45rem;
		border-radius: 0.25rem;
		color: var(--page-text);
		font-size: 0.875rem;
		line-height: 1.4;
		text-decoration: none;
	}
	.index-content a:hover,
	.index-content a:focus-visible {
		color: var(--page-link);
		background: var(--page-row-hover);
	}
	.direction {
		display: block;
		color: var(--page-muted);
		font-size: 0.72rem;
	}
	@media (min-width: 1200px) {
		.article-index {
			position: fixed;
			top: min(9rem, 20vh);
			left: max(1.25rem, calc((100vw - 72.5rem) / 2));
			width: 13rem;
			margin: 0;
		}
		.index-panel {
			position: static;
			width: 100%;
			max-height: 0;
			border: 0;
			border-radius: 0;
			background: transparent;
			box-shadow: none;
			transition:
				max-height 220ms ease,
				opacity 180ms ease,
				transform 180ms ease,
				visibility 180ms;
		}
		.index-panel.open {
			max-height: max(0px, min(calc(100vh - min(9rem, 20vh) - 60px), 38rem));
		}
		.index-content {
			padding: 0;
		}
		.index-label {
			padding: 0;
		}
		.index-content a {
			padding: 0.3rem 0;
		}
		.index-content a:hover,
		.index-content a:focus-visible {
			background: transparent;
			text-decoration: underline;
		}
	}
</style>
