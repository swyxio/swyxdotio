<script>
  import WebMentions from '../../components/WebMentions/WebMentions.svelte'
  import SignUp from '../../components/SignUp/SignUp.svelte'
  export let data
  const { html, frontmatter, markdown, podcasts, talks, ...rest } = data
  // console.log({frontmatter, rest})
  $: longDesc = frontmatter.description || frontmatter.desc || null
  let seoSubtitle = frontmatter && frontmatter.subtitle
  export let seoTitle =
    (seoSubtitle
      ? `${frontmatter && frontmatter.title}: ${seoSubtitle}`
      : `${frontmatter && frontmatter.title}`) + ' ∊ swyx.io'
  export let seoDescription = frontmatter
    ? frontmatter.desc || frontmatter.description || seoTitle
    : seoTitle
  let slug = frontmatter.slug
  // $: console.log({html, frontmatter, rest})
  let swyxioURL = `https://www.swyx.io/${slug}`
  let canonical = frontmatter.canonical_url || swyxioURL
  let coverImage =
    frontmatter.cover_image || 'https://www.swyx.io/og_image/writing.png'
  let readTime = Math.max(1, Math.floor(html.split(' ').length / 250)) // https://blog.medium.com/read-time-and-you-bc2048ab620c
  readTime = readTime < 2 ? readTime + ' minute' : readTime + ' minutes'
  let metaDate = new Date(frontmatter.date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
</script>

<svelte:head>
  <title>{frontmatter.title}</title>
  <link rel="canonical" href={canonical} />
  <meta property="og:url" content={swyxioURL} />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={seoTitle} />
  <meta name="Description" content={seoDescription} />
  <meta property="og:description" content={seoDescription} />
  {#if frontmatter.cover_image}
    <meta property="og:image" content={coverImage} />
  {/if}
  <meta
    name="twitter:card"
    content={frontmatter.cover_image ? 'summary_large_image' : 'summary'}
  />
  <meta name="twitter:domain" content="swyx.io" />
  <meta name="twitter:creator" content="@swyx" />
  <meta name="twitter:title" content={seoTitle} />
  <meta name="twitter:description" content={seoDescription} />
  <meta
    name="twitter:image"
    content={frontmatter.cover_image
      ? frontmatter.cover_image
      : 'https://www.swyx.io/swyx-ski.jpeg'}
  />
  <meta name="twitter:label1" value="Last updated" content="Last updated" />
  <meta name="twitter:data1" value={metaDate} content={metaDate} />
  <meta name="twitter:label2" content="Read Time" />
  <meta name="twitter:data2" content={readTime} />
</svelte:head>

<article
  class="px-4 py-10 max-w-xl mx-auto sm:px-6 sm:py-12 lg:max-w-2xl lg:py-16
    lg:px-8 xl:max-w-3xl"
>
  <div class="prose lg:prose-xl">
    <div class="title">
      <h1>{frontmatter.title}
        {#if frontmatter.subtitle}
          <p class="mytext-light italic font-bold text-xl">{frontmatter.subtitle}</p>
        {/if}
      </h1>
      {#if longDesc}
        <!-- p-summary is for https://brid.gy/about#microformats -->
        <p class="mytext-light italic text-sm p-summary">
          {longDesc}
          {#each frontmatter.categories as tag}
            <span class="text-xs italic font-light leading-5"> #{tag} </span>
          {/each}
        </p>
      {:else}
        {#each frontmatter.categories as tag}
          <p>
            <span class="text-xs italic font-light leading-5"> #{tag} </span>
          </p>
        {/each}
      {/if}
      {#if frontmatter.author}<small>By {frontmatter.author}</small>{/if}
    </div>

    <blockquote class="text-sm font-mono bg-indigo-100 dark:bg-indigo-900">
      <span class="font-bold">Read time: {readTime}</span>
      {#if frontmatter.date}<span class=" hidden sm:inline">|</span>
      <span class=" block sm:inline">Published:
          <time
            datetime={new Date(frontmatter.date).toDateString().slice(0, 10)}
          >
            {new Date(frontmatter.date).toDateString().slice(4)}
          </time>
      </span>
      {/if}
    </blockquote>

    {#if html}
      <!-- e-content is for https://brid.gy/about#microformats -->
      <div class="articleMain font-serif e-content">
        {@html html}
      </div>
    {:else}
      <h1>There was a problem rendering this page - please let @swyx know!</h1>
    {/if}
  </div>

  <div>
    {#if frontmatter.disclosure}
      <blockquote class="text-sm mb-8 p-4 font-mono mytext-light bg-indigo-100 dark:bg-indigo-900">
        <div class="text-xs"><a
          aria-label="What is my disclosure policy?"
          target="_blank"
          title="What is my disclosure policy?"
          rel="noopener"
          class="mylink"
          href="https://www.swyx.io/digital-garden-tos/#2-epistemic-disclosure"
          color="blue"
          >
          <span class="font-bold relative">Disclosures<svg
              xmlns="http://www.w3.org/2000/svg"
              width="0.5em"
              height="0.5em"
              class="inline"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#999"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12" y2="17" />
            </svg></span></a
            >:
          <span class="italic">{frontmatter.disclosure}</span>
        </div>
      </blockquote>
    {/if}
    <div class="flex justify-between mb-12">
      <a class="mylink" href="http://swyx.io/ideas?show=Essays"
        >&LeftArrow; All Essays</a
      >
      <!-- <a
        class="text-pink-700 dark:text-pink-400 underline hover:text-pink-200 font-bold"
        href="https://tinyletter.com/swyx">❤️ Subscribe via Email ❤️</a> -->
      <a class="mylink" href="http://swyx.io/#featured-writing"
        >Featured Essays &RightArrow;</a
      >
    </div>
  </div>
  <hr class="mt-5" />
  <div class="mt-8 mytext sm:mx-auto sm:text-center lg:text-left lg:mx-0">
    <p class="text-base font-light text-opacity-75">
      Join 2,000+ developers getting updates ✉️
    </p>
    <SignUp />
    <p class="mt-3 text-sm leading-5 text-opacity-75 italic">
      Too soon!
      <a
        class="font-medium text-opacity-75
          underline"
        rel="noopener"
        href="https://tinyletter.com/swyx/archive"
        >Show me what I'm signing up for!</a
      >
    </p>
  </div>
  <WebMentions
    hydrate-client={{
      devto_reactions: frontmatter.devto_reactions,
      targets: [
        `https://www.swyx.io/${frontmatter.slug}`,
        frontmatter.devto_url,
        frontmatter.canonical_url
      ]
    }}
  />
</article>

<style>
  /* Add space to the left of the anchor
     generated by `remark-autolink-headings`
     Ref: https://github.com/sw-yx/ssg/blob/c920826e062f379e3634ae8bd26c3b037ec12b40/packages/source-devto/src/index.ts#L27-L38
     */
  .prose
    :global(h1 a[aria-hidden='true'], h2 a[aria-hidden='true'], h3
      a[aria-hidden='true'], h4 a[aria-hidden='true'], h5
      a[aria-hidden='true'], h6 a[aria-hidden='true']) {
    margin-left: 1rem;
  }
  .prose .articleMain :global(h2::before) {
    content: '## ';
    background: linear-gradient(to right, hsl(98 100% 62%), hsl(204 100% 59%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .prose .articleMain :global(h3::before) {
    content: '### ';
    background: linear-gradient(to right, hsl(98 100% 62%), hsl(204 100% 59%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .prose .articleMain :global(h4::before) {
    content: '#### ';
    background: linear-gradient(to right, hsl(98 100% 62%), hsl(204 100% 59%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* undo ol bug in tailwind typography */
  /* https://github.com/tailwindlabs/tailwindcss-typography/issues/71 */

  :global(.prose .articleMain ol) {
    list-style: decimal;
    margin-left: 1rem;
    margin-right: 1rem;
  }
  :global(.prose .articleMain ul) {
    margin-left: 1rem;
    margin-right: 1rem;
  }
  :global(.prose .articleMain ol > li) {
    padding-left: 0;
  }
  :global(.prose .articleMain ol > li::before) {
    content: none;
  }
  /* undo ol bug in tailwind typography */

  /* opt out of blockquote quotes */
  /* .prose :global(blockquote p:first-of-type::before) {
    content: none;
  } */
  .prose :global(blockquote) {
    position: relative;
    margin-left: 0;
    padding-left: 1em;
    padding-right: 0.5em;
    font-size: 0.9em;
    line-height: 1.4em;
    margin-right: 0;
    /* font-style: italic; */
  }
  .prose :global(blockquote:before) {
    content: '';
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    pointer-events: none;
  }
  /* .prose :global(a) {
    border-bottom: 2px solid #F26111;
  } */
  .prose :global(.icon-link) {
    font-size: smaller;
  }

  :global(.prose .highlightOnHover) {
    text-decoration: none;
  }
  :global(.prose .highlightOnHover:hover) {
    text-decoration: underline;
  }

  /* this is for the hover link thing */
  /* dont use transition: all 0.5s; this is buggy */
  /* @media (min-width: 480px) {
    .prose :global(a)::before {
      content: attr(href);
      position: absolute;
      transform: translate(-10rem, 1.5rem) scale(0);
      background: linear-gradient(45deg, var(--hover-color-primary),var(--hover-color-secondary));
      visibility: visible;
      opacity: 0;
      transition-duration: 0.5s;
      transition-property: opacity, transform;
    }
    .prose :global(a):hover::before {
      opacity: 1;
      transform: translateY(1.5rem) scale(1);
    }
  } */
</style>
