<script context="module">
  export async function preload({ params, query }) {
    // the `slug` parameter is available because
    // this file is called [slug].svelte
    const res = await this.fetch(`data/writing___ssg___${params.slug}.json`)
    const data = await res.json()

    if (res.status === 200) {
      return { post: data }
    } else {
      this.error(res.status, data.message)
    }
  }
</script>

<script>
  export let post
  export let seoCategory = "swyx Writing"
  export let seoTitle = `${seoCategory} | ${post.metadata.title}`
  export let category = "writing"
</script>

<style>
  /*
		By default, CSS is locally scoped to the component,
		and any unused styles are dead-code-eliminated.
		In this page, Svelte can't know which elements are
		going to appear inside the {{{post.html}}} block,
		so we have to use the :global(...) modifier to target
		all elements inside .content
	*/
  .content :global(h2) {
    font-size: 1.4em;
    font-weight: 500;
  }

  .content :global(pre) {
    background-color: #f9f9f9;
    box-shadow: inset 1px 1px 5px rgba(0, 0, 0, 0.05);
    padding: 0.5em;
    border-radius: 2px;
    overflow-x: auto;
  }

  .content :global(pre) :global(code) {
    background-color: transparent;
    padding: 0;
  }

  .content :global(ul) {
    line-height: 1.5;
  }

  .content :global(li) {
    margin: 0 0 0.5em 0;
  }

  .content :global(img) {
    max-width: 80%;
    margin: 0 auto;
    display: block;
  }

  /* figure */
  h1 {
    text-align: center;
    margin: 0 auto;
  }
  /* img {
    max-width: 80%;
  } */
</style>

<svelte:head>
    <title>{seoTitle}</title>
    <meta property="og:url" content={`https://www.swyx.io/${category}/${params.slug}`}>
    <meta property="og:type" content="article">
    <meta property="og:title" content={seoCategory}>
    <meta property="og:description" content="shawn / @swyx / site">
    <meta property="og:image" content="https://www.swyx.io/swyx.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:creator" content="https://twitter.com/swyx/">
    <meta name="twitter:title" content={seoCategory}>
    <meta name="twitter:description" content="shawn / @swyx / site">
    <meta name="twitter:image" content="https://www.swyx.io/swyx.jpg">
</svelte:head>

<h1>{post.metadata.title}</h1>

<div class="content">
  {@html post.html}
</div>
<!-- 
<div class="content">
  {#if post.image}
  <figure>
    <img src={`/assets/${post.image}`} alt={post.title} />
    <figcaption>{post.title}</figcaption>
  </figure>
  {:else}
  <a href="{post.url}">{post.url}</a>
  {/if} {#if post.description}
  <div>{post.description}</div>
  {/if}
</div> -->
