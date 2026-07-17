<script>
	import '../tailwind.css';
	import Nav from '../components/Nav.svelte';
	import ReadCounter from '../components/ReadCounter.svelte';
	import { page } from '$app/stores';
	import { publicPageKeyForPath } from '$lib/read-counter';
	import { MY_TWITTER_HANDLE, MY_YOUTUBE, REPO_URL, SITE_TITLE } from '$lib/siteConfig';

	$: publicPageKey = $page.status === 200 ? publicPageKeyForPath($page.url.pathname) : null;
</script>

<svelte:head>
	<link
		rel="alternate"
		type="application/rss+xml"
		title={'RSS Feed for ' + SITE_TITLE}
		href="/rss.xml"
	/>
	<link rel="webmention" href="https://webmention.io/www.swyx.io/webmention" />
	<link rel="pingback" href="https://webmention.io/www.swyx.io/xmlrpc" />
</svelte:head>

<div class="site-shell site-nav-shell">
	<Nav />
</div>
<main id="skip" class="site-main">
	<slot />
</main>

<footer class="site-shell site-panel mb-8 mt-8 p-4">
	<p class="plain-muted text-sm">
		<a href="/">Home</a> · <a href="/about">About</a> · <a href="/podcasts">Podcasts</a> ·
		<a href="/subscribe">Newsletter</a> ·
		<a href="/rss.xml" rel="external" data-sveltekit-reload>RSS</a> ·
		<a href="/portfolio">Portfolio</a> ·
		<a href={'https://twitter.com/intent/follow?screen_name=' + MY_TWITTER_HANDLE}>Twitter</a> ·
		<a href={REPO_URL}>GitHub</a> · <a href={MY_YOUTUBE}>YouTube</a>
	</p>
	<p class="plain-muted mt-4 text-sm">
		Based on the <a href="https://swyxkit.netlify.app/">swyxkit</a> template.
		{#if publicPageKey}
			·
			{#key publicPageKey}
				<ReadCounter pageKey={publicPageKey} />
			{/key}
		{/if}
	</p>
</footer>
