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
		<div class="frontispiece">
			<section class="home-hero" aria-labelledby="me">
				<div class="author-introduction">
					<a href="/about" class="portrait-link" aria-label="More about Shawn Wang">
						<img
							class="author-portrait"
							src="/assets/literary/portrait-engraved.webp"
							alt="Engraved portrait of Shawn Wang"
							width="116"
							height="174"
							fetchpriority="high"
						/>
					</a>
					<div class="author-copy">
						<h1 id="me">Shawn <span>@swyx</span> Wang</h1>
						<div class="small-rule" aria-hidden="true"><span>✶</span></div>
						<p id="bio" class="author-motto"><a href="/learn-in-public">Learn in Public</a></p>
						<p class="author-details">
							I write about technology, markets, and networks.<br />Building in public at the
							frontier of AI.<br />Recovering finance geek. Singaporean in San Francisco.
						</p>
						<p class="author-links">
							<a href="/about">My story</a><span aria-hidden="true"> · </span><a href="/portfolio"
								>People I bet on</a
							><span aria-hidden="true"> · </span><a href="/cognition">Cognition</a>
						</p>
						<div class="place-line">
							<span aria-hidden="true">✧</span> SG
							<span class="place-route" aria-hidden="true">⟷</span>
							SF <span aria-hidden="true">✧</span>
						</div>
					</div>
				</div>
				<aside class="field-note" aria-label="A note to self">
					<div>
						<p class="note-label">A note to self, and whoever finds it useful</p>
						<p>
							Be generous with attention. Build things that outlive you. Leave the library better
							than you found it.
						</p>
					</div>
					<img
						class="messenger-bird"
						src="/assets/literary/messenger-bird.webp"
						alt=""
						width="110"
						height="74"
						decoding="async"
					/>
				</aside>
			</section>

			<FeaturedEssayShelf />

			<section class="projects-section" aria-labelledby="projects-heading">
				<h2 id="projects-heading" class="section-kicker">Currently causing interesting trouble</h2>
				<a class="project-link latent-project" href="https://latent.space">
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
					><span class="project-arrow" aria-hidden="true">↗</span>
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
					><span class="project-arrow" aria-hidden="true">↗</span>
				</a>
				<p class="side-project">
					After hours: <a href="https://overgrid.swyx.io">a game of OverGrid →</a>
				</p>
			</section>
			<div class="book-ribbon"><BookLaunchCallout ribbon /></div>
		</div>

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
	}
	.literary-home {
		--site-max-width: 1160px;
		position: relative;
		padding-top: 1.1rem;
	}
	.literary-home::before {
		position: absolute;
		z-index: -1;
		top: -4rem;
		left: 50%;
		width: min(100vw, calc(100% + 14rem));
		height: 44rem;
		pointer-events: none;
		transform: translateX(-50%);
		content: '';
	}
	:global(.dark) .literary-home::before {
		background: url('/assets/literary/celestial-atlas.webp') center top / cover no-repeat;
		opacity: 0.18;
	}
	.frontispiece {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 13.5rem 10rem;
		grid-template-areas: 'hero projects book' 'essays essays essays';
		gap: 1.5rem;
		align-items: start;
		padding: 1rem 0 1.1rem;
	}
	.home-hero {
		grid-area: hero;
		min-width: 0;
	}
	.author-introduction {
		display: grid;
		grid-template-columns: 7.3rem minmax(0, 1fr);
		gap: 1.2rem;
		align-items: center;
	}
	.portrait-link {
		display: block;
	}
	.author-portrait {
		width: 7.3rem;
		height: 11rem;
		object-fit: contain;
		background: transparent;
		clip-path: ellipse(46% 45% at 50% 47%);
	}
	.author-copy {
		min-width: 0;
	}
	.home-hero h1 {
		margin: 0;
		font-size: clamp(1.9rem, 3.1vw, 2.6rem);
		font-weight: 600;
		line-height: 1.08;
		letter-spacing: -0.04em;
	}
	.home-hero h1 span {
		color: inherit;
		white-space: nowrap;
	}
	.small-rule {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		width: 7rem;
		margin: 0.7rem 0 0.35rem;
		color: var(--page-gold);
	}
	.small-rule::before,
	.small-rule::after {
		height: 1px;
		flex: 1;
		background: currentColor;
		opacity: 0.6;
		content: '';
	}
	.small-rule span {
		font-size: 1rem;
		line-height: 1;
	}
	.author-motto {
		margin: 0 0 0.6rem;
		font: italic 1.16rem var(--font-display);
	}
	.author-motto a {
		color: var(--page-accent);
		text-decoration: none;
	}
	.author-details {
		margin: 0;
		font-family: Georgia, serif;
		font-size: 0.82rem;
		line-height: 1.55;
	}
	.author-links {
		margin: 0.55rem 0 0;
		font-size: 0.72rem;
	}
	.author-links a {
		text-decoration: none;
	}
	.author-links > span {
		margin-inline: 0.28rem;
		color: var(--page-gold);
	}
	.place-line {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-top: 0.65rem;
		color: var(--page-gold);
		font-family: var(--font-display);
		font-size: 1rem;
		letter-spacing: 0.06em;
	}
	.place-route {
		width: 3rem;
		text-align: center;
	}
	.field-note {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 4.4rem;
		gap: 0.6rem;
		align-items: center;
		margin: 0.6rem 0 0;
		border-top: 1px solid var(--page-border);
		padding-top: 0.4rem;
	}
	.field-note p {
		margin: 0;
		font-family: Georgia, serif;
		font-size: 0.74rem;
		line-height: 1.45;
		font-style: italic;
		color: var(--page-muted);
	}
	.field-note .note-label {
		margin-bottom: 0.25rem;
		color: var(--page-gold);
		font: 0.56rem var(--font-mono);
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}
	.messenger-bird {
		width: 4.4rem;
		height: auto;
		background: transparent;
	}
	.section-kicker {
		margin: 0.2rem 0 0.8rem;
		font-family: var(--font-mono);
		font-size: 0.61rem;
		font-weight: 500;
		line-height: 1.55;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--page-gold);
	}
	.project-link {
		position: relative;
		display: grid;
		grid-template-columns: 3.4rem minmax(0, 1fr);
		gap: 0.55rem;
		align-items: center;
		min-height: 6.2rem;
		margin-bottom: 0.65rem;
		border: 1px solid var(--page-border);
		padding: 0.55rem;
		color: var(--page-text);
		text-decoration: none;
		background: var(--page-surface);
	}
	.project-link strong {
		display: block;
		margin-bottom: 0.4rem;
		font: 1.2rem var(--font-display);
	}
	.project-link small {
		display: block;
		padding-right: 0.45rem;
		font-family: Georgia, serif;
		font-size: 0.7rem;
		line-height: 1.4;
	}
	.project-logo {
		width: 3.4rem;
		height: auto;
		object-fit: contain;
		background: transparent;
	}
	.latent-project {
		background: #30382d;
		border-color: #30382d;
		color: #f4ecd8;
	}
	.engineer-project .project-logo {
		filter: invert(1);
	}
	.project-arrow {
		position: absolute;
		bottom: 0.35rem;
		right: 0.45rem;
		font-size: 0.75rem;
	}
	.side-project {
		margin: 0.7rem 0 0;
		font-size: 0.65rem;
		color: var(--page-muted);
	}
	.side-project a {
		white-space: nowrap;
		text-decoration: none;
	}
	:global(.dark) .project-link {
		background: transparent;
		border-color: transparent;
		padding-left: 0;
		padding-right: 0;
	}
	:global(.dark) .engineer-project .project-logo {
		filter: none;
	}
	.projects-section {
		grid-area: projects;
	}
	:global(.dark) .field-note {
		display: none;
	}
	.book-ribbon {
		grid-area: book;
		position: relative;
	}
	.reading-desk {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr 1fr;
		border: 1px solid var(--page-border);
		border-radius: 3px;
		background: #f5eddb;
		color: #342d21;
		box-shadow: inset 0 0 40px #c7ae6c16;
	}
	:global(.dark) .reading-desk {
		background: #e8dbb9;
		border-color: #b59e6c;
	}
	.desk-column {
		min-width: 0;
		padding: 1rem;
	}
	.desk-column + .desk-column {
		border-left: 1px solid #b49b7052;
	}
	.desk-column h2 {
		margin: 0 0 0.7rem;
		font: 1.1rem var(--font-display);
		color: #342d21;
	}
	.desk-column h2 span {
		margin-right: 0.25rem;
		color: #816f47;
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
		border-bottom: 1px solid #b49b703b;
		padding: 0.35rem 0;
	}
	.compact-row a,
	.talk-row a {
		min-width: 0;
		font-family: Georgia, serif;
		font-size: 0.74rem;
		line-height: 1.35;
		color: inherit;
		text-decoration: none;
	}
	.compact-row > span,
	.compact-row time {
		font-family: Georgia, serif;
		font-size: 0.62rem;
		opacity: 0.7;
	}
	.talk-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		border-bottom: 1px solid #b49b703b;
		padding: 0.45rem 0;
	}
	.talk-row > span {
		color: #816f47;
	}
	.desk-more {
		display: inline-block;
		margin-top: 0.7rem;
		font-family: Georgia, serif;
		font-size: 0.72rem;
		color: #6d4533;
		text-decoration: none;
	}
	.reading-desk :global(.newsletter-card) {
		--page-text: #342d21;
		--page-muted: #655b47;
		--page-accent: #8d4935;
		--page-surface: #f7eedb;
		--page-link: #8d4935;
		--page-border: #b49b7065;
		border-left: 1px solid #b49b7052;
	}
	.closing-note {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin: 0.65rem 0 1.1rem;
		color: var(--page-muted);
		font:
			italic 0.68rem Georgia,
			serif;
	}
	.closing-note a {
		flex-shrink: 0;
		font-style: normal;
		text-decoration: none;
	}
	.complete-archive {
		border: 0;
		border-top: 1px solid var(--page-border);
		padding: 0.8rem 0;
	}
	.complete-archive > h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.55rem;
		color: var(--page-text);
	}
	.library-description {
		margin: 0.25rem 0 1.1rem;
		color: var(--page-muted);
		font-size: 0.8rem;
	}
	.archive-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		margin-top: 1rem;
	}
	.archive-grid h2,
	.more-recent h2 {
		font: 1.45rem var(--font-display);
	}
	.more-recent {
		margin-top: 1.5rem;
	}
	@media (min-width: 961px) {
		:global(html:not(.dark)) .small-rule {
			display: none;
		}
		:global(html:not(.dark)) .author-motto {
			margin-top: 0.6rem;
		}
		:global(html:not(.dark)) .home-hero h1 {
			font-size: 2.35rem;
		}
		:global(html:not(.dark)) .home-hero {
			border: 1px solid var(--page-border);
			border-radius: 3px;
			background: #fbf7ed;
			padding: 1rem;
		}
	}
	@media (max-width: 1100px) and (min-width: 961px) {
		.frontispiece {
			grid-template-columns: minmax(0, 1fr) 11rem 9rem;
			gap: 1rem;
		}
		.author-introduction {
			grid-template-columns: 5.6rem minmax(0, 1fr);
			gap: 0.8rem;
		}
		.author-portrait {
			width: 5.6rem;
			height: 8.4rem;
		}
		.home-hero h1 {
			font-size: 2rem;
		}
		.author-details {
			font-size: 0.76rem;
		}
		.project-link {
			grid-template-columns: 2.6rem minmax(0, 1fr);
		}
		.project-logo {
			width: 2.6rem;
		}
	}
	@media (max-width: 960px) {
		.frontispiece {
			grid-template-columns: minmax(0, 1fr) 11rem;
			grid-template-areas: 'hero book' 'projects book' 'essays essays';
			gap: 1rem 1.3rem;
		}

		.projects-section {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.6rem;
		}
		.section-kicker {
			grid-column: 1 / -1;
			margin: 0;
		}
		.project-link {
			margin: 0;
			grid-template-columns: 2.5rem minmax(0, 1fr);
		}
		.project-logo {
			width: 2.5rem;
		}
		.project-link strong {
			font-size: 1.05rem;
		}
		.side-project {
			grid-column: 1 / -1;
			margin: 0;
		}

		.author-introduction {
			grid-template-columns: 5.5rem minmax(0, 1fr);
			gap: 0.8rem;
		}
		.author-portrait {
			width: 5.5rem;
			height: 8.25rem;
		}
		.home-hero h1 {
			font-size: 2rem;
		}
		.author-details {
			font-size: 0.75rem;
		}
		.author-links {
			font-size: 0.68rem;
		}
		.field-note {
			display: none;
		}
		.reading-desk {
			grid-template-columns: 1fr 1fr;
		}
		.reading-desk :global(.newsletter-card) {
			grid-column: 1 / -1;
			border-left: 0;
			border-top: 1px solid #b49b7052;
		}
	}
	@media (max-width: 600px) {
		.literary-home {
			padding-top: 0.35rem;
		}
		.frontispiece {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas: 'hero' 'essays' 'projects' 'book';
			padding-top: 0.4rem;
			gap: 0.9rem;
		}
		.author-introduction {
			grid-template-columns: 4.6rem minmax(0, 1fr);
			gap: 0.8rem;
		}
		.author-portrait {
			width: 4.6rem;
			height: 6.9rem;
		}
		.home-hero h1 {
			font-size: 1.65rem;
		}
		.small-rule {
			margin: 0.45rem 0 0.3rem;
			width: 5rem;
		}
		.author-motto {
			font-size: 1rem;
			margin-bottom: 0.4rem;
		}
		.author-details {
			font-size: 0.71rem;
			line-height: 1.5;
		}
		.author-links {
			font-size: 0.64rem;
			margin-top: 0.4rem;
		}
		.place-line {
			font-size: 0.83rem;
			margin-top: 0.5rem;
		}
		.projects-section {
			grid-column: 1;
			gap: 0.5rem;
		}
		.section-kicker {
			font-size: 0.55rem;
		}
		.project-link {
			min-height: 4.5rem;
			grid-template-columns: 2rem minmax(0, 1fr);
			gap: 0.35rem;
			padding: 0.4rem;
		}
		.project-logo {
			width: 2rem;
		}
		.project-link strong {
			font-size: 0.95rem;
			margin-bottom: 0.2rem;
		}
		.project-link small {
			font-size: 0.61rem;
		}
		.side-project {
			font-size: 0.61rem;
		}

		.reading-desk {
			grid-template-columns: minmax(0, 1fr);
		}
		.desk-column + .desk-column {
			border-left: 0;
			border-top: 1px solid #b49b7052;
		}
		.desk-column {
			padding: 0.9rem;
		}
		.closing-note {
			font-size: 0.63rem;
		}
		.archive-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
