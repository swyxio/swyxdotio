<script>
	import Newsletter from '../components/Newsletter.svelte';
	let title = 'subscribe to swyxletter';
	let seoDescription = "Signup for swyx's Newsletter!";
</script>

<svelte:head>
	<title>swyx's Newsletter</title>
	<link rel="alternate" type="application/rss+xml" href="https://swyx.io/rss.xml" />
	<meta property="og:url" content={'https://swyx.io/newsletter'} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={title} />
	<meta name="Description" content={seoDescription} />
	<meta property="og:description" content={seoDescription} />
	<meta name="twitter:card" content={'summary'} />
	<meta name="twitter:domain" content="swyx.io" />
	<meta name="twitter:creator" content="@swyx" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={seoDescription} />
	<meta name="twitter:label1" value="Top picks" content="Top picks" />
	<meta name="twitter:data1" value={'Weekly'} content={'Weekly'} />
	<meta name="twitter:label2" content="Value" />
	<meta name="twitter:data2" content={'Priceless'} />
</svelte:head>

<article
	class="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-12 lg:max-w-2xl lg:py-16
    lg:px-8 xl:max-w-3xl prose dark:prose-invert"
>
	<p>
		<a class="no-underline" href="https://swyx.transistor.fm/"
			>✉️ <span
				class="ml-2 bg-gradient-to-br from-pink-400 to-red-600 bg-clip-text text-xl font-extrabold uppercase text-transparent"
				>The Swyx Newsletter</span
			></a
		>
	</p>
	<div class="mytext mb-8">
		<p class="text-base font-light text-opacity-75">
			Join <span
				class="bg-gradient-to-br from-pink-400 to-red-600 bg-clip-text font-extrabold text-transparent"
				>3,000+</span
			> developers getting good reads, fun picks, and first looks at my work before I publish!
		</p>
		<Newsletter />
		<!-- <p class="mt-3 text-sm leading-5 text-opacity-75 italic">
      Too soon!
      <a
        class="text-opacity-75
          hover:underline"
        rel="noopener"
        href="https://twyx.ck.page/posts"
        >Show me what I'm signing up for!</a
      >
    </p> -->
	</div>

	<p>
		<a class="no-underline" href="https://swyx.transistor.fm/"
			>🎧 <span
				class="ml-2 bg-gradient-to-br from-pink-400 to-red-600 bg-clip-text font-extrabold uppercase text-transparent"
				>The Swyx Mixtape</span
			></a
		>
	</p>
	<div class="mb-4">
		My personal pod where I share 5-10 minute clips from over 250 podcasts! <br /> Search "<span
			class="bg-gradient-to-br from-pink-400 to-red-600 bg-clip-text font-extrabold text-transparent"
			>swyx</span
		>" wherever fine podcasts are sold (<a
			class="mylinkcolors underline"
			href="https://podcasts.apple.com/us/podcast/learn-in-podcast/id1549059398">Apple</a
		>,
		<a
			class="mylinkcolors underline"
			href="https://podcasts.google.com/feed/aHR0cHM6Ly9mZWVkcy50cmFuc2lzdG9yLmZtL2xlYXJuLWluLXBvZGNhc3Q="
			>Google</a
		>,
		<a class="mylinkcolors underline" href="https://overcast.fm/itunes1549059398">Overcast</a>,
		<a class="mylinkcolors underline" href="https://feeds.transistor.fm/learn-in-podcast">RSS</a>).
	</div>
  <iframe id="swyxembed" title="swyx mixtape embed" width="100%" height="390" frameborder="no" scrolling="no" seamless src="https://share.transistor.fm/e/learn-in-podcast/playlist/dark"></iframe>
</article>

<style>
</style>
