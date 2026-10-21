<script>
	import '../tailwind.css';
	import Nav from '../components/Nav.svelte';
	import SiteSearch from '../components/SiteSearch.svelte';
	/** @type {SiteSearch | undefined} */
	let siteSearch;
	import ReadCounter from '../components/ReadCounter.svelte';
	import LivePresence from '../components/LivePresence.svelte';
	import LiveChat from '../components/LiveChat.svelte';
	import SelectionShare from '../components/SelectionShare.svelte';
	import { env } from '$env/dynamic/public';
	import { page } from '$app/stores';
	import { publicPageKeyForPath } from '$lib/read-counter';
	import { MY_TWITTER_HANDLE, MY_YOUTUBE, REPO_URL, SITE_TITLE } from '$lib/siteConfig';

	$: publicPageKey = $page.status === 200 ? publicPageKeyForPath($page.url.pathname) : null;
	$: presencePageKey =
		$page.status === 200 && typeof $page.data?.slug === 'string'
			? `article:${$page.data.slug}`
			: publicPageKey
				? `page:${publicPageKey}`
				: null;
	$: presenceAdmissionRate = Number(env.PUBLIC_PRESENCE_ADMISSION_RATE ?? 1);
	$: immersiveTool = $page.url.pathname === '/tools/box' || $page.url.pathname === '/tools/draw';
	let chatCollapsed = false;
	let nick = '';
	/** @type {LiveChat | undefined} */
	let liveChat;
	/** @type {LivePresence | undefined} */
	let livePresence;
	/** @type {import('$lib/presence-client').PresenceSummary} */
	const noPresence = {
		pageKey: null,
		hidden: false,
		admitted: false,
		connected: false,
		stopped: false,
		pages: [],
		otherCount: 0
	};
	/** @type {import('$lib/presence-client').PresenceSummary} */
	let presence = noPresence;
	$: chatPresence = presencePageKey && presence.pageKey === presencePageKey ? presence : noPresence;
</script>

<svelte:head>
	{#if !immersiveTool}
		<link
			rel="preload"
			href="/fonts/newsreader-semibold.woff2"
			as="font"
			type="font/woff2"
			crossorigin="anonymous"
		/>
	{/if}
	<link
		rel="alternate"
		type="application/rss+xml"
		title={'RSS Feed for ' + SITE_TITLE}
		href="/rss.xml"
	/>
	<link rel="webmention" href="https://webmention.io/www.swyx.io/webmention" />
	<link rel="pingback" href="https://webmention.io/www.swyx.io/xmlrpc" />
	<link rel="alternate" type="text/plain" title="AI discovery index" href="/llms.txt" />
	<noscript
		><style>
			@media (min-width: 1500px) {
				.site-page.chat-space {
					padding-left: 0 !important;
				}
			}
		</style></noscript
	>
</svelte:head>

<div class="site-page" class:chat-space={!chatCollapsed && !immersiveTool}>
	{#if !immersiveTool}
		<div class="site-shell site-nav-shell">
			<Nav onSearch={() => siteSearch?.open()} />
		</div>
	{/if}
	<SiteSearch bind:this={siteSearch} />
	<main id="skip" class="site-main">
		<slot />
	</main>
	<LiveChat
		bind:this={liveChat}
		bind:collapsed={chatCollapsed}
		bind:nick
		allowSidebar={!immersiveTool}
		presence={chatPresence}
		onPresenceVisibility={(hidden) => livePresence?.setHidden(hidden)}
		onPresenceReaction={(reaction) => livePresence?.react(reaction)}
		onPresenceShare={(event) => livePresence?.requestShare(event)}
		onFollowReader={(id, pageKey) => livePresence?.followReader(id, pageKey)}
	/>

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
			{#if publicPageKey}
				<p class="plain-muted mt-4 text-sm">
					{#key publicPageKey}
						<ReadCounter pageKey={publicPageKey} />
					{/key}
				</p>
			{/if}
			{#if presencePageKey}
				{#key presencePageKey}
					<LivePresence
						bind:this={livePresence}
						pageKey={presencePageKey}
						{nick}
						admissionRate={presenceAdmissionRate}
						on:change={(event) => (presence = event.detail)}
						on:chatNotice={(event) => liveChat?.noteMessage(event.detail)}
					/>
				{/key}
			{/if}
			<p class="clacks-tribute"><span aria-hidden="true">✶</span> GNU Terry Pratchett</p>
		</footer>
	{/if}
</div>

{#if presencePageKey}
	{#key presencePageKey}
		<SelectionShare />
	{/key}
{/if}

<style>
	@media (max-width: 1240px) {
		.site-page {
			--site-gutter: 1.5rem;
		}
	}

	@media (min-width: 1500px) {
		.site-page.chat-space {
			padding-left: 300px;
		}
		.site-page.chat-space :global(.article-index) {
			left: max(calc(300px + 1.25rem), calc(300px + (100vw - 300px - 72.5rem) / 2));
		}
		.site-page.chat-space :global(.floating-toc) {
			right: max(1.25rem, calc((100vw - 300px - 72.5rem) / 2));
		}
	}

	.literary-footer {
		--site-max-width: 1160px;
		position: relative;
		border: 0;
		border-top: 1px solid var(--page-gold);
		border-radius: 0;
		padding-inline: 0;
		background: transparent;
		box-shadow: none;
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
