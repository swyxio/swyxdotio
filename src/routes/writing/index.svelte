<script context="module">
  export function preload({ params, query }) {
    return this.fetch(`data/writing___ssg___writing_index.json`)
      .then((r) => r.json())
      .then((_posts) => {
        const posts = _posts.sort((b, a) => new Date(a.date) - new Date(b.date))
        return { posts }
      })
      .catch((err) => {
        this.error(500, err.message)
      })
  }
</script>

<script>
  export let posts
</script>

<style>
  ul {
    margin: 0 0 1em 0;
    line-height: 1.5;
    list-style-type: none;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
  }
  @media (max-width: 400px) {
    ul {
      grid-template-columns: 1fr;
    }
  }
  li {
    margin-bottom: 1.5rem;
  }

  /* h1, figure, p {
		text-align: center;
		margin: 0 auto;
	} */
  /* img {
    max-width: 95%;
  } */
</style>

<svelte:head>
  <title>swyx | Writing</title>
  <meta property="og:url" content="https://www.swyx.io/writing/">
  <meta property="og:type" content="article">
  <meta property="og:title" content="swyx | Writing">
  <meta property="og:description" content="shawn / @swyx / site">
  <meta property="og:image" content="https://www.swyx.io/swyx.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:creator" content="https://twitter.com/swyx/">
  <meta name="twitter:title" content="swyx | Writing">
  <meta name="twitter:description" content="shawn / @swyx / site">
  <meta name="twitter:image" content="https://www.swyx.io/swyx.jpg">
</svelte:head>

<h1>Writing</h1>
<!-- <pre>
  {JSON.stringify(posts)}
</pre> -->

<ul>
  {#each posts as post}
  <li>
    <strong>
      <a rel="prefetch" href="/writing/{post.slug}">
        {post.title}
      </a>
    </strong>
    <br />
    - {new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
  </li>
  {/each}
</ul>
