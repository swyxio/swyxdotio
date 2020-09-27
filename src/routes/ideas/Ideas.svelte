<script>
  import BlogTeaser from '../../components/BlogTeaser/BlogTeaser.svelte'
  import Showcase from '../../components/Showcase/Showcase.svelte'
  export let data

  let _data = [
    ...data.podcasts.map((x) => void (x.type = 'Podcasts') || x),
    ...data.talks.map((x) => void (x.type = 'Talks') || x),
    ...data.markdown.map((x) => void (x.data.type = 'Essays') || x.data)
  ]
</script>

<svelte:head>
  <title>swyx | Ideas</title>
  <meta property="og:url" content="https://www.swyx.io/ideas/" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="swyx | Ideas" />
  <meta
    name="Description"
    content="all of swyx's Talks, Podcasts, and Essays" />
  <meta
    property="og:description"
    content="all of swyx's Talks, Podcasts, and Essays" />
  <meta property="og:image" content="https://www.swyx.io/swyx.jpg" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:creator" content="https://twitter.com/swyx/" />
  <meta name="twitter:title" content="swyx | Ideas" />
  <meta
    name="twitter:description"
    content="all of swyx's Talks, Podcasts, and Essays" />
  <meta
    name="twitter:image"
    content="https://www.swyx.io/og_image/speaking.png" />
</svelte:head>

<div
  class="pt-16 pb-20 px-4 sm:px-6 lg:pt-24 lg:pb-28 lg:px-8 container mx-auto">
  <Showcase hydrate-client={{ data: _data }} />
  <!-- <div
    class="mt-12 grid gap-16 border-t-2 border-gray-100 pt-12 lg:grid-cols-3
      lg:col-gap-5 lg:row-gap-12">
    {#each data.markdown as blog}
      <BlogTeaser { blog } />
    {/each}
  </div> -->
</div>
