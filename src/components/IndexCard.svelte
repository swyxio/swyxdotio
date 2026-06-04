<script>
	// href={item.slug} title={item.data.title} date={item.data.date}
	export let href = '#';
	/** @type {import('$lib/types').ContentItem} */
	export let item;
	/** @type {import('$lib/types').GHMetadata} */
	export let ghMetadata;
	export let title = 'Untitled post';
	/** @type {string} */
	export let stringData = 'no date';
	let videoID = item?.instances?.[0]?.video;
	if (videoID) {
		try {
			if (videoID.includes('youtube')) {
				videoID = videoID.split('v=')[1].split('&')[0].split('?')[0];
				// new URL(item.instances[0].video).searchParams.get('v')
			} else {
				videoID = videoID.split('/')[videoID.split('/').length - 1].split('?')[0];
			}
		} catch (err) {
			console.log({ videoID });
		}
	}
</script>

{#if ['essay', 'note', 'notes', 'snippet', 'tutorial', 'podcast'].includes(item?.category)}
	<div class="archive-card w-full">
		<div class="flex flex-col justify-between md:flex-row">
			<h3 class="archive-card-title mb-1 w-full text-lg font-bold">
				<a {href}>{title}</a>
			</h3>
		</div>
		<p class="archive-card-description plain-muted mb-2 break-all sm:break-words">
			<slot />
		</p>
		<div class="archive-card-meta plain-muted flex flex-wrap gap-x-3 gap-y-1 text-sm">
			<!-- {JSON.stringify(item.readingTime)} -->
			<p>{stringData}</p>
			{#if item?.readingTime}
				<p class="hidden sm:inline-block">{item?.readingTime}</p>
			{/if}
			<!-- comment this in if you have multiple categories -->
			<span class="type-hint" data-category={item?.category}>
				{#if item?.venues}
					🎧 {item?.venues}
				{:else}
					{item?.category}
				{/if}
			</span>
			{#if item?.tags?.length}
				<div class="hidden md:block flex-1">
					{#each item.tags as tag}
						<span class="px-1">
							#{tag}
						</span>
					{/each}
				</div>
			{/if}
			{#if item?.devToReactions ?? (ghMetadata && ghMetadata.reactions.total_count)}
				<p class="accent-text">
					{ghMetadata.reactions.total_count + (item?.devToReactions ?? 0)} ♥
				</p>
			{/if}
		</div>
	</div>
{:else if item?.category === 'talk'}
	<div class="archive-card talk-card w-full">
		<div class="talk-card-layout">
			{#if item.instances?.[0]?.video && videoID}
				<a href={item.instances[0].video} target="_blank" class="talk-thumbnail">
					<img alt="" src={`http://i3.ytimg.com/vi/${videoID}/hqdefault.jpg`} />
				</a>
			{/if}
			<div class="min-w-0">
				<h3 class="archive-card-title mb-1 w-full text-lg font-bold">
					<a href={item.instances?.[0]?.video ?? href} target="_blank">{item.title}</a>
				</h3>
				<p class="archive-card-description plain-muted mb-2">
					{item.desc || item.description}
				</p>
				<div class="archive-card-meta plain-muted flex flex-wrap gap-x-3 gap-y-1 text-sm">
					<p>{stringData}</p>
					<span class="type-hint" data-category="talk">📺 Talk</span>
					{#if item.instances && item.instances.length > 1}
						<p>{item.instances.length} recordings</p>
					{:else if item.instances?.[0]?.venue}
						<p>{item.instances[0].venue}</p>
					{/if}
				</div>
				{#if item.instances && item.instances.length > 1}
					<ul class="talk-recordings">
						{#each item.instances as instance}
							<li>
								<a href={instance.video} target="_blank">
									{instance.venue} · {instance.date
										? new Date(instance.date).toISOString().slice(0, 10)
										: ''}
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<pre class="prose dark:prose-invert overflow-scroll w-full">{JSON.stringify(item, null, 2)}</pre>
{/if}
