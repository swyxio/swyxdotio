<script>

  export let data
</script>

<div class="relative max-w-lg mx-auto lg:max-w-7xl mb-8">
  <div>
    <h2
      class="text-3xl leading-9 tracking-tight font-extrabold text-gray-900
        sm:text-4xl sm:leading-10">
      Idea Showcase
    </h2>
    <p class="mt-3 text-xl leading-7 text-gray-500 sm:mt-4">
      For Free: Great Ideas. Lightly Used. Talks, Podcasts, Essays, Tutorials.
    </p>
  </div>
</div>
<!-- <div class="pb-5 border-b border-gray-200 space-y-3 sm:flex sm:flex-col sm:items-center sm:justify-between sm:space-x-4 sm:space-y-0"> -->
  <div>
    <label for="search_candidate" class="sr-only">Search</label>
    <div class="flex rounded-md shadow-sm">
      <div class="relative flex-grow focus-within:z-10">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <!-- Heroicon name: search -->
          <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
        </div>
        <input id="search_candidate" class="form-input block w-full rounded-none rounded-l-md pl-10 transition ease-in-out duration-150 sm:hidden" placeholder="Search">
        <input id="search_candidate" class="hidden form-input w-full rounded-none rounded-l-md pl-10 transition ease-in-out duration-150 sm:block sm:text-sm sm:leading-5" placeholder="Search candidates">
      </div>
      <button class="-ml-px relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm leading-5 font-medium rounded-r-md text-gray-700 bg-gray-50 hover:text-gray-500 hover:bg-white focus:outline-none focus:shadow-outline-blue focus:border-blue-300 active:bg-gray-100 active:text-gray-700 transition ease-in-out duration-150">
        <!-- Heroicon name: sort-ascending -->
        <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
        </svg>
        <span class="ml-2">Sort</span>
        <!-- Heroicon name: chevron-down -->
        <svg class="ml-2.5 -mr-1.5 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <div class="bg-white shadow overflow-hidden sm:rounded-md">
      <ul>
        {#each data as item}
        <li>
          <a href="#" class="block hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition duration-150 ease-in-out">
            <div class="px-4 py-4 sm:px-6">
              <div class="flex items-center justify-between">
                <div class="text-sm leading-5 font-medium text-indigo-600 truncate">
                  {item.title}
                </div>
                <div class="ml-2 flex-shrink-0 flex">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Full-time
                  </span>
                </div>
              </div>
              <div class="mt-2 sm:flex sm:justify-between">
                <div class="sm:flex">
                  <div class="mr-6 flex items-center text-sm leading-5 text-gray-500">
                    <!-- Heroicon name: users -->
                    <svg class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Engineering
                  </div>
                  <div class="mt-2 flex items-center text-sm leading-5 text-gray-500 sm:mt-0">
                    <!-- Heroicon name: location-marker -->
                    <svg class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                    </svg>
                    Remote
                  </div>
                </div>
                <div class="mt-2 flex items-center text-sm leading-5 text-gray-500 sm:mt-0">
                  <!-- Heroicon name: calendar -->
                  <svg class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                  </svg>
                  <span>
                    Closing on
                    <time datetime="2020-01-07">January 7, 2020</time>
                  </span>
                </div>
              </div>
            </div>
          </a>
        </li>
        {/each}
      </ul>
    </div>
  </div>
<!-- </div> -->
