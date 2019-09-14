<script context="module">
  export async function preload({ params, query }) {
    // the `slug` parameter is available because
    // this file is called [slug].svelte
    const res = await this.fetch(`data/talks___ssg___${params.slug}.json`)
    const data = await res.json()

    if (res.status === 200) {
      return { post: data }
    } else {
      this.error(res.status, data.message)
    }
  }
</script>

<script>
  import { stores } from '@sapper/app';
  const { page } = stores();
  export let slug = $page.params.slug
  export let post
  export let description = post.metadata.desc || post.metadata.description 
  export let seoCategory = "swyx Talks"
  export let seoTitle = `${seoCategory} | ${post.metadata.title}`
  export let seoDescription = description || seoTitle
  export let category = "talks"
  export let date = post.metadata.dateString || 'no date specified'
  export let topic = post.metadata.topic ? post.metadata.topic + ' @ ' : ''

  export let videoId  = post.metadata.video || post.metadata.video_url
  if (videoId) {
    if (videoId.startsWith('https://www.youtube.com/watch')) {
      videoId = new URL(videoId).searchParams.get('v')
    } else if (videoId.startsWith('https://youtu.be/')) {
      videoId = videoId.slice(17)
    } else {
      videoId = null
    }
  }
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
  /* .content :global(h2) {
    font-size: 1.4em;
    font-weight: 500;
  } */

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

  h1, h2 {
    text-align: center;
    margin: 0 auto;
  }
  .VideoDiv {
    position: relative;
    overflow: hidden;
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
    color:rgb(254, 254, 218);
    background-color: rgb(18, 0, 18);
  }
</style>

<svelte:head>
  <title>{seoTitle}</title>
  <meta property="og:url" content={`https://www.swyx.io/${category}/${slug}`}>
  <meta property="og:type" content="article">
  <meta property="og:title" content={seoCategory}>
  <meta name="Description" content={seoDescription}>
  <meta property="og:description" content={seoDescription}>
  <meta property="og:image" content="https://www.swyx.io/swyx.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:creator" content="https://twitter.com/swyx/">
  <meta name="twitter:title" content={seoCategory}>
  <meta name="twitter:description" content={seoDescription}>
  <meta name="twitter:image" content="https://www.swyx.io/swyx.jpg">
</svelte:head>

<h1>{post.metadata.title} </h1>
<h2><b>{topic}</b>
{#if post.metadata.venues && post.metadata.url}
  {post.metadata.venues} <br /> {date} (<a href={post.metadata.url}>External link</a>)
{:else if post.metadata.venues}
  {post.metadata.venues} <br /> {date}
{:else if post.metadata.url}
  {date} (<a href={post.metadata.url}>External link</a>)
{/if}
</h2>



{#if videoId}
<div class="VideoDiv">
  <iframe
    src={`https://www.youtube.com/embed/${videoId}`}
    title={seoTitle}
    name={seoTitle}
    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
    frameBorder="0"
    webkitallowfullscreen="true"
    mozallowfullscreen="true"
    width="600"
    height="400"
    allowFullScreen
    aria-hidden="true"
  />
</div>
{/if}


<div class="content">
  <p> {description}
  </p>
  {@html post.html}
    <pre id="metadataDisplay">
      {JSON.stringify(post.metadata, null, 2)}
    </pre>
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
