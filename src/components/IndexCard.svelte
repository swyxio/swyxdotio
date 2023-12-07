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
	let videoID = item?.instances?.[0]?.video
	if (videoID) {
		try {
			if (videoID.includes('youtube')) {
				videoID = videoID.split('v=')[1].split('&')[0].split('?')[0]
				// new URL(item.instances[0].video).searchParams.get('v')
			} else {
				videoID = videoID.split('/')[videoID.split('/').length - 1].split('?')[0]
			}
		catch (err) { console.log({videoID}) }
	} 
</script>

{#if ['essay', 'note', 'notes', 'snippet', 'tutorial', 'podcast'].includes(item?.category)}
<a
	class="w-full text-gray-900 hover:text-yellow-600 dark:text-gray-100 dark:hover:text-yellow-100 hover:no-underline"
	{href}
	><div class="w-full">
		<div class="flex flex-col justify-between md:flex-row">
			<h4 class="flex-auto w-full mb-2 text-lg font-bold md:text-xl">
				{title}
			</h4>
		</div>
		<p class="text-gray-600 mb-2 break-all sm:break-words dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-100">
			<slot />
		</p>
		<div class="flex justify-between items-center gap-1 text-left text-gray-500 sm:justify-start sm:flex-row sm:gap-4 md:mb-0 md:text-sm">
			<!-- {JSON.stringify(item.readingTime)} -->
			<p>{stringData}</p>
			{#if item?.readingTime}
				<p class="hidden sm:inline-block">{item?.readingTime}</p>
			{/if}
			<!-- comment this in if you have multiple categories -->
			<span class="px-2 max-h-6 flex items-center capitalize bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-400"
			class:!bg-indigo-900={item?.category === 'podcast'}
			class:!bg-yellow-800={item?.category === 'essay'}
			class:!bg-blue-900={item?.category === 'tutorial'}
			class:!text-white={['podcast', 'essay'].includes(item?.category)}
			>
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
			{#if (item?.devToReactions) ?? (ghMetadata && ghMetadata.reactions.total_count)}
				<p class="">{ghMetadata.reactions.total_count + (item?.devToReactions ?? 0)} ♥</p>
			{/if}
		</div>
	</div></a
>

{:else if item?.category === 'talk'}
	<div class="w-full text-gray-900 dark:text-gray-100">
		<div class="w-full mb-4">
			{#if item.instances.length === 1}
				<div class="grid sm:grid-cols-[8rem_minmax(auto,_1fr)] gap-4 pb-4">
					<a
						href={item.instances[0].video}
						target="_blank"
						class="w-32 inline-flex flex-col items-center"
					>
						{#if item.instances[0].video}
							<img
								alt="talk thumbnail"
								src={`http://i3.ytimg.com/vi/${videoID}/hqdefault.jpg`}
							/>
						{/if}
					</a>
					<div class="justify-between md:flex-row">
						<h4
							class="w-full text-lg font-medium md:text-xl flex-auto  flex items-center space-x-2"
						>
							<span class="p-1 rounded text-white bg-green-700 text-xs">Talk</span>
							<span>{item.title}</span>
							<!-- pill -->
						</h4>
						<div class="inline-flex flex-1 items-center">
							<!-- {#if ghMetadata && ghMetadata.reactions.total_count}
							<span class=" min-w-[2rem] mr-2 text-xs font-mono text-opacity-70 text-gray-700 dark:text-gray-300">{ghMetadata.reactions.total_count} ♥</span>
						{/if} -->
							<p class="mb-4 text-left text-gray-500 md:text-right md:mb-0">
								{item.instances[0].venue} @ {new Date(item.instances[0].date)
									.toISOString()
									.slice(0, 10)}
							</p>
						</div>
						<p class="text-gray-600 dark:text-gray-400 text-ellipsis overflow-hidden text-sm">
							{item.desc || item.description}
							<slot />
						</p>
					</div>
				</div>
			{:else}
				<div class="flex flex-col-reverse md:flex-col py-2">
					<div class="flex flex-col justify-between">
						<h4
							class="w-full mb-2 text-lg font-medium md:text-xl flex-auto  flex items-center space-x-2"
						>
							<span class="p-1 rounded text-white bg-green-700 text-xs">Talk</span>
							<span>{item.title}</span>
						</h4>
						<div class="inline-flex flex-1 items-center">
							<!-- {#if ghMetadata && ghMetadata.reactions.total_count}
							<span class=" min-w-[2rem] mr-2 text-xs font-mono text-opacity-70 text-gray-700 dark:text-gray-300">{ghMetadata.reactions.total_count} ♥</span>
						{/if} -->
							<!-- <p class="w-32 mb-4 text-left text-gray-500 md:text-right md:mb-0">
								{new Date(item.date).toISOString().slice(0, 10)}
							</p> -->
						</div>
						<p class="text-gray-600 dark:text-gray-400 text-ellipsis overflow-hidden text-sm">
							{item.desc || item.description}
						</p>
					</div>
					<ul class="grid grid-cols-2 gap-4 items-center my-4">
						{#each item.instances as instance}
							{@const url = instance.video && new URL(instance.video)}
							{@const ytslug =
								url &&
								(url.host === 'www.youtube.com'
									? url.searchParams.get('v')
									: url.pathname.slice(1))}
							{#if url}
								<li>
									<a href={instance.video} target="_blank">
										{#if ['www.youtube.com', 'youtu.be'].includes(url.host)}
											<img
												class="max-h-32 w-fit"
												alt="talk thumbnail"
												src={`http://i3.ytimg.com/vi/${ytslug}/hqdefault.jpg`}
											/>
										{/if}
										{instance.venue} @ {new Date(instance.date).toISOString().slice(0, 10)}
									</a>
								</li>
							{:else}
								<li>
									<a href={instance.video} target="_blank">
										{instance.venue} @ {new Date(instance.date).toISOString().slice(0, 10)}
									</a>
								</li>
							{/if}
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<pre class="prose dark:prose-invert overflow-scroll w-full">{JSON.stringify(item, null, 2)}</pre>
{/if}
