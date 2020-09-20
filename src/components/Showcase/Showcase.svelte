<script>
  import ShowcaseItem from "./ShowcaseItem.svelte"
  export let data

  let essays = true
  let talks = true
  let podcasts = true
  let tutorials = false
  let notes = false

  let filterStr = ''

  $: filteredData = data.filter((x) => {
    if (filterStr && notIncludes(filterStr, x)) {
      return false
    } else {
      if (essays && x.type === 'Essays') return true
      if (talks && x.type === 'Talks') return true
      if (podcasts && x.type === 'Podcasts') return true
      if (tutorials && x.type === 'Tutorials') return true
      if (notes && x.type === 'Notes') return true
    }
  }).map(x => {
    if (x.date) x.effectiveDate = new Date(x.date)
    if (x.instances) x.effectiveDate = new Date(x.instances[0].date)
    return x
  }).sort((a,z) => z.effectiveDate - a.effectiveDate)
  // $: console.log({ filteredData })

  function notIncludes(_filterStr, item) {

    let res = true
    _filterStr = _filterStr.toLowerCase();
    // if (JSON.stringify(item).toLowerCase().includes(_filterStr)) return true
    if (item.title && item.title.toLowerCase().includes(_filterStr)) res = false
    if (item.categories && item.categories.join().toLowerCase().includes(_filterStr)) res = false
    if (item.description && item.description.toLowerCase().includes(_filterStr)) res = false
    return res
  }

</script>

<div class="relative max-w-lg mx-auto lg:max-w-7xl mb-8">
  <div class="text-center">
    <h2
      class="text-3xl leading-9 tracking-tight font-extrabold text-gray-900
        sm:text-4xl sm:leading-10">
      Idea Showcase
    </h2>
    <p class="mt-3 text-xl leading-7 text-gray-500 sm:mt-4">
      For Free: {filteredData.length} Great Ideas. Lightly Used.
    </p>
  </div>
</div>
<!-- <div class="pb-5 border-b border-gray-200 space-y-3 sm:flex sm:flex-col sm:items-center sm:justify-between sm:space-x-4 sm:space-y-0"> -->
<div>
  <div class="flex rounded-md shadow-sm mb-4">
    <!-- search -->
    <label for="search_candidate" class="sr-only">Search</label>
    <div class="relative flex-grow focus-within:z-10">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center">
        <!-- Heroicon name: search -->
        <label for="search_candidate">
          <svg
            class="h-5 w-5 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clip-rule="evenodd" />
          </svg>
        </label>
        <!-- <input
          id="search_candidate"
          class="form-input block w-full rounded-none rounded-l-md pl-2
            transition ease-in-out duration-150 sm:hidden"
          placeholder="Filter" bind:value={filterStr} /> -->
        <input
          id="search_candidate"
          autofocus
          class="hidden form-input w-full rounded-none rounded-l-md pl-2
            transition ease-in-out duration-150 sm:block sm:text-sm sm:leading-5"
          placeholder="Filter ideas" bind:value={filterStr} />
      </div>
    </div>
    <!-- categories -->
    <span class="relative z-0 inline-flex shadow-sm rounded-md">
      <div class="inline-flex items-center mr-2">Show:</div>
      <button
        type="button"
        on:click={() => (essays = !essays)}
        class:bg-gray-200={essays}
        class="relative inline-flex items-center px-4 py-2 rounded-l-md border
          border-gray-300 bg-white text-sm leading-5 font-medium text-gray-700
          hover:text-gray-500 focus:z-10 focus:outline-none
          focus:border-blue-300 focus:shadow-outline-blue active:bg-gray-100
          active:text-gray-700 transition ease-in-out duration-150">
        Essays
      </button>
      <button
        type="button"
        on:click={() => (talks = !talks)}
        class:bg-gray-200={talks}
        class="-ml-px relative inline-flex items-center px-4 py-2 border
          border-gray-300 bg-white text-sm leading-5 font-medium text-gray-700
          hover:text-gray-500 focus:z-10 focus:outline-none
          focus:border-blue-300 focus:shadow-outline-blue active:bg-gray-100
          active:text-gray-700 transition ease-in-out duration-150">
        Talks
      </button>
      <button
        type="button"
        on:click={() => (podcasts = !podcasts)}
        class:bg-gray-200={podcasts}
        class="-ml-px relative inline-flex items-center px-4 py-2 border
          border-gray-300 bg-white text-sm leading-5 font-medium text-gray-700
          hover:text-gray-500 focus:z-10 focus:outline-none
          focus:border-blue-300 focus:shadow-outline-blue active:bg-gray-100
          active:text-gray-700 transition ease-in-out duration-150">
        Podcasts
      </button>
      <button
        type="button"
        on:click={() => (tutorials = !tutorials)}
        class:bg-gray-200={tutorials}
        class="-ml-px relative inline-flex items-center px-4 py-2 border
          border-gray-300 bg-white text-sm leading-5 font-medium text-gray-700
          hover:text-gray-500 focus:z-10 focus:outline-none
          focus:border-blue-300 focus:shadow-outline-blue active:bg-gray-100
          active:text-gray-700 transition ease-in-out duration-150">
        <strike>Tutorials</strike>
      </button>
      <button
        type="button"
        on:click={() => (notes = !notes)}
        class:bg-gray-200={notes}
        class="-ml-px relative inline-flex items-center px-4 py-2 rounded-r-md
          border border-gray-300 bg-white text-sm leading-5 font-medium
          text-gray-700 hover:text-gray-500 focus:z-10 focus:outline-none
          focus:border-blue-300 focus:shadow-outline-blue active:bg-gray-100
          active:text-gray-700 transition ease-in-out duration-150">
        <strike>Notes</strike>
      </button>
    </span>

    <!-- sort - todo: see whether i actually need to sort -->
    {#if false}
    <button
      class="-ml-px relative inline-flex items-center px-4 py-2 border
        border-gray-300 text-sm leading-5 font-medium rounded-r-md text-gray-700
        bg-gray-50 hover:text-gray-500 hover:bg-white focus:outline-none
        focus:shadow-outline-blue focus:border-blue-300 active:bg-gray-100
        active:text-gray-700 transition ease-in-out duration-150">
      <!-- Heroicon name: sort-ascending -->
      <svg
        class="h-5 w-5 text-gray-400"
        viewBox="0 0 20 20"
        fill="currentColor">
        <path
          d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
      </svg>
      <span class="ml-2">Sort</span>
      <!-- Heroicon name: chevron-down -->
      <svg
        class="ml-2.5 -mr-1.5 h-5 w-5 text-gray-400"
        viewBox="0 0 20 20"
        fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clip-rule="evenodd" />
      </svg>
    </button>
    {/if}
  </div>

  <div class="bg-white shadow overflow-hidden sm:rounded-md">
    <ul>
      {#each filteredData as item}
        <li><ShowcaseItem {item} />
        </li>
      {/each}
    </ul>
  </div>
</div>
<!-- </div> -->
