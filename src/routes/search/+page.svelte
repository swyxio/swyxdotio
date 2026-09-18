<script lang="ts">
	import { SEARCH_TYPES, COMMON_DESTINATIONS } from '$lib/site-search.js';
	import { beforeNavigate } from '$app/navigation';
	export let data: import('./$types').PageData;
	let query = data.q,
		type = data.type,
		year = data.year,
		tag = data.tag,
		source = data.source;
	let currentData = data;
	let navigationDraft: string | null = null;
	const draft = () => JSON.stringify([query, type, year, tag, source]);
	beforeNavigate(() => {
		navigationDraft = draft();
	});
	$: if (data !== currentData) {
		// A completed earlier navigation must not overwrite a newer edit.
		if (navigationDraft === null || draft() === navigationDraft) {
			query = data.q;
			type = data.type;
			year = data.year;
			tag = data.tag;
			source = data.source;
		}
		currentData = data;
		navigationDraft = null;
	}
	function pageUrl(page: number) {
		const params = new URLSearchParams({
			q: data.q,
			type: data.type,
			year: data.year,
			tag: data.tag,
			source: data.source,
			page: String(page)
		});
		return `/search?${params}`;
	}
</script>

<svelte:head
	><title>{data.q ? `${data.q} — ` : ''}Search — swyx.io</title><meta
		name="robots"
		content="noindex"
	/></svelte:head
>
<div class="site-shell search-page">
	<h1>Search the notebook</h1>
	<p class="intro">Writing, talks, podcast appearances, and pages.</p>
	<form action="/search" method="get" role="search">
		<label class="query-label" for="full-search">Search swyx.io</label>
		<div class="query-row">
			<input
				id="full-search"
				name="q"
				bind:value={query}
				type="search"
				maxlength="120"
				placeholder="What are you looking for?"
				autocomplete="off"
				autocorrect="off"
				autocapitalize="none"
				spellcheck="false"
				enterkeyhint="search"
			/><button>Search</button>
		</div>
		<div class="facets">
			<label
				>Content<select name="type" bind:value={type}
					>{#each SEARCH_TYPES as [value, label]}<option {value}>{label}</option>{/each}</select
				></label
			>
			<label
				>Year<select name="year" bind:value={year}
					><option value="">Any year</option>{#each data.years as year}<option value={year}
							>{year}</option
						>{/each}{#if data.year && !data.years.includes(data.year)}<option value={data.year}
							>{data.year}</option
						>{/if}</select
				></label
			>
			<label
				>Topic<select name="tag" bind:value={tag}
					><option value="">Any topic</option>{#each data.tags as tag}<option value={tag}
							>{tag}</option
						>{/each}{#if data.tag && !data.tags.includes(data.tag)}<option value={data.tag}
							>{data.tag}</option
						>{/if}</select
				></label
			>
			<label
				>Source<select name="source" bind:value={source}
					><option value="">All sources</option>{#each data.sources as domain}<option value={domain}
							>{domain} ({data.sourceCounts[domain || ''] || 0})</option
						>{/each}</select
				></label
			>
		</div>
	</form>
	{#if data.unavailable}
		<p role="status">Search is temporarily unavailable. You can still open these common pages.</p>
		<ul class="complete-results">
			{#each COMMON_DESTINATIONS as result}<li>
					<a href={result.url}>{result.title}</a>
					<p>
						{#if result.snippetParts}{#each result.snippetParts as part}{#if part.matched}<mark
										>{part.text}</mark
									>{:else}{part.text}{/if}{/each}{:else}{result.snippet}{/if}
					</p>
				</li>{/each}
		</ul>
	{:else}
		<p class="result-count" role="status">
			{data.total}
			{data.total === 1 ? 'result' : 'results'}{data.q ? ` for “${data.q}”` : ''}
		</p>
		<ul class="complete-results">
			{#each data.results as result (result.id)}<li>
					<a href={result.url}>{result.title}</a><span
						>{result.type}{result.year ? ` · ${result.year}` : ''}</span
					>{#if result.section}<p class="section">↳ {result.section}</p>{/if}{#if result.snippet}<p>
							{#if result.snippetParts}{#each result.snippetParts as part}{#if part.matched}<mark
											>{part.text}</mark
										>{:else}{part.text}{/if}{/each}{:else}{result.snippet}{/if}
						</p>{/if}
				</li>{/each}
		</ul>
		{#if !data.total}<p>Try a broader phrase or clear a filter.</p>{/if}
		{#if data.total > data.limit}<nav class="pagination" aria-label="Search pages">
				{#if data.page > 1}<a href={pageUrl(data.page - 1)}>← Previous</a>{/if}<span
					>Page {data.page} of {Math.ceil(data.total / data.limit)}</span
				>{#if data.page * data.limit < data.total}<a href={pageUrl(data.page + 1)}>Next →</a>{/if}
			</nav>{/if}
	{/if}
</div>

<style>
	.search-page {
		max-width: 760px;
		padding-block: 32px;
	}
	h1 {
		font: 600 36px/1.2 var(--font-display);
		margin: 0 0 8px;
	}
	.intro,
	.result-count {
		color: var(--page-muted);
		font: 400 14px/1.5 var(--font-body);
	}
	form {
		margin: 24px 0;
	}
	.query-label {
		display: block;
		font-size: 13px;
		margin-bottom: 6px;
	}
	.query-row {
		display: flex;
		gap: 8px;
	}
	input,
	select,
	button {
		font: 400 16px var(--font-body);
		color: var(--page-text);
		background: var(--page-surface);
		border: 1px solid var(--page-border);
		border-radius: 6px;
		min-height: 48px;
		padding: 8px 12px;
	}
	input {
		flex: 1;
		min-width: 0;
	}
	button {
		color: var(--page-accent);
		font-weight: 600;
	}
	.facets {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
		margin-top: 12px;
	}
	.facets label {
		font-size: 12px;
		color: var(--page-muted);
		min-width: 0;
	}
	select {
		display: block;
		width: 100%;
		margin-top: 4px;
		font-size: 14px;
		min-height: 44px;
	}
	.complete-results {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.complete-results li {
		border-bottom: 1px solid var(--page-border);
		padding: 16px 0;
	}
	.complete-results a {
		display: block;
		min-height: 44px;
		font: 600 24px/1.3 var(--font-display);
		color: var(--page-text);
		text-decoration: none;
		overflow-wrap: anywhere;
	}
	.complete-results a:hover {
		color: var(--page-accent);
	}
	.complete-results span {
		color: var(--page-muted);
		font: 400 11px var(--font-mono);
	}
	.complete-results p {
		font: 400 16px/1.65 var(--font-reading);
		margin: 8px 0 0;
	}
	.pagination {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 24px;
	}
	.pagination a {
		display: flex;
		align-items: center;
		min-height: 44px;
	}
	.pagination span {
		font-size: 13px;
		color: var(--page-muted);
	}
	@media (max-width: 450px) {
		h1 {
			font-size: 30px;
		}
		.facets {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.search-page {
			padding-block: 24px;
		}
	}
</style>
