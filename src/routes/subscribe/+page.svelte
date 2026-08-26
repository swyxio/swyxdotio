<script>
	import Newsletter from '../../components/Newsletter.svelte';
	import SocialMeta from '../../components/SocialMeta.svelte';
	import { getPageSocialMeta } from '$lib/social-meta';
	const social = getPageSocialMeta('subscribe');
</script>

<SocialMeta {...social} />

<svelte:head>
	<link rel="alternate" type="application/rss+xml" href="https://swyx.io/rss.xml" />
</svelte:head>

<article class="site-shell subscription-page">
	<header class="editorial-header">
		<p class="editorial-kicker">Stay in correspondence</p>
		<h1>Subscribe</h1>
		<p class="editorial-deck">
			Occasional letters on builders, markets, and the strange future. Join more than 10,000
			readers.
		</p>
		<Newsletter embedded />
	</header>

	<section class="channel-section" id="rss" aria-labelledby="rss-heading">
		<h2 id="rss-heading">Read by RSS</h2>
		<div class="channel-content">
			<p class="plain-muted">New essays, straight to your feed reader.</p>
			<p class="channel-primary">
				<a href="/rss.xml" data-sveltekit-reload>Subscribe to the writing feed →</a>
			</p>
		</div>
	</section>

	<section class="channel-section" aria-labelledby="podcasts-heading">
		<h2 id="podcasts-heading">Podcasts</h2>
		<div class="channel-content">
			<p>
				I host <a href="https://www.latent.space/podcast">Latent Space: The AI Engineer Podcast</a>.
				Conversations with the people building AI, best watched on YouTube.
			</p>
			<p class="channel-primary">
				<a href="https://www.youtube.com/@LatentSpacePod">Watch Latent Space on YouTube ↗</a>
			</p>
			<ul class="channel-links" aria-label="Latent Space episodes">
				<li>
					<a href="https://www.youtube.com/playlist?list=PLWEAb1SXhjlfkEF_PxzYHonU_v5LPMI8L"
						>Complete episode playlist ↗</a
					>
				</li>
				<li><a href="https://www.latent.space/podcast">Show notes</a></li>
			</ul>
			<p class="listening-label plain-muted">Prefer audio?</p>
			<ul class="channel-links" aria-label="Listen to Latent Space">
				<li>
					<a href="https://rss.flightcast.com/vgnxzgiwwzwke85ym53fjnzu.xml">RSS feed</a>
				</li>
				<li>
					<a
						href="https://podcasts.apple.com/us/podcast/latent-space-the-ai-engineer-podcast/id1674008350"
						>Apple Podcasts</a
					>
				</li>
				<li><a href="https://open.spotify.com/show/2p7zZVwVF6Yk0Zsb4QmT7t">Spotify</a></li>
			</ul>

			<div class="earlier-audio">
				<h3>Earlier audio</h3>
				<p class="plain-muted">The original feeds are still here for your podcast app.</p>
				<ul class="archive-feeds">
					<li>
						<a href="/podcast/learn-in-podcast/rss.xml" data-sveltekit-reload
							>The swyx mixtape RSS</a
						>
					</li>
					<li>
						<a href="/podcast/the-temporal-podcast/rss.xml" data-sveltekit-reload
							>swyx backup pod RSS</a
						>
					</li>
					<li>
						<a href="/podcast/career-chats/rss.xml" data-sveltekit-reload
							>Career Chats with Swyx and Randall RSS</a
						>
					</li>
				</ul>
				<p class="channel-primary"><a href="/podcasts">Browse the podcast archive →</a></p>
			</div>
		</div>
	</section>
</article>

<style>
	.subscription-page {
		margin-bottom: 3rem;
	}

	.editorial-header {
		margin-bottom: 0;
		padding-bottom: 2rem;
	}

	.channel-section {
		display: grid;
		grid-template-columns: minmax(0, 12rem) minmax(0, 1fr);
		gap: 1rem 2rem;
		padding-block: 2rem;
	}

	.channel-section + .channel-section {
		border-top: 1px solid var(--page-border);
	}

	.channel-section h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.85rem;
		line-height: 1.15;
	}

	.channel-content {
		max-width: 36rem;
	}

	.channel-content p {
		margin: 0;
		line-height: 1.65;
	}

	.channel-content .channel-primary {
		margin-top: 0.4rem;
	}

	.channel-primary a,
	.channel-links a,
	.archive-feeds a {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
	}

	.channel-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0 1.15rem;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.875rem;
	}

	.channel-content .listening-label {
		margin-top: 0.7rem;
		font-size: 0.875rem;
	}

	.earlier-audio {
		margin-top: 1.5rem;
		border-top: 1px solid var(--page-border);
		padding-top: 1.5rem;
	}

	.earlier-audio h3 {
		margin: 0 0 0.4rem;
		font-family: var(--font-display);
		font-size: 1.35rem;
	}

	.earlier-audio p,
	.archive-feeds {
		font-size: 0.875rem;
	}

	.archive-feeds {
		margin: 0.45rem 0;
		padding: 0;
		list-style: none;
	}

	@media (max-width: 42rem) {
		.channel-section {
			grid-template-columns: minmax(0, 1fr);
			gap: 0.65rem;
			padding-block: 1.5rem;
		}
	}
</style>
