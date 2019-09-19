<script context="module">
  export async function preload({ params, query }) {
    const talkIndex = await this.fetch(`/data/talks___ssg___index.json`).then(
      x => x.json()
    )
    const post = talkIndex[params.slug]
    const uid = post.uid
    const res = await this.fetch(`/data/talks___ssg___${uid}.json`)
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
  import { stores } from '@sapper/app'
  import SlugTemplate from '../_slug.svelte'
  const { page } = stores()
  export let slug = $page.params.slug
  export let post
  export let description = post.metadata.desc || post.metadata.description
  export let seoCategory = 'swyx Talks'
  export let seoTitle = `${seoCategory} | ${post.metadata.title}`
  export let seoDescription = description || seoTitle
  export let category = 'talks'
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
  /* .content :global(a) {
    text-decoration: none;
    background-image: linear-gradient(45deg, #b6bedf, #9a6a9e);
    background-position: 0% 100%;
    background-repeat: no-repeat;
    background-size: 0% 100%;
    transition: background-size cubic-bezier(0, 0.5, 0, 1) 0.3s;
  }

  .content :global(a):hover,
  .content :global(a):focus {
    text-decoration: none;
    background-size: 100% 100%;
  } */
  /* 
  .content :global(pre) {
    font-size: 80%;
    background-color: #292d3e;
    box-shadow: inset 1px 1px 5px rgba(0, 0, 0, 0.05);
    padding: 0.5em;
    margin-left: -1em;
    margin-right: -1em;
    border-radius: 2px;
    overflow-x: auto;
  } */

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
  .svgwave {
    width: 100%;
    margin-bottom: -1vh;
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
  {#if description}
    <p>{description}</p>
  {/if}
  {#if post.html}
    {@html post.html}
  {/if}
  <pre id="metadataDisplay">{JSON.stringify(post.metadata, null, 2)}</pre>
</SlugTemplate>
