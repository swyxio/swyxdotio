<script>
  let page = 0
  export let target
  if (!target) console.error('error: no target')
  let mentions = []
  let groupedMention = new Map()
  $: {
    // group each mention by url
    groupedMention = new Map()
    mentions.forEach(mention => {
      let url =
        mention['repost-of'] || mention['in-reply-to'] || mention['mention-of']
      if (groupedMention.has(url)) {
        let others = groupedMention.get(url)
        groupedMention.set(url, [...others, mention])
      } else {
        groupedMention.set(url, [mention])
      }
    })
  }
  let fetchState = 'fetching'
  import { onMount } from 'svelte'
  onMount(() => {
    getMentions().then(x => {
      mentions = x
      fetchState = 'done'
      return fetchMore()
    })
  })
  function getMentions() {
    return fetch(`/.netlify/functions/webmentions?page=${page}`)
      .then(x => x.json())
      .then(x => x.children.filter(x => x['wm-property'] !== 'like-of'))
      .then(_mentions => {
        console.log({ _mentions })
        return _mentions
      })
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
  h1,
  /* h2, */
  #CTA {
    text-align: center;
    margin: 0 auto;
  }

  #CTA {
    font-size: 2em;
    line-height: 1.25;
    margin: 0 0 2em 0;
  }
  h1 {
    font-size: 2.8em;
    text-transform: uppercase;
    font-weight: 700;
    margin: 0 0 0.5em 0;
  }

  @media (min-width: 480px) {
    h1 {
      font-size: 4em;
    }
  }

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
  .FetchMore {
    width: 20ch;
    font-size: 1.5rem;
    background-color: transparent;
    color: var(--link-color);
    border: 0;
    text-align: left;
  }
  .PostHeader {
    background-color: var(--bg-color-secondary);
  }
  .PostHeader a {
    overflow-wrap: break-word;
  }
</style>

<svelte:head>
  <title>swyx's site</title>
</svelte:head>
<article>
  <h1>swyx's site!</h1>
  <div id="CTA">
    Featured Post:
    <div>
      <a href="/writing/i-m-writing-a-book-45a8">
        <b>I'm Writing a Book!</b>
      </a>
    </div>
  </div>
  <div id="WebMentions">
    <h3 font-family="system" font-size="4" font-weight="bold">Mentions</h3>
    <a
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
    {' - '}
    <a
      href="https://twitter.com/intent/tweet/?text=My%20thoughts%20on%20{target}">
      Tweet about
    </a>
    any of my posts and it will show up here!
    <div class="WebMentionsContainer">
      {#if fetchState === 'fetching'}
        <div>🌀</div>
      {:else}
        <ul>
          {#each [...groupedMention.entries()] as [link, mentions]}
            <li>
              <div class="PostHeader">
                <h3>
                  Post:
                  <a href={link}>{link}</a>
                </h3>
              </div>
              {#each mentions as mention}
                <div class="WebMentionReply">
                  <div class="Avatar">
                    <a
                      target="_blank"
                      rel="noopener"
                      href={mention.author.url}
                      color="blue">
                      <img
                        width="40"
                        height="40"
                        alt="avatar of {mention.author.name}"
                        src={mention.author.photo} />
                    </a>
                  </div>
                  <div>
                    {#if mention['wm-property'] === 'repost-of'}
                      {mention.author.name}
                      <a href={mention.url}>retweeted</a>
                    {:else}
                      <div font-family="system" color="text" font-weight="bold">
                        {mention.author.name}
                        <a
                          target="_blank"
                          rel="noopener"
                          href={mention.url}
                          color="blue">
                          replied
                        </a>
                        on
                        <span color="tertiary">
                          {mention.published.slice(0, 10)}
                        </span>
                      </div>
                      <div>
                        <p font-family="system" color="tertiary" font-size="2">
                          {@html cleanString(mention.content.html)}
                        </p>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </li>
          {/each}
          {#if fetchState !== 'nomore'}
            <li>
              <button class="FetchMore" on:click={fetchMore}>
                Fetch More...
              </button>
            </li>
          {/if}
        </ul>
      {/if}
    </div>
  </div>

</article>
