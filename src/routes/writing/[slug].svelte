<script context="module">
  export async function preload({ params, query }) {
    const writingIndex = await this.fetch(
      `/data/writing___ssg___index.json`
    ).then(x => x.json())
    const post = writingIndex[params.slug]
    // console.log({ post });
    const uid = post.uid
    const res = await this.fetch(`/data/writing___ssg___${uid}.json`)
    const data = await res.json()
    post.html = data
    if (res.status === 200) {
      return { post }
    } else {
      this.error(res.status, data.message)
    }
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
let seoSubtitle = post.metadata.subtitle
  export let seoTitle = seoSubtitle ? `${post.metadata.title}: ${seoSubtitle}` : `${seoCategory} | ${post.metadata.title}`
  export let seoDescription =
    post.metadata.desc || post.metadata.description || seoTitle
  export let category = 'writing'
</script>

<style>
  h1 {
    text-align: center;
    margin: 0 auto;
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
    content="https://www.swyx.io/{category}/{slug}.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:creator" content="https://twitter.com/swyx/" />
  <meta name="twitter:title" content={seoTitle} />
  <meta name="twitter:description" content={seoDescription} />
  <meta
    name="twitter:image"
    content="https://www.swyx.io/{category}/{slug}.png" />
</svelte:head>

<SlugTemplate>
  <h1>{post.metadata.title}</h1>
  {#if seoSubtitle}
  <h2>{seoSubtitle}</h2>
  {/if}
  {@html post.html}
</SlugTemplate>
