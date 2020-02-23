---
title: Clientside Webmentions
slug: clientside-webmentions
subtitle: Joining the IndieWeb with Svelte
categories: ['IndieWeb', 'Svelte']
date: 2020-02-11
description: How you can enhance your blog with webmentions without adding heavy build times.
---

[Max Bock's blogpost on Webmentions](https://mxb.dev/blog/using-webmentions-on-static-sites/) was very influential in the Indieweb community, but it discusses a serverside only approach to pulling and displaying that data.

I was interested in deferring that work and leaving it to the clientside. Clientside solutions of course forces clients to do more work, but explicitly designing for it can be more considerate by not dumping a ton of image requests and useless markup on the mobile user. Of course, build times and success rates are also a little more predictable if you take external dependencies out of the equation.

I searched Webmention implementations on GitHub and found [Max Stoiber's impl](https://github.com/mxstbr/mxstbr.com/blob/49aceb93a43d1e87736f204f26c07e203cb2a0e1/components/WebMentions/WebMentionCounts.js). It fetches a simple count of webmentions, and then paginated full text responses. I figured I should try adapting that.

> ⚠️ For this post I will assume you've already followed Max's advice on setting up [webmention.io](https://mxb.dev/blog/using-webmentions-on-static-sites/) (add the twitter link with `rel="me"`) and then setting up the backfeed with [Bridgy](https://brid.gy/). I don't know any other services that perform these functions - we have to be thankful to folks like [Aaron Parecki](https://github.com/aaronpk) for the fact that these even work.

## Clientside Webmention.io Widget

You can use their provided Webmention widget ([docs](https://webmention.io/)):

```html
<span data-webmention-count data-url="https://example.com/page/100"></span> mentions
<script type="text/javascript" src="https://webmention.io/js/mentions.js"></script>
```

## Simple Count

This is the endpoint to hit: `https://webmention.io/api/count.json?target=URL_TO_YOUR_POST/`. ⚠️ NOTE: You will need that trailing slash for this request to work! I probably wasted 2 hours figuring this out.

This is the API response you get back:

```json
{
  "count": 1062,
  "type": {
    "like": 638,
    "mention": 154,
    "reply": 51,
    "repost": 219
  }
}
```

Some of these are likes, and retweets, while others are replies and quote tweets. Max combines the last 2 and first 2 and I do so too.

```html
<script>
  export let target // passed in as prop
  const counts = fetch(`https://webmention.io/api/count.json?target=${target}`)
    .then(res => res.json())
    .then(x => x.type)
</script>
{#await counts}
  <p>loading counts</p>
{:then data}
  {#if data === undefined}
    Failed to load...
  {:else}
    ❤️ {data.like + data.repost || 0} 💬 {data.mention + data.reply || 0}
  {/if}
{/await}
```

## Paginated Mentions

Of course, counts are nice, but real human contact lives in mentions. Here is the endpoint to hit: `https://webmention.io/api/mentions?page=0&per-page=20&sort-by=published&target=URL_TO_YOUR_POST/`

> ⚠️ NOTE: You will need that trailing slash for this request to work! I probably wasted 2 hours figuring this out.

> ⚠️ Note that the endpoint is `/mentions` - the docs say to hit `/mentions.jf2` but that did not work at all in my testing. 

Note that there is pagination, so you have to be able to increment the page and refetch the mentions. 

I originally chose to use Svelte's nifty [#await syntax](https://svelte.dev/docs#await) - this means only showing 20 at any time:

```html
<script>
  let page = 0
  export let target
  const promiseFactory = () =>
    fetch(`https://webmention.io/api/mentions?page=${page}&target=${target}`)
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
```

But this means losing the previous 20 that you see and also some nasty re-layout issues.

Because I am SSRing, I also had some nasty `fetch is undefined` error issues.

Instead I switched to another implementation that appended infinitely to an array, and loaded `onMount`:

```html
<script>
  let page = 0
  export let target
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
    })
  })
  function getMentions() {
    return fetch(
      // `https://webmention.io/api/mentions?page=${page}&per-page=20&sort-by=published&target=${target}`,
      `https://webmention.io/api/mentions?page=${page}&per-page=50&target=${target}/` // trailing slash impt
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
</script>
<!-- etc -->

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
```

And that's the clientside webmentions you see live now 👇🏽.