<script context="module">
  export async function preload({ params, query }) {
    const writingIndex = await this.fetch(
      `data/writing___ssg___index.json`
    ).then(x => x.json());
    const post = writingIndex[params.slug];
    // console.log({ post });
    const uid = post.uid;
    const res = await this.fetch(`data/writing___ssg___${uid}.json`);
    const data = await res.json();
    post.html = data;
    if (res.status === 200) {
      return { post };
    } else {
      this.error(res.status, data.message);
    }
  }
</script>

<script>
  import { stores } from "@sapper/app";
  const { page } = stores();
  export let slug = $page.params.slug;
  export let post;
  export let seoCategory = "swyx Writing";
  export let seoTitle = `${seoCategory} | ${post.metadata.title}`;
  export let seoDescription =
    post.metadata.desc || post.metadata.description || seoTitle;
  export let category = "writing";
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
  .content {
    padding: 1em;
    max-width: 56em;
    margin: 0 auto;
  }
  .content :global(h2) {
    font-size: 1.4em;
    font-weight: 500;
  }

  .content :global(pre) {
    font-size: 80%;
    background-color: #292d3e;
    box-shadow: inset 1px 1px 5px rgba(0, 0, 0, 0.05);
    padding: 1em;
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
  @media (min-width: 640px) {
    .content :global(a)::before {
      content: attr(href);
      position: absolute;
      transform: translate(-10rem, 1.5rem) scale(0);
      background: linear-gradient(45deg, #c3c9df, #e0c0e3);
      visibility: visible;
      transition: all 0.5s;
      opacity: 0;
    }
    .content :global(a):hover::before {
      opacity: 1;
      transform: translateY(1.5rem) scale(1);
    }
  }
  /* figure */
  h1 {
    text-align: center;
    margin: 0 auto;
  }
</style>

<svelte:head>
  <title>{seoTitle}</title>
  <meta property="og:url" content={`https://www.swyx.io/${category}/${slug}`} />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={seoCategory} />
  <meta name="Description" content={seoDescription} />
  <meta property="og:description" content={seoDescription} />
  <meta property="og:image" content="https://www.swyx.io/swyx.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:creator" content="https://twitter.com/swyx/" />
  <meta name="twitter:title" content={seoCategory} />
  <meta name="twitter:description" content={seoDescription} />
  <meta name="twitter:image" content="https://www.swyx.io/swyx.jpg" />
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
