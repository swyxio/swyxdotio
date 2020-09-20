<script>
  export let item
  let displayDetails = false
  let seeRawDetails = false
  const shorten = str => str.length > 200 ? str.slice(0,200) + '...' : str
  let shortDesc =
    item.desc ||
    (item.description ? shorten(item.description) : undefined)

  
  function parseVideoURL(videoURL) {
    if (videoURL.startsWith('https://www.youtube.com/watch')) {
      return new URL(videoURL).searchParams.get('v')
    } else if (videoURL.startsWith('https://youtu.be/')) {
      return videoURL.slice(17)
    } 
    return null
  }
</script>

<style>
  dl > div:nth-of-type(odd) {
    background-color: #eee;
  }
  dl > div:nth-of-type(even) {
    background-color: white;
  }
</style>

<div
  class="block hover:bg-gray-200 focus:outline-none focus:bg-gray-50 transition
    duration-150 ease-in-out">
  {#if item.type === 'Essays' && item.slug}
    <a href={`/${item.slug}`}>
      <div class="px-4 py-4 sm:px-6">
        <div class="flex items-center justify-between">
          <div class="text-sm leading-5 font-medium text-indigo-600 truncate">
            {item.title}
          </div>
          <div class="ml-2 flex-shrink-0 flex">
            <span
              class="px-2 inline-flex text-xs leading-5 font-semibold
                rounded-full bg-green-100 text-green-800">
              {item.type}
            </span>
          </div>
        </div>
        <div class="my-2 sm:flex sm:justify-between">
          <div class="sm:flex">
            <div class="mr-6 flex items-center text-sm leading-5 text-gray-500">
              <!-- Heroicon name: users -->
              <svg
                class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor">
                <path
                  d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              {item.categories && item.categories.length ? item.categories.join(', ') : 'Uncategorized'}
              <!-- {item.tags} -->
            </div>
          </div>
          <div class="mt-2 flex text-sm leading-5 text-gray-500 sm:mt-0">
            {#if item.type === 'Talks'}
              <!-- Heroicon name: location-marker -->
              {#each item.instances as instance}
                <div class="flex">
                  <svg
                    class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clip-rule="evenodd" />
                  </svg>
                  <span>
                    <time
                      datetime={new Date(instance.date)
                        .toISOString()
                        .slice(
                          0,
                          10
                        )}>{new Date(instance.date).toDateString().slice(4)}</time>
                    @ {instance.venue}
                  </span>
                </div>
              {/each}
            {:else}
              <!-- Heroicon name: calendar -->
              <svg
                class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clip-rule="evenodd" />
              </svg>
              <span>
                <time
                  datetime={new Date(item.date)
                    .toISOString()
                    .slice(
                      0,
                      10
                    )}>{new Date(item.date).toDateString().slice(4)}</time>
              </span>
            {/if}
          </div>
        </div>
        {#if displayDetails === false && shortDesc}
          <div class="">{shortDesc}</div>
        {/if}
      </div>
    </a>
  {:else}
    <div
      on:click={() => (displayDetails = !displayDetails)}
      class="cursor-pointer px-4 py-4 sm:px-6">
      <div class="flex items-center justify-between">
        <div class="text-sm leading-5 font-medium text-indigo-600 truncate">
          {item.title}
        </div>
        <div class="ml-2 flex-shrink-0 flex">
          <span
            class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full
              bg-green-100 text-green-800">
            {item.type}
          </span>
        </div>
      </div>
      <div class="my-2 sm:flex sm:justify-between">
        <div class="sm:flex">
          <div class="mr-6 flex items-center text-sm leading-5 text-gray-500">
            <!-- Heroicon name: users -->
            <svg
              class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor">
              <path
                d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            {item.categories && item.categories.length ? item.categories.join(', ') : 'Uncategorized'}
            <!-- {item.tags} -->
          </div>
        </div>
        <div class="mt-2 flex text-sm leading-5 text-gray-500 sm:mt-0">
          {#if item.type === 'Talks'}
            <!-- Heroicon name: location-marker -->
            {#each item.instances as instance}
              <div class="flex">
                <svg
                  class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clip-rule="evenodd" />
                </svg>
                <span>
                  <time
                    datetime={new Date(instance.date)
                      .toISOString()
                      .slice(
                        0,
                        10
                      )}>{new Date(instance.date).toDateString().slice(4)}</time>
                  @ {instance.venue}
                </span>
              </div>
            {/each}
          {:else}
            <!-- Heroicon name: calendar -->
            <svg
              class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clip-rule="evenodd" />
            </svg>
            <span>
              <time
                datetime={new Date(item.date)
                  .toISOString()
                  .slice(
                    0,
                    10
                  )}>{new Date(item.date).toDateString().slice(4)}</time>
            </span>
          {/if}
        </div>
      </div>
      {#if displayDetails === false && shortDesc}
        <div class="">{shortDesc}</div>
      {/if}
    </div>
  {/if}
  {#if displayDetails}
    <dl>
      {#if item.canonical}
        <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <dt class="text-sm leading-5 font-medium text-gray-500">
            Originally posted at:
          </dt>
          <dd
            class="mt-1 text-sm leading-5 text-gray-900 sm:mt-0 sm:col-span-2">
            <a
              class="underline hover:text-blue-700"
              href={item.canonical}>{item.canonical}</a>
          </dd>
        </div>
      {/if}
      {#if item.url}
        <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <dt class="text-sm leading-5 font-medium text-gray-500">URL</dt>
          <dd
            class="mt-1 text-sm leading-5 text-gray-900 sm:mt-0 sm:col-span-2">
            <a
              class="underline hover:text-blue-700"
              href={item.url}>{item.url}</a>
          </dd>
        </div>
      {/if}
      {#if item.slides}
        <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <dt class="text-sm leading-5 font-medium text-gray-500">Slides</dt>
          <dd
            class="mt-1 text-sm leading-5 text-gray-900 sm:mt-0 sm:col-span-2">
            <a
              class="underline hover:text-blue-700"
              href={item.slides}>{item.slides}</a>
          </dd>
        </div>
      {/if}
      {#if item.description}
        <div class="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <dt class="text-sm leading-5 font-medium text-gray-500">
            Description
          </dt>
          <dd
            class="mt-1 text-sm leading-5 text-gray-900 sm:mt-0 sm:col-span-2">
            {item.description}
          </dd>
        </div>
      {/if}
    </dl>

    <div class="px-4 sm:px-6">
      {#if item.instances}
      
      <!-- <div class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"> -->
      <div class="bg-white sm:grid sm:grid-cols-3">
        <dt class="text-sm leading-5 font-medium text-gray-500">
          Instances
        </dt>
        <dd class="mt-1 text-sm leading-5 text-gray-900 sm:mt-0 sm:col-span-2">
          <ul class="border border-gray-200 rounded-md">
            {#each item.instances as instance}
            <li class="pl-3 pr-4 flex items-center justify-between text-sm leading-5">
              <div class="w-0 flex-1 flex items-center">
                On {new Date(instance.date).toDateString().slice(4)} at {instance.venue}
              </div>
              <div class="ml-4 flex-shrink-0">
                <a class="underline hover:text-blue-900" href={instance.video}>Link to Video</a>
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
              </div>
            </li>
            {/each}
          </ul>
        </dd>
      </div>

      <!-- {:else} -->
      {/if}

      <!-- raw details button toggle -->
      <div class="flex items-center my-2">
        <!-- This component requires you to enable the `group-focus` variant for `boxShadow` utilities. -->
        <span
          on:click={() => (seeRawDetails = !seeRawDetails)}
          role="checkbox"
          tabindex="0"
          aria-checked="false"
          class="group relative inline-flex items-center justify-center
            flex-shrink-0 h-5 w-10 cursor-pointer focus:outline-none mr-2">
          <!-- On: "bg-indigo-600", Off: "bg-gray-200" -->
          <span
            aria-hidden="true"
            class:bg-indigo-600={seeRawDetails}
            class="bg-gray-500 absolute h-4 w-8 mx-auto rounded-full
              transition-colors ease-in-out duration-200" />
          <!-- On: "translate-x-5", Off: "translate-x-0" -->
          <span
            aria-hidden="true"
            class:translate-x-5={seeRawDetails}
            class="translate-x-0 absolute left-0 inline-block h-5 w-5 border
              border-gray-200 rounded-full bg-white shadow transform
              group-focus:shadow-outline group-focus:border-blue-300
              transition-transform ease-in-out duration-200" />
        </span> See Raw
      </div>
      {#if seeRawDetails}
        <pre>{JSON.stringify(item, null, 2)}</pre>
      {/if}
    </div>
  {/if}
</div>
