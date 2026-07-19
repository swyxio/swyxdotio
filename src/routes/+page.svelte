<script>
	import Newsletter from '../components/Newsletter.svelte';
	import FeaturedWriting from '../components/FeaturedWriting.svelte';
	import FeaturedSpeaking from '../components/FeaturedSpeaking.svelte';
	import SocialMeta from '../components/SocialMeta.svelte';
	import { SITE_URL } from '$lib/siteConfig';
	import { getPageSocialMeta } from '$lib/social-meta';

	const social = getPageSocialMeta('home');

	/** @type {import('./$types').PageData} */
	export let data;
	// technically this is a slighlty different type because doesnt have 'content' but we'll let it slide
	/** @type {import('$lib/types').ContentItem[]} */
	$: items = data.items;

	/** @param {import('$lib/types').ContentItem} item */
	function itemHref(item) {
		if (item.category === 'podcast' && item.url) return item.url;
		if (item.category === 'talk') return item.instances?.[0]?.video ?? `/${item.slug}`;
		return `/${item.slug}`;
	}

	/** @param {import('$lib/types').ContentItem} item */
	function itemIcon(item) {
		if (item.category === 'podcast') return '🎧';
		if (item.category === 'talk') return '📺';
		if (item.category === 'essay') return '📙';
		if (item.category === 'tutorial') return '📘';
		return '📓';
	}
</script>

<SocialMeta {...social} />

<svelte:head>
	<link rel="alternate" type="application/rss+xml" href={SITE_URL + '/rss.xml'} />
</svelte:head>

<div class="site-shell">
	<section class="home-hero site-card">
		<p class="eyebrow">swyx.io</p>
		<h1 id="me">Shawn @swyx Wang</h1>
		<p id="bio" class="plain-muted mb-4 italic">Writer, Founder, Devtools Startup Advisor</p>
		<p class="mb-4">
			I foster <a href="https://www.latent.space/p/ai-engineer">the Rise of the AI Engineer</a> and
			am working on
			<a href="https://latent.space">Latent Space</a>,
			<a href="https://ai.engineer">AI Engineer</a>, and
			<a href="https://swyx.io/cognition">Cognition</a>
			based in San Francisco. I also help devtools startups cross the chasm (devrel, advising and
			<a href="/portfolio">investing</a>) and will always be the champion for
			<a href="/learn-in-public">Learning in Public</a>!
		</p>
		<p><a href="/about">More on the about page</a>.</p>
		<p class="plain-muted">
			Recent experiment: <a href="https://overgrid.swyx.io">play OverGrid in your browser</a>.
		</p>
	</section>

	<section class="home-section site-card">
		<div class="section-header">
			<h2 id="latest">Latest content</h2>
			<a href="/ideas">See all posts</a>
		</div>
		<ul class="compact-list">
			{#each items as item (item.url ?? item.slug)}
				<li class="compact-row">
					<time datetime={new Date(item.date).toISOString()}
						>{new Date(item.date).toISOString().slice(0, 10)}</time
					>
					<a href={itemHref(item)}>
						<span aria-hidden="true">{itemIcon(item)}</span>
						{item.title}
					</a>
				</li>
			{/each}
		</ul>
	</section>
	<Newsletter />
	<section class="home-section site-card">
		<div class="section-header">
			<h2 id="writing">Popular writing</h2>
		</div>
		<FeaturedWriting />
	</section>
	<section class="home-section site-card">
		<div class="section-header">
			<h2 id="speaking">Popular speaking</h2>
		</div>
		<FeaturedSpeaking />
	</section>
</div>

<style>
	.home-hero,
	.home-section,
	:global(#newsletter) {
		margin-block: 0.9rem;
	}

	.home-hero h1 {
		margin: 0;
		font-size: clamp(2.2rem, 6vw, 4.5rem);
		line-height: 0.95;
		letter-spacing: -0.055em;
	}

	.eyebrow {
		margin: 0 0 0.35rem;
		color: var(--page-accent);
		font-family: var(--font-mono);
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.section-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid var(--page-border);
		margin: calc(clamp(1rem, 2vw, 1.5rem) * -1) calc(clamp(1rem, 2vw, 1.5rem) * -1) 0.75rem;
		padding: 0.65rem clamp(1rem, 2vw, 1.5rem);
		background: var(--page-section-bg);
	}

	.section-header h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 800;
	}

	.section-header a {
		font-size: 0.82rem;
	}

	.compact-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.compact-row {
		display: grid;
		grid-template-columns: 6.5rem minmax(0, 1fr);
		gap: 0.85rem;
		align-items: baseline;
		border-bottom: 1px solid var(--page-border);
		padding-block: 0.45rem;
	}

	.compact-row:last-child {
		border-bottom: 0;
	}

	.compact-row time {
		color: var(--page-muted);
		font-size: 0.82rem;
		font-variant-numeric: tabular-nums;
	}

	.compact-row a {
		display: inline-flex;
		gap: 0.4rem;
		min-width: 0;
		color: var(--page-text);
		font-size: 0.94rem;
		font-weight: 600;
		line-height: 1.25;
		text-decoration: none;
	}

	.compact-row a:hover {
		color: var(--page-accent);
		text-decoration: underline;
	}

	@media (max-width: 640px) {
		.compact-row {
			grid-template-columns: 1fr;
			gap: 0.1rem;
		}

		.compact-row time {
			order: 2;
		}
	}
</style>
