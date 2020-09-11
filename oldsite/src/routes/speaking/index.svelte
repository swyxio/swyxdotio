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
  function prettyDate(post) {
    return new Date(post.metadata.date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
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
    grid-gap: 0rem 1.5rem;
    padding: 0;
  }
  @media (max-width: 480px) {
    ul.allTalks {
      grid-template-columns: 1fr;
    }
  }
  .allTalks li {
    margin-bottom: 1.5rem;
    overflow: scroll;
    /* background: linear-gradient(45deg, #337bd8, #6433d8);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent; */
  }
  article {
    padding: 1rem;
    max-width: 56em;
    margin: 0 auto;
  }
  a {
    color: var(--brand-color-primary);
  }
  .postlist__meta {
    font-size: 1.125rem;
    margin-bottom: 1rem;
    color: var(--text-color-secondary);
  }
  .postlist__tags {
    font-family: Georgia, Times, serif;
    text-transform: uppercase;
    font-size: 0.875em;
    letter-spacing: 3px;
  }
  .postlist__excerpt {
    font-size: 1.125rem;
    line-height: 1.65;
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
  <header>
    <h1>Speaking</h1>
  </header>
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
          <h2>{post.metadata.title}</h2>
          <div class="postlist__meta">
            <time
              class="postlist__date dt-published"
              datetime={post.metadata.date}>
              {prettyDate(post)}
            </time>
            <span aria-hidden="true">⋅</span>
            <span class="postlist__tags p-category">
              {post.metadata.topic || ''}
            </span>
          </div>
        </a>
        <p class="postlist__excerpt p-summary">
          {post.metadata.description || post.metadata.desc || post.metadata.subtitle || ''}
        </p>
      </li>
    {/each}
  </ul>
</article>
