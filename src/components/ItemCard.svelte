<script>
	export let item;
	let date = new Date(item?.date).toISOString().slice(0, 10);
	let videoID = item?.instances?.[0]?.video
	if (videoID) {
		if (videoID.includes('youtube')) {
			videoID = videoID.split('v=')[1].split('&')[0]
			// new URL(item.instances[0].video).searchParams.get('v')
		} else {
			videoID = videoID.split('/')[videoID.split('/').length - 1]
		}
	} 
	// console.log(item)
</script>

{#if ['essay', 'note', 'notes', 'snippet', 'tutorial'].includes(item?.type)}
	<div class="mb-4 w-full">
		<div class="flex flex-col-reverse justify-between md:flex-row">
			<a
				sveltekit:prefetch
				class="w-full text-gray-900 hover:text-yellow-600 dark:text-gray-100 dark:hover:text-yellow-100"
				href={`/` + item.slug}
			>
				<h4 class="mb-2 w-full flex-auto text-lg font-medium md:text-xl">
					{#if item.type !== 'note'}
						<span class="rounded bg-blue-700 p-1 text-xs text-white"
							>{item.type[0].toUpperCase() + item.type.substring(1)}</span
						>
					{/if}
					<span>{item.title}</span>
				</h4></a
			>
			<div
				class="inline-flex flex-1 flex-row-reverse items-center justify-end md:flex-row md:justify-start"
			>
				{#if (item.ghMetadata && item.ghMetadata.reactions.total_count) || item.data.devToReactions}
					<span
						class=" mr-2 min-w-[3rem] text-right font-mono text-xs text-gray-700 text-opacity-70 dark:text-gray-300"
						>{(item?.ghMetadata?.reactions?.total_count || 0) + (item?.data?.devToReactions || 0)} ♥</span
					>
				{/if}
				<p class="w-28 text-left text-gray-500 md:text-right">{date}</p>
			</div>
		</div>
		<p class="overflow-hidden text-ellipsis break-all text-gray-600 dark:text-gray-400 text-sm">
			{item.description}
		</p>
	</div>
{:else if item?.type === 'podcast'}
	<div class="w-full mb-4">
		<div class="flex flex-col justify-between md:flex-row">
			<a
				class="w-full text-gray-900 dark:text-gray-100 hover:text-yellow-600 dark:hover:text-yellow-100"
				href={item.url}
				target="_blank"
			>
				<h4
					class="w-full mb-2 text-lg font-medium md:text-xl flex-auto flex items-center space-x-2"
				>
					<span class="p-1 rounded text-white bg-purple-700 text-xs">Podcast</span>
					<span>{item.title}</span>
					<!-- pill -->
				</h4></a
			>
			<div class="inline-flex flex-1 items-center">
				<!-- {#if ghMetadata && ghMetadata.reactions.total_count}
					<span class=" min-w-[2rem] mr-2 text-xs font-mono text-opacity-70 text-gray-700 dark:text-gray-300">{ghMetadata.reactions.total_count} ♥</span>
				{/if} -->
				<p class="w-32 mb-4 text-left text-gray-500 md:text-right md:mb-0">{date}</p>
			</div>
		</div>
		<p class="text-gray-600 dark:text-gray-400 text-ellipsis overflow-hidden text-sm">
			{item.description}
		</p>
	</div>
{:else if item?.type === 'talk'}
	<div class="w-full text-gray-900 dark:text-gray-100">
		<div class="w-full mb-4">
			{#if item.instances.length === 1}
				<div class="grid sm:grid-cols-[8rem_minmax(auto,_1fr)] gap-4 border-b-2 border-white pb-4">
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
							{item.description}
						</p>
					</div>
				</div>
			{:else}
				<div class="flex flex-col-reverse md:flex-col border-b-2 py-2  border-white">
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
							{item.description}
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
