<script>
	/**
	 * @type {import('$lib/types').ContentItem[]}
	 */
	export let items;
</script>

<section class="plain-section w-full">
	<hr class="plain-rule mb-4" />
	<h3 id="latest" class="mb-2 text-xl font-bold">Latest posts</h3>
	<ul>
		{#each items as item (item.url ?? item.slug)}
			<li>
				{#if item.category === 'podcast'}
					🎧 <a href={item.url}>{item.title}</a>
				{:else if item.category === 'talk'}
					📺 <a href={item.instances?.[0]?.video ?? item.slug}>{item.title}</a>
				{:else if item.category === 'essay'}
					📙 <a href={item.slug}>{item.title}</a>
				{:else if item.category === 'tutorial'}
					📘 <a href={item.slug}>{item.title}</a>
				{:else}
					📓 <a href={item.slug}>{item.title}</a>
				{/if}
				<!-- <a class="font-bold" data-sveltekit-preload-data href={item.slug}>{item.title}</a> -->
				<span class="plain-muted hidden text-sm sm:inline"
					>{new Date(item.date).toISOString().slice(0, 10)}</span
				>
			</li>
		{/each}
	</ul>
	<p class="mt-2"><a href="/ideas">Search and see all content</a>.</p>
</section>
