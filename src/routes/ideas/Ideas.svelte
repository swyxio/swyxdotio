<script>
  // import BlogTeaser from '../../components/BlogTeaser/BlogTeaser.svelte'
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
  <link rel="canonical" href="https://www.swyx.io/ideas/" />
  <link rel="alternate" type="application/rss+xml" href="https://swyx.io/rss.xml" />
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

<div class="pt-4 pb-20 sm:px-6 lg:pt-8 lg:pb-28 lg:px-8 container mx-auto
max-w-xl lg:max-w-2xl xl:max-w-3xl
">
  <Showcase hydrate-client={{ data: _data }} />
</div>
