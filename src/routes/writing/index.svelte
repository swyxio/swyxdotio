<script context="module">
  export function preload({ params, query }) {
    return this.ssgData({ key: 'writing' })
      .then(posts => ({ posts }))
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
  ul {
    margin: 0 0 1em 0;
    line-height: 1.5;
    list-style-type: none;
    display: grid;
    grid-gap: 0rem 1.5rem;
    grid-template-columns: 1fr 1fr 1fr;
  }
  @media (max-width: 480px) {
    ul {
      grid-template-columns: 1fr;
    }
  }
  li {
    margin-bottom: 1.5rem;
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
</style>

<svelte:head>
  <title>swyx | Writing</title>
  <meta property="og:url" content="https://www.swyx.io/writing/" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="swyx | Writing" />
  <meta name="Description" content="all of swyx's personal and work writing" />
  <meta
    property="og:description"
    content="all of swyx's personal and work writing" />
  <meta
    property="og:image"
    content="https://www.swyx.io/og_image/writing.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:creator" content="https://twitter.com/swyx/" />
  <meta name="twitter:title" content="swyx | Writing" />
  <meta
    name="twitter:description"
    content="all of swyx's personal and work writing" />
  <meta
    name="twitter:image"
    content="https://www.swyx.io/og_image/writing.png" />
</svelte:head>

<article>
  <header>
    <h1>Writing</h1>
  </header>
  <ul>
    {#each posts as post}
      <li>
        <a rel="prefetch" href="/writing/{post.metadata.slug}">
          <h2>{post.metadata.title}</h2>
          <div class="postlist__meta">
            <time
              class="postlist__date dt-published"
              datetime={post.metadata.date}>
              {prettyDate(post)}
            </time>
            <span aria-hidden="true">⋅</span>
            <span class="postlist__tags p-category">
              {post.metadata.categories && post.metadata.categories[0]}
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
