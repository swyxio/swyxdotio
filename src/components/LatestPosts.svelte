<script>
  /**
   * @type {import('$lib/types').ContentItem[]}
   */
	export let items;
</script>

<section class="mb-8 w-full">
	<h3
		id="latest"
		class="mb-6 text-2xl font-bold tracking-tight text-black dark:text-white md:text-4xl"
	>
		Latest Posts
	</h3>
	<ul class="space-y-2 text-white">
		{#each items as item (item.slug)}
			<li>
				{#if item.category === 'podcast'}
				🎧 <a href={item.url}>{item.title}</a>
				{:else if item.category === 'talk'}
				📺 <a href={item.instances[0].video}>{item.title}</a>
				{:else if item.category === 'essay'}
				📙 <a href={item.slug}>{item.title}</a>
				{:else if item.category === 'tutorial'}
				📘 <a href={item.slug}>{item.title}</a>
				{:else}
				📓 <a href={item.slug}>{item.title}</a>
				{/if}
				<!-- <a class="font-bold" data-sveltekit-preload-data href={item.slug}>{item.title}</a> -->
				<span class="hidden text-xs text-black dark:text-gray-400 sm:inline"
					>{new Date(item.date).toISOString().slice(0, 10)}</span
				>
			</li>
		{/each}
	</ul>
	<a
		class="mt-2 flex h-6 rounded-lg leading-7 text-gray-600 transition-all dark:text-gray-400 dark:hover:text-gray-200"
		href="/ideas"
		>Search and see all content<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			class="ml-1 h-6 w-6"
			><path
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M17.5 12h-15m11.667-4l3.333 4-3.333-4zm3.333 4l-3.333 4 3.333-4z"
			/></svg
		></a
	>
</section>
