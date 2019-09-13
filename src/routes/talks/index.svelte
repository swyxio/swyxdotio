<script context="module">
  export function preload({ params, query }) {
    return this.fetch(`data/talks___ssg___talks_index.json`)
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
  img {
    max-width: 95%;
  }
</style>

<svelte:head>
  <title>swyx | Talks</title>
</svelte:head>

<h1>Talks</h1>
<!-- <pre>
  {JSON.stringify(posts)}
</pre> -->

<ul>
  {#each posts as post}
  <li>
    <strong>
      <a rel="prefetch" href="/talks/{post.slug}">
        {post.title}
      </a>
    </strong>
    <br />
    - {new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
  </li>
  {/each}
</ul>
