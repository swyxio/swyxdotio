<script>
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { queryParameters } from 'sveltekit-search-params';

	import { POST_CATEGORIES } from '$lib/siteConfig';
	import { withIdeasYearHeadings } from '$lib/ideas-library-rows';
	import { IDEAS_QUERY_PARAMETERS, IDEAS_QUERY_OPTIONS } from '$lib/ideas-query-parameters';
	import { loadOnScroll } from '$lib/load-on-scroll';
	import {
		READ_COUNT_BATCH_LIMIT,
		READ_COUNT_VISIBILITY_EVENT,
		READ_COUNT_VISIBILITY_KEY,
		readCountsAreHidden
	} from '$lib/read-counter';
	import SocialMeta from '../../components/SocialMeta.svelte';
	import { getPageSocialMeta } from '$lib/social-meta';

	import FeaturedEssayShelf from '../../components/FeaturedEssayShelf.svelte';

	const social = getPageSocialMeta('ideas');

	/**
	 * @typedef {{
	 *   title: string;
	 *   slug: string;
	 *   url?: string;
	 *   date: Date | string;
	 *   category: string;
	 *   type?: string;
	 *   tags?: string[];
	 *   venues?: string;
	 *   readingTime?: string;
	 *   devToReactions?: number;
	 *   ghReactions?: number;
	 *   ghMetadata?: import('$lib/types').GHMetadata;
	 *   highlightedResults?: string;
	 *   searchSnippet?: import('$lib/ideas-search-snippet').SearchSnippetPart[];
	 *   description?: string;
	 *   content?: string;
	 *   instances?: { date?: Date | string; venue?: string; video?: string }[];
	 * }} ArchiveItem
	 * @typedef {ArchiveItem & { yearHeading: number | null }} ArchiveRow
	 */

	/** @type {import('./$types').PageData} */
	export let data;

	// List metadata stays small; full article bodies are fetched only when search is used.
	/** @type {ArchiveItem[]} */
	let archiveItems = /** @type {ArchiveItem[]} */ (data.items);
	/** @type {ArchiveItem[]} */
	let searchableItems = [];

	const filters = queryParameters(IDEAS_QUERY_PARAMETERS, IDEAS_QUERY_OPTIONS);

	/** @type {HTMLInputElement | undefined} */
	let inputEl;
	let countsHidden = false;
	/** @type {Record<string, number>} */
	let readCounts = {};
	const requestedReadKeys = new Set();
	const readFormatter = new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1
	});

	/** @param {KeyboardEvent} event */
	function handleSearchKey(event) {
		if (
			event.defaultPrevented ||
			event.isComposing ||
			event.metaKey ||
			event.ctrlKey ||
			event.altKey
		)
			return;
		if (event.key === 'Escape' && event.target === inputEl) {
			event.preventDefault();
			if ($filters.filter) $filters.filter = '';
			else inputEl?.blur();
			return;
		}
		const target = event.target;
		if (
			event.key === '/' &&
			inputEl &&
			!(
				target instanceof Element &&
				target.closest('input, textarea, select, [contenteditable], [role="textbox"]')
			)
		) {
			event.preventDefault();
			inputEl.focus();
			inputEl.select();
		}
	}

	const initialCount = data.totalCount ?? data.items.length;
	let archiveLoaded = archiveItems.length >= initialCount;
	/** @type {((items: ArchiveItem[], categories: string[] | null, query: string | null) => Promise<ArchiveItem[]>) | undefined} */
	let searchFn;
	/** @type {typeof import('$lib/ideas-search-snippet').createIdeasSearchSnippet | undefined} */
	let createSnippet;
	/** @type {Promise<void> | undefined} */
	let archiveLoad;
	function loadArchiveItems() {
		if (archiveLoaded) return Promise.resolve();
		if (archiveLoad) return archiveLoad;
		archiveLoad = fetch('/api/listArchive.json')
			.then(async (res) => {
				if (!res.ok) throw new Error(`failed to load archive content (${res.status})`);
				const content = await res.json();
				if (!Array.isArray(content)) throw new Error('Archive content is unavailable');
				archiveItems = /** @type {ArchiveItem[]} */ (content);
				archiveLoaded = true;
			})
			.catch((error) => {
				archiveLoad = undefined;
				throw error;
			});
		return archiveLoad;
	}

	/** @type {Promise<void> | undefined} */
	let searchLoad;
	function loadSearchContent() {
		if (searchLoad) return searchLoad;
		searchLoad = Promise.all([
			import('./fuzzySearch'),
			import('$lib/ideas-search-snippet'),
			fetch('/api/searchContent.json')
		])
			.then(async ([fuzzy, snippets, res]) => {
				if (!res.ok) throw new Error(`failed to load search content (${res.status})`);
				const content = await res.json();
				if (!Array.isArray(content)) throw new Error('Search content is unavailable');
				searchableItems = /** @type {ArchiveItem[]} */ (content);
				searchFn = /** @type {NonNullable<typeof searchFn>} */ (fuzzy.fuzzySearch);
				createSnippet = snippets.createIdeasSearchSnippet;
			})
			.catch((error) => {
				searchLoad = undefined;
				throw error;
			});
		return searchLoad;
	}

	/** @type {ArchiveRow[]} */
	let list = $filters.filter || $filters.show?.length ? [] : withIdeasYearHeadings(archiveItems);
	let totalResults = initialCount;
	const pageSize = 80;
	let visibleCount = pageSize;
	let isLoading = Boolean($filters.filter || $filters.show?.length);
	let loadError = '';
	let requestVersion = 0;
	let previousFilters = '';
	$: query = $filters.filter?.trim() ?? '';
	$: filterKey = JSON.stringify([query, $filters.show]);
	$: if (filterKey) visibleCount = pageSize;
	$: if (browser) void updateResults(query, $filters.show ?? [], visibleCount);

	function loadMore() {
		if (isLoading || loadError || list.length >= totalResults) return;
		isLoading = true;
		visibleCount = Math.min(visibleCount + pageSize, totalResults);
	}

	/**
	 * Await the complete source before claiming a result count or an empty state.
	 * A newer query always wins over an older pending request.
	 * @param {string} searchText
	 * @param {string[]} categories
	 * @param {number} limit
	 */
	async function updateResults(searchText, categories, limit) {
		const version = ++requestVersion;
		const filters = JSON.stringify([searchText, categories]);
		if (filters !== previousFilters && (searchText || categories.length)) list = [];
		previousFilters = filters;
		loadError = '';
		isLoading = Boolean(searchText || categories.length || limit > archiveItems.length);
		try {
			/** @type {ArchiveItem[]} */
			let results;
			if (searchText) {
				await loadSearchContent();
				if (!searchFn) throw new Error('Search is unavailable');
				results = await searchFn(searchableItems, categories, searchText);
			} else {
				if (categories.length || limit > archiveItems.length) await loadArchiveItems();
				const categoryNames = categories.map((category) => category.toLowerCase());
				results = categoryNames.length
					? archiveItems.filter((item) => categoryNames.includes(item.category.toLowerCase()))
					: archiveItems;
			}
			if (version !== requestVersion) return;
			totalResults =
				searchText || categories.length || archiveLoaded ? results.length : initialCount;
			list = withIdeasYearHeadings(results.slice(0, limit), !searchText).map((item) =>
				searchText
					? {
							...item,
							searchSnippet: createSnippet?.(item.content || item.description || '', searchText)
						}
					: item
			);
		} catch (error) {
			if (version !== requestVersion) return;
			loadError = searchText
				? 'Full-text search could not load. Please try again.'
				: 'The complete library could not load. Please try again.';
			console.error('Ideas library unavailable', error);
		} finally {
			if (version === requestVersion) isLoading = false;
		}
	}

	function clearSearch() {
		$filters.filter = '';
		inputEl?.focus();
	}

	function clearFilters() {
		$filters = { ...$filters, filter: '', show: [] };
	}

	/** @param {ArchiveItem} item */
	function itemHref(item) {
		if (item.category === 'talk' && item.instances?.[0]?.video) return item.instances[0].video;
		return item.category === 'podcast' && item.url ? item.url : `/${item.slug}`;
	}

	/** @param {ArchiveItem} item */
	function isExternalItem(item) {
		return (
			(item.category === 'podcast' && !!item.url) ||
			(item.category === 'talk' && !!item.instances?.[0]?.video)
		);
	}

	/** @param {ArchiveItem} item */
	function itemDate(item) {
		return new Date(item.date).toISOString().slice(0, 10);
	}

	/** @param {ArchiveItem} item */
	function shortDate(item) {
		const date = new Date(item.date);
		return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
	}

	/** @param {ArchiveItem} item */
	function yearOf(item) {
		return new Date(item.date).getFullYear();
	}

	/** @param {ArchiveItem[]} visibleItems */
	async function loadReadCounts(visibleItems) {
		if (countsHidden) return;
		const keys = [
			...new Set(
				visibleItems
					// Speaking entries without a video are still not registered article counters.
					.filter((item) => item.type === 'blog')
					.map((item) => item.slug)
					.filter((slug) => slug && !requestedReadKeys.has(slug))
			)
		];
		for (let offset = 0; offset < keys.length; offset += READ_COUNT_BATCH_LIMIT) {
			const chunk = keys.slice(offset, offset + READ_COUNT_BATCH_LIMIT);
			chunk.forEach((key) => requestedReadKeys.add(key));
			const params = new URLSearchParams();
			chunk.forEach((key) => params.append('key', key));
			try {
				const response = await fetch(`/api/reads/batch?${params}`);
				if (!response.ok) throw new Error(`read counts unavailable (${response.status})`);
				const payload = await response.json();
				readCounts = { ...readCounts, ...payload.reads };
			} catch (error) {
				chunk.forEach((key) => requestedReadKeys.delete(key));
				console.error('failed to load archive view counts', error);
			}
		}
	}

	function toggleReadCountVisibility() {
		countsHidden = !countsHidden;
		try {
			if (countsHidden) localStorage.setItem(READ_COUNT_VISIBILITY_KEY, 'hidden');
			else localStorage.removeItem(READ_COUNT_VISIBILITY_KEY);
		} catch {
			// The in-page preference still works when storage is unavailable.
		}
		window.dispatchEvent(
			new CustomEvent(READ_COUNT_VISIBILITY_EVENT, { detail: { hidden: countsHidden } })
		);
		if (!countsHidden) void loadReadCounts(list);
	}

	onMount(() => {
		function readPreference() {
			try {
				countsHidden = readCountsAreHidden(localStorage.getItem(READ_COUNT_VISIBILITY_KEY));
			} catch {
				countsHidden = false;
			}
		}
		/** @param {StorageEvent} event */
		function handleStorage(event) {
			if (event.key === READ_COUNT_VISIBILITY_KEY) readPreference();
		}
		/** @param {Event} event */
		function handlePreferenceEvent(event) {
			const detail = /** @type {CustomEvent<{ hidden?: unknown }>} */ (event).detail;
			countsHidden = detail?.hidden === true;
			if (!countsHidden) void loadReadCounts(list);
		}
		readPreference();
		window.addEventListener('storage', handleStorage);
		window.addEventListener(READ_COUNT_VISIBILITY_EVENT, handlePreferenceEvent);
		return () => {
			window.removeEventListener('storage', handleStorage);
			window.removeEventListener(READ_COUNT_VISIBILITY_EVENT, handlePreferenceEvent);
		};
	});

	$: if (browser && !countsHidden && list.length) void loadReadCounts(list);
</script>

<SocialMeta {...social} />

<svelte:window on:keydown={handleSearchKey} />

<div class="ideas-stage">
	<section class="ideas-shell site-shell">
		<header class="ideas-header">
			<h1>Ideas</h1>
			<p class="ideas-deck"><em>For free: great ideas, lightly used.</em></p>
			<p class="ideas-count">
				<strong>{initialCount.toLocaleString('en-US')}</strong> entries
			</p>
		</header>

		<div class="ideas-controls">
			<div class="search-control">
				<div class="search-label">
					<label for="ideas-search">Search the library</label>
					<span class="search-shortcut">Press <kbd>/</kbd> to search</span>
				</div>
				<div class="search-field">
					<input
						id="ideas-search"
						aria-label="Search articles"
						aria-controls="ideas-results"
						type="search"
						autocomplete="off"
						bind:value={$filters.filter}
						bind:this={inputEl}
						placeholder="Titles, topics, and full text"
						class="ideas-search"
					/>
					{#if $filters.filter}
						<button
							class="search-clear"
							type="button"
							on:click={clearSearch}
							title="Clear search (Escape)"
						>
							Clear
						</button>
					{/if}
				</div>
			</div>
			<fieldset class="ideas-filters">
				<legend class="sr-only">Filter by format</legend>
				<button
					type="button"
					class="ideas-filter"
					class:active={!$filters.show?.length}
					aria-pressed={!$filters.show?.length}
					on:click={() => ($filters.show = [])}
				>
					All
				</button>
				{#each POST_CATEGORIES as availableCategory}
					<label class="ideas-filter" class:active={$filters.show?.includes(availableCategory)}>
						<input
							id="category-{availableCategory}"
							class="filter-checkbox"
							type="checkbox"
							bind:group={$filters.show}
							value={availableCategory}
						/>
						{availableCategory}
					</label>
				{/each}
			</fieldset>
		</div>

		{#if !query && !$filters.show?.length}
			<FeaturedEssayShelf />
		{/if}

		<section
			id="ideas-results"
			class="ideas-results"
			aria-labelledby="library-heading"
			aria-busy={isLoading}
		>
			<div class="results-heading">
				<div>
					<h2 id="library-heading">
						{query || $filters.show?.length ? 'Found in the library' : 'All entries'}
					</h2>
					<p class="results-count" role="status" aria-live="polite">
						{#if isLoading}
							{query ? 'Searching the full library…' : 'Loading the complete library…'}
						{:else if loadError}
							{list.length ? 'Showing the entries already loaded.' : 'Results are unavailable.'}
						{:else}
							{`${totalResults > list.length ? `${list.length.toLocaleString('en-US')} of ` : ''}${totalResults.toLocaleString('en-US')} ${totalResults === 1 ? 'entry' : 'entries'}${query ? ` matching “${query}”` : ''}`}
						{/if}
					</p>
				</div>
				<button
					class="views-toggle"
					type="button"
					aria-pressed={!countsHidden}
					on:click={toggleReadCountVisibility}
				>
					{countsHidden ? 'Show views' : 'Hide views'}
				</button>
			</div>

			{#if loadError && !list.length}
				<div class="ideas-notice" role="alert">
					<p>{loadError}</p>
					<button
						class="library-button"
						type="button"
						on:click={() => updateResults(query, $filters.show ?? [], visibleCount)}
						>Try again</button
					>
				</div>
			{/if}

			{#if list.length}
				<div class="ideas-table" aria-label="Ideas archive">
					{#each list as item (item.url ?? item.slug)}
						{#if item.yearHeading !== null}
							<h3 class="ideas-year">{item.yearHeading}</h3>
						{/if}
						<a
							class="ideas-row"
							href={itemHref(item)}
							target={isExternalItem(item) ? '_blank' : undefined}
							rel={isExternalItem(item) ? 'noopener noreferrer' : undefined}
						>
							<time datetime={itemDate(item)}>
								<span>{shortDate(item)}</span>
								{#if query}<span class="date-year">{yearOf(item)}</span>{/if}
							</time>
							<span class="ideas-content">
								<span class="ideas-title">{item.title}</span>
								{#if item.searchSnippet?.length}
									<span class="ideas-snippet">
										{#each item.searchSnippet as part}{#if part.matched}<mark>{part.text}</mark
												>{:else}{part.text}{/if}{/each}
									</span>
								{/if}
							</span>
							<span class="ideas-meta">
								<span class="entry-category" title={item.venues}>{item.category}</span>
								{#if !countsHidden && Number.isSafeInteger(readCounts[item.slug])}
									<span
										class="view-count"
										title="Approximate lifetime views: historical estimate plus sampled engaged reads"
										>~{readFormatter.format(readCounts[item.slug])} views</span
									>
								{/if}
							</span>
						</a>
					{/each}
				</div>
				{#if totalResults > list.length}
					<div class="ideas-load-more">
						{#if loadError}
							<p class="load-progress" role="alert">{loadError}</p>
							<button
								type="button"
								class="library-button"
								on:click={() => updateResults(query, $filters.show ?? [], visibleCount)}
								>Try again</button
							>
						{:else}
							{#if !isLoading}
								{#key list.length}
									<div class="scroll-boundary" aria-hidden="true" use:loadOnScroll={loadMore}></div>
								{/key}
							{/if}
							<p class="load-progress">
								{isLoading
									? 'Loading more entries…'
									: `${list.length.toLocaleString('en-US')} of ${totalResults.toLocaleString('en-US')} entries`}
							</p>
							<button
								type="button"
								class="library-button"
								disabled={isLoading}
								aria-controls="ideas-results"
								on:click={loadMore}>{isLoading ? 'Loading…' : 'Load more'}</button
							>
						{/if}
					</div>
				{:else if !isLoading}
					<p class="library-end">
						{`All ${totalResults.toLocaleString('en-US')} ${totalResults === 1 ? 'entry' : 'entries'} shown.`}
					</p>
				{/if}
			{:else if isLoading}
				<div class="ideas-pending" aria-hidden="true">One moment while I check the shelves.</div>
			{:else if !loadError}
				<div class="ideas-empty">
					<h3>No entries found.</h3>
					<p>
						{query ? `Nothing matches “${query}”` : 'No entries are available'}{$filters.show
							?.length
							? ' in the selected formats'
							: ''}. Try another phrase or widen your filters.
					</p>
					<button class="library-button" type="button" on:click={clearFilters}
						>Clear search and filters</button
					>
				</div>
			{/if}
		</section>
	</section>
</div>

<style>
	.ideas-stage {
		overflow-x: clip;
	}

	.ideas-shell {
		--site-max-width: 1160px;
		margin-block: 0 4rem;
	}

	.ideas-header {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: baseline;
		gap: 0.4rem 1rem;
		padding-block: 1.5rem 0.85rem;
		border-bottom: 1px solid var(--page-border);
	}

	.ideas-header h1 {
		margin: 0;
		font: 600 2.25rem/1.1 var(--font-display);
	}

	.ideas-deck {
		margin: 0;
		color: var(--page-muted);
		font: 0.95rem/1.5 var(--font-reading);
	}

	.ideas-count {
		margin: 0;
		color: var(--page-muted);
		font: 0.78rem/1.5 var(--font-reading);
		white-space: nowrap;
	}

	.ideas-count strong {
		color: var(--page-text);
		font-weight: 600;
	}

	.ideas-controls {
		display: grid;
		grid-template-columns: minmax(16rem, 1fr) auto;
		align-items: end;
		gap: 1rem;
		margin-block: 0.9rem 1.1rem;
	}

	.search-control {
		min-width: 0;
	}

	.search-label {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.3rem;
	}

	.search-label label {
		font-size: 0.75rem;
		font-weight: 600;
	}

	.search-shortcut {
		color: var(--page-muted);
		font-size: 0.68rem;
		white-space: nowrap;
	}

	.search-shortcut kbd {
		border: 1px solid var(--page-border);
		border-radius: 2px;
		padding: 0.05rem 0.35rem;
		font-family: var(--font-mono);
	}

	.search-field {
		display: flex;
		min-height: 44px;
		border: 1px solid var(--control-border);
		border-radius: 3px;
		background: var(--page-surface);
	}

	.search-field:focus-within {
		outline: 2px solid var(--page-accent);
		outline-offset: 3px;
		border-color: var(--page-accent);
	}

	.ideas-search {
		width: 100%;
		min-width: 0;
		min-height: 44px;
		padding: 0.45rem 0.75rem;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--page-text);
		font: inherit;
	}

	.ideas-search::placeholder {
		color: var(--page-muted);
		opacity: 1;
	}

	.ideas-search::-webkit-search-cancel-button {
		display: none;
	}

	.search-clear {
		min-width: 3.75rem;
		min-height: 44px;
		margin: 0.2rem;
		border-radius: 2px;
		color: var(--page-link);
		font-size: 0.85rem;
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.ideas-filters {
		display: flex;
		flex-wrap: wrap;
		min-width: 0;
		gap: 0.15rem;
		margin: 0;
		padding: 0;
		border: 0;
	}

	.ideas-filter {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		padding: 0.45rem 0.65rem;
		border: 1px solid transparent;
		color: var(--page-muted);
		font-size: 0.8rem;
		line-height: 1.4;
		cursor: pointer;
	}

	.ideas-filter:hover,
	.search-clear:hover {
		color: var(--page-accent);
		background: var(--page-accent-soft);
	}

	.ideas-filter.active {
		border-bottom-color: var(--page-accent);
		box-shadow: inset 0 -1px var(--page-accent);
		color: var(--page-accent);
		font-weight: 600;
	}

	.ideas-filter:has(input:focus-visible),
	.ideas-row:focus-visible,
	.search-clear:focus-visible,
	.library-button:focus-visible,
	.views-toggle:focus-visible {
		outline: 2px solid var(--page-accent);
		outline-offset: 3px;
	}

	.ideas-results {
		margin-top: 1.1rem;
	}

	.results-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		padding-bottom: 0.3rem;
		border-bottom: 1px solid var(--page-border);
	}

	.results-heading > div {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.2rem 0.75rem;
	}

	.results-heading h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.23rem;
		font-weight: 600;
		line-height: 1.2;
	}

	.results-count {
		margin: 0;
		color: var(--page-muted);
		font-size: 0.72rem;
		line-height: 1.5;
	}

	.views-toggle {
		flex-shrink: 0;
		min-height: 44px;
		padding-inline: 0.45rem;
		color: var(--page-muted);
		font-size: 0.78rem;
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.views-toggle:hover {
		color: var(--page-text);
	}

	.ideas-year {
		margin: 0.9rem 0 0;
		padding-block: 0.25rem;
		border-bottom: 1px solid var(--page-border);
		color: var(--page-accent);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 400;
		letter-spacing: 0.06em;
	}

	.ideas-year:first-child {
		margin-top: 0.4rem;
	}

	.ideas-row {
		display: grid;
		grid-template-columns: 3.4rem minmax(0, 1fr) minmax(5rem, 8rem);
		align-items: baseline;
		gap: 0.75rem;
		min-height: 44px;
		padding: 0.42rem 0.25rem;
		border-bottom: 1px solid var(--page-border);
		color: var(--page-text);
		text-decoration: none;
	}

	.ideas-row:hover {
		background: var(--page-row-hover);
		color: var(--page-text);
	}

	.ideas-row:hover .ideas-title {
		color: var(--page-link);
		text-decoration: underline;
		text-decoration-thickness: 0.05em;
		text-underline-offset: 0.16em;
	}

	.ideas-row time {
		color: var(--page-muted);
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.date-year {
		display: block;
		font-size: 0.72rem;
	}

	.ideas-content {
		min-width: 0;
	}

	.ideas-title {
		display: block;
		font-family: var(--font-reading);
		font-size: 0.95rem;
		font-weight: 400;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}

	.ideas-meta {
		display: flex;
		align-items: end;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
		color: var(--page-muted);
		font-size: 0.7rem;
		line-height: 1.4;
		text-align: right;
	}

	.entry-category {
		text-transform: capitalize;
	}

	.view-count {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.ideas-snippet {
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		margin-top: 0.25rem;
		color: var(--page-muted);
		font-size: 0.82rem;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}

	.ideas-snippet mark {
		background: var(--page-accent-soft);
		color: var(--page-text);
		font-weight: 600;
	}

	.ideas-load-more {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem 1rem;
		margin-top: 1.3rem;
	}

	.scroll-boundary {
		position: absolute;
		top: 0;
		width: 1px;
		height: 1px;
	}

	.load-progress,
	.library-end {
		margin: 0;
		color: var(--page-muted);
		font-size: 0.82rem;
		line-height: 1.5;
	}

	.library-end {
		margin-top: 1.3rem;
	}

	.library-button {
		min-height: 44px;
		border: 1px solid var(--control-border);
		border-radius: 2px;
		padding: 0.55rem 0.9rem;
		color: var(--page-text);
		font-size: 0.9rem;
	}

	.library-button:hover:not(:disabled) {
		border-color: var(--page-accent);
		background: var(--page-accent-soft);
		color: var(--page-accent);
	}

	.library-button:disabled {
		cursor: progress;
	}

	.ideas-notice,
	.ideas-empty,
	.ideas-pending {
		padding-block: 1.8rem;
		color: var(--page-muted);
	}

	.ideas-notice p,
	.ideas-empty p {
		margin: 0 0 1rem;
	}

	.ideas-empty h3 {
		margin: 0 0 0.4rem;
		color: var(--page-text);
		font-family: var(--font-display);
		font-size: 1.5rem;
	}

	.ideas-pending {
		min-height: 10rem;
		font-style: italic;
	}

	@media (max-width: 960px) {
		.ideas-controls {
			grid-template-columns: minmax(0, 1fr);
			gap: 0.4rem;
		}
	}

	@media (max-width: 42rem) {
		.ideas-header {
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 0.2rem 0.75rem;
			padding-block: 0.9rem 0.6rem;
		}

		.ideas-header h1 {
			font-size: 1.9rem;
		}

		.ideas-deck {
			grid-column: 1 / -1;
			grid-row: 2;
			font-size: 0.85rem;
		}

		.ideas-count {
			grid-column: 2;
			grid-row: 1;
		}

		.ideas-controls {
			margin-block: 0.65rem 0.9rem;
		}

		.ideas-results {
			margin-top: 0.9rem;
		}

		.results-heading {
			padding-bottom: 0.55rem;
		}

		.ideas-year {
			margin-top: 0.6rem;
		}

		.search-shortcut {
			display: none;
		}

		.ideas-filters {
			flex-wrap: nowrap;
			overflow-x: auto;
			overscroll-behavior-inline: contain;
			scrollbar-width: thin;
			scrollbar-color: var(--page-gold) transparent;
		}

		.ideas-filter {
			flex-shrink: 0;
			padding-inline: 0.6rem;
		}

		.ideas-row {
			grid-template-columns: 3rem minmax(0, 1fr);
			gap: 0.1rem 0.6rem;
			padding-inline: 0;
		}

		.ideas-title {
			font-size: 1rem;
		}

		.ideas-meta {
			grid-column: 2;
			flex-direction: row;
			align-items: baseline;
			flex-wrap: wrap;
			gap: 0.35rem 0.75rem;
			text-align: left;
		}

		.ideas-snippet {
			line-clamp: 3;
			-webkit-line-clamp: 3;
		}
	}
</style>
