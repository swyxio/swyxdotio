<script>
  let page = 0
  export let target
  if (!target) console.error('error: no target')
  let counts
  let mentions = []
  let fetchState = 'fetching'
  import { onMount } from 'svelte'
  onMount(() => {
    counts = fetch(`https://webmention.io/api/count.json?target=${target}/`) // trailing slash impt
      .then(res => res.json())
      .then(x => x.type)
    getMentions().then(x => {
      mentions = x
      fetchState = 'done'
      return fetchMore()
    })
  })
  function getMentions() {
    return fetch(
      // `https://webmention.io/api/mentions?page=${page}&per-page=20&sort-by=published&target=${target}`,
      `https://webmention.io/api/mentions?page=${page}&per-page=20&target=${target}/` // trailing slash impt
    )
      .then(x => x.json())
      .then(x => x.links.filter(x => x.activity.type !== 'like'))
  }
  const fetchMore = () => {
    page += 1
    getMentions().then(x => {
      if (x.length) {
        mentions = [...mentions, ...x]
      } else {
        fetchState = 'nomore'
      }
    })
  }
  function cleanString(str) {
    const withSlash = target + '/'
    const linky = `<a href="${withSlash}">${withSlash}</a>`
    return str
      .replace(linky, '') // drop self referential <a> tags
      .replace('<script>', '<$cript>') // sneaky sneaky!
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
    color: var(--text-color);
  }
  .WebMentionsContainer ul {
    list-style-type: none;
    padding: 0;
  }
  hr {
    margin: 3rem 1rem;
  }
  .WebMentionReply {
    margin-top: 16px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .Avatar {
    margin-right: 16px;
    width: 40px;
    flex: 0 0 auto;
    align-self: start;
  }
  .Avatar img {
    width: 40px;
    max-width: 100%;
    height: 40px;
    margin: 0px;
    border-radius: 50%;
  }
  .WebMentionsHeader {
    display: flex;
    justify-content: space-between;
  }
  .FetchMore {
    width: 20ch;
    font-size: 1.5rem;
    background-color: transparent;
    color: var(--link-color);
    border: 0;
    text-align: left;
  }
  svg {
    display: inline
  }
</style>

<hr />
<div id="WebMentions">
  <h3 font-family="system" font-size="4" font-weight="bold">Webmentions</h3>
  <a
    aria-label="Clientside Webmentions"
    target="_blank"
    rel="noopener"
    href="http://swyx.io/writing/clientside-webmentions"
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
    <div class="WebMentionsHeader">
      {#await counts}
        <p>loading counts</p>
      {:then data}
        <div>
          {#if data === undefined}
            Failed to load...
          {:else}
            ❤️ {data.like + data.repost || 0} 💬 {data.mention + data.reply || 0}
          {/if}
        </div>
      {/await}
    </div>
    {#if fetchState === 'fetching'}
      <div />
    {:else if mentions.length === 0}
      <div>
        No replies yet.
        <a
          href="https://twitter.com/intent/tweet/?text=My%20thoughts%20on%20{target}">
          Tweet about this post
        </a>
        and it will show up here!
      </div>
    {:else}
      <ul>
        {#each mentions as link}
          <li class="WebMentionReply">
            <div class="Avatar">
              <a
                target="_blank"
                rel="noopener"
                href={link.data.author && link.data.author.url}
                color="blue">
                <img
                  width="40"
                  height="40"
                  alt="avatar of {link.data.author && link.data.author.name}"
                  src={link.data.author && link.data.author.photo} />
              </a>
            </div>
            <div>
              {#if link.activity.type === 'repost'}
                {link.data.author && link.data.author.name}
                <a href={link.data.url}>retweeted</a>
              {:else}
                <div font-family="system" color="text" font-weight="bold">
                  {link.data.author && link.data.author.name}
                  <a
                    target="_blank"
                    rel="noopener"
                    href={link.data.url}
                    color="blue">
                    replied
                  </a>
                  on
                  <span color="tertiary">
                    {link.data.published.slice(0, 10)}
                  </span>
                </div>
                <div>
                  <p font-family="system" color="tertiary" font-size="2">
                    {@html cleanString(link.data.content)}
                  </p>
                </div>
              {/if}
            </div>
          </li>
        {/each}
        {#if fetchState !== 'nomore'}
          <li>
            <button class="FetchMore" on:click={fetchMore}>
              Fetch More...
            </button>
          </li>
        {:else}
          <li>
            No further replies found.
            <a
              href="https://twitter.com/intent/tweet/?text=My%20thoughts%20on%20{target}">
              Tweet about this post
            </a>
            and it will show up here!
          </li>
        {/if}
      </ul>
    {/if}
  </div>
</div>
