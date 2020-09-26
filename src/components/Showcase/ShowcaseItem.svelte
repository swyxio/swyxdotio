<script>
  export let item
  let displayDetails = false
  let seeRawDetails = false
  const shorten = (str) =>
    str ? (str.length > 200 ? str.slice(0, 100) + '...' : str) : undefined
  $: shortDesc = shorten(item.desc) || shorten(item.description)
  $: longDesc =
    item.description || item.desc || 'No description provided. Suggest one!'
  function parseVideoURL(videoURL) {
    if (videoURL.startsWith('https://www.youtube.com/watch')) {
      return new URL(videoURL).searchParams.get('v')
    } else if (videoURL.startsWith('https://youtu.be/')) {
      return videoURL.slice(17)
    }
    return null
  }
  // $: if (item.type === 'Essays') console.log({ item })
</script>

<!-- because svelte class is broken -->
<!-- border-green-500
border-blue-500
border-teal-500
bg-green-100
text-green-800
bg-blue-100
text-blue-800
bg-teal-100
text-teal-800
bg-indigo-600
translate-x-5
bg-gray-500
text-teal-500 -->

<li
  class="col-span-1 bg-gray-100 rounded-lg shadow flex flex-col justify-between
    border-4 transition duration-100 transform hover:-translate-y-1"
  class:border-green-500={item.type === 'Essays'}
  class:border-blue-500={item.type === 'Talks'}
  class:border-teal-500={item.type === 'Podcasts'}>
  <div>
    <div class="w-full flex items-center justify-between p-6 space-x-6">
      <div class="flex-1 truncate">
        <!-- <div class="flex flex-col"> -->
        <div class="">
          <span
            class="flex-shrink-0 inline-block px-2 py-0.5 text-xs leading-4
              font-medium rounded-full"
            class:bg-green-100={item.type === 'Essays'}
            class:text-green-800={item.type === 'Essays'}
            class:bg-blue-100={item.type === 'Talks'}
            class:text-blue-800={item.type === 'Talks'}
            class:bg-teal-100={item.type === 'Podcasts'}
            class:text-teal-800={item.type === 'Podcasts'}>
            {item.type}
          </span>
          <h3
            class="text-gray-900 text-sm leading-5 font-medium whitespace-normal
              inline">
            {item.title}
          </h3>
        </div>
        <p class="mt-1 text-gray-700 text-sm leading-5 whitespace-normal">
          {#if displayDetails === false && shortDesc}
            <div class="">{shortDesc}</div>
          {:else}
            <div>{longDesc}</div>

            <dl>
              {#if item.date}
                <div class="py-2 sm:grid sm:grid-cols-3 sm:gap-4 break-all">
                  <dt class="text-sm leading-5 font-medium text-gray-500">
                    Date
                  </dt>
                  <dd
                    class="mt-1 text-sm leading-5 text-gray-900 sm:mt-0
                      sm:col-span-2">
                    {item.date.slice(0, 10)}
                  </dd>
                </div>
              {/if}
              {#if item.canonical}
                <div class="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt class="text-sm leading-5 font-medium text-gray-500">
                    Originally posted at:
                  </dt>
                  <dd
                    class="mt-1 text-sm leading-5 text-gray-900 sm:mt-0
                      sm:col-span-2">
                    <a
                      class="underline hover:text-blue-700"
                      href={item.canonical}>{item.canonical}</a>
                  </dd>
                </div>
              {/if}
              {#if item.url}
                <div class="py-2 sm:grid sm:grid-cols-3 sm:gap-4 break-all">
                  <dt
                    class="text-sm leading-5 font-medium text-gray-500
                      break-normal">
                    External URL
                  </dt>
                  <dd
                    class="mt-1 text-sm leading-5 text-gray-900 sm:mt-0
                      sm:col-span-2">
                    <a
                      class="underline hover:text-blue-700"
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
                    class="mt-1 text-sm leading-5 text-gray-900 sm:mt-0
                      sm:col-span-2">
                    <a
                      class="underline hover:text-blue-700"
                      href={item.slides}>{item.slides}</a>
                  </dd>
                </div>
              {/if}
              {#if item.categories}
                <div class="py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt class="text-sm leading-5 font-medium text-gray-500">
                    Categories
                  </dt>
                  <dd
                    class="mt-1 text-sm leading-5 text-gray-900 sm:mt-0
                      sm:col-span-2">
                    {item.categories && item.categories.length ? item.categories.join(', ') : 'Uncategorized'}
                  </dd>
                </div>
              {/if}
            </dl>

            {#if item.instances}
              <ul class="border border-gray-200 rounded-md list-disc">
                {#each item.instances as instance}
                  <li class="pr-4 text-sm leading-5">
                    {new Date(instance.date).toDateString().slice(4)} at {instance.venue}
                    <!-- <div class="ml-4 flex-shrink-0"> -->
                    <!-- <div class="VideoDiv">
          <iframe
            src={`https://www.youtube.com/embed/${parseVideoURL(instance.video)}`}
            title={item.title}
            name={item.title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope;
            picture-in-picture"
            frameBorder="0"
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
            width="600"
            height="400"
            allowFullScreen
            aria-hidden="true" />
        </div> -->
                    <!-- </div> -->

                    <div class="ml-4">
                      {#if instance.video}
                        <a
                          class="underline hover:text-blue-700"
                          href={instance.video}>Video</a>
                      {/if}
                      {#if instance.slides}
                        <a
                          class="underline hover:text-blue-700"
                          href={instance.slides}>Slides</a>
                      {/if}
                      {#if instance.github}
                        <a
                          class="underline hover:text-blue-700 text-sm leading-5
                            font-medium text-gray-500"
                          href={instance.github}>GitHub</a>
                      {/if}
                      {#if instance.tweet}
                        <a
                          class="underline hover:text-blue-700 text-sm leading-5
                            font-medium text-gray-500"
                          href={instance.tweet}>Tweet</a>
                      {/if}
                      {#if instance.description}
                        <span
                          class="text-sm leading-5 text-gray-700">{instance.description}</span>
                      {/if}
                    </div>
                  </li>
                {/each}
              </ul>
            {/if}

            <!-- <div class="flex items-center my-2">
              <span
                on:click={() => (seeRawDetails = !seeRawDetails)}
                role="checkbox"
                tabindex="0"
                aria-checked="false"
                class="group relative inline-flex items-center justify-center
                  flex-shrink-0 h-5 w-10 cursor-pointer focus:outline-none mr-2">
                <span
                  aria-hidden="true"
                  class:bg-indigo-600={seeRawDetails}
                  class="bg-gray-500 absolute h-4 w-8 mx-auto rounded-full
                    transition-colors ease-in-out duration-200" />
                <span
                  aria-hidden="true"
                  class:translate-x-5={seeRawDetails}
                  class="translate-x-0 absolute left-0 inline-block h-5 w-5
                    border border-gray-200 rounded-full bg-white shadow
                    transform group-focus:shadow-outline
                    group-focus:border-blue-300 transition-transform ease-in-out
                    duration-200" />
              </span> See Raw
            </div>
            {#if seeRawDetails}
              <div class="relative  inline-block">
                <div class="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg">
                  <div class="rounded-md bg-white shadow-xs">
                    <div class="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                      <pre>
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            {/if} -->
          {/if}
        </p>
      </div>
      <!-- <img class="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&amp;ixid=eyJhcHBfaWQiOjEyMDd9&amp;auto=format&amp;fit=facearea&amp;facepad=4&amp;w=256&amp;h=256&amp;q=60" alt=""> -->
      <div>
        <!-- <p class="mt-1 text-gray-500 text-xs leading-5 truncate">
      {item.categories && item.categories.length ? item.categories.join(', ') : 'Uncategorized'}
    </p> -->
      </div>
    </div>
  </div>
  <div class="border-t border-gray-200">
    <div class="-mt-px flex">
      <div class="w-0 flex-1 flex border-r border-gray-200">
        <button
          on:click={() => (displayDetails = !displayDetails)}
          class="relative -mr-px w-0 flex-1 inline-flex items-center
            justify-center py-4 text-sm leading-5 text-gray-700 font-medium
            border border-transparent rounded-bl-lg hover:bg-gray-300
            focus:outline-none focus:shadow-outline-blue focus:border-blue-300
            focus:z-10 transition ease-in-out duration-150"
          class:bg-gray-500={displayDetails}
          class:text-teal-500={displayDetails}>
          <!-- Heroicon name: mail -->
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <!-- <svg
            viewBox="0 0 20 20"
            fill="currentColor">
            <path
              d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg> -->
          <span class="ml-3">More Info</span>
        </button>
      </div>
      <div class="-ml-px w-0 flex-1 flex">
        {#if item.type === 'Essays' && item.slug}
          <a
            href={`/${item.slug}`}
            class="relative w-0 flex-1 inline-flex items-center justify-center
              py-4 text-sm leading-5 text-gray-700 font-medium border
              border-transparent rounded-br-lg hover:text-gray-500
              focus:outline-none focus:shadow-outline-blue focus:border-blue-300
              focus:z-10 transition ease-in-out duration-150">
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
            <span class="ml-3">Read</span>
          </a>
          <!-- TODO: read later -->
        {:else if item.type === 'Talks' && item.instances && item.instances[0].video}
          <a
            href={item.instances[0].video}
            target="_blank"
            rel="noopener"
            class="relative w-0 flex-1 inline-flex items-center justify-center
              py-4 text-sm leading-5 text-gray-700 font-medium border
              border-transparent rounded-br-lg hover:text-gray-500
              focus:outline-none focus:shadow-outline-blue focus:border-blue-300
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
            <span class="ml-3">Watch</span>
          </a>
        {:else if item.type === 'Podcasts' && item.url}
          <a
            href={item.url}
            target="_blank"
            rel="noopener"
            class="relative w-0 flex-1 inline-flex items-center justify-center
              py-4 text-sm leading-5 text-gray-700 font-medium border
              border-transparent rounded-br-lg hover:text-gray-500
              focus:outline-none focus:shadow-outline-blue focus:border-blue-300
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
            <span class="ml-3">Listen</span>
          </a>
        {:else}
          <div />
        {/if}
      </div>
    </div>
  </div>
</li>
