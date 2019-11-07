<script context="module">
  export async function preload({ params, query }) {
    const post = await this.ssgData({ key: 'writing', id: params.slug })
    return { post }
  }
</script>

<script>
  // hack for adding location onto anchor links bc of base element
  import { onMount } from 'svelte'
  onMount(async () => {
    ;[...document.querySelectorAll('a[href^="#"]')].map(
      x => (x.href = document.location + new URL(x.href).hash)
    )
  })
  import { stores } from '@sapper/app'
  import SlugTemplate from '../_slug.svelte'
  const { page } = stores()
  export let slug = $page.params.slug
  export let post
  export let seoCategory = 'swyx Writing'
  // $: console.log({ post })
  let seoSubtitle = post.metadata && post.metadata.subtitle
  export let seoTitle = seoSubtitle
    ? `${post.metadata && post.metadata.title}: ${seoSubtitle}`
    : `${seoCategory} | ${post.metadata && post.metadata.title}`
  export let seoDescription = post.metadata
    ? post.metadata.desc || post.metadata.description || seoTitle
    : seoTitle
  export let category = 'writing'
</script>

<style>
  h1 {
    text-align: center;
    margin: 0 auto;
  }
  h2 {
    width: 60%;
    min-width: 300px;
  }
  #postSubtitle {
    text-align: center;
    margin: 0 auto;
    font-style: italic;
  }
</style>

<svelte:head>
  <title>{seoTitle}</title>
  <meta property="og:url" content={`https://www.swyx.io/${category}/${slug}`} />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={seoTitle} />
  <meta name="Description" content={seoDescription} />
  <meta property="og:description" content={seoDescription} />
  <meta
    property="og:image"
    content="https://www.swyx.io/og_image/{category}/{slug}.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:domain" value="swyx.io" />
  <meta name="twitter:creator" value="https://twitter.com/swyx/" />
  <meta name="twitter:title" value={seoTitle} />
  <meta name="twitter:description" value={seoDescription} />
  <meta
    name="twitter:image"
    content="https://www.swyx.io/og_image/{category}/{slug}.png" />
  <meta name="twitter:label1" value="Published on" />
  <meta
    name="twitter:data1"
    value={new Date(post.metadata.date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })} />
  <meta name="twitter:label2" value="Reading Time" />
  <meta name="twitter:data2" value="10 minutes" />
</svelte:head>

<SlugTemplate>
  <h1 id="postTitle">{post.metadata.title}</h1>
  {#if seoSubtitle}
    <h2 id="postSubtitle">{seoSubtitle}</h2>
  {/if}
  {@html post.html}
</SlugTemplate>
