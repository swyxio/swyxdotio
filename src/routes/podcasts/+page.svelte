<script>
	import SocialMeta from '../../components/SocialMeta.svelte';
	import { getPageSocialMeta } from '$lib/social-meta';

	/** @type {import('./$types').PageData} */
	export let data;
	const social = getPageSocialMeta('podcasts');

	const latentSpace = {
		siteUrl: 'https://www.latent.space/podcast',
		feedUrl: 'https://rss.flightcast.com/vgnxzgiwwzwke85ym53fjnzu.xml',
		appleUrl:
			'https://podcasts.apple.com/us/podcast/latent-space-the-ai-engineer-podcast/id1674008350',
		appleEmbedUrl:
			'https://embed.podcasts.apple.com/us/podcast/latent-space-the-ai-engineer-podcast/id1674008350',
		spotifyUrl: 'https://open.spotify.com/show/2p7zZVwVF6Yk0Zsb4QmT7t',
		spotifyEmbedUrl:
			'https://open.spotify.com/embed/show/2p7zZVwVF6Yk0Zsb4QmT7t?utm_source=generator'
	};

	$: episodeCount = data.shows.reduce((total, show) => total + show.episodes.length, 0);
</script>

<SocialMeta {...social} />

<section class="site-shell mb-16">
	<header class="plain-section">
		<p class="archive-kicker">Audio home base</p>
		<h1 class="mb-2 text-3xl font-bold">Podcasts</h1>
		<p class="plain-muted max-w-3xl">
			My current work is the Latent Space podcast. The three swyx.io feeds below preserve my earlier
			audio archive with <strong>{episodeCount}</strong> first-party episodes.
		</p>
	</header>

	<article class="latent-space-feature plain-section">
		<hr class="plain-rule mb-5" />
		<p class="archive-kicker">Current show</p>
		<h2 class="mb-1 text-2xl font-bold">
			<a href={latentSpace.siteUrl}>Latent Space: The AI Engineer Podcast</a>
		</h2>
		<p class="plain-muted max-w-3xl">
			The podcast by and for AI Engineers, co-hosted with Alessio Fanelli. Technical deep dives with
			the founders, builders, and researchers shaping Software 3.0.
		</p>
		<p class="feed-actions mt-2 text-sm">
			<a href={latentSpace.siteUrl}>Latest episodes and show notes</a>
			<span aria-hidden="true">·</span>
			<a href={latentSpace.feedUrl}>RSS feed</a>
			<span aria-hidden="true">·</span>
			<a href={latentSpace.appleUrl}>Apple Podcasts</a>
			<span aria-hidden="true">·</span>
			<a href={latentSpace.spotifyUrl}>Spotify</a>
		</p>
		<div class="platform-embeds">
			<iframe
				title="Latent Space on Apple Podcasts"
				src={latentSpace.appleEmbedUrl}
				height="175"
				loading="lazy"
				allow="autoplay *; encrypted-media *; fullscreen *"
			></iframe>
			<iframe
				title="Latent Space on Spotify"
				src={latentSpace.spotifyEmbedUrl}
				height="352"
				loading="lazy"
				allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
			></iframe>
		</div>
	</article>

	<p class="archive-kicker legacy-label">Legacy swyx.io archive</p>
	<div class="show-grid">
		{#each data.shows as show}
			<a class="show-jump" href={`#${show.slug}`}>
				<span class="show-jump-count">{show.episodes.length}</span>
				<span>
					<strong>{show.title}</strong>
					<small>episodes</small>
				</span>
			</a>
		{/each}
	</div>

	{#each data.shows as show, index}
		<article id={show.slug} class="podcast-show plain-section">
			<hr class="plain-rule mb-5" />
			<div class="show-header">
				{#if show.imageUrl}
					<img class="show-artwork" src={show.imageUrl} alt="" loading="lazy" />
				{/if}
				<div>
					<p class="archive-kicker">Feed {String(index + 1).padStart(2, '0')}</p>
					<h2 class="mb-1 text-2xl font-bold">{show.title}</h2>
					<p class="plain-muted mb-2">{show.description}</p>
					<p class="feed-actions text-sm">
						<a href={show.feedUrl}>RSS feed</a>
						<span aria-hidden="true">·</span>
						<a href={`#${show.slug}-episodes`}>{show.episodes.length} episodes</a>
					</p>
				</div>
			</div>

			<details id={`${show.slug}-episodes`} class="episode-details" open={index !== 0}>
				<summary>
					<span>Browse episode archive</span>
					<span class="plain-muted">{show.episodes.length} tracks</span>
				</summary>
				<ol class="episode-list">
					{#each show.episodes as episode}
						<li>
							<div class="episode-title">
								{#if episode.audioUrl}
									<a href={episode.audioUrl}>{episode.title}</a>
								{:else}
									{episode.title}
								{/if}
							</div>
							<div class="episode-meta plain-muted">
								{#if episode.publishedAt}<time datetime={episode.publishedAt}
										>{episode.publishedAt}</time
									>{/if}
								{#if episode.duration}<span>{episode.duration}</span>{/if}
							</div>
						</li>
					{/each}
				</ol>
			</details>
		</article>
	{/each}
</section>

<style>
	.archive-kicker {
		color: var(--page-accent);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.show-grid {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
	}

	.legacy-label {
		margin: 2rem 0 0.75rem;
	}

	.platform-embeds {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
		margin-top: 1rem;
	}

	.platform-embeds iframe {
		border: 0;
		border-radius: 0.75rem;
		width: 100%;
	}

	.show-jump {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border: 1px solid var(--page-border);
		padding: 0.8rem;
		text-decoration: none;
	}

	.show-jump:hover {
		border-color: var(--page-accent);
		background: var(--page-accent-soft);
	}

	.show-jump-count {
		color: var(--page-accent);
		font-family: var(--font-mono);
		font-size: 1.65rem;
		font-weight: 700;
		line-height: 1;
	}

	.show-jump small {
		display: block;
		color: var(--page-muted);
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.show-header {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 5.5rem) minmax(0, 1fr);
	}

	.show-artwork {
		aspect-ratio: 1;
		border: 1px solid var(--page-border);
		height: auto;
		width: 100%;
	}

	.feed-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.episode-details {
		margin-top: 1rem;
		padding: 0;
	}

	.episode-details summary {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.55rem 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.episode-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.episode-list li {
		display: grid;
		gap: 0.25rem 1rem;
		grid-template-columns: minmax(0, 1fr) auto;
		border-top: 1px solid var(--page-border);
		padding: 0.55rem 0.75rem;
	}

	.episode-title {
		min-width: 0;
	}

	.episode-meta {
		display: flex;
		gap: 0.65rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		white-space: nowrap;
	}

	@media (max-width: 42rem) {
		.show-header {
			grid-template-columns: minmax(0, 4rem) minmax(0, 1fr);
		}

		.episode-list li {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
