<script>
  export let item
  export let uno = false
  let displayDetails = uno
  $: longDesc =
    item.description || item.desc || 'No description provided. Suggest one!'
  function formatDate(date) {
    if (date.getFullYear() > 2019) return date.toDateString().slice(4, 10)
    return date ? date.toISOString().slice(0, 10) : '???'
  }
</script>

<!-- border-green-500
border-blue-500
border-purple-500
bg-green-100
text-green-900
bg-indigo-600
translate-x-5
bg-gray-500
text-indigo-500 -->

<li class="mb-4">
  <div
    class="py-4 px-1"
    class:bimodalblue={item.type === 'Talks'}
    class:bimodalpurple={item.type === 'Podcasts'}>
    <div class="flex flex-col">
      <span
        class="inline-flex uppercase items-center text-gray-500 text-xs font-mono whitespace-nowrap">
        {formatDate(item.effectiveDate)}</span>
      <!-- class:justify-between={!displayDetails}  -->
      <button
        on:click={() => (displayDetails = !displayDetails)}
        class="relative justify-between flex flex-col -mr-px text-sm text-left leading-5 w-full
          text-gray-700 font-medium border border-transparent focus:outline-none
          focus:ring-blue focus:border-blue-300 focus:z-10 transition
          ease-in-out duration-150">
        <h3
          class="mylinkcolors text-base md:text-lg leading-5
          font-medium whitespace-normal inline">
          {item.title}
        </h3>
        {#if !displayDetails}
          <div
            class="hidden md:inline-flex items-center h-full text-sm mylinkcolors">
            Expand {item.type.slice(0,item.type.length - 1)}
          </div>
        {:else}
          <div
            role="switch"
            class="hidden md:inline-flex h-full items-center text-sm mytext mr-4">
            ❌
          </div>
        {/if}
      </button>
    </div>
    {#if displayDetails}
      <div class="ml-4 p-4">
        <!-- <h3
          class="hidden items-center ml-4 flex-shrink-0 md:inline-block px-2 py-0.5 text-xs leading-4
            font-medium rounded-full"
          class:bg-green-100={item.type === 'Essays'}
          class:text-green-900={item.type === 'Essays'}
          class:bimodalblue={item.type === 'Talks'}
          class:bimodalpurple={item.type === 'Podcasts'}>
          {item.type}
        </h3> -->
        <p
          class="prose mt-1 mytext text-base md:text-xl leading-5 whitespace-normal">
          <span>{longDesc}</span>
        </p>

        <div class="prose ml-4">
          {#if item.type === 'Essays' && item.slug}
            <a
              href={`/${item.slug}`}
              class="relative inline-flex items-center justify-center py-4 text-sm
                leading-5 text-gray-700 font-medium border border-transparent
                rounded-br-lg hover:text-gray-500 focus:outline-none
                focus:ring-blue focus:border-blue-300 focus:z-10
                transition ease-in-out duration-150">
              <!-- Heroicon name: book open -->
              <svg
                class="w-5 h-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span class="ml-2">Read</span>
            </a>
            <!-- TODO: read later -->
          {:else if item.type === 'Talks' && item.instances && item.instances[0].video}
            <a
              href={item.instances[0].video}
              target="_blank"
              rel="noopener"
              class="relative flex-1 inline-flex items-center justify-center py-4
                text-sm leading-5 text-gray-700 font-medium border
                border-transparent rounded-br-lg hover:text-gray-500
                focus:outline-none focus:ring-blue focus:border-blue-300
                focus:z-10 transition ease-in-out duration-150">
              <!-- http://simpleicons.org/?q=youtube -->
              <svg
                class="w-5 h-5 text-gray-400"
                fill="currentColor"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"><title>YouTube icon</title>
                <path
                  d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" /></svg>
              <span class="ml-2">Watch Talk</span>
            </a>
          {:else if item.type === 'Podcasts' && item.url}
            <a
              href={item.url}
              target="_blank"
              rel="noopener"
              class="relative flex-1 inline-flex items-center justify-center py-4
                text-sm leading-5 text-gray-700 font-medium border
                border-transparent rounded-br-lg hover:text-gray-500
                focus:outline-none focus:ring-blue focus:border-blue-300
                focus:z-10 transition ease-in-out duration-150">
              <!-- Heroicon name: volume up -->
              <svg
                class="w-5 h-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <span class="ml-2">Listen to Podcast</span>
            </a>
          {:else}
            <div />
          {/if}
        </div>

        <dl class="prose">
          {#if item.canonical}
            <div class="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt class="text-sm leading-5 font-medium text-gray-500">
                Originally posted at:
              </dt>
              <dd
                class="mt-1 text-sm leading-5 text-gray-400 sm:mt-0 sm:col-span-2">
                <a
                  class="underline hover:text-blue-100"
                  href={item.canonical}>{item.canonical}</a>
              </dd>
            </div>
          {/if}
          {#if item.url}
            <div class="py-2 sm:grid sm:grid-cols-3 sm:gap-4 break-all">
              <dt
                class="text-sm leading-5 font-medium text-gray-500 break-normal">
                External URL
              </dt>
              <dd
                class="mt-1 text-sm leading-5 text-gray-400 sm:mt-0 sm:col-span-2">
                <a
                  class="underline hover:text-blue-100"
                  href={item.url}>{item.url}</a>
              </dd>
            </div>
          {/if}
          {#if item.slides}
            <div class="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt class="text-sm leading-5 font-medium text-gray-500">
                Slides
              </dt>
              <dd
                class="mt-1 text-sm leading-5 text-gray-400 sm:mt-0 sm:col-span-2">
                <a
                  class="underline hover:text-blue-100"
                  href={item.slides}>{item.slides}</a>
              </dd>
            </div>
          {/if}
          {#if item.categories}
            <div class="py-5 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt class="text-sm leading-5 font-medium text-gray-500">
                Categories
              </dt>
              <dd class="mt-1 text-sm leading-5 mytext sm:mt-0 sm:col-span-2">
                {item.categories && item.categories.length ? item.categories.join(', ') : 'Uncategorized'}
              </dd>
            </div>
          {/if}
        </dl>

        {#if item.instances}
          <ul class="prose border border-gray-200 rounded-md">
            {#each item.instances as instance}
              <li class="pr-4 text-sm leading-5">
                {new Date(instance.date).toDateString().slice(4)}
                at
                {instance.venue}
                <div class="ml-4">
                  {#if instance.video}
                    <a
                      class="underline hover:text-blue-100"
                      href={instance.video}>Video</a>
                  {/if}
                  {#if instance.slides}
                    <a
                      class="underline hover:text-blue-100"
                      href={instance.slides}>Slides</a>
                  {/if}
                  {#if instance.github}
                    <a
                      class="underline hover:text-blue-100 text-sm leading-5
                        font-medium text-gray-500"
                      href={instance.github}>GitHub</a>
                  {/if}
                  {#if instance.tweet}
                    <a
                      class="underline hover:text-blue-100 text-sm leading-5
                        font-medium text-gray-500"
                      href={instance.tweet}>Tweet</a>
                  {/if}
                  {#if instance.description}
                    <span
                      class="text-sm leading-5 text-gray-400">{instance.description}</span>
                  {/if}
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
  </div>
</li>
