<script>
  let page = 0
  export let target
  if (!target) console.error('error: no target')
  const counts = fetch(`https://webmention.io/api/count.json?target=${target}`)
    .then(res => res.json())
    .then(x => x.type)
  const promiseFactory = () =>
    fetch(
      // `https://webmention.io/api/mentions?page=${page}&per-page=20&sort-by=published&target=${target}`,
      `https://webmention.io/api/mentions?page=${page}&target=${target}`
    )
      .then(x => x.json())
      .then(x => x.links) // array
  let promise = promiseFactory()
  const dec = () => {
    page -= 1
    promise = promiseFactory()
  }
  const inc = () => {
    page += 1
    promise = promiseFactory()
  }
</script>

<style>
  #WebMentions {
    margin: 0 auto;
    font-style: italic;
    width: 80%;
    min-width: 300px;
  }
  h3 {
    display: inline;
  }
  .WebMentionsContainer {
    border: 1px dashed var(--link-color);
    padding: 1rem;
    margin-top: 1rem;
  }
  hr {
    margin: 3rem 1rem;
  }
</style>

<hr />
<div id="WebMentions">
  <h3
    font-family="system"
    font-size="4"
    font-weight="bold"
  >
    Webmentions 
  </h3>
  <a
      target="_blank"
      rel="noopener"
      href="https://indieweb.org/Webmention"
      color="blue">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="0.75em"
          height="0.75em"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#999"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12" y2="17" />
        </svg>
    </a>
  <div class="WebMentionsContainer">
  {#await counts}
    <p>loading counts</p>
  {:then data}
    {#if data === undefined}
      Failed to load...
    {:else}
      ❤️ {data.like + data.repost || 0} 💬 {data.mention + data.reply || 0}
    {/if}
  {/await}
  {#await promise}
    <p>Loading replies...</p>
  {:then links}
    {#if links.length === 0}
      <div>
        No replies yet.
        <a
          href="https://twitter.com/intent/tweet/?text=My%20thoughts%20on%20{target}">
          Tweet about this post
        </a>
        and it will show up here!
      </div>
    {:else}
      <div>
        <button on:click={dec} disabled={page === 0}>-</button>
        Page {page + 1}
        <button on:click={inc}>+</button>
      </div>
      <h1>Replies</h1>
      <ul>
        {#each links as link}
          <li>
            <div width="40">
              <a
                target="_blank"
                rel="noopener"
                href={link.data.url}
                color="blue">
                <img
                  width="40"
                  height="40"
                  alt="avatar of {link.data.author.name}"
                  src={link.data.author.photo} />
              </a>
            </div>
            <div>
              <a
                target="_blank"
                rel="noopener"
                href={link.data.url}
                color="blue">
                <div font-family="system" color="text" font-weight="bold">
                  {link.data.author.name}
                  <span color="tertiary">
                    · {new Date(link.data.published)}
                  </span>
                </div>
              </a>
              <div>
                <p font-family="system" color="tertiary" font-size="2">
                  {@html link.activity.sentence_html}
                </p>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  {:catch error}
    <!-- promise was rejected -->
    <p>Something went wrong: {error.message}</p>
  {/await}
    </div>
</div>
