<script>
	import { browser } from '$app/environment';
	// import { goto } from '$app/navigation';
	// import { page } from '$app/stores';
	import { queryParam, ssp } from 'sveltekit-search-params';

	import { SITE_TITLE, POST_CATEGORIES } from '$lib/siteConfig';

	import IndexCard from '../../components/IndexCard.svelte';
	import MostPopular from './MostPopular.svelte';

	/**
	 * @typedef {import('$lib/types').ContentItem & {
	 *   highlightedResults?: string;
	 *   url?: string;
	 * }} SearchContentItem
	 */

	/** @type {import('$lib/types').GHMetadata} */
	const EMPTY_GH_METADATA = {
		issueUrl: '',
		commentsUrl: '',
		title: '',
		created_at: new Date(0),
		updated_at: new Date(0),
		reactions: {
			total_count: 0,
			'+1': 0,
			'-1': 0,
			laugh: 0,
			hooray: 0,
			confused: 0,
			heart: 0,
			rocket: 0,
			eyes: 0
		}
	};

	/** @type {import('./$types').PageData} */
	export let data;

	// List metadata stays small; full article bodies are fetched only when search is used.
	/** @type {SearchContentItem[]} */
	$: items = data.items;
	/** @type {SearchContentItem[]} */
	let searchableItems = data.items;

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

	/** @param {KeyboardEvent} e */
	function focusSearch(e) {
		if (e.key === '/' && inputEl) inputEl.select();
	}

	// https://github.com/leeoniya/uFuzzy#options
	// we know this has js weight, but we tried lazyloading and it wasnt significant enough for the added complexity
	// https://github.com/swyxio/swyxkit/pull/171
	// this will be slow if you have thousands of items, but most people don't
	let isTruncated = data.items.length > 20;

	// we are lazy loading a fuzzy search function
	// with a fallback to a simple filter function
	/**
	 * @param {SearchContentItem[]} _items
	 * @param {string[] | null} _
	 * @param {string | null} s
	 * @returns {Promise<SearchContentItem[]>}
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
	/** @type {(items: SearchContentItem[], categories: string[] | null, search: string | null) => Promise<SearchContentItem[]>} */
	$: searchFn = filterCategories;
	/** @type {Promise<void> | undefined} */
	let searchLoad;
	function loadsearchFn() {
		if (searchLoad) return searchLoad;
		searchLoad = Promise.all([import('./fuzzySearch'), fetch('/api/searchContent.json')])
			.then(async ([fuzzy, res]) => {
				searchFn = fuzzy.fuzzySearch;
				if (!res.ok) throw new Error(`failed to load search content (${res.status})`);
				searchableItems = /** @type {SearchContentItem[]} */ (await res.json());
			})
			.catch((err) => console.error('failed to load full-body search content', err));
		return searchLoad;
	}
	$: if (browser && $search) loadsearchFn();
	$: filteredItems = $search ? searchableItems : items;
	/** @type {SearchContentItem[]} */
	let list = data.items.slice(0, isTruncated ? 20 : data.items.length);
	$: searchFn(filteredItems, $selectedCategories, $search).then((_items) => {
		list = _items.slice(0, isTruncated ? 20 : items.length);
	});
	// $: console.log({list})
</script>

<svelte:head>
	<title>Swyx Idea Showcase</title>
	<meta name="description" content={`Latest ${SITE_TITLE} posts`} />
</svelte:head>

<svelte:window on:keyup={focusSearch} />

<section class="site-shell mb-16">
	<h1 class="mb-2 text-3xl font-bold">Ideas</h1>
	<p class="mb-1 italic">For free: great ideas, lightly used.</p>
	<p class="plain-muted mb-4">
		<strong class="accent-text">{items.length}</strong> essays, snippets, tutorials, podcasts, talks,
		and notes.
	</p>
	<div class="relative mb-4 w-full">
		<input
			aria-label="Search articles"
			type="text"
			bind:value={$search}
			bind:this={inputEl}
			placeholder="Hit / to search"
			class="plain-input block w-full"
		/>
	</div>

	<!-- if you have multiple categories enabled -->
	{#if POST_CATEGORIES.length > 1}
		<div class="mb-8">
			<p class="mb-1">Filter:</p>
			<div class="flex flex-wrap gap-2">
				{#each POST_CATEGORIES as availableCategory}
					<label class="filter-option flex cursor-pointer items-center gap-1">
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
			</div>
		</div>
	{/if}

	<!-- you can hardcode yourmost popular posts or pinned post here if you wish -->
	{#if !$search && !$selectedCategories?.length}
		<MostPopular />
		<h2 class="section-heading mb-4 mt-8 text-2xl font-bold">All posts</h2>
	{/if}

	{#if list?.length}
		<ul class="archive-list max-w-full">
			{#each list as item (item.url ?? item.slug)}
				<li>
					<!-- <code class="mr-4">{item.data.date}</code> -->
					<IndexCard
						href={item.category === 'podcast' && item.url ? item.url : item.slug}
						title={item.title}
						stringData={new Date(item.date).toISOString().slice(0, 10)}
						ghMetadata={item.ghMetadata ?? EMPTY_GH_METADATA}
						{item}
					>
						{#if item.highlightedResults}
							<span class="italic">
								{@html item.highlightedResults}
							</span>
						{:else}
							{item.description}
						{/if}
					</IndexCard>
				</li>
			{/each}
		</ul>
		{#if isTruncated}
			<div>
				<button on:click={() => (isTruncated = false)} class="plain-button">
					Load more posts
				</button>
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
