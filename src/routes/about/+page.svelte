<script>
	import SocialMeta from '../../components/SocialMeta.svelte';
	import { getPageSocialMeta } from '$lib/social-meta';
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
	<header class="about-introduction">
		<div>
			<p class="editorial-kicker">About</p>
			<h1>Shawn Wang (swyx)</h1>
			<p class="about-hello reading-prose">
				Hey, I'm swyx! I help foster the
				<a href="https://www.latent.space/p/ai-engineer">Rise of the AI Engineer</a>.
			</p>
			<p class="name-note">
				“swyx” is the initials of my English and Chinese names. You can call me Shawn, too.
				Pronounced “swicks”.
			</p>
			<ul class="social-links" aria-label="Find me online">
				<li><a href="https://twitter.com/intent/user?screen_name=swyx">Twitter</a></li>
				<li><a href="https://github.com/swyxio">GitHub</a></li>
				<li><a href="https://youtube.com/swyxTV?sub_confirmation=1">YouTube</a></li>
			</ul>
		</div>
		<figure class="about-portrait">
			<img src="/swyx-ski.jpeg" alt="swyx in the snow at Niseko" width="460" height="460" />
			<figcaption>Out of office, Niseko.</figcaption>
		</figure>
	</header>

	<nav class="about-sections" aria-label="About sections">
		<a href="#current-work">Current work</a>
		<a href="#my-story">My story</a>
		<a href="#speaker-bio">Speaker bio</a>
		<a href="#press-photos">Press photos</a>
	</nav>

	<div class="reading-prose about-copy">
		{@html data.html}
	</div>

	<section class="press-photos" aria-labelledby="press-photos">
		<header class="reading-prose">
			<h2 id="press-photos">Press photos</h2>
			<p>
				Pictures of me you can use without asking. Recent favorites from
				<a href="https://aiengineer.pixieset.com/worldsfair2026/">AI Engineer World’s Fair 2026</a>,
				plus headshots and avatars.
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
</article>

<style>
	.about-page {
		margin-block: clamp(2rem, 4vw, 3.5rem) 4rem;
	}

	.about-introduction {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 11rem;
		align-items: center;
		gap: clamp(1.5rem, 4vw, 4rem);
		max-width: 58rem;
	}

	h1 {
		font-family: var(--font-display);
		font-size: clamp(2.25rem, 4.5vw, 3.4rem);
		line-height: 1.08;
		letter-spacing: -0.025em;
	}

	.about-hello {
		margin-block: 1.1rem 0.75rem;
		font-size: 1.3rem;
	}

	.name-note {
		max-width: 52ch;
		color: var(--page-muted);
		font-size: 0.95rem;
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

	.social-links a,
	.about-sections a {
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
		display: flex;
		flex-wrap: wrap;
		gap: 0.1rem 1.5rem;
		margin-block: 1.5rem 2rem;
		padding-block: 0.4rem;
		border-block: 1px solid var(--page-border);
		font-size: 0.9rem;
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

	@media (max-width: 42rem) {
		.about-introduction {
			grid-template-columns: minmax(0, 1fr) 7.5rem;
			align-items: start;
			gap: 1rem;
		}

		.press-photo-grid,
		.photo-sources :global(.photo-preview-grid) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 30rem) {
		.about-introduction {
			grid-template-columns: minmax(0, 1fr);
		}

		.about-portrait {
			display: flex;
			align-items: flex-end;
			gap: 0.85rem;
		}

		.about-portrait img {
			width: 6rem;
		}

		.about-portrait figcaption {
			max-width: 9rem;
			margin: 0;
		}

		.about-sections {
			gap: 0.1rem 1.25rem;
			margin-block: 1.25rem 1.75rem;
		}
	}
</style>
