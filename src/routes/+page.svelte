<script>
	import Newsletter from '../components/Newsletter.svelte';
	import FeaturedWriting from '../components/FeaturedWriting.svelte';
	import FeaturedSpeaking from '../components/FeaturedSpeaking.svelte';
	import BookLaunchCallout from '../components/BookLaunchCallout.svelte';
	import SocialMeta from '../components/SocialMeta.svelte';
	import FeaturedEssayShelf from '../components/FeaturedEssayShelf.svelte';
	import { SITE_URL } from '$lib/siteConfig';
	import { getPageSocialMeta } from '$lib/social-meta';

	const social = getPageSocialMeta('home');

	/** @type {import('./$types').PageData} */
	export let data;
	/** @type {import('$lib/types').ContentItem[]} */
	$: items = data.items;

	/** @param {import('$lib/types').ContentItem} item */
	function itemHref(item) {
		if (item.category === 'podcast' && item.url) return item.url;
		if (item.category === 'talk') return item.instances?.[0]?.video ?? `/${item.slug}`;
		return `/${item.slug}`;
	}
</script>

<SocialMeta {...social} />

<svelte:head>
	<link rel="alternate" type="application/rss+xml" href={SITE_URL + '/rss.xml'} />
</svelte:head>

<div class="literary-stage">
	<div class="site-shell literary-home">
		<section class="home-hero" aria-labelledby="me">
			<div class="hero-copy">
				<p class="eyebrow">A NOTEBOOK BY SHAWN WANG</p>
				<h1 id="me">Hey, I’m <span>swyx.</span></h1>
				<p class="hero-lead">
					I write about technology, markets, and networks. Building in public at the frontier of AI.
				</p>
				<p id="bio" class="hero-detail">
					Recovering finance geek. Singaporean in San Francisco. <a href="/learn-in-public"
						>Learning in public</a
					> along the way.
				</p>
				<div class="hero-links">
					<a href="/about">My story <span aria-hidden="true">↗</span></a><a href="/portfolio"
						>People I bet on <span aria-hidden="true">↗</span></a
					><a href="/cognition">Cognition <span aria-hidden="true">↗</span></a>
				</div>
			</div>
			<div class="hero-art">
				<img
					src="/assets/personal/two-cities.webp"
					alt=""
					width="1100"
					height="402"
					fetchpriority="high"
				/>
				<p>
					<span>San Francisco</span><span class="route-line" aria-hidden="true"
						>✦ · · · · · · · · · ✦</span
					><span>Singapore</span>
				</p>
			</div>
		</section>

		<FeaturedEssayShelf />

		<div class="personal-grid">
			<section class="projects-section" aria-labelledby="projects-heading">
				<p class="eyebrow">MAKING THINGS TOGETHER</p>
				<h2 id="projects-heading">What I’m building</h2>
				<a class="project-link" href="https://latent.space">
					<img
						class="project-logo"
						src="/assets/latent-space-hex-gradient.png"
						alt=""
						width="144"
						height="144"
					/>
					<span
						><strong>Latent Space</strong><small
							>Conversations on AI, technology, and humanity.</small
						></span
					><span aria-hidden="true">↗</span>
				</a>
				<a class="project-link engineer-project" href="https://ai.engineer">
					<img
						class="project-logo"
						src="/assets/ai-engineer-logo.svg"
						alt=""
						width="141"
						height="115"
					/>
					<span
						><strong>AI Engineer</strong><small
							>A gathering place for people building with AI.</small
						></span
					><span aria-hidden="true">↗</span>
				</a>
				<p class="side-project">
					After hours: <a href="https://overgrid.swyx.io">a game of OverGrid ↗</a>
				</p>
			</section>
			<aside class="personal-note" aria-labelledby="offscreen-heading">
				<p class="eyebrow">BEYOND THE SCREEN</p>
				<h2 id="offscreen-heading">A few other interests</h2>
				<p><span aria-hidden="true">♫</span> <a href="/wicked">Singing, music &amp; musicals</a></p>
				<p>
					<span aria-hidden="true">✳</span>
					<a href="/bouldering">Bouldering &amp; finding the next route</a>
				</p>
				<p><span aria-hidden="true">✦</span> Bringing people together</p>
				<a href="/sg-guide">A personal guide to Singapore ↗</a>
			</aside>
		</div>
		<div class="book-feature"><BookLaunchCallout /></div>

		<div class="reading-desk">
			<section class="desk-column latest-section" aria-labelledby="latest">
				<h2 id="latest"><span aria-hidden="true">❧</span> Latest writing & appearances</h2>
				<ul class="compact-list">
					{#each items.slice(0, 5) as item (item.url ?? item.slug)}
						<li class="compact-row">
							<a href={itemHref(item)}>{item.title}</a><span>{item.category}</span>
						</li>
					{/each}
				</ul>
				<a class="desk-more" href="/ideas">Browse all writing →</a>
			</section>
			<section class="desk-column talks-section" aria-labelledby="selected-talks">
				<h2 id="selected-talks"><span aria-hidden="true">♧</span> Selected talks</h2>
				<ul class="compact-list">
					<li class="talk-row">
						<span aria-hidden="true">▷</span><a
							href="https://www.youtube.com/embed/D-Sj6jo4o1I?autoplay=1"
							>The Operating System of You</a
						>
					</li>
					<li class="talk-row">
						<span aria-hidden="true">▷</span><a
							href="https://www.youtube.com/embed/KsTAcQJ619o?autoplay=1">Paradigm Lost</a
						>
					</li>
					<li class="talk-row">
						<span aria-hidden="true">▷</span><a
							href="https://www.youtube.com/embed/ddKDPikKbNk?autoplay=1"
							>Mapping Developer Experience</a
						>
					</li>
					<li class="talk-row">
						<span aria-hidden="true">▷</span><a href="/hooks">Getting Closure on Hooks</a>
					</li>
				</ul>
				<a class="desk-more" href="/ideas?show=Talk%2CPodcast">Watch & listen →</a>
			</section>
			<Newsletter compact />
		</div>
		<p class="closing-note">
			<span>The universe is expanding. So, apparently, is the reading list.</span><a
				href="/rss.xml"
				data-sveltekit-reload>Follow by RSS ↗</a
			>
		</p>

		<section class="complete-archive" aria-labelledby="library-heading">
			<h2 id="library-heading">The rest of the library</h2>
			<p class="library-description">Writing, speaking, and recent entries.</p>
			<div class="archive-grid">
				<section>
					<h2 id="writing">Popular writing</h2>
					<FeaturedWriting />
				</section>
				<section>
					<h2 id="speaking">Popular speaking</h2>
					<FeaturedSpeaking />
				</section>
			</div>
			{#if items.length > 5}
				<section class="more-recent">
					<h2>More recent entries</h2>
					<ul class="compact-list">
						{#each items.slice(5) as item (item.url ?? item.slug)}
							<li class="compact-row">
								<a href={itemHref(item)}>{item.title}</a><time
									datetime={new Date(item.date).toISOString()}
									>{new Date(item.date).toISOString().slice(0, 10)}</time
								>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</section>
	</div>
</div>

<style>
	.literary-stage {
		overflow-x: clip;
		background-image:
			radial-gradient(circle at 8% 8%, #d6b67b18 0, transparent 24rem),
			radial-gradient(circle at 93% 28%, #63919712 0, transparent 24rem),
			radial-gradient(#8a6f4a12 0.6px, transparent 0.7px);
		background-size:
			auto,
			auto,
			5px 5px;
	}
	.literary-home {
		--site-max-width: 1160px;
		padding-top: 2.4rem;
	}
	.home-hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(19rem, 0.9fr);
		gap: 2.5rem;
		align-items: center;
		padding: 2.2rem 0 2.8rem;
		border-bottom: 1px solid var(--page-border);
	}
	.eyebrow {
		margin: 0 0 0.65rem;
		color: var(--page-gold);
		font: 600 0.72rem/1.4 var(--font-body);
		letter-spacing: 0.1em;
	}
	.home-hero h1 {
		margin: 0 0 1.1rem;
		font: 700 clamp(2.5rem, 4vw, 3.8rem)/1.05 var(--font-body);
		letter-spacing: -0.05em;
	}
	.home-hero h1 span {
		color: var(--page-link);
	}
	.hero-lead {
		max-width: 33rem;
		margin: 0 0 0.7rem;
		font-size: 1.2rem;
		line-height: 1.65;
	}
	.hero-detail {
		max-width: 32rem;
		margin: 0;
		color: var(--page-muted);
		font-size: 1rem;
		line-height: 1.7;
	}
	.hero-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem 1.5rem;
		margin-top: 1.35rem;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.hero-links a,
	.personal-note a {
		text-decoration: none;
	}
	.hero-links a:hover,
	.personal-note a:hover {
		text-decoration: underline;
	}
	.hero-art {
		align-self: center;
	}
	.hero-art img {
		display: block;
		width: 100%;
		height: auto;
		background: transparent;
	}
	.hero-art p {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
		margin: 0.2rem 0 0;
		color: var(--page-muted);
		font: 600 0.72rem/1.4 var(--font-body);
		letter-spacing: 0.03em;
	}
	.route-line {
		flex: 1;
		overflow: hidden;
		color: var(--page-gold);
		text-align: center;
		white-space: nowrap;
	}
	.personal-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4rem;
		margin: 3rem 0;
		padding-top: 1.6rem;
		border-top: 1px solid var(--page-border);
	}
	.personal-grid h2,
	.desk-column h2,
	.complete-archive h2 {
		margin: 0 0 1rem;
		font: 650 1.4rem/1.25 var(--font-body);
		letter-spacing: -0.025em;
	}
	.project-link {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr) auto;
		gap: 0.85rem;
		align-items: center;
		padding: 0.8rem 0;
		border-bottom: 1px solid var(--page-border);
		color: var(--page-text);
		text-decoration: none;
	}
	.project-link:hover strong {
		color: var(--page-link);
		text-decoration: underline;
	}
	.project-link strong,
	.project-link small {
		display: block;
	}
	.project-link strong {
		font-size: 1rem;
	}
	.project-link small {
		color: var(--page-muted);
		font-size: 0.86rem;
		line-height: 1.5;
	}
	.project-logo {
		width: 3rem;
		height: 3rem;
		object-fit: contain;
		background: transparent;
	}
	.engineer-project .project-logo {
		filter: invert(1);
	}
	:global(.dark) .engineer-project .project-logo {
		filter: none;
	}
	.side-project {
		margin: 0.8rem 0 0;
		color: var(--page-muted);
		font-size: 0.85rem;
	}
	.personal-note {
		border-left: 3px solid #b48a3a;
		padding: 0.1rem 0 0 1.5rem;
	}
	.personal-note p:not(.eyebrow) {
		margin: 0.65rem 0;
		font-size: 0.95rem;
		line-height: 1.6;
	}
	.personal-note p span {
		display: inline-block;
		width: 1.75rem;
		color: var(--page-link);
	}
	.personal-note p:nth-of-type(3) span {
		color: #427d86;
	}
	.personal-note > a {
		display: inline-block;
		margin-top: 0.6rem;
		font-size: 0.86rem;
		font-weight: 600;
	}
	.book-feature {
		margin: 0 0 3rem;
	}
	.reading-desk {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 2rem;
		padding: 2rem 0;
		border-top: 1px solid var(--page-border);
		border-bottom: 1px solid var(--page-border);
	}
	.desk-column {
		min-width: 0;
	}
	.desk-column h2 {
		font-size: 1.15rem;
	}
	.desk-column h2 span {
		color: var(--page-gold);
	}
	.compact-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.compact-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: baseline;
		gap: 0.6rem;
		border-bottom: 1px solid var(--page-border);
		padding: 0.6rem 0;
	}
	.compact-row a,
	.talk-row a {
		min-width: 0;
		color: var(--page-text);
		font-size: 0.9rem;
		line-height: 1.5;
		text-decoration: none;
	}
	.compact-row a:hover,
	.talk-row a:hover {
		color: var(--page-link);
		text-decoration: underline;
	}
	.compact-row > span,
	.compact-row time {
		color: var(--page-muted);
		font-size: 0.72rem;
	}
	.talk-row {
		display: flex;
		gap: 0.5rem;
		border-bottom: 1px solid var(--page-border);
		padding: 0.6rem 0;
	}
	.talk-row > span {
		color: var(--page-gold);
	}
	.desk-more {
		display: inline-block;
		margin-top: 0.8rem;
		font-size: 0.85rem;
		text-decoration: none;
	}
	.reading-desk :global(.newsletter-card) {
		border-left: 1px solid var(--page-border);
		padding: 0 0 0 1.5rem;
	}
	.closing-note {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 1rem;
		margin: 1.1rem 0 2.5rem;
		color: var(--page-muted);
		font-size: 0.8rem;
	}
	.closing-note a {
		text-decoration: none;
	}
	.complete-archive {
		padding: 1rem 0;
	}
	.complete-archive > h2 {
		margin-bottom: 0.25rem;
		font-size: 1.65rem;
	}
	.library-description {
		margin: 0 0 1.5rem;
		color: var(--page-muted);
		font-size: 0.9rem;
	}
	.archive-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}
	.more-recent {
		margin-top: 2rem;
	}
	@media (max-width: 800px) {
		.home-hero {
			grid-template-columns: 1fr 0.8fr;
			gap: 1rem;
		}
		.reading-desk {
			grid-template-columns: 1fr 1fr;
		}
		.reading-desk :global(.newsletter-card) {
			grid-column: 1 / -1;
			border-left: 0;
			border-top: 1px solid var(--page-border);
			padding: 1.5rem 0 0;
		}
	}
	@media (max-width: 600px) {
		.literary-home {
			padding-top: 1rem;
		}
		.home-hero {
			grid-template-columns: 1fr;
			gap: 1rem;
			padding: 1.4rem 0 1.8rem;
		}
		.home-hero h1 {
			font-size: 2.6rem;
		}
		.hero-lead {
			font-size: 1.08rem;
			line-height: 1.65;
		}
		.hero-detail {
			font-size: 0.96rem;
		}
		.hero-art {
			width: min(100%, 24rem);
			margin: 0.4rem auto 0;
		}
		.personal-grid,
		.reading-desk,
		.archive-grid {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
		.personal-grid {
			margin-block: 2rem;
		}
		.reading-desk :global(.newsletter-card) {
			grid-column: auto;
		}
		.closing-note {
			line-height: 1.5;
		}
	}
</style>
