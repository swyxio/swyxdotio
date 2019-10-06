<script context="module">
  export async function preload({ params, query }) {
    const talkIndex = await this.fetch(`/data/speaking___ssg___index.json`).then(
      x => x.json()
    )
    const post = talkIndex[params.slug]
    const uid = post.uid
    const res = await this.fetch(`/data/speaking___ssg___${uid}.json`)
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
  export let seoCategory = 'swyx Speaking'

  let seoSubtitle = post.metadata.subtitle
  export let seoTitle = seoSubtitle
    ? `${post.metadata.title}: ${seoSubtitle}`
    : `${seoCategory} | ${post.metadata.title}`
  export let seoDescription =
    post.metadata.desc || post.metadata.description || seoTitle
  export let category = 'speaking'
  export let date = post.metadata.dateString || 'no date specified'
  export let topic = post.metadata.topic ? post.metadata.topic + ' @ ' : ''

  export let videoId = post.metadata.video || post.metadata.video_url
  if (videoId) {
    if (videoId.startsWith('https://www.youtube.com/watch')) {
      videoId = new URL(videoId).searchParams.get('v')
    } else if (videoId.startsWith('https://youtu.be/')) {
      videoId = videoId.slice(17)
    } else {
      videoId = null
    }
  }
  // $: console.log({ post })
</script>

<style>
  h1,
  h2 {
    text-align: center;
    margin: 0 auto;
  }
  .VideoDiv {
    position: relative;
    overflow: hidden;
    width: 80%;
    margin: 0 auto;
    border: 3px solid black;
    padding-top: 56.25%;
    padding-bottom: -56.25%;
    margin-bottom: 2rem;
  }
  .VideoDiv iframe {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    border: 0px;
  }
  #metadataDisplay {
    color: rgb(254, 254, 218);
    background-color: rgb(18, 0, 18);
  }
  .talkHeaderDiv {
    background: #273036;
    color: rgb(254, 254, 218);
  }
  .talkHeaderDiv a {
    color: white;
  }

  @media (min-width: 480px) {
    .talkHeaderDiv h1 {
      font-size: 60px;
    }
    .talkHeaderDiv h2 {
      font-size: 40px;
    }
  }
  .svgwave {
    width: 100%;
    margin-bottom: -1vh;
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
  <meta name="twitter:creator" content="https://twitter.com/swyx/" />
  <meta name="twitter:title" content={seoTitle} />
  <meta name="twitter:description" content={seoDescription} />
  <meta
    name="twitter:image"
    content="https://www.swyx.io/og_image/{category}/{slug}.png" />
</svelte:head>

<div class="talkHeaderDiv">
  <h1>{post.metadata.title}</h1>
  <h2>
    <b>{topic}</b>
    {#if post.metadata.venues && post.metadata.url}
      {post.metadata.venues}
      <br />
      {date} (
      <a href={post.metadata.url}>External link</a>
      )
    {:else if post.metadata.venues}
      {post.metadata.venues}
      <br />
      {date}
    {:else if post.metadata.url}
      {date} (
      <a href={post.metadata.url}>External link</a>
      )
    {/if}
  </h2>
</div>
<svg class="svgwave" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
  <path
    fill="#273036"
    fill-opacity="1"
    d="M0,160L60,160C120,160,240,160,360,176C480,192,600,224,720,208C840,192,960,128,1080,133.3C1200,139,1320,213,1380,250.7L1440,288L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z" />
</svg>
{#if videoId}
  <div class="VideoDiv">
    <iframe
      src={`https://www.youtube.com/embed/${videoId}`}
      title={seoTitle}
      name={seoTitle}
      allow="accelerometer; autoplay; encrypted-media; gyroscope;
      picture-in-picture"
      frameBorder="0"
      webkitallowfullscreen="true"
      mozallowfullscreen="true"
      width="600"
      height="400"
      allowFullScreen
      aria-hidden="true" />
  </div>
{/if}
<SlugTemplate>
  {#if seoDescription}
    <p>Description: {seoDescription}</p>
  {/if}
  {#if post.html}
    {@html post.html}
  {/if}
  <pre id="metadataDisplay">{JSON.stringify(post.metadata, null, 2)}</pre>
</SlugTemplate>
