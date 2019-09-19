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
  export let seoTitle = `${seoCategory} | ${post.metadata.title}`
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

<SlugTemplate>
  <h1>{post.metadata.title}</h1>
  {@html post.html}
</SlugTemplate>
