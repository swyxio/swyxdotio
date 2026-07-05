<script>
	/**
	 * @type {import('$lib/types').ContentItem[]}
	 */
	export let items;

	/** @param {import('$lib/types').ContentItem} item */
	function itemHref(item) {
		if (item.category === 'podcast' && item.url) return item.url;
		if (item.category === 'talk') return item.instances?.[0]?.video ?? `/${item.slug}`;
		return `/${item.slug}`;
	}

	/** @param {import('$lib/types').ContentItem} item */
	function itemIcon(item) {
		if (item.category === 'podcast') return '🎧';
		if (item.category === 'talk') return '📺';
		if (item.category === 'essay') return '📙';
		if (item.category === 'tutorial') return '📘';
		return '📓';
	}
</script>

<section class="plain-section site-card w-full">
	<h3 id="latest" class="mb-2 text-xl font-bold">Latest posts</h3>
	<ul class="latest-list">
		{#each items as item (item.url ?? item.slug)}
			<li>
				<time datetime={new Date(item.date).toISOString()}
					>{new Date(item.date).toISOString().slice(0, 10)}</time
				>
				<a href={itemHref(item)}><span aria-hidden="true">{itemIcon(item)}</span>{item.title}</a>
				<!-- <a class="font-bold" data-sveltekit-preload-data href={item.slug}>{item.title}</a> -->
			</li>
		{/each}
	</ul>
	<p class="mt-2"><a href="/ideas">Search and see all content</a>.</p>
</section>

<style>
	.latest-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.latest-list li {
		display: grid;
		grid-template-columns: 6.5rem minmax(0, 1fr);
		gap: 0.85rem;
		border-bottom: 1px solid var(--page-border);
		padding-block: 0.42rem;
	}

	.latest-list li:last-child {
		border-bottom: 0;
	}

	.latest-list time {
		color: var(--page-muted);
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
	}

	.latest-list a {
		display: inline-flex;
		gap: 0.4rem;
		color: var(--page-text);
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1.25;
		text-decoration: none;
	}

	.latest-list a:hover {
		color: var(--page-accent);
		text-decoration: underline;
	}

	@media (max-width: 640px) {
		.latest-list li {
			grid-template-columns: 1fr;
			gap: 0.1rem;
		}

		.latest-list time {
			order: 2;
		}
	}
</style>
