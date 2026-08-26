<script>
	import Newsletter from '../components/Newsletter.svelte';
	import FeaturedWriting from '../components/FeaturedWriting.svelte';
	import FeaturedSpeaking from '../components/FeaturedSpeaking.svelte';
	import BookLaunchCallout from '../components/BookLaunchCallout.svelte';
	import SocialMeta from '../components/SocialMeta.svelte';
	import { FEATURED_ESSAYS } from '$lib/featured-essays';
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

<div class="site-shell literary-home">
	<section class="home-hero" aria-labelledby="me">
		<div class="author-introduction">
			<img
				class="author-portrait"
				src="/swyx-ski.jpeg"
				alt="Shawn Wang"
				width="88"
				height="88"
				fetchpriority="high"
			/>
			<div class="author-copy">
				<p class="eyebrow">Notes from the open workbench</p>
				<h1 id="me">Shawn <span>@swyx</span> Wang</h1>
				<p id="bio" class="author-subtitle">Writer, founder, learner in public.</p>
				<p class="author-details">
					I help foster <a href="https://www.latent.space/p/ai-engineer"
						>the rise of the AI engineer</a
					>
					and build <a href="https://latent.space">Latent Space</a>,
					<a href="https://ai.engineer">AI Engineer</a>, and
					<a href="https://swyx.io/cognition">Cognition</a> in San Francisco.{' '}
					<a href="/portfolio">Occasional investor.</a>{' '}
					<a href="/learn-in-public">Perpetual public learner.</a>{' '}
					<a href="/about">More about me →</a>
				</p>
			</div>
		</div>
		<aside class="field-note" aria-label="A note from the workbench">
			<img
				class="messenger-bird"
				src="/assets/literary/messenger-bird.webp"
				alt=""
				width="176"
				height="118"
				decoding="async"
			/>
			<p>Somewhere between Singapore, San Francisco, and whatever comes next.</p>
		</aside>
	</section>

	<section class="featured-section" aria-labelledby="featured-essays-heading">
		<div class="section-header shelf-header">
			<div>
				<p class="eyebrow">From a rather overfull bookshelf</p>
				<h2 id="featured-essays-heading">Things worth thinking about</h2>
			</div>
			<a href="/ideas?show=Essay">All essays →</a>
		</div>
		<div
			class="essay-shelf"
			role="region"
			aria-label="Featured essays; scroll horizontally for more"
		>
			{#each FEATURED_ESSAYS as essay, index (essay.href)}
				<a class="essay-card" href={essay.href}>
					<span class="essay-category">{essay.category}</span>
					<h3>{essay.title}</h3>
					<p>{essay.description}</p>
					<span class="essay-mark" aria-hidden="true"
						>{String(index + 1).padStart(2, '0')} <span>↗</span></span
					>
				</a>
			{/each}
		</div>
	</section>

	<div class="workbench-grid">
		<section class="home-section site-card latest-section">
			<div class="section-header">
				<h2 id="latest">Latest content</h2>
				<a href="/ideas">See all posts →</a>
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

		<div class="workbench-aside">
			<section class="home-section site-card projects-section">
				<div class="section-header">
					<h2>Currently making</h2>
				</div>
				<ul class="project-list">
					<li>
						<a href="https://latent.space">Latent Space</a><span>The AI engineer podcast</span>
					</li>
					<li><a href="https://ai.engineer">AI Engineer</a><span>Conferences & community</span></li>
					<li><a href="/portfolio">Portfolio</a><span>Devtools, builders & useful bets</span></li>
					<li>
						<a href="https://overgrid.swyx.io">OverGrid</a><span
							>A small browser-sized experiment</span
						>
					</li>
				</ul>
			</section>
			<BookLaunchCallout />
		</div>
	</div>

	<Newsletter />

	<div class="archive-grid">
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
</div>

<style>
	.literary-home {
		position: relative;
		padding-top: 1.35rem;
	}

	:global(.dark) .literary-home::before {
		position: absolute;
		z-index: -1;
		top: -4rem;
		left: 50%;
		width: min(100vw, calc(100% + 22rem));
		height: 39rem;
		background: url('/assets/literary/celestial-atlas.webp') center top / cover no-repeat;
		opacity: 0.22;
		pointer-events: none;
		transform: translateX(-50%);
		content: '';
	}

	.home-hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 13rem;
		gap: 1.5rem;
		align-items: center;
		padding: 0.8rem 0 1.35rem;
	}

	.author-introduction {
		display: grid;
		grid-template-columns: 5.5rem minmax(0, 1fr);
		gap: 1.2rem;
		align-items: start;
	}

	.author-portrait {
		width: 5.5rem;
		height: 5.5rem;
		border: 2px solid var(--page-border);
		border-radius: 50%;
		filter: sepia(0.18) saturate(0.88);
	}

	.author-copy {
		min-width: 0;
	}

	.home-hero h1 {
		margin: 0;
		font-size: clamp(2.1rem, 4vw, 3.1rem);
		line-height: 1.05;
		letter-spacing: -0.04em;
	}

	.home-hero h1 span {
		color: var(--page-accent);
	}

	.author-subtitle {
		margin: 0.3rem 0 0.45rem;
		color: var(--page-muted);
		font-family: var(--font-display);
		font-size: 1.08rem;
	}

	.author-details {
		max-width: 38rem;
		margin: 0;
		color: var(--page-muted);
		font-size: 0.82rem;
		line-height: 1.62;
	}

	.field-note {
		align-self: center;
		text-align: center;
	}

	.messenger-bird {
		display: block;
		width: 11rem;
		height: auto;
		margin: -1rem auto -0.4rem;
		background: transparent;
	}

	.field-note p {
		margin: 0;
		color: var(--page-muted);
		font-family: var(--font-display);
		font-size: 0.83rem;
		line-height: 1.38;
	}

	.eyebrow {
		margin: 0 0 0.18rem;
		color: var(--page-gold);
		font-family: var(--font-mono);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.075em;
		text-transform: uppercase;
	}

	.featured-section {
		margin: 0.55rem 0 1.5rem;
	}

	.section-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid var(--page-border);
		margin-bottom: 0.65rem;
		padding-bottom: 0.6rem;
	}

	.section-header h2 {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 600;
		line-height: 1.12;
	}

	.section-header a {
		flex-shrink: 0;
		font-size: 0.82rem;
		text-decoration: none;
	}

	.shelf-header {
		margin-bottom: 0.9rem;
	}

	.shelf-header h2 {
		font-size: clamp(1.55rem, 3vw, 1.95rem);
	}

	.essay-shelf {
		display: flex;
		gap: 0.8rem;
		overflow-x: auto;
		overscroll-behavior-inline: contain;
		padding-bottom: 0.8rem;
		scroll-snap-type: x mandatory;
		scrollbar-color: var(--page-gold) var(--page-border);
		scrollbar-width: thin;
	}

	.essay-card {
		display: flex;
		min-height: 11.3rem;
		flex: 0 0 clamp(13.5rem, 25vw, 16rem);
		flex-direction: column;
		border: 1px solid var(--page-border);
		border-radius: 0.55rem;
		background: var(--page-paper);
		padding: 0.85rem;
		color: var(--page-text);
		scroll-snap-align: start;
		text-decoration: none;
		transition:
			border-color 150ms ease,
			transform 150ms ease;
	}

	.essay-card:hover,
	.essay-card:focus-visible {
		border-color: var(--page-gold);
		color: var(--page-text);
		transform: translateY(-2px);
	}

	.essay-category {
		color: var(--page-gold);
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.025em;
		text-transform: uppercase;
	}

	.essay-card h3 {
		margin: 0.45rem 0 0.3rem;
		font-size: 1.12rem;
		line-height: 1.12;
	}

	.essay-card > p {
		margin: 0;
		color: var(--page-muted);
		font-size: 0.76rem;
		line-height: 1.45;
	}

	.essay-mark {
		display: flex;
		justify-content: space-between;
		margin-top: auto;
		padding-top: 0.65rem;
		color: var(--page-gold);
		font-family: var(--font-mono);
		font-size: 0.71rem;
	}

	.workbench-grid,
	.archive-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.85fr);
		gap: 1rem;
		align-items: start;
	}

	.workbench-aside {
		display: grid;
		gap: 0.8rem;
	}

	.home-section {
		min-width: 0;
	}

	.project-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.project-list li {
		display: grid;
		gap: 0.1rem;
		border-bottom: 1px solid var(--page-border);
		padding: 0.44rem 0;
	}

	.project-list li:last-child {
		border-bottom: 0;
	}

	.project-list a {
		font-weight: 650;
		text-decoration: none;
	}

	.project-list span {
		color: var(--page-muted);
		font-size: 0.74rem;
	}

	:global(#newsletter) {
		margin-block: 1.15rem;
	}

	.compact-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.compact-row {
		display: grid;
		grid-template-columns: 5.5rem minmax(0, 1fr);
		gap: 0.6rem;
		align-items: baseline;
		border-bottom: 1px solid var(--page-border);
		padding-block: 0.45rem;
	}

	.compact-row:last-child {
		border-bottom: 0;
	}

	.compact-row time {
		color: var(--page-muted);
		font-size: 0.71rem;
		font-variant-numeric: tabular-nums;
	}

	.compact-row a {
		display: inline-flex;
		gap: 0.4rem;
		min-width: 0;
		color: var(--page-text);
		font-size: 0.83rem;
		font-weight: 600;
		line-height: 1.25;
		text-decoration: none;
	}

	.compact-row a:hover {
		color: var(--page-accent);
		text-decoration: underline;
	}

	@media (max-width: 860px) {
		.home-hero {
			grid-template-columns: minmax(0, 1fr) 9rem;
			gap: 0.8rem;
		}

		.messenger-bird {
			width: 8.3rem;
		}

		.workbench-grid,
		.archive-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.workbench-aside {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			align-items: start;
			order: -1;
		}
	}

	@media (max-width: 600px) {
		.literary-home {
			padding-top: 0.55rem;
		}

		.home-hero {
			grid-template-columns: minmax(0, 1fr);
			padding: 0.5rem 0 0.9rem;
		}

		.author-introduction {
			grid-template-columns: 3.75rem minmax(0, 1fr);
			gap: 0.72rem;
		}

		.author-portrait {
			width: 3.75rem;
			height: 3.75rem;
		}

		.home-hero h1 {
			font-size: clamp(1.58rem, 6.8vw, 2.15rem);
		}

		.author-subtitle {
			font-size: 0.95rem;
		}

		.author-details {
			margin-left: -4.47rem;
			padding-top: 0.65rem;
			font-size: 0.79rem;
		}

		.field-note {
			display: none;
		}

		.featured-section {
			margin-top: 0.2rem;
		}

		.shelf-header h2 {
			font-size: 1.42rem;
		}

		.shelf-header > a {
			font-size: 0.71rem;
		}

		.essay-card {
			flex-basis: 78%;
		}

		.workbench-aside {
			grid-template-columns: minmax(0, 1fr);
		}

		.workbench-aside :global(.book-callout) {
			order: -1;
		}

		.compact-row {
			grid-template-columns: 1fr;
			gap: 0.1rem;
		}

		.compact-row time {
			order: 2;
		}
	}
</style>
