<script context="module">
  export function preload({ params, query }) {
    return this.fetch(`data/writing___ssg___index.json`)
      .then(r => r.json())
      .then(posts => ({ posts: Object.values(posts) }))
      .catch(err => {
        this.error(500, err.message);
      });
  }
</script>

<script>
  export let posts;
</script>

<style>
  ul {
    margin: 0 0 1em 0;
    line-height: 1.5;
    list-style-type: none;
    display: grid;
    grid-gap: 3rem 1.5rem;
    grid-template-columns: 1fr 1fr 1fr;
  }
  @media (max-width: 400px) {
    ul {
      grid-template-columns: 1fr;
    }
  }
  li {
    margin-bottom: 1.5rem;
    background: linear-gradient(to right, #647bd8, #93199f);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  article {
    padding: 1rem;
    max-width: 56em;
    margin: 0 auto;
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
  <meta property="og:image" content="https://www.swyx.io/swyx.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:creator" content="https://twitter.com/swyx/" />
  <meta name="twitter:title" content="swyx | Writing" />
  <meta
    name="twitter:description"
    content="all of swyx's personal and work writing" />
  <meta name="twitter:image" content="https://www.swyx.io/swyx.jpg" />
</svelte:head>

<article>
  <h1>Writing</h1>
  <!-- <pre>
  {JSON.stringify(posts)}
</pre> -->

  <ul>
    {#each posts as post}
      <li>
        <a rel="prefetch" href="/writing/{post.metadata.slug}">
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
