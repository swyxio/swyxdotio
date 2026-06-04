<script>
	import Newsletter from '../components/Newsletter.svelte';
	import FeaturedWriting from '../components/FeaturedWriting.svelte';
	import FeaturedSpeaking from '../components/FeaturedSpeaking.svelte';
	import {
		SITE_URL,
		REPO_URL,
		SITE_TITLE,
		SITE_DESCRIPTION,
		DEFAULT_OG_IMAGE,
		MY_TWITTER_HANDLE
	} from '$lib/siteConfig';

	/** @type {import('./$types').PageData} */
	export let data;
	// technically this is a slighlty different type because doesnt have 'content' but we'll let it slide
	/** @type {import('$lib/types').ContentItem[]} */
	$: items = data.items;
</script>

<svelte:head>
	<title>{SITE_TITLE}</title>
	<link rel="canonical" href={SITE_URL} />
	<link rel="alternate" type="application/rss+xml" href={SITE_URL + '/rss.xml'} />
	<meta property="og:url" content={SITE_URL} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={SITE_TITLE} />
	<meta name="Description" content={SITE_DESCRIPTION} />
	<meta property="og:description" content={SITE_DESCRIPTION} />
	<meta property="og:image" content={DEFAULT_OG_IMAGE} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:creator" content={'@' + MY_TWITTER_HANDLE} />
	<meta name="twitter:title" content={SITE_TITLE} />
	<meta name="twitter:description" content={SITE_DESCRIPTION} />
	<meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
</svelte:head>

<div class="site-shell">
	<section class="plain-section">
		<h1 id="me" class="mb-2 text-3xl font-bold">Shawn @swyx Wang</h1>
		<p id="bio" class="plain-muted mb-4 italic">Writer, Founder, Devtools Startup Advisor</p>
		<p class="mb-4">
			I foster <a href="https://www.latent.space/p/ai-engineer">the Rise of the AI Engineer</a> and
			am working on
			<a href="https://latent.space">Latent Space</a>,
			<a href="https://ai.engineer">AI Engineer</a>, and
			<a href="https://www.swyx.io/cognition">Cognition</a>
			based in San Francisco. I also help devtools startups cross the chasm (devrel, advising and
			<a href="/portfolio">investing</a>) and will always be the champion for
			<a href="/learn-in-public">Learning in Public</a>!
		</p>
		<p><a href="/about">More on the about page</a>.</p>
	</section>

	<section class="plain-section">
		<hr class="plain-rule mb-4" />
		<h2 id="latest" class="mb-2 text-2xl font-bold">Latest content</h2>
		<ul>
			{#each items as item (item.url ?? item.slug)}
				<li>
					{#if item.category === 'podcast'}
						🎧 <a href={item.url}>{item.title}</a>
					{:else if item.category === 'talk'}
						📺 <a href={item.instances?.[0]?.video ?? item.slug}>{item.title}</a>
					{:else if item.category === 'essay'}
						📙 <a href={item.slug}>{item.title}</a>
					{:else if item.category === 'tutorial'}
						📘 <a href={item.slug}>{item.title}</a>
					{:else}
						📓 <a href={item.slug}>{item.title}</a>
					{/if}
					<span class="plain-muted text-sm">{new Date(item.date).toISOString().slice(0, 10)}</span>
				</li>
			{/each}
		</ul>
		<p class="mt-2"><a href="/ideas">See all posts</a>.</p>
	</section>
	<Newsletter />
	<section class="plain-section">
		<hr class="plain-rule mb-4" />
		<h2 id="writing" class="mb-2 text-2xl font-bold">Popular writing</h2>
		<FeaturedWriting />
	</section>
	<section class="plain-section">
		<hr class="plain-rule mb-4" />
		<h2 id="speaking" class="mb-2 text-2xl font-bold">Popular speaking</h2>
		<FeaturedSpeaking />
	</section>
</div>
