<script>
  export let item
  $: longDesc =
    item.description || item.desc || 'No description provided. Suggest one!'
</script>

<li class="mb-8">
  <div class="flex md:items-center flex-col md:flex-row">
    <span
      class="mr-4 text-gray-300 text-xs font-mono w-20">{item.effectiveDate ? item.effectiveDate
            .toISOString()
            .slice(0, 10) : '???'}</span>
    <span
      class="flex-shrink-0 inline md:inline-block px-2 py-0.5 text-xs leading-4
        font-medium rounded-full bg-green-100 text-green-800">
      {item.type}
    </span>
    <a
      href={`/${item.slug}`}
      class="relative -mr-px inline-flex text-sm text-left leading-5
        text-gray-700 font-medium border border-transparent focus:outline-none
        focus:shadow-outline-blue focus:border-blue-300 focus:z-10 transition
        ease-in-out duration-150">
      <h3
        class="text-gray-300 hover:text-teal-600 text-base md:text-2xl leading-5
          font-medium whitespace-normal ml-4 inline">
        {item.title}
      </h3>
    </a>
  </div>
  <div class="ml-4 mt-4 p-4">
    <p
      class="prose mt-1 text-gray-500 text-sm md:text-xl leading-5
        whitespace-normal">
        <span>{longDesc}</span>
        {#if item.categories}
          <span class="inline font-mono text-xs">
            {item.categories && item.categories.length ? item.categories.map(x => `#${x}`).join(', ') : 'Uncategorized'}
          </span>
        {/if}
    </p>
  </div>
</li>
