<script>
	import Newsletter from '../../components/Newsletter.svelte';
	let title = 'subscribe to swyxletter';
	let seoDescription = "Signup for swyx's Newsletter!";
</script>

<svelte:head>
	<title>swyx's Newsletter</title>
	<link rel="alternate" type="application/rss+xml" href="https://swyx.io/rss.xml" />
	<meta property="og:url" content={'https://swyx.io/subscribe'} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={title} />
	<meta name="Description" content={seoDescription} />
	<meta property="og:description" content={seoDescription} />
	<meta name="twitter:card" content={'summary'} />
	<meta name="twitter:domain" content="swyx.io" />
	<meta name="twitter:creator" content="@swyx" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={seoDescription} />
	<meta name="twitter:label1" content="Top picks" />
	<meta name="twitter:data1" content={'Weekly'} />
	<meta name="twitter:label2" content="Value" />
	<meta name="twitter:data2" content={'Priceless'} />
</svelte:head>

<article class="site-shell py-8 sm:py-12">
	<section class="plain-section">
		<h1>The swyx newsletter</h1>
		<p class="plain-muted">
			Join 10k+ developers getting good reads, fun picks, and first looks at my work before I
			publish.
		</p>
		<Newsletter />
	</section>

	<section class="plain-section">
		<hr class="plain-rule" />
		<h2><a href="/podcasts">Podcasts</a></h2>
		<p>
			My main current show is
			<a href="https://www.latent.space/podcast">Latent Space: The AI Engineer Podcast</a>.
		</p>
		<ul>
			<li>
				<a href="https://rss.flightcast.com/vgnxzgiwwzwke85ym53fjnzu.xml">Latent Space RSS</a>
			</li>
			<li>
				<a
					href="https://podcasts.apple.com/us/podcast/latent-space-the-ai-engineer-podcast/id1674008350"
					>Latent Space on Apple Podcasts</a
				>
			</li>
			<li>
				<a href="https://open.spotify.com/show/2p7zZVwVF6Yk0Zsb4QmT7t">Latent Space on Spotify</a>
			</li>
		</ul>
		<p>Browse the complete legacy episode archives or subscribe directly:</p>
		<ul>
			<li><a href="/podcast/learn-in-podcast/rss.xml">The swyx mixtape RSS</a></li>
			<li><a href="/podcast/the-temporal-podcast/rss.xml">swyx backup pod RSS</a></li>
			<li><a href="/podcast/career-chats/rss.xml">Career Chats with Swyx and Randall RSS</a></li>
		</ul>
		<p><a href="/podcasts">Browse all podcast episodes</a>.</p>
	</section>
</article>
