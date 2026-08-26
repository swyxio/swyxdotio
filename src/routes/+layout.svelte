<script>
	import '../tailwind.css';
	import Nav from '../components/Nav.svelte';
	import ReadCounter from '../components/ReadCounter.svelte';
	import LivePresence from '../components/LivePresence.svelte';
	import SelectionShare from '../components/SelectionShare.svelte';
	import { env } from '$env/dynamic/public';
	import { page } from '$app/stores';
	import { publicPageKeyForPath } from '$lib/read-counter';
	import { MY_TWITTER_HANDLE, MY_YOUTUBE, REPO_URL, SITE_TITLE } from '$lib/siteConfig';

	$: publicPageKey = $page.status === 200 ? publicPageKeyForPath($page.url.pathname) : null;
	$: presencePageKey =
		$page.status === 200 && typeof $page.data?.slug === 'string' ? $page.data.slug : publicPageKey;
	$: presenceAdmissionRate = Number(env.PUBLIC_PRESENCE_ADMISSION_RATE ?? 1);
	$: immersiveTool = $page.url.pathname === '/tools/box' || $page.url.pathname === '/tools/draw';
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
	<link rel="alternate" type="text/plain" title="AI discovery index" href="/llms.txt" />
</svelte:head>

{#if !immersiveTool}
	<div class="site-shell site-nav-shell">
		<Nav />
	</div>
{/if}
<main id="skip" class="site-main">
	<slot />
</main>

{#if !immersiveTool}
	<footer class="site-shell site-panel literary-footer mb-8 mt-8 p-4">
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
		<p class="clacks-tribute"><span aria-hidden="true">✶</span> GNU Terry Pratchett</p>
	</footer>
{/if}

{#if presencePageKey}
	{#key presencePageKey}
		<LivePresence pageKey={presencePageKey} admissionRate={presenceAdmissionRate} />
		<SelectionShare />
	{/key}
{/if}

<style>
	.literary-footer {
		position: relative;
		border-top: 2px solid var(--page-gold);
	}

	.clacks-tribute {
		margin: 0.9rem 0 0;
		color: var(--page-gold);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.04em;
	}

	.clacks-tribute span {
		margin-right: 0.35rem;
	}
</style>
