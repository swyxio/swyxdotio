<script>
  import ShowcaseLine from './ShowcaseLine.svelte'
  import ShowcaseLineEssay from './ShowcaseLineEssay.svelte'
  import queryString from 'query-string'
  import { onMount } from 'svelte'

  let urlState = { filter: '', show: [] }
  let defaultURLState = { filter: '', show: ['Essays', 'Talks', 'Podcasts'] }

  const setURLState = (newState) => {
    const finalState = { ...urlState, ...newState } // merge with existing urlstate
    urlState = finalState
    Object.keys(finalState).forEach(function (k) {
      if (
        // don't save some state values if it meets the conditions below
        !finalState[k] || // falsy
        finalState[k] === '' || // string
        (Array.isArray(finalState[k]) && !finalState[k].length) || // array
        finalState[k] === defaultURLState[k] // same as default state, unnecessary
      ) {
        delete finalState[k] // drop query params with new values = falsy
      }
    })
    if (typeof window !== 'undefined')
      history.pushState(
        {},
        '',
        document.location.origin +
          document.location.pathname +
          '?' +
          queryString.stringify(finalState)
      )
  }

  export let data

  let essays = true
  let talks = true
  let podcasts = true
  let tutorials = false
  let notes = false

  let filterStr = ''

  onMount(() => {
    if (location.search.length < 1) return // early terminate if no search
    let givenstate = queryString.parse(location.search)
    if (!Array.isArray(givenstate.show)) givenstate.show = [givenstate.show]
    if (!givenstate.show.includes('Essays')) essays = false
    if (!givenstate.show.includes('Talks')) talks = false
    if (!givenstate.show.includes('Podcasts')) podcasts = false
    if (!givenstate.show.includes('Tutorials')) tutorials = false
    if (!givenstate.show.includes('Notes')) notes = false
    if (givenstate.filter) filterStr = givenstate.filter
    urlState = { ...defaultURLState, ...givenstate }
  })
  function saveURLState() {
    setURLState({
      filter: filterStr,
      show: [
        essays && 'Essays',
        talks && 'Talks',
        podcasts && 'Podcasts',
        tutorials && 'Tutorials',
        notes && 'Notes'
      ].filter(Boolean)
    })
  }
  // $: console.log({urlState, essays, talks, podcasts})

  $: showAll = filterStr.length > 2
  $: filteredData = data
    .map((x) => {
      if (x.date) x.effectiveDate = new Date(x.date)
      if (x.instances) x.effectiveDate = new Date(x.instances[0].date)
      return x
    })
    .sort((a, z) => z.effectiveDate - a.effectiveDate)
    .filter((_, i) => (showAll ? true : i < 30))
    .filter((x) => {
      if (filterStr && notIncludes(filterStr, x)) {
        return false
      } else {
        if (essays && x.type === 'Essays') return true
        if (talks && x.type === 'Talks') return true
        if (podcasts && x.type === 'Podcasts') return true
        if (tutorials && x.type === 'Tutorials') return true
        if (notes && x.type === 'Notes') return true
      }
    })
  // $: console.log({ filteredData })

  function notIncludes(_filterStr, item) {
    let res = true
    _filterStr = _filterStr.toLowerCase().replace('/', '')
    // if (JSON.stringify(item).toLowerCase().includes(_filterStr)) return true
    if (item.title && item.title.toLowerCase().includes(_filterStr)) res = false
    if (item.slug && item.slug.toLowerCase().includes(_filterStr)) res = false
    if (
      item.categories &&
      item.categories.join().toLowerCase().includes(_filterStr)
    )
      res = false
    if (item.description && item.description.toLowerCase().includes(_filterStr))
      res = false
    return res
  }

  let inputEl
  function focusSearch(e) {
    if (e.key === '/' && inputEl) inputEl.select()
  }
</script>

<svelte:window on:keyup={focusSearch} />

<div class="relative mb-8 px-2 myflexresponsive">
  <div class="flex-1 mb-4 md:mb-0">
    <h1
      class="text-5xl leading-9 tracking-tight font-extrabold mytext
      sm:text-4xl sm:leading-10">
      Idea Showcase
    </h1>
    <p class="mt-3 text-xl leading-7 mytext-light sm:mt-4">
      For Free: Great Ideas. Lightly Used.
      <span class="mt-1 text-xs italic block">This site is still under construction,
        pardon our appearance...</span>
    </p>
  </div>
</div>


<div class="flex-1 flex flex-col gap-4 md:gap-0 rounded-md mb-8">

  
  <div class="px-2">
    <label for="search_candidate" class="sr-only">Search</label>
    <div class="mt-1 relative rounded-md shadow-sm mb-4">
      <div class="absolute inset-y-0 left-0 flex items-center pointer-events-none pl-2">
        <!-- Heroicon name: search -->
        <svg
          class="h-5 w-5 mytext-light"
          viewBox="0 0 20 20"
          fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clip-rule="evenodd" />
        </svg>
      </div>
      <!-- class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"  -->
      <input type="text" name="email" id="email" 
        class="form-input w-full rounded-md pl-12 transition ease-in-out text-white
        duration-150 sm:block sm:text-sm sm:leading-5 py-2 bg-gray-800
        focus:bg-yellow-200 focus:text-gray-800"
        placeholder="Filter ideas (press / to focus)"
        bind:this={inputEl}
        on:input={saveURLState}
        bind:value={filterStr} />
    </div>
  </div>
  <!-- categories -->
  <span
    class="relative z-0 inline-flex flex-col sm:flex-row shadow-sm rounded-md">
    <div class="inline-flex items-center mr-2 mytext-light px-4">Show:</div>
    <button
      type="button"
      on:click={() => saveURLState((essays = !essays))}
      class:bimodalpurple={essays}
      class:mytext={essays}
      class:font-medium={essays}
      class="-ml-px sm:ml-0 relative inline-flex items-center px-4 py-2
      sm:rounded-l-md border border-gray-300 text-sm leading-5
     dark:text-gray-200 text-gray-700 focus:z-10
      focus:outline-none focus:border-blue-300 focus:ring-yellow focus:text-yellow-400
       transition ease-in-out
      duration-150">
      Essays
    </button>
    <button
      type="button"
      on:click={() => saveURLState((talks = !talks))}
      class:bimodalpurple={talks}
      class:mytext={talks}
      class:font-medium={talks}
      class="-ml-px relative inline-flex items-center px-4 py-2 border
      border-gray-300 text-sm leading-5 dark:text-gray-200 text-gray-700
     focus:z-10 focus:outline-none
      focus:border-blue-300 focus:ring-yellow focus:text-yellow-400 
     transition ease-in-out duration-150">
      Talks
    </button>
    <button
      type="button"
      on:click={() => saveURLState((podcasts = !podcasts))}
      class:bimodalpurple={podcasts}
      class:mytext={podcasts}
      class:font-medium={podcasts}
      class="-ml-px relative inline-flex items-center px-4 py-2 border
      border-gray-300 text-sm leading-5 dark:text-gray-200 text-gray-700
     focus:z-10 focus:outline-none
      focus:border-blue-300 focus:ring-yellow focus:text-yellow-400 
     transition ease-in-out duration-150">
      Podcasts
    </button>
    <button
      type="button"
      on:click={() => alert('coming soon')}
      class:bimodalpurple={tutorials}
      class:mytext={tutorials}
      class:font-medium={tutorials}
      class="-ml-px relative items-center px-4 py-2 border
      hidden md:inline-flex
      border-gray-300 text-sm leading-5 dark:text-gray-200 text-gray-700
     focus:z-10 focus:outline-none
      focus:border-blue-300 focus:ring-yellow focus:text-yellow-400 
     transition ease-in-out duration-150">
      <strike>Tutorials</strike>
    </button>
    <button
      type="button"
      on:click={() => alert('coming soon')}
      class:bimodalpurple={notes}
      class:mytext={notes}
      class:font-medium={notes}
      class="-ml-px relative items-center px-4 py-2
      hidden md:inline-flex
      sm:rounded-r-md border border-gray-300 text-sm leading-5
     dark:text-gray-200 text-gray-700 focus:z-10
      focus:outline-none focus:border-blue-300 focus:ring-yellow focus:text-yellow-400
       transition ease-in-out
      duration-150">
      <strike>Notes</strike>
    </button>
  </span>
</div>
<!-- <div class="pb-5 border-b border-gray-200 space-y-3 sm:flex sm:flex-col sm:items-center sm:justify-between sm:space-x-4 sm:space-y-0"> -->
<div>
  <!-- <div class=" bg-gray-200 shadow overflow-hidden sm:rounded-md"> -->
  {#if filteredData.length || !showAll}
    <!-- <ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"> -->
    <ul class="flex flex-col max-w-2xl sm:mx-4 bg-gray-200 dark:bg-gray-800 p-4 sm:rounded">
      {#each filteredData as item}
        {#if item.type === 'Essays'}
          <ShowcaseLineEssay {item} />
        {:else}
          <ShowcaseLine {item} uno={filteredData.length === 1} />
        {/if}
      {/each}
    </ul>
    {#if !showAll}
      <span
        class="flex justify-center my-8 rounded-md shadow-sm animate-bounce">
        <button
          on:click={() => (showAll = true)}
          type="button"
          class="inline-flex items-center border border-transparent leading-6
            font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500
            focus:outline-none focus:border-indigo-700
            focus:ring-indigo active:bg-indigo-700 transition
            ease-in-out duration-150 text-4xl p-8">
          Show All
        </button>
      </span>
    {/if}
  {:else}
    <div class="p-8 text-red-500">
      Nothing found! The filter was too restrictive.
      {#if !urlState.show}
        Please pick either Essays, Talks, or Podcasts to show.
      {/if}
      {#if urlState.filter}
        Please clear the filter bar and you'll see more stuff.
      {/if}
    </div>
  {/if}
  <!-- </div> -->
</div>
<!-- </div> -->
