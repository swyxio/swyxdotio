<script>
    import SignUp from '../../components/SignUp/SignUp.svelte'
    let title = "subscribe to swyxletter"
    let seoDescription = "Signup for swyx's Newsletter!"
</script>
  
  <svelte:head>
    <title>swyx's Newsletter</title>
    <link rel="alternate" type="application/rss+xml" href="https://swyx.io/rss.xml" />
    <meta property="og:url" content={'https://swyx.io/newsletter'} />
    <meta property="og:type" content="article" />
    <meta property="og:title" content={title} />
    <meta name="Description" content={seoDescription} />
    <meta property="og:description" content={seoDescription} />
    <meta
      name="twitter:card"
      content={'summary'}
    />
    <meta name="twitter:domain" content="swyx.io" />
    <meta name="twitter:creator" content="@swyx" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={seoDescription} />
    <meta name="twitter:label1" value="Top picks" content="Top picks" />
    <meta name="twitter:data1" value={"Weekly"} content={"Weekly"} />
    <meta name="twitter:label2" content="Value" />
    <meta name="twitter:data2" content={"Priceless"} />
  </svelte:head>
  
  <article
    class="px-4 py-10 max-w-xl mx-auto sm:px-6 sm:py-12 lg:max-w-2xl lg:py-16
      lg:px-8 xl:max-w-3xl"
  >
    <h2><a href="https://swyx.transistor.fm/"><span class="uppercase text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-pink-400 to-red-600">The Swyx Newsletter</span></a></h2>
    <div class="mb-8 mytext sm:mx-auto sm:text-center lg:text-left lg:mx-0">
      <p class="text-base font-light text-opacity-75">
        Join <span class="font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-pink-400 to-red-600">3,000+</span> developers getting updates ✉️
      </p>
      <SignUp />
      <p class="mt-3 text-sm leading-5 text-opacity-75 italic">
        Too soon!
        <a
          class="font-medium text-opacity-75
            underline"
          rel="noopener"
          href="https://twyx.ck.page/posts"
          >Show me what I'm signing up for!</a
        >
      </p>
    </div>

    <h2><a href="https://swyx.transistor.fm/"><span class="uppercase font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-pink-400 to-red-600">The Swyx Mixtape</span></a></h2>
    <div class="text-white">
      My personal pod where I share 5-10 minute clips from over 250 podcasts! Search "<span class="font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-pink-400 to-red-600">swyx</span>" wherever fine podcasts are sold.
    </div>
  </article>
  
  <style>
  </style>
  