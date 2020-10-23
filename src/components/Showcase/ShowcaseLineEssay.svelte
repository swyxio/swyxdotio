<script>
  export let item
  // $: longDesc = item.description || item.desc || 'No description provided. Suggest one!'
  function formatDate(date) {
    if (date.getFullYear() > 2019) return date.toDateString().slice(4,10)
    return date ? date.toISOString().slice(0, 10) : '???'
  }
</script>

<style>
  .longTitle {
    font-size: 1rem
  }
</style>
<li class="mb-4 md:mb-8">
  <div class="flex">
    <span
      class="inline-flex justify-end items-center text-gray-600 text-xs font-mono whitespace-no-wrap">{formatDate(item.effectiveDate) }</span>
    <a
      href={`/${item.slug}`}
      class="relative -mr-px inline-flex text-sm text-left leading-5
        text-gray-700 font-medium">
      <h3
        class="text-gray-300 hover:text-teal-600 focus:text-teal-600 text-base md:text-2xl leading-5
          font-medium whitespace-normal ml-4 inline"
        class:longTitle={item.title.length > 58}
      >
        {item.title}
      </h3>
      {#if item.categories}
        <span class="font-mono text-xs ml-4 hidden md:inline">
          {item.categories && item.categories.length ? item.categories.map(x => `#${x}`).join(', ') : 'Uncategorized'}
        </span>
      {/if}
    </a>
  </div>
  <!-- <div class="ml-4 mt-4 p-4">
    <p
      class="prose mt-1 text-gray-500 text-sm md:text-xl leading-5
        whitespace-normal">
        <span>{longDesc}</span>
    </p>
  </div> -->
</li>
