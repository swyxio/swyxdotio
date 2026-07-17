<script>
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	// import { goto } from '$app/navigation';
	// import { page } from '$app/stores';
	import { queryParam, ssp } from 'sveltekit-search-params';

	import { POST_CATEGORIES } from '$lib/siteConfig';
	import {
		READ_COUNT_BATCH_LIMIT,
		READ_COUNT_VISIBILITY_EVENT,
		READ_COUNT_VISIBILITY_KEY,
		readCountsAreHidden
	} from '$lib/read-counter';
	import SocialMeta from '../../components/SocialMeta.svelte';
	import { getPageSocialMeta } from '$lib/social-meta';

	import MostPopular from './MostPopular.svelte';

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
	 *   description?: string;
	 *   content?: string;
	 *   instances?: { date?: Date | string; venue?: string; video?: string }[];
	 * }} ArchiveItem
	 */

	/** @type {import('./$types').PageData} */
	export let data;

	// List metadata stays small; full article bodies are fetched only when search is used.
	/** @type {ArchiveItem[]} */
	let items = /** @type {ArchiveItem[]} */ (data.items);
	/** @type {ArchiveItem[]} */
	let archiveItems = /** @type {ArchiveItem[]} */ (data.items);
	/** @type {ArchiveItem[]} */
	let searchableItems = /** @type {ArchiveItem[]} */ (data.items);

	// https://github.com/paoloricciuti/sveltekit-search-params#how-to-use-it
	/** @type {import('svelte/store').Writable<string[] | null>} */
	let selectedCategories = queryParam(
		'show',
		{
			encode: (arr) => arr?.toString(),
			decode: (str) => str?.split(',')?.filter((e) => e) ?? []
		},
		{ debounceHistory: 500 }
	);
	let search = queryParam('filter', ssp.string(), {
		debounceHistory: 500
	});

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

	/** @param {KeyboardEvent} e */
	function focusSearch(e) {
		if (e.key === '/' && inputEl) inputEl.select();
	}

	// https://github.com/leeoniya/uFuzzy#options
	// we know this has js weight, but we tried lazyloading and it wasnt significant enough for the added complexity
	// https://github.com/swyxio/swyxkit/pull/171
	// this will be slow if you have thousands of items, but most people don't
	let isTruncated = (data.totalCount ?? data.items.length) > data.items.length;

	// we are lazy loading a fuzzy search function
	// with a fallback to a simple filter function
	/**
	 * @param {ArchiveItem[]} _items
	 * @param {string[] | null} _
	 * @param {string | null} s
	 * @returns {Promise<ArchiveItem[]>}
	 */
	const filterCategories = async (_items, _, s) => {
		const categories = $selectedCategories;
		if (categories?.length) {
			_items = _items.filter((item) => {
				return categories
					.map((element) => {
						return element.toLowerCase();
					})
					.includes(item.category.toLowerCase());
			});
		}
		if (s?.length) {
			_items = _items.filter((item) =>
				JSON.stringify(item).toLowerCase().includes(s.toLowerCase())
			);
		}
		return _items;
	};
	/** @type {(items: ArchiveItem[], categories: string[] | null, search: string | null) => Promise<ArchiveItem[]>} */
	$: searchFn = filterCategories;
	/** @type {Promise<void> | undefined} */
	let archiveLoad;
	function loadArchiveItems() {
		if (archiveLoad) return archiveLoad;
		archiveLoad = fetch('/api/listArchive.json')
			.then(async (res) => {
				if (!res.ok) throw new Error(`failed to load archive content (${res.status})`);
				archiveItems = /** @type {ArchiveItem[]} */ (await res.json());
			})
			.catch((err) => console.error('failed to load archive content', err));
		return archiveLoad;
	}

	/** @type {Promise<void> | undefined} */
	let searchLoad;
	function loadsearchFn() {
		if (searchLoad) return searchLoad;
		searchLoad = Promise.all([import('./fuzzySearch'), fetch('/api/searchContent.json')])
			.then(async ([fuzzy, res]) => {
				searchFn =
					/** @type {(items: ArchiveItem[], categories: string[] | null, search: string | null) => Promise<ArchiveItem[]>} */ (
						fuzzy.fuzzySearch
					);
				if (!res.ok) throw new Error(`failed to load search content (${res.status})`);
				searchableItems = /** @type {ArchiveItem[]} */ (await res.json());
			})
			.catch((err) => console.error('failed to load full-body search content', err));
		return searchLoad;
	}
	$: if (browser && $search) loadsearchFn();
	$: if (browser && !$search && $selectedCategories?.length) loadArchiveItems();
	$: filteredItems = $search ? searchableItems : archiveItems;
	/** @type {ArchiveItem[]} */
	let list = /** @type {ArchiveItem[]} */ (data.items).slice(
		0,
		isTruncated ? 80 : data.items.length
	);
	$: searchFn(filteredItems, $selectedCategories, $search).then((_items) => {
		list = _items.slice(0, isTruncated ? 80 : _items.length);
	});
	// $: console.log({list})

	async function showAllItems() {
		await loadArchiveItems();
		isTruncated = false;
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

	/** @param {ArchiveItem} item */
	function categoryLabel(item) {
		if (item.venues) return item.venues;
		if (item.category) return item.category;
		return item.type ?? 'note';
	}

	/** @param {ArchiveItem} item */
	function categoryIcon(item) {
		if (item.category === 'podcast') return '🎧';
		if (item.category === 'talk') return '📺';
		if (item.category === 'tutorial') return '🛠️';
		if (item.category === 'snippet') return '✂️';
		return '📰';
	}

	/** @param {ArchiveItem} item */
	function reactionCount(item) {
		return (
			(item.ghReactions ?? item.ghMetadata?.reactions?.total_count ?? 0) +
			(item.devToReactions ?? 0)
		);
	}

	/** @param {ArchiveItem[]} visibleItems */
	async function loadReadCounts(visibleItems) {
		if (countsHidden) return;
		const keys = [
			...new Set(
				visibleItems
					.filter((item) => !isExternalItem(item))
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

<svelte:window on:keyup={focusSearch} />

<section class="ideas-shell">
	<header class="ideas-header">
		<div>
			<h1>Ideas</h1>
			<p><em>For free: great ideas, lightly used.</em></p>
		</div>
		<p class="ideas-count">
			<strong>{data.totalCount ?? items.length}</strong> essays, snippets, tutorials, podcasts, talks,
			and notes.
		</p>
	</header>

	<div class="ideas-toolbar" aria-label="Ideas controls">
		<a class:active={!$selectedCategories?.length} href="/ideas">All</a>
		{#each POST_CATEGORIES as availableCategory}
			<label class="ideas-filter" class:active={$selectedCategories?.includes(availableCategory)}>
				<input
					id="category-{availableCategory}"
					class="filter-checkbox"
					type="checkbox"
					bind:group={$selectedCategories}
					value={availableCategory}
				/>
				{availableCategory}
			</label>
		{/each}
		<input
			aria-label="Search articles"
			type="text"
			bind:value={$search}
			bind:this={inputEl}
			placeholder="Hit / to search"
			class="ideas-search"
		/>
		<button class="views-toggle" type="button" on:click={toggleReadCountVisibility}>
			{countsHidden ? 'Show views' : 'Hide views'}
		</button>
	</div>

	{#if !$search && !$selectedCategories?.length}
		<div class="ideas-featured">
			<MostPopular />
		</div>
	{/if}

	{#if list?.length}
		<div class="ideas-table" aria-label="Ideas archive">
			{#each list as item, index (item.url ?? item.slug)}
				{#if index === 0 || yearOf(item) !== yearOf(list[index - 1])}
					<div class="ideas-year">{yearOf(item)}</div>
				{/if}
				<a
					class="ideas-row"
					href={itemHref(item)}
					target={isExternalItem(item) ? '_blank' : undefined}
				>
					<time datetime={itemDate(item)}>{shortDate(item)}</time>
					<span class="ideas-title">
						<span class="type-emoji" aria-hidden="true">{categoryIcon(item)}</span>
						<span>{item.title}</span>
					</span>
					<span class="ideas-meta">
						{#if item.highlightedResults}
							<span class="ideas-snippet">{@html item.highlightedResults}</span>
						{/if}
						<span class="type-chip" data-category={item.category}>{categoryLabel(item)}</span>
						{#if item.tags?.length}
							{#each item.tags.slice(0, 3) as tag}
								<span class="tag-chip">{tag}</span>
							{/each}
						{/if}
						{#if reactionCount(item)}
							<span class="reaction-chip">{reactionCount(item)} ♥</span>
						{/if}
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
		{#if isTruncated}
			<div class="ideas-load-more">
				<button on:click={showAllItems} class="plain-button"> Load more posts </button>
			</div>
		{/if}
	{:else if $search}
		<div class="prose dark:prose-invert">
			No posts found for
			<code>{$search}</code>.
		</div>
		<button class="plain-button mt-2" on:click={() => ($search = '')}>Clear your search</button>
	{:else}
		<div class="prose dark:prose-invert">No content found! Try widening your search again</div>
	{/if}
</section>

<style>
	.ideas-shell {
		width: min(100% - 1rem, 100rem);
		margin: 0.5rem auto 3rem;
		border: 1px solid var(--page-border);
		border-radius: 0.45rem;
		background: var(--page-surface, var(--page-bg));
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.03);
		overflow: hidden;
	}

	.ideas-header,
	.ideas-toolbar,
	.ideas-year,
	.ideas-row {
		padding-inline: clamp(0.9rem, 2vw, 2rem);
	}

	.ideas-header {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		padding-block: 1rem 0.85rem;
		border-bottom: 1px solid var(--page-border);
	}

	.ideas-header h1 {
		margin: 0;
		font-size: clamp(1.8rem, 3vw, 2.7rem);
		line-height: 1;
	}

	.ideas-header p {
		margin: 0.35rem 0 0;
		color: var(--page-muted);
		font-size: 0.9rem;
		line-height: 1.35;
	}

	.ideas-count {
		max-width: 28rem;
		text-align: right;
	}

	.ideas-count strong {
		color: var(--page-accent);
	}

	.ideas-toolbar {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		border-bottom: 1px solid var(--page-border);
		background: color-mix(in srgb, var(--page-surface, var(--page-bg)) 92%, transparent);
		backdrop-filter: blur(8px);
		padding-block: 0.45rem;
		overflow-x: auto;
	}

	.ideas-toolbar a,
	.ideas-filter {
		flex: 0 0 auto;
		border: 1px solid var(--page-border);
		border-radius: 0.38rem;
		padding: 0.08rem 0.45rem;
		color: var(--page-muted);
		font-size: 0.78rem;
		line-height: 1.45;
		text-decoration: none;
		cursor: pointer;
	}

	.ideas-toolbar a:hover,
	.ideas-filter:hover,
	.ideas-toolbar a.active,
	.ideas-filter.active,
	.ideas-filter:has(input:focus-visible) {
		border-color: color-mix(in srgb, var(--page-accent) 55%, var(--page-border));
		background: var(--page-accent-soft);
		color: var(--page-accent);
	}

	.ideas-filter:has(input:focus-visible) {
		outline: 2px solid var(--page-accent);
		outline-offset: 1px;
	}

	.ideas-search {
		min-width: 10rem;
		max-width: 18rem;
		margin-left: auto;
		border: 1px solid var(--page-border);
		border-radius: 0.38rem;
		background: transparent;
		padding: 0.12rem 0.5rem;
		color: var(--page-text);
		font: inherit;
		font-size: 0.78rem;
		line-height: 1.45;
	}

	.ideas-search:focus {
		border-color: var(--page-accent);
		outline: 2px solid var(--page-accent);
		outline-offset: 1px;
	}

	.views-toggle {
		flex: 0 0 auto;
		border: 0;
		padding: 0.12rem 0;
		background: transparent;
		color: var(--page-muted);
		font: inherit;
		font-size: 0.72rem;
		line-height: 1.45;
		text-decoration: underline;
		text-underline-offset: 0.16em;
		cursor: pointer;
	}

	.views-toggle:hover,
	.views-toggle:focus-visible {
		color: var(--page-text);
	}

	.ideas-featured {
		padding: 1rem clamp(0.9rem, 2vw, 2rem);
		border-bottom: 1px solid var(--page-border);
		font-size: 0.92rem;
	}

	.ideas-featured :global(.plain-section) {
		margin-block: 0;
	}

	.ideas-featured :global(.plain-rule) {
		margin-bottom: 1rem;
	}

	.ideas-featured :global(h2) {
		font-size: 1.1rem;
	}

	.ideas-featured :global(.feature-description) {
		display: block;
	}

	.ideas-featured :global(.feature-list) {
		margin-block: 0.5rem;
	}

	.ideas-table {
		font-size: 0.92rem;
	}

	.ideas-year {
		position: sticky;
		top: 2.35rem;
		z-index: 1;
		border-bottom: 1px solid var(--page-border);
		background: var(--page-section-bg, rgba(127, 127, 127, 0.08));
		padding-block: 0.35rem;
		color: var(--page-text);
		font-size: 0.82rem;
		font-weight: 700;
		line-height: 1.25;
	}

	.ideas-row {
		display: grid;
		grid-template-columns: 5.5rem minmax(12rem, 1fr) minmax(12rem, 34rem);
		gap: 1rem;
		align-items: center;
		min-height: 2.55rem;
		border-bottom: 1px solid var(--page-border);
		color: var(--page-text);
		text-decoration: none;
	}

	.ideas-row:hover {
		background: var(--page-row-hover, rgba(127, 127, 127, 0.06));
		color: var(--page-text);
	}

	.ideas-row time {
		color: var(--page-muted);
		font-size: 0.82rem;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.ideas-title {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-width: 0;
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1.25;
	}

	.ideas-title span:last-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.type-emoji {
		width: 1.25rem;
		text-align: center;
		font-size: 0.9rem;
	}

	.ideas-meta {
		display: flex;
		justify-content: flex-end;
		gap: 0.35rem;
		min-width: 0;
		color: var(--page-muted);
		font-size: 0.76rem;
		line-height: 1.25;
	}

	.type-chip,
	.tag-chip,
	.reaction-chip {
		flex: 0 0 auto;
		max-width: 10rem;
		overflow: hidden;
		border: 1px solid var(--page-border);
		border-radius: 0.35rem;
		padding: 0.08rem 0.38rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.view-count {
		flex: 0 0 auto;
		min-width: 5.2rem;
		color: var(--page-muted);
		font-variant-numeric: tabular-nums;
		text-align: right;
		white-space: nowrap;
	}

	.type-chip {
		border-color: color-mix(in srgb, var(--page-accent) 45%, var(--page-border));
		background: var(--page-accent-soft);
		color: var(--page-accent);
		font-weight: 700;
		text-transform: uppercase;
	}

	.ideas-snippet {
		flex: 1 1 auto;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ideas-snippet :global(b) {
		color: var(--page-accent) !important;
		background: transparent !important;
	}

	.ideas-load-more {
		padding: 1rem clamp(0.9rem, 2vw, 2rem);
	}

	@media (max-width: 760px) {
		.ideas-shell {
			width: min(100% - 0.75rem, 100rem);
			margin-top: 0.35rem;
		}

		.ideas-header {
			display: block;
		}

		.ideas-count {
			max-width: none;
			text-align: left;
		}

		.ideas-toolbar {
			top: 0;
			flex-wrap: wrap;
			align-items: stretch;
			overflow-x: visible;
		}

		.ideas-search {
			order: -1;
			flex: 1 0 100%;
			width: 100%;
			min-width: 8rem;
			max-width: none;
			margin-left: 0;
		}

		.ideas-row {
			grid-template-columns: 4.25rem minmax(0, 1fr);
			gap: 0.6rem;
			align-items: start;
			padding-block: 0.55rem;
		}

		.ideas-row time {
			padding-top: 0.08rem;
		}

		.ideas-title {
			font-size: 0.95rem;
		}

		.ideas-title span:last-child {
			white-space: normal;
		}

		.ideas-meta {
			grid-column: 2;
			justify-content: flex-start;
			flex-wrap: wrap;
			gap: 0.3rem;
		}
	}
</style>
