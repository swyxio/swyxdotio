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
    <div class="mt-8 mytext sm:mx-auto sm:text-center lg:text-left lg:mx-0">
      <p class="text-base font-light text-opacity-75">
        Join 3,000+ developers getting updates ✉️
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

    <h2><a href="https://swyx.transistor.fm/"><span class="uppercase font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-pink-400 to-red-600">The Swyx Mixtape</span></a></h2>
    <div>
      Personal podcast where I post 5-10 minute clips audio essays and clips from over 250 podcasts! 
      <iframe title="swyx mixtape embed" width="100%" height="390" frameborder="no" scrolling="no" seamless src="https://share.transistor.fm/e/learn-in-podcast/playlist/dark"></iframe>
    </div>
  </article>
  
  <style>
  </style>
  