<script>
  export let data;
  const { html, frontmatter } = data;
</script>

<style>
</style>

<svelte:head>
  <title>{frontmatter.title} | swyx.io</title>
</svelte:head>
<a href="/">&LeftArrow; Home</a>

<article class="prose lg:prose-xl">
  <div class="title">
    <h1>{frontmatter.title}</h1>
    {#if frontmatter.author}<small>By {frontmatter.author}</small>{/if}
  </div>

  {#if html}
    {@html html}
  {:else}
    <h1>There was a problem rendering this page - please let swyx know!</h1>
  {/if}
</article>
