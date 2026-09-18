<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { SEARCH_TYPES, COMMON_DESTINATIONS, commonMatches, searchUrl } from '$lib/site-search.js';
	import type { SearchResult } from '$lib/site-search.js';
	export let onClose: () => void;
	let dialog: HTMLDialogElement;
	let input: HTMLInputElement;
	let resultArea: HTMLDivElement;
	let query = '';
	let type = 'all';
	let selected = 0;
	let results: SearchResult[] = [];
	let loading = false;
	let failed = false;
	let total = 0;
	let composing = false;
	let timer: ReturnType<typeof setTimeout>;
	let request: AbortController | undefined;
	let revision = 0;
	$: common = commonMatches(query, type);
	$: suggestions = failed
		? COMMON_DESTINATIONS
		: query.trim().length >= 2 && !loading
			? results
			: common;
	$: catalogMatches = query.trim().length >= 2 && !loading && !failed;
	function update(event?: Event) {
		if (event?.currentTarget instanceof HTMLInputElement) query = event.currentTarget.value;
		clearTimeout(timer);
		request?.abort();
		revision++;
		results = [];
		total = 0;
		selected = 0;
		failed = false;
		loading = query.trim().length >= 2;
		if (resultArea) resultArea.scrollTop = 0;
		if (!loading || composing) return;
		const version = revision;
		const params = new URLSearchParams({ q: query, type, limit: '8' });
		timer = setTimeout(async () => {
			request = new AbortController();
			try {
				const response = await fetch(`/api/search?${params}`, { signal: request.signal });
				if (!response.ok) throw new Error('Search unavailable');
				const data = await response.json();
				if (version !== revision) return;
				results = data.results;
				total = data.total;
			} catch (error) {
				if (
					version === revision &&
					!(error instanceof DOMException && error.name === 'AbortError')
				) {
					failed = true;
					selected = -1;
				}
			} finally {
				if (version === revision) loading = false;
			}
		}, 150);
	}
	function chooseType(next: string) {
		type = next;
		update();
		input.focus();
	}
	async function keys(event: KeyboardEvent) {
		if (event.isComposing || composing) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			dialog.close();
			return;
		}
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!suggestions.length) return;
			selected =
				selected < 0
					? event.key === 'ArrowDown'
						? 0
						: suggestions.length - 1
					: (selected + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) %
						suggestions.length;
			await tick();
			document
				.getElementById(`site-search-option-${selected}`)
				?.scrollIntoView({ block: 'nearest' });
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (suggestions[selected]) {
				// Use normal link navigation for both local pages and external recordings.
				document.getElementById(`site-search-option-${selected}`)?.click();
				return;
			}
			dialog.close();
			await goto(searchUrl(query, type));
		}
	}
	function backdrop(event: MouseEvent) {
		if (event.target !== dialog) return;
		const r = dialog.getBoundingClientRect();
		if (
			event.clientX < r.left ||
			event.clientX > r.right ||
			event.clientY < r.top ||
			event.clientY > r.bottom
		)
			dialog.close();
	}
	onMount(() => {
		dialog.showModal();
		input.focus();
		return () => {
			clearTimeout(timer);
			revision++;
			request?.abort();
		};
	});
</script>

<dialog
	bind:this={dialog}
	class="search-dialog"
	aria-labelledby="site-search-title"
	on:close={onClose}
	on:click={backdrop}
>
	<div class="search-top">
		<h2 id="site-search-title">Search swyx.io</h2>
		<button class="close" aria-label="Close search" on:click={() => dialog.close()}>✕</button>
	</div>
	<div class="search-input-wrap">
		<span aria-hidden="true">⌕</span>
		<input
			bind:this={input}
			bind:value={query}
			on:input={update}
			on:keydown={keys}
			on:compositionstart={() => {
				composing = true;
				clearTimeout(timer);
				request?.abort();
				revision++;
			}}
			on:compositionend={(event) => {
				composing = false;
				update(event);
			}}
			type="search"
			maxlength="120"
			role="combobox"
			aria-label="Search writing, talks, podcasts, and pages"
			aria-autocomplete="list"
			aria-expanded="true"
			aria-controls="site-search-options"
			aria-activedescendant={suggestions.length && selected >= 0
				? `site-search-option-${selected}`
				: undefined}
			placeholder="Ideas, talks, podcasts…"
			autocomplete="off"
			autocorrect="off"
			autocapitalize="none"
			spellcheck="false"
			enterkeyhint="search"
		/>
	</div>
	<div class="search-types" aria-label="Search content types">
		{#each SEARCH_TYPES as [value, label]}<button
				class:chosen={type === value}
				aria-pressed={type === value}
				on:click={() => chooseType(value)}>{label}</button
			>{/each}
	</div>
	<div class="search-results" bind:this={resultArea}>
		<p class="search-status" role="status">
			{loading
				? 'Searching the catalog…'
				: failed
					? 'Search is temporarily unavailable. Showing common pages instead of catalog matches.'
					: catalogMatches
						? `${total} catalog ${total === 1 ? 'match' : 'matches'}`
						: 'Common destinations'}
		</p>
		<div
			id="site-search-options"
			role="listbox"
			aria-label={catalogMatches ? 'Search results' : 'Common destinations'}
		>
			{#each suggestions as result, i (result.id)}
				<a
					id={`site-search-option-${i}`}
					class="search-result"
					class:selected={selected === i}
					role="option"
					aria-selected={selected === i}
					tabindex="-1"
					href={result.url}
					on:click={() => dialog.close()}
				>
					<span class="result-title">{result.title}</span><span class="result-meta"
						>{result.type}{result.year ? ` · ${result.year}` : ''}</span
					>
					{#if result.snippet}<span class="result-snippet"
							>{#if result.snippetParts}{#each result.snippetParts as part}{#if part.matched}<mark
											>{part.text}</mark
										>{:else}{part.text}{/if}{/each}{:else}{result.snippet}{/if}</span
						>{/if}
					{#if result.section}<span class="result-meta">↳ {result.section}</span>{/if}
				</a>
			{/each}
		</div>
		{#if !loading && !failed && catalogMatches && !results.length}<p class="search-empty">
				No matches. Try a broader phrase or another content type.
			</p>{/if}
		{#if !catalogMatches && !suggestions.length && !loading && !failed}<p class="search-empty">
				Type at least two characters to search this content type.
			</p>{/if}
	</div>
	<div class="search-bottom">
		<span class="keyboard-help">↑ ↓ to browse · Enter to open · Esc to close</span>
		<a class="all-results" href={searchUrl(query, type)} on:click={() => dialog.close()}
			>All results <span aria-hidden="true">→</span></a
		>
	</div>
</dialog>

<style>
	.search-dialog {
		width: min(680px, calc(100% - 32px));
		max-height: min(720px, calc(100dvh - 48px));
		max-width: none;
		margin: 24px auto;
		padding: 0;
		border: 1px solid var(--page-border);
		border-radius: 12px;
		background: var(--page-surface);
		color: var(--page-text);
		box-shadow: 0 20px 80px #0004;
	}
	.search-dialog[open] {
		display: flex;
		flex-direction: column;
	}
	.search-dialog::backdrop {
		background: #11152399;
		backdrop-filter: blur(4px);
	}
	:global(body:has(.search-dialog[open])) {
		overflow: hidden;
	}
	.search-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		gap: 12px;
	}
	.search-top h2 {
		font: 600 22px/1.3 var(--font-display);
		margin: 0;
	}
	button,
	input {
		font-family: var(--font-body);
	}
	.close {
		min-width: 44px;
		min-height: 44px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--page-muted);
	}
	.search-input-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 16px;
		border: 1px solid var(--page-border);
		border-radius: 6px;
		padding: 0 12px;
		background: var(--page-bg);
	}
	.search-input-wrap:focus-within {
		outline: 2px solid var(--page-accent);
		outline-offset: 2px;
	}
	.search-input-wrap > span {
		font-size: 26px;
		color: var(--page-muted);
	}
	input {
		width: 100%;
		min-width: 0;
		height: 48px;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--page-text);
		font-size: 16px;
		outline: none;
	}
	.search-types {
		display: flex;
		flex-shrink: 0;
		overflow-x: auto;
		gap: 6px;
		padding: 12px 16px;
		scrollbar-width: none;
	}
	.search-types::-webkit-scrollbar {
		display: none;
	}
	.search-types button {
		white-space: nowrap;
		min-height: 44px;
		padding: 6px 12px;
		border: 1px solid var(--page-border);
		border-radius: 6px;
		background: transparent;
		color: var(--page-muted);
		font-size: 13px;
	}
	.search-types button.chosen {
		background: var(--page-accent-soft);
		border-color: var(--page-accent);
		color: var(--page-accent);
	}
	.search-results {
		overflow-y: auto;
		overscroll-behavior: contain;
		min-height: 0;
		flex: 1;
		padding: 0 12px 12px;
	}
	.search-status,
	.search-empty {
		color: var(--page-muted);
		font: 400 13px/1.5 var(--font-body);
		padding: 4px 8px;
		margin: 0 0 8px;
	}
	.search-result {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 4px 12px;
		min-height: 56px;
		padding: 12px;
		border-radius: 6px;
		color: var(--page-text);
		text-decoration: none;
	}
	.search-result.selected,
	.search-result:hover {
		background: var(--page-accent-soft);
	}
	.result-title {
		font: 600 18px/1.3 var(--font-display);
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.result-meta {
		font: 400 11px/1.5 var(--font-mono);
		color: var(--page-muted);
	}
	.result-snippet {
		grid-column: 1/-1;
		color: var(--page-muted);
		font: 400 13px/1.5 var(--font-body);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.search-bottom {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		border-top: 1px solid var(--page-border);
		padding: 8px 16px;
		flex-shrink: 0;
	}
	.keyboard-help {
		font: 400 11px var(--font-mono);
		color: var(--page-muted);
	}
	.all-results {
		display: inline-flex;
		gap: 12px;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		color: var(--page-accent);
		font: 600 14px var(--font-body);
	}
	@media (max-width: 600px) {
		.search-dialog {
			width: calc(100% - 16px);
			margin: 8px auto;
			max-height: calc(100dvh - 16px);
		}
		.keyboard-help {
			display: none;
		}
		.search-bottom {
			justify-content: flex-end;
		}
		.result-meta {
			font-size: 10px;
		}
	}
	@media (max-height: 450px) {
		.search-top {
			padding-block: 0;
		}
		.search-types {
			padding-block: 4px;
		}
		.search-bottom {
			padding-block: 0;
		}
	}
</style>
