<script context="module">
  export function preload({ params, query }) {
    return this.ssgData({ key: 'speaking' })
      .then(posts => ({ posts: Object.values(posts) }))
      .catch(err => {
        this.error(500, err.message)
      })
  }
</script>

<script>
  export let posts
  // $: console.log({ posts })
</script>

<style>
  h2 {
    font-weight: 700;
  }
  ul.allTalks {
    margin: 0 0 1em 0;
    line-height: 1.5;
    list-style-type: none;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-gap: 3rem 1.5rem;
  }
  @media (max-width: 480px) {
    ul.allTalks {
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

  <h2>My Best Talks</h2>
  <div>
    I have done a bunch of talks and podcast appearances. The best of which are:
    <ul>
      <li>
        <a href="/speaking/react-hooks">Getting Closure on Hooks</a>
      </li>
      <li>
        <a href="/speaking/react-not-reactive">Why React is not Reactive</a>
      </li>

      <li>
        <a href="/speaking/contributing-to-react">Contributing to React</a>
      </li>
      <li>
        <a href="/speaking/learn-in-public-nyc">Learn In Public</a>
      </li>
      <li>
        <a href="/speaking/babel-macros">Babel Macros (the Moana talk)</a>
      </li>
    </ul>
  </div>

  <h2>All Talks</h2>
  <ul class="allTalks">
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
