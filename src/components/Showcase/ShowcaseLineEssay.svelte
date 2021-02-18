<script>
  export let item
  // $: longDesc = item.description || item.desc || 'No description provided. Suggest one!'
  function formatDate(date) {
    if (date.getFullYear() > 2020) return date.toDateString().slice(4,10)
    return date ? date.toISOString().slice(0, 10) : '???'
  }
</script>

<style>
  .longTitle {
    font-size: 1rem
  }
</style>
<li class="mb-4 md:mb-8 px-1">
  <div class="flex flex-col">
    <span
      class="inline-flex uppercase items-center text-gray-400 text-xs font-mono whitespace-nowrap">{formatDate(item.effectiveDate) }</span>
    <a
      href={`/${item.slug}`}
      class="relative -mr-px inline-flex text-left leading-5
        mytext font-medium">
      <h3
        class="mylinkcolors text-base md:text-lg leading-5
          font-medium whitespace-normal inline"
        class:longTitle={item.title.length > 58}
      >
        {item.title}
      </h3>
    </a>
    {#if item.categories}
    <div class="mytext font-mono text-xs italic hidden md:inline-flex items-center">
        {item.categories && item.categories.length ? item.categories.map(x => `#${x}`).join(', ') : 'Uncategorized'}
    </div>
    {/if}
  </div>
  <!-- <div class="ml-4 mt-4 p-4">
    <p
      class="prose mt-1 text-gray-500 text-sm md:text-xl leading-5
        whitespace-normal">
        <span>{longDesc}</span>
    </p>
  </div> -->
</li>
