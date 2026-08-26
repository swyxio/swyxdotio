<script>
	import SocialMeta from '../../components/SocialMeta.svelte';
	import { getPageSocialMeta } from '$lib/social-meta';
	/** @type {{ html: string }} */
	export let data;
	const social = getPageSocialMeta('now');
</script>

<SocialMeta {...social} />

<article class="site-shell now-page">
	<header>
		<p class="editorial-kicker">A note from the present</p>
		<h1>What I’m doing now</h1>
		<p class="dateline">
			Updated <time datetime="2026-08-26">August 26, 2026</time> · San Francisco
		</p>
		<p class="reading-prose opening">
			The <a href="/about">About page</a> is the longer story. This is what has my attention these
			days—a <a href="https://nownownow.com/about">now page</a>, in the spirit of Derek Sivers.
		</p>
	</header>
	<div class="reading-prose now-copy">{@html data.html}</div>
	<footer>
		<p>— swyx</p>
		<a href="/about">Back to the longer story →</a>
	</footer>
</article>

<style>
	.now-page {
		--site-max-width: 760px;
		margin-block: clamp(2rem, 4vw, 3.5rem) 4rem;
	}
	h1 {
		font: 600 clamp(2.1rem, 4vw, 3rem)/1.15 var(--font-display);
		margin: 0.4rem 0 0.8rem;
		letter-spacing: -0.025em;
	}
	.dateline {
		color: var(--page-muted);
		font: 0.875rem/1.5 var(--font-body);
	}
	.opening {
		margin: 1.5rem 0 2rem;
	}
	.now-copy :global(h2) {
		scroll-margin-top: 1.5rem;
	}
	.now-copy :global(details) {
		margin-top: 2rem;
		padding: 1rem 0;
		border-block: 1px solid var(--page-border);
	}
	.now-copy :global(summary) {
		min-height: 44px;
		cursor: pointer;
		color: var(--page-link);
		font: 1rem/1.5 var(--font-reading);
	}
	footer {
		margin-top: 2rem;
		font: italic 1rem/1.75 var(--font-reading);
	}
	footer a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-style: normal;
	}
</style>
