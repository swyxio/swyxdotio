<script context="module">
  export function preload({ params, query }) {
    return this.fetch(`/data/writing___ssg___index.json`)
      .then(r => r.json())
      .then(posts => ({ posts: Object.values(posts) }))
      .catch(err => {
        throw err // try to see what the error is
        this.error(500, err.message)
      })
  }
</script>

<script>
  import Fuse from 'fuse.js'
  import { onMount } from 'svelte'
  let searchterm = ''
  export let posts
  let results = []
  // $: console.log({ posts })
  $: {
    var options = {
      keys: ['title', 'slug', 'desc', 'description']
    }
    var fuse = new Fuse(posts.map(x => x.metadata), options)
    results = fuse.search(searchterm)
  }
  onMount(async () => {
    if (document.location.pathname !== '/search/') {
      searchterm = document.location.pathname.split('/').join(' ')
      console.log('setting searchterm', searchterm)
    }
  })
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
  @media (max-width: 480px) {
    ul {
      grid-template-columns: 1fr;
    }
  }
  li {
    margin-bottom: 1.5rem;
    background: linear-gradient(to right, #647bd8, #93199f);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  article {
    padding: 1rem;
    max-width: var(--line-length);
    margin: 0 auto;
  }
</style>

<svelte:head>
  <title>Search</title>
</svelte:head>

<article>
  <h1>Search this site</h1>

  <label>
    Search:
    <input bind:value={searchterm} placeholder="search things" />
  </label>

  <ul>
    {#each results as post}
      <li>
        <a rel="prefetch" href="/writing/{post.slug}">
          <strong>{post.title}</strong>
        </a>
        <br />
        -
        <em>
          {new Date(post.date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </em>
      </li>
    {/each}
  </ul>
</article>
