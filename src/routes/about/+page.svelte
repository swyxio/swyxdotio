<script>
	import SponsorshipOption from '$lib/about/SponsorshipOption.svelte';
	import SocialMeta from '../../components/SocialMeta.svelte';
	import { getPageSocialMeta } from '$lib/social-meta';
	import LetterSection from '$lib/about/LetterSection.svelte';
	import TextVersions from '$lib/about/TextVersions.svelte';
	import { introductions, speakerBios } from '$lib/about/copy';
	/** @type {{ html: string, photoHtml: string }} */
	export let data;
	const social = getPageSocialMeta('about');
	const photos = [
		{
			title: 'At the lectern',
			src: '/about-photos/worlds-fair-speaking.webp',
			href: 'https://images.pixieset.com/123558811/6c76a1739b4eabc52f657fde9713a4f4-xxlarge.jpg',
			alt: 'swyx speaking into a microphone against blue curtains at AI Engineer World’s Fair 2026',
			format: '1600 × 1067 · JPEG'
		},
		{
			title: 'Main-stage close-up',
			src: '/about-photos/worlds-fair-main-stage.webp',
			href: 'https://images.pixieset.com/123558811/4d6e437d525dacddd421dd54f80b82ba-xxlarge.jpg',
			alt: 'swyx gesturing with both hands on the main stage at AI Engineer World’s Fair 2026',
			format: '1600 × 1066 · JPEG'
		},
		{
			title: 'Fireside conversation',
			src: '/about-photos/worlds-fair-fireside.webp',
			href: 'https://images.pixieset.com/123558811/1c7d09dc3e532093ab515a1934290380-xxlarge.jpg',
			alt: 'swyx in an onstage fireside conversation at AI Engineer World’s Fair 2026',
			format: '1600 × 1066 · JPEG'
		},
		{
			title: 'A little guitar',
			src: '/about-photos/worlds-fair-guitar.webp',
			href: 'https://images.pixieset.com/123558811/aeb10950f838422b446615e625163675-xxlarge.jpg',
			alt: 'swyx playing acoustic guitar alongside another musician at AI Engineer World’s Fair 2026',
			format: '1600 × 1067 · JPEG'
		}
	];
</script>

<SocialMeta {...social} />

<article class="site-shell about-page">
	<header class="letter-opening">
		<div class="about-introduction">
			<figure class="about-portrait">
				<img src="/swyx-ski.jpeg" alt="swyx in the snow at Niseko" width="460" height="460" />
				<figcaption>Out of office, Niseko.</figcaption>
			</figure>
			<div class="introduction-copy">
				<h1>Hey, I’m swyx.</h1>
				<p class="name-note">Pronounced “swicks”. Shawn works too.</p>
				<TextVersions id="intro" label="Intro" versions={introductions} />
				<a class="now-link" href="/now">What I’m doing now →</a>
			</div>
		</div>
		<aside class="opening-note" aria-label="A note on the name">
			<p>“swyx” is the initials of my English and Chinese names. You can call me Shawn, too.</p>
		</aside>
	</header>

	<nav class="about-sections" aria-labelledby="visitor-heading">
		<h2 id="visitor-heading">What brings you here?</h2>
		<ol>
			<li>
				<a href="#start-here"><span>1.</span> Something to read <span aria-hidden="true">→</span></a
				>
			</li>
			<li>
				<a href="#current-work"
					><span>2.</span> What I’m building <span aria-hidden="true">→</span></a
				>
			</li>
			<li>
				<a href="#founders"><span>3.</span> Building a company? <span aria-hidden="true">→</span></a
				>
			</li>
			<li>
				<a href="#sponsor"><span>4.</span> Sponsor my work <span aria-hidden="true">→</span></a>
			</li>
			<li>
				<a href="#speaker-bio"><span>5.</span> Bio &amp; photos <span aria-hidden="true">→</span></a
				>
			</li>
			<li>
				<a href="#my-story"><span>6.</span> The longer story <span aria-hidden="true">→</span></a>
			</li>
		</ol>
	</nav>

	<LetterSection id="start-here" title="Start here" number="1">
		<p>
			This site is my public notebook. Some entries are technical; others are about careers,
			ambition, and figuring things out. If you’re new, these are a few places to begin.
		</p>
		<ul class="starting-points">
			<li>
				<a href="/learn-in-public">Learn in Public</a><span>Learning by sharing what you know.</span
				>
			</li>
			<li>
				<a href="/create-luck">How to Create Luck</a><span
					>Making more room for good things to happen.</span
				>
			</li>
			<li>
				<a href="https://www.latent.space/p/ai-engineer">The Rise of the AI Engineer</a><span
					>The shift behind much of my current work.</span
				>
			</li>
		</ul>
		<p class="section-links">
			<a href="/ideas">Browse the library →</a><a href="/subscribe">Occasional letters →</a>
		</p>
		<svelte:fragment slot="commentary"
			><p>
				Learning in public starts with making something that would have helped your past self. An
				audience is a bonus, not a prerequisite.
			</p></svelte:fragment
		>
	</LetterSection>

	<LetterSection id="current-work" title="What I’m working on" number="2">
		<p>
			Most of my work lives in <a href="https://www.latent.space/">Latent Space</a>,
			<a href="https://ai.engineer">AI Engineer</a>, and <a href="/cognition">Cognition</a>.
		</p>
		<p>
			Latent Space is where I write and have conversations about AI and the people building it. AI
			Engineer brings together people turning new capabilities into useful software. You can read
			more about my work at <a href="/cognition">Cognition here</a>.
		</p>
		<p>
			For what has my attention these days, there’s <a href="/now">/now</a>. This page is the longer
			view.
		</p>
		<svelte:fragment slot="commentary"
			><p>
				My writing moves between technology, markets, and networks. The software matters; so do the
				people building it and the communities forming around it.
			</p></svelte:fragment
		>
	</LetterSection>

	<LetterSection id="my-story" title="I took the scenic route" number="3">
		<p>
			I grew up in Singapore and have worked mostly in the US and UK. Before software, I was a <a
				href="https://www.freecodecamp.org/news/shawn-wang-podcast-interview/"
				>currency options trader, then a technology, media, and telecom hedge fund analyst</a
			>. I still often approach technology from an investing and risk-management angle.
		</p>
		<p>
			My developer-experience work took me through <a href="/farewell-netlify">Netlify</a>,
			<a href="/hello-aws">Amazon Web Services</a>, <a href="/why-temporal">Temporal</a>, and
			<a href="https://airbyte.io/">Airbyte</a>. Along the way, I helped run
			<a href="/moderating-rreactjs">the React subreddit</a>
			and <a href="/starting-dev-community-meetup">grow Svelte Society</a>.
		</p>
		<p>
			I wrote <a href="/learn-in-public">Learn in Public</a> and collected my nontechnical advice
			for developers growing from junior to senior in
			<a href="https://learninpublic.org/">The Coding Career Handbook</a>, now free and open source.
			My technical writing includes the
			<a href="/self-provisioning-runtime">Self-Provisioning Runtime</a>, the
			<a href="/js-third-age">Third Age of JavaScript</a>, and the
			<a href="https://dx.tips/the-end-of-localhost">End of Localhost</a>.
		</p>
		<svelte:fragment slot="commentary"
			><p>Singapore → finance → developer experience → AI.</p>
			<p>The industries changed. Thinking about incentives and risk came with me.</p>
			<img
				class="letter-bird"
				src="/assets/literary/messenger-bird.webp"
				alt=""
				width="112"
				height="84"
				loading="lazy"
				decoding="async"
			/></svelte:fragment
		>
	</LetterSection>

	<LetterSection id="founders" title="If you’re building a company" number="4">
		<p>
			I invest in AI and developer-tool companies. I mostly help with developer relations and
			community strategy, hiring early devrels, and AI product feedback and launch guidance.
		</p>
		<p>
			My <a href="/portfolio">portfolio</a> explains where I’ve invested and the boundaries between investing
			and my editorial work. I’m not taking new advising inquiries; the portfolio page has more detail
			for founders who are fundraising.
		</p>
		<svelte:fragment slot="commentary"
			><p>
				Backing a company doesn’t buy it a place on the podcast or conference stage. Those are
				separate decisions.
			</p></svelte:fragment
		>
	</LetterSection>

	<LetterSection id="sponsor" title="Sponsor my work" number="5">
		<p>
			Want to support what I’m building and reach the people building with AI? I work with sponsors
			through <strong>AI Engineer</strong> and <strong>Latent Space</strong>.
		</p>
		<SponsorshipOption
			name="AI Engineer"
			logo="/assets/ai-engineer-logo.svg"
			monochrome
			description="Conferences, expos & workshops for the people building AI."
			contact="sponsorships@ai.engineer"
			source="https://ai.engineer/about"
			stats={[
				{ value: '15,000+', label: 'In-person AI engineers' },
				{ value: '100,000+', label: 'Newsletter subscribers' },
				{ value: '10M+', label: 'Talk & workshop views in 2025' }
			]}
		/>
		<SponsorshipOption
			name="Latent Space"
			logo="/assets/latent-space-hex-gradient.png"
			description="Technical AI conversations, in your inbox and headphones."
			contact="business@latent.space"
			source="https://www.latent.space/about"
			stats={[
				{ value: '200,000+', label: 'Subscribers across all channels' },
				{ value: '10M+', label: 'Viewers across all channels' },
				{ value: 'Top 30', label: 'US Technology on Apple Podcasts (historical ranking)' }
			]}
		/>
		<svelte:fragment slot="commentary"
			><p>
				If you’re building something useful for AI engineers, these are the two places where I can
				help you meet them. Tell us what you’re launching, who it’s for, and your timing.
			</p></svelte:fragment
		>
	</LetterSection>

	<LetterSection id="speaker-bio" title="Bios & photos" number="6">
		<p>
			Introducing me? Here are two third-person versions you can use. For the name: <strong
				>Shawn Wang</strong
			>, usually <strong>swyx</strong>, pronounced “swicks”.
		</p>
		<TextVersions id="speaker" label="Bio" versions={speakerBios} />
		<p class="section-links">
			<a href="#headshots">Headshots &amp; avatars ↓</a><a href="#press-photos"
				>Conference &amp; social photos ↓</a
			>
		</p>
		<details class="previous-bios">
			<summary>Selected talks &amp; conversations</summary>
			<p>I speak and write about AI engineering, developer experience, and learning in public.</p>
			<ul class="talk-links">
				<li><a href="/ai-eng-agents">Engineering AI Agents</a></li>
				<li>
					<a href="https://www.youtube.com/watch?v=D-Sj6jo4o1I">The Operating System of You</a>
				</li>
				<li><a href="/paradigm-lost">Paradigm Lost</a></li>
				<li>
					<a href="/hooks">The Hooks talk</a> ·
					<a href="https://www.youtube.com/watch?v=nyFHR0dDZo0">Concurrent React</a>
				</li>
			</ul>
			<p><a href="/podcasts">More conversations on the podcasts page →</a></p>
		</details>
		<details class="previous-bios">
			<summary>Previous bios &amp; older links</summary>
			<div class="reading-prose about-copy">{@html data.html}</div>
		</details>
		<svelte:fragment slot="commentary"
			><p>
				A bio is an introduction, not a complete inventory. Pick the length that suits the occasion;
				the older versions are here for context, not current titles.
			</p></svelte:fragment
		>
	</LetterSection>

	<section class="press-photos" aria-labelledby="press-photos">
		<header class="reading-prose">
			<h2 id="press-photos">Press photos</h2>
			<p>
				Headshots, avatars, and recent favorites from
				<a href="https://aiengineer.pixieset.com/worldsfair2026/">AI Engineer World’s Fair 2026</a>,
				plus earlier events and social photos. Each image links to its original or source post. For
				reuse of someone else’s photo, check with its photographer or original poster.
			</p>
		</header>
		<div class="press-photo-grid">
			{#each photos as photo}
				<figure>
					<a href={photo.href} aria-label={`Open full-size: ${photo.title}`}>
						<img
							src={photo.src}
							alt={photo.alt}
							width="720"
							height="480"
							loading="lazy"
							decoding="async"
						/>
					</a>
					<figcaption>
						<strong>{photo.title}</strong>
						<span>{photo.format}</span>
						<a href={photo.href}>Open full-size ↗</a>
					</figcaption>
				</figure>
			{/each}
		</div>
		<div class="photo-sources">
			{@html data.photoHtml}
		</div>
	</section>
	<footer class="letter-signoff">
		<p>Thanks for stopping by.<br /><span>— swyx</span></p>
		<ul class="social-links" aria-label="Find me online">
			<li><a href="https://x.com/swyx">Twitter</a></li>
			<li><a href="https://github.com/swyxio">GitHub</a></li>
			<li><a href="https://youtube.com/swyxTV?sub_confirmation=1">YouTube</a></li>
		</ul>
	</footer>
</article>

<style>
	.about-page {
		--site-max-width: 1080px;
		margin-block: clamp(2rem, 4vw, 3.5rem) 4rem;
	}
	.letter-opening {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 12rem;
		gap: 3rem;
		align-items: start;
	}

	.about-introduction {
		display: grid;
		grid-template-columns: 8rem minmax(0, 1fr);
		align-items: start;
		gap: 1.8rem;
	}
	.introduction-copy {
		min-width: 0;
	}

	h1 {
		font-family: var(--font-display);
		font-size: clamp(2.1rem, 4vw, 3rem);
		line-height: 1.08;
		letter-spacing: -0.025em;
	}

	.name-note {
		margin-block: 0.5rem 0.3rem;
		color: var(--page-muted);
		font: italic 0.95rem/1.5 var(--font-reading);
	}
	.opening-note {
		border-left: 1px solid var(--page-border);
		padding: 0.4rem 0 0.4rem 1.2rem;
		margin-top: 0.4rem;
		color: var(--page-muted);
		font: italic 0.96rem/1.6 var(--font-reading);
	}
	.opening-note p {
		margin: 0 0 0.8rem;
	}
	.opening-note p:last-child {
		margin-bottom: 0;
	}
	.now-link {
		display: inline-block;
		padding-block: 0.75rem 0.2rem;
		font-family: var(--font-reading);
		color: var(--page-link);
	}

	.social-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem 1.1rem;
		margin-block: 0.7rem 0;
		padding: 0;
		list-style: none;
		font-size: 0.95rem;
	}

	.social-links a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}

	.about-portrait {
		margin: 0;
	}

	.about-portrait img {
		width: 100%;
		height: auto;
		aspect-ratio: 1;
	}

	.about-portrait figcaption {
		margin-top: 0.5rem;
		color: var(--page-muted);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 0.85rem;
		font-style: italic;
	}

	.about-sections {
		margin-block: 1.8rem 2.2rem;
		padding-block: 0.9rem;
		border-block: 1px solid var(--page-border);
		font: 1rem/1.4 var(--font-reading);
	}
	.about-sections h2 {
		font: 500 0.8rem/1.5 var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0 0 0.5rem;
		color: var(--page-link);
	}
	.about-sections ol {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-auto-flow: column;
		grid-template-rows: repeat(3, auto);
		column-gap: 3rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.about-sections li {
		min-width: 0;
		border-bottom: 1px solid var(--page-border);
	}
	.about-sections li:nth-child(3n) {
		border-bottom: 0;
	}
	.about-sections a {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		min-height: 44px;
		color: var(--page-link);
		text-decoration: none;
	}
	.about-sections a:hover {
		text-decoration: underline;
	}
	.about-sections a:focus-visible {
		outline: 2px solid var(--page-link);
		outline-offset: 3px;
	}
	.about-sections a span:last-child {
		margin-left: auto;
		color: var(--page-muted);
	}
	.starting-points {
		list-style: none;
		padding: 0;
		margin: 1rem 0;
	}
	.starting-points li {
		display: grid;
		grid-template-columns: minmax(12rem, 0.9fr) minmax(0, 1fr);
		gap: 0.7rem;
		padding-block: 0.4rem;
	}
	.starting-points a {
		font-weight: 600;
	}
	.starting-points span {
		font-size: 0.95rem;
		line-height: 1.65;
		color: var(--page-muted);
	}
	.section-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.5rem;
		margin-top: 1rem;
		font-size: 1rem;
	}
	.section-links a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.talk-links {
		padding-left: 1.2rem;
	}
	.letter-bird {
		width: 112px;
		height: auto;
		background: transparent;
		margin: 1.2rem 0 0 auto;
	}
	.previous-bios {
		margin-top: 1.2rem;
	}
	.previous-bios > summary {
		min-height: 44px;
		cursor: pointer;
		color: var(--page-link);
		font: 0.95rem/1.6 var(--font-body);
	}
	.about-copy {
		padding-top: 1rem;
		font-size: 1rem;
	}
	.letter-signoff {
		margin-top: 2.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--page-border);
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
	}
	.letter-signoff p {
		margin: 0;
		font: italic 1rem/1.8 var(--font-reading);
	}

	.about-copy :global(h2) {
		scroll-margin-top: 1.5rem;
	}

	.about-copy :global(h2:first-child) {
		margin-top: 0;
	}

	.about-copy :global(details),
	.photo-sources :global(details) {
		margin-block: 1.5rem;
		padding: 0.75rem 0;
		border-inline: 0;
	}

	.about-copy :global(summary),
	.photo-sources :global(summary) {
		min-height: 2rem;
		color: var(--page-link);
		font-family: var(--font-body);
		font-size: 0.95rem;
	}

	.about-copy :global(.bio-date) {
		color: var(--page-muted);
		font-family: var(--font-body);
		font-size: 0.9rem;
	}

	.press-photos {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--page-border);
	}

	.press-photos h2 {
		margin-top: 0;
		scroll-margin-top: 1.5rem;
	}

	.press-photo-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1.25rem;
		margin-block: 1.5rem;
	}

	.press-photo-grid figure {
		min-width: 0;
		margin: 0;
	}

	.press-photo-grid img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 3 / 2;
		object-fit: contain;
		object-position: center;
	}

	.press-photo-grid figcaption {
		display: grid;
		gap: 0.25rem;
		margin-top: 0.7rem;
		font-size: 0.9rem;
	}

	.press-photo-grid figcaption strong {
		font-weight: 600;
	}

	.press-photo-grid figcaption span {
		color: var(--page-muted);
		font-size: 0.8rem;
	}

	.press-photo-grid figcaption a {
		display: flex;
		align-items: center;
		min-height: 44px;
		width: fit-content;
	}

	.photo-sources :global(details) {
		border-top: 1px solid var(--page-border);
	}

	.photo-sources :global(summary) {
		display: list-item;
		min-height: 44px;
		cursor: pointer;
	}

	.photo-sources :global(h3) {
		margin-block: 2rem 1rem;
		font: 600 1.35rem / 1.2 var(--font-display);
	}

	.photo-sources :global(p) {
		margin-block: 0.75rem;
		font-size: 0.9rem;
		line-height: 1.6;
	}

	.photo-sources :global(.photo-preview-grid) {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1.5rem 1.25rem;
	}

	.photo-sources :global(.portrait-previews) {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}

	.photo-sources :global(.photo-preview) {
		display: block;
		min-width: 0;
		text-decoration: none;
	}

	.photo-sources :global(.photo-preview:focus-visible) {
		outline: 2px solid var(--page-link);
		outline-offset: 5px;
	}

	.photo-sources :global(.photo-preview figure) {
		margin: 0;
	}

	.photo-sources :global(.photo-preview img) {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 4 / 3;
		object-fit: contain;
		background: rgb(128 128 128 / 6%);
		border: 1px solid var(--page-border);
	}

	.photo-sources :global(.photo-preview figcaption) {
		display: grid;
		gap: 0.25rem;
		margin-top: 0.65rem;
		color: var(--page-text);
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1.4;
	}

	.photo-sources :global(.photo-preview:hover figcaption) {
		color: var(--page-link);
	}

	.photo-sources :global(.photo-preview figcaption span) {
		color: var(--page-muted);
		font-size: 0.8rem;
		font-weight: 400;
	}

	@media (max-width: 64rem) {
		.photo-sources :global(.portrait-previews) {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (max-width: 900px) {
		.letter-opening {
			grid-template-columns: minmax(0, 1fr);
			gap: 1rem;
		}
		.opening-note {
			margin: 0 0 0 1rem;
			max-width: 48ch;
			padding-block: 0;
		}
		.about-introduction {
			grid-template-columns: 7rem minmax(0, 1fr);
		}
	}

	@media (max-width: 42rem) {
		.about-introduction {
			grid-template-columns: 6rem minmax(0, 1fr);
			align-items: start;
			gap: 1rem;
		}
		.about-sections ol {
			column-gap: 1.2rem;
		}
		.about-sections a {
			font-size: 0.95rem;
		}
		.starting-points li {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
			padding-block: 0.45rem;
		}

		.press-photo-grid,
		.photo-sources :global(.photo-preview-grid) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 30rem) {
		.about-introduction {
			grid-template-columns: 4.5rem minmax(0, 1fr);
			column-gap: 1rem;
			row-gap: 0.4rem;
		}
		.introduction-copy {
			display: contents;
		}
		h1 {
			grid-column: 2;
			align-self: end;
			font-size: 2.05rem;
		}
		.name-note {
			grid-column: 2;
			margin: 0;
		}
		.about-introduction :global(.text-versions) {
			grid-column: 1 / -1;
			margin-top: 0.6rem;
		}
		.now-link {
			grid-column: 1 / -1;
		}

		.about-portrait {
			grid-column: 1;
			grid-row: 1 / 3;
		}

		.about-portrait img {
			width: 4.5rem;
		}

		.about-portrait figcaption {
			display: none;
		}

		.about-sections {
			margin-block: 1.25rem 1.75rem;
		}
		.about-sections a span:last-child {
			display: none;
		}
		.letter-signoff {
			align-items: start;
			flex-direction: column;
		}
	}
</style>
