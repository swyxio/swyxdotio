<script>
	import SocialMeta from '../../components/SocialMeta.svelte';
	import { getPageSocialMeta } from '$lib/social-meta';
	/** @type {{ html: string, photoHtml: string }} */
	export let data;
	const social = getPageSocialMeta('about');
	const photos = [
		{
			title: 'Niseko headshot',
			src: '/about-photos/headshot-niseko.webp',
			href: 'https://user-images.githubusercontent.com/6764957/103350806-26d9ca80-4adc-11eb-9e53-a8ce9ca3f21f.jpeg',
			alt: 'swyx in the snow at Niseko',
			format: '460 × 460 · JPEG'
		},
		{
			title: 'Thursday Nights in AI',
			src: '/about-photos/thursday-with-dog.webp',
			href: 'https://pbs.twimg.com/media/GH7eSt8a0AAhQDy?format=png',
			alt: 'swyx smiling and holding a dog at Thursday Nights in AI',
			format: 'Portrait · PNG'
		},
		{
			title: 'React Miami',
			src: '/about-photos/react-miami-stage.webp',
			href: 'https://user-images.githubusercontent.com/6764957/164554925-e6a2791e-4c75-4d5f-8003-2932193d5b25.png',
			alt: 'swyx presenting Temporal on stage at React Miami',
			format: 'On stage · PNG'
		},
		{
			title: 'React Advanced',
			src: '/about-photos/react-advanced-stage.webp',
			href: 'https://user-images.githubusercontent.com/6764957/182177069-eae41bb1-ec46-4622-9659-ec9392b5add8.png',
			alt: 'swyx on stage for React With Hooks from Scratch at React Advanced London',
			format: 'On stage · PNG'
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
				Pictures of me you can use without asking. Open an original to save the full-size image.
			</p>
		</header>
		<div class="press-photo-grid">
			{#each photos as photo}
				<figure>
					<a href={photo.href} aria-label={`Open original: ${photo.title}`}>
						<img src={photo.src} alt={photo.alt} width="460" height="460" loading="lazy" />
					</a>
					<figcaption>
						<strong>{photo.title}</strong>
						<span>{photo.format}</span>
						<a href={photo.href}>Open original ↗</a>
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
		aspect-ratio: 1;
		object-fit: cover;
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
