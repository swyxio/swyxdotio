<script context="module">
  export function preload({ params, query }) {
    return this.fetch(`/data/speaking___ssg___index.json`)
      .then(r => r.json())
      .then(posts => ({ posts: Object.values(posts) }))
      .catch(err => {
        this.error(500, err.message)
      })
  }
</script>

<script>
  export let posts
  // $: console.log({ posts });
</script>

<style>
  ul {
    margin: 0 0 1em 0;
    line-height: 1.5;
    list-style-type: none;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-gap: 3rem 1.5rem;
  }
  @media (max-width: 480px) {
    ul {
      grid-template-columns: 1fr;
    }
  }
  li {
    margin-bottom: 1.5rem;
    background: linear-gradient(45deg, #337bd8, #6433d8);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  article {
    padding: 1rem;
    max-width: 56em;
    margin: 0 auto;
  }
</style>

<svelte:head>
  <title>swyx | Speaking</title>
  <meta property="og:url" content="https://www.swyx.io/speaking/" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="swyx | Speaking" />
  <meta name="Description" content="all of swyx's speaking" />
  <meta property="og:description" content="all of swyx's speaking" />
  <meta
    property="og:image"
    content="https://www.swyx.io/og_image/speaking.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:creator" content="https://twitter.com/swyx/" />
  <meta name="twitter:title" content="swyx | Speaking" />
  <meta name="twitter:description" content="all of swyx's speaking" />
  <meta
    name="twitter:image"
    content="https://www.swyx.io/og_image/speaking.png" />
</svelte:head>

<article>
  <h1>Speaking</h1>
  <ul>
    {#each posts as post}
      <li>
        <a rel="prefetch" href="/speaking/{post.metadata.slug}">
          <strong>{post.metadata.title}</strong>
        </a>
        <br />
        -
        <em>
          {new Date(post.metadata.date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </em>
      </li>
    {/each}
  </ul>
</article>
