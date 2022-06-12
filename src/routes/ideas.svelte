<script context="module">
	export const prerender = true; // turned off so it refreshes quickly
	export async function load({ params, fetch }) {
		const items = await fetch(`/api/listAll.json`);
		if (items.status > 400) {
			console.error('render error for ' + `/api/listAll.json`);
			return {
				status: items.status,
				error: await items.text()
			};
		} else {
			return {
				props: {
					items: await items.json()
				},
				maxage: 300 // 5 mins
			};
		}
	}
</script>

<script>
	import ItemCard from '../components/ItemCard.svelte';
	import queryString from 'query-string';
	import { onMount } from 'svelte';

	let urlState = { filter: '', show: [] };
	let defaultURLState = { filter: '', show: [] };

	const setURLState = (newState) => {
		const finalState = { ...urlState, ...newState }; // merge with existing urlstate
		urlState = finalState;
		Object.keys(finalState).forEach(function (k) {
			if (
				// don't save some state values if it meets the conditions below
				!finalState[k] || // falsy
				finalState[k] === '' || // string
				(Array.isArray(finalState[k]) && !finalState[k].length) || // array
				finalState[k] === defaultURLState[k] // same as default state, unnecessary
			) {
				delete finalState[k]; // drop query params with new values = falsy
			}
		});
		if (typeof window !== 'undefined')
			history.pushState(
				{},
				'',
				document.location.origin +
					document.location.pathname +
					'?' +
					queryString.stringify(finalState)
			);
	};

	let essays = false;
	let talks = false;
	let podcasts = false;
	let tutorials = false;
	let snippets = false;
	let notes = false;

	let filterStr = '';

	onMount(() => {
		if (location.search.length < 1) return; // early terminate if no search
		let givenstate = queryString.parse(location.search);
		if (!Array.isArray(givenstate.show)) givenstate.show = [givenstate.show];
		if (!givenstate.show.includes('Essays')) essays = false;
		if (!givenstate.show.includes('Talks')) talks = false;
		if (!givenstate.show.includes('Podcasts')) podcasts = false;
		if (!givenstate.show.includes('Tutorials')) tutorials = false;
		if (!givenstate.show.includes('Snippets')) snippets = false;
		if (!givenstate.show.includes('Notes')) notes = false;
		if (givenstate.filter) filterStr = givenstate.filter;
		urlState = { ...defaultURLState, ...givenstate };
	});
	function saveURLState() {
		showAll = true
		setTimeout(() => {
			setURLState({
				filter: filterStr,
				show: [
					essays && 'Essays',
					talks && 'Talks',
					podcasts && 'Podcasts',
					snippets && 'Snippets',
					tutorials && 'Tutorials',
					notes && 'Notes'
				].filter(Boolean)
			});
		}, 100);
	}
	// $: console.log({urlState, essays, talks, podcasts})

	$: showAll = filterStr.length > 2;
	// $: filteredData = data
	//   .map((x) => {
	//     if (x.date) x.effectiveDate = new Date(x.date)
	//     if (x.instances) x.effectiveDate = new Date(x.instances[0].date)
	//     return x
	//   })
	//   .sort((a, z) => z.effectiveDate - a.effectiveDate)
	//   .filter((_, i) => (showAll ? true : i < 30))
	//   .filter((x) => {
	//     if (filterStr && notIncludes(filterStr, x)) {
	//       return false
	//     } else {
	//       if (essays && x.type === 'Essays') return true
	//       if (talks && x.type === 'Talks') return true
	//       if (podcasts && x.type === 'Podcasts') return true
	//       if (tutorials && x.type === 'Tutorials') return true
	//       if (notes && x.type === 'Notes') return true
	//     }
	//   })

	function notIncludes(_filterStr, item) {
		let res = true;
		_filterStr = _filterStr.toLowerCase().replace('/', '');
		function incluye(thing) {
			// make sure to coerce to string bc sometimes yaml parses as string
			if (thing && String(thing).toLowerCase().includes(_filterStr)) res = false;
		}
		incluye(item.title);
		incluye(item.slug);
		incluye(item.categories);
		incluye(item.description);
		return res;
	}

	let inputEl;
	function focusSearch(e) {
		if (e.key === '/' && inputEl) inputEl.select();
	}

	export let items;

	// // export let page;
	// // const PAGE_SIZE = 30;
	// // $: start = 1 + (page - 1) * PAGE_SIZE;
	// // $: next = `/${list}/${+page + 1}`;
	// let isTruncated = items.length > 20;
	// let search;
	// $: {
	// 	if (search) isTruncated = false;
	// }
	$: list = items
		// .filter((item) => {
		// 	if (search) {
		// 		return item.title.toLowerCase().includes(search.toLowerCase());
		// 	}
		// 	return true;
		// })
		.slice(0, showAll ? items.length : 20)
		.filter((x) => {
			if (filterStr && notIncludes(filterStr, x)) {
				return false;
			} else {
				if ([essays, talks, podcasts, tutorials, snippets, notes].every(v => v === false)) return true;
				if (essays && x.type === 'essay') return true;
				if (talks && x.type === 'talk') return true;
				if (podcasts && x.type === 'podcast') return true;
				if (tutorials && x.type === 'tutorial') return true;
				if (snippets && x.type === 'snippet') return true;
				if (notes && x.type === 'note') return true;
			}
		});
</script>

<svelte:head>
	<title>Swyx Idea Showcase</title>
	<meta name="description" content="Latest Hacker News stories in the {list} category" />
</svelte:head>

<svelte:window on:keyup={focusSearch} />

<section class="mx-auto mb-16 flex max-w-4xl w-full flex-col items-start justify-center px-4 sm:px-8">
	<h1 class="mb-4 text-3xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
		Idea Showcase
	</h1>
	<p class="mt-3 text-xl italic leading-7 text-black dark:text-white sm:mt-4">
		For Free: Great Ideas. Lightly Used.
	</p>
	<p class="mb-4 text-gray-600 dark:text-gray-400">
		In total, I've written <span class="bg-orange-400 bg-opacity-70 px-2 font-mono text-white"
			>{items.length}</span
		> essays, snippets, tutorials, and notes!
	</p>
	<div class="relative w-full">
		<input
			aria-label="Search articles"
			type="text"
			bind:this={inputEl}
			on:input={saveURLState}
			bind:value={filterStr}
			placeholder="Hit / to search"
			class="block w-full rounded-md border border-gray-200 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-900 dark:bg-gray-800 dark:text-gray-100"
		/><svg
			class="absolute right-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-300"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			><path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/></svg
		>
	</div>
	<div class="mb-12 mt-2 flex items-center ">
		<span class="mr-2 text-gray-900 dark:text-gray-400"> Filter: </span>
		<span class="relative z-0 grid grid-cols-3 rounded-md shadow-sm sm:grid-cols-6">
			<!-- <div class="inline-flex items-center text-gray-600 dark:text-gray-400 mr-2 italic px-4">Show:</div> -->
			<button
				type="button"
				on:click={() => {
					saveURLState();
					essays = !essays;
				}}
				class:bimodalpurple={essays}
				class:mytext={essays}
				class:font-medium={essays}
				class="focus:ring-yellow relative -ml-px inline-flex items-center border border-gray-300
      px-4 py-2 text-sm leading-5 text-gray-700
     transition duration-150 ease-in-out
      focus:z-10 focus:border-blue-300 focus:text-yellow-400 focus:outline-none
       dark:text-gray-200 sm:ml-0
      sm:rounded-l-md"
			>
				Essays
			</button>
			<button
				type="button"
				on:click={() => {
					saveURLState();
					talks = !talks;
				}}
				class:bimodalpurple={talks}
				class:mytext={talks}
				class:font-medium={talks}
				class="focus:ring-yellow relative -ml-px inline-flex items-center border border-gray-300
      px-4 py-2 text-sm leading-5 text-gray-700
     transition duration-150
      ease-in-out focus:z-10 focus:border-blue-300 
     focus:text-yellow-400 focus:outline-none dark:text-gray-200"
			>
				Talks
			</button>
			<button
				type="button"
				on:click={() => {
					saveURLState();
					podcasts = !podcasts;
				}}
				class:bimodalpurple={podcasts}
				class:mytext={podcasts}
				class:font-medium={podcasts}
				class="focus:ring-yellow relative -ml-px inline-flex items-center border border-gray-300
      px-4 py-2 text-sm leading-5 text-gray-700
     transition duration-150
      ease-in-out focus:z-10 focus:border-blue-300 
     focus:text-yellow-400 focus:outline-none dark:text-gray-200"
			>
				Podcasts
			</button>
			<button
				type="button"
				on:click={() => {
					saveURLState();
					snippets = !snippets;
				}}
				class:bimodalpurple={snippets}
				class:mytext={snippets}
				class:font-medium={snippets}
				class="focus:ring-yellow relative -ml-px inline-flex items-center border border-gray-300
        px-4 py-2 text-sm leading-5 text-gray-700
       transition duration-150
        ease-in-out focus:z-10 focus:border-blue-300 
       focus:text-yellow-400 focus:outline-none dark:text-gray-200"
			>
				Snippets
			</button>
			<button
				type="button"
				on:click={() => {
					saveURLState();
					tutorials = !tutorials;
				}}
				class:bimodalpurple={tutorials}
				class:mytext={tutorials}
				class:font-medium={tutorials}
				class="focus:ring-yellow relative -ml-px inline-flex items-center border border-gray-300
        px-4 py-2 text-sm leading-5 text-gray-700
       transition duration-150
        ease-in-out focus:z-10 focus:border-blue-300 
       focus:text-yellow-400 focus:outline-none dark:text-gray-200"
			>
				Tutorials
			</button>
			<button
				type="button"
				on:click={() => {
					saveURLState();
					notes = !notes;
				}}
				class:bimodalpurple={notes}
				class:mytext={notes}
				class:font-medium={notes}
				class="
      focus:ring-yellow relative -ml-px inline-flex items-center border border border-gray-300 px-4
      py-2 text-sm leading-5 text-gray-700 transition
     duration-150 ease-in-out
      focus:z-10 focus:border-blue-300 focus:text-yellow-400 
     focus:outline-none dark:text-gray-200 sm:rounded-r-md"
			>
				Notes
			</button>
		</span>
	</div>
	<!-- {#if !search}
		<h3 class="mt-8 mb-4 text-2xl font-bold tracking-tight text-black md:text-4xl dark:text-white">
			Most Popular
		</h3>
		<IndexCard href="/foo" title="Hardcoded Blogpost # 1" date="106,255 views">
			Just a hardcorded blogpost or you can use the metadata up to you
		</IndexCard>
		<IndexCard href="/welcome" title="Welcome to Swyxkit" date="106,255 views">
			Just a hardcorded blogpost or you can use the metadata up to you
		</IndexCard>
		<IndexCard href="/moo" title="Hardcoded Blogpost # 3" date="106,255 views">
			Just a hardcorded blogpost or you can use the metadata up to you
		</IndexCard>

		<h3 class="mt-8 mb-4 text-2xl font-bold tracking-tight text-black md:text-4xl dark:text-white">
			All Posts
		</h3>
	{/if} -->
	{#if list.length}
		<ul class="max-w-full">
			{#each list as item (item.slug)}
				<li class="mb-4">
					<ItemCard {item} />
				</li>
			{/each}
		</ul>
		{#if !showAll}
			<div class="flex justify-center">
				<button
					on:click={() => (showAll = true)}
					class="inline-block rounded bg-blue-100 p-4 text-lg font-bold tracking-tight text-black hover:text-yellow-900 dark:bg-blue-900 dark:text-white hover:dark:text-yellow-200 md:text-2xl"
				>
					Load More Posts...
				</button>
			</div>
		{/if}
	{:else if filterStr}
		<div class="prose dark:prose-invert">
			No posts found for
			<code>{filterStr}</code>.
		</div>
		<button class="p-2 bg-slate-500" on:click={() => (filterStr = '')}>Clear your search</button>
	{:else}
		<div class="prose dark:prose-invert">Search something else!</div>
	{/if}
</section>
