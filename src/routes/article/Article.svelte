<script>
  export let data
  const { html, frontmatter } = data
</script>

<style>
  :global(.prose ul > li) {
    margin-top: 0;
    margin-bottom: 0;
  }
</style>

<svelte:head>
  <title>{frontmatter.title} | swyx.io</title>
</svelte:head>
<a href="/">&LeftArrow; Home</a>

<article
  class="px-4 py-10 max-w-3xl mx-auto sm:px-6 sm:py-12 lg:max-w-4xl lg:py-16
    lg:px-8 xl:max-w-6xl">
    
    <div class="flex gap-2">
      {#each frontmatter.categories as tag}
      <span
        class="inline-flex items-center px-3 py-0.5 rounded-full text-sm
          font-medium leading-5 bg-indigo-100 text-indigo-800">
        {tag}
      </span>
    {/each}
    </div>
  <div class="prose lg:prose-xl">
    <div class="title">
      <h1 class="text-white">{frontmatter.title}</h1>
      {#if frontmatter.author}<small>By {frontmatter.author}</small>{/if}
    </div>

    {#if html}
      {@html html}
    {:else}
      <h1>There was a problem rendering this page - please let @swyx know!</h1>
    {/if}
  </div>
</article>
