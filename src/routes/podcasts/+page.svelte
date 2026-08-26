<script>
	import SocialMeta from '../../components/SocialMeta.svelte';
	import { getPageSocialMeta } from '$lib/social-meta';
	import { FEATURED_PODCAST_EPISODES } from '$lib/featured-podcast-episodes';

	/** @type {import('./$types').PageData} */
	export let data;
	const social = getPageSocialMeta('podcasts');

	const youtubePlaylistId = 'PLWEAb1SXhjlfkEF_PxzYHonU_v5LPMI8L';
	const latentSpace = {
		siteUrl: 'https://www.latent.space/podcast',
		feedUrl: 'https://rss.flightcast.com/vgnxzgiwwzwke85ym53fjnzu.xml',
		youtubeUrl: 'https://www.youtube.com/@LatentSpacePod',
		playlistUrl: `https://www.youtube.com/playlist?list=${youtubePlaylistId}`
	};

	// Selected from latent.space/about; Dharmesh's quote is also in his episode transcript.
	const praise = [
		{
			quote: 'Great episode, good technical discussion on LLM pretraining',
			author: 'Andrej Karpathy',
			source: 'https://www.latent.space/about'
		},
		{
			quote: 'A good intro to the tiny corp for people who want to come work here.',
			author: 'George Hotz',
			source: 'https://www.latent.space/about'
		},
		{
			quote: 'You guys taught me a lot of what I think I know.',
			author: 'Dharmesh Shah',
			source: 'https://www.latent.space/p/dharmesh'
		}
	];

	$: episodeCount = data.shows.reduce((total, show) => total + show.episodes.length, 0);
</script>

<SocialMeta {...social} />

<section class="site-shell mb-16">
	<header class="editorial-header podcast-header">
		<p class="editorial-kicker">Audio home base</p>
		<h1>Podcasts</h1>
		<p class="editorial-deck">
			I host <a href={latentSpace.siteUrl}>Latent Space: The AI Engineer Podcast</a> — technical conversations
			with the founders, builders, and researchers shaping AI.
		</p>
		<p class="podcast-standing">
			<span aria-hidden="true">✦</span>
			Has ranked in the <strong>Top 30 for US Technology</strong> on Apple Podcasts.
			<a href="https://www.latent.space/about" class="standing-source">About the show ↗</a>
		</p>
		<p class="feed-actions current-show-actions">
			<a href={latentSpace.youtubeUrl}>Watch on YouTube ↗</a>
			<span aria-hidden="true">·</span>
			<a href={latentSpace.playlistUrl}>Complete episode playlist ↗</a>
			<span aria-hidden="true">·</span>
			<a href={latentSpace.siteUrl}>Show notes</a>
			<span aria-hidden="true">·</span>
			<a href={latentSpace.feedUrl}>RSS feed</a>
		</p>
	</header>

	<article class="latent-space-feature">
		<section class="episode-gallery" aria-labelledby="gallery-heading">
			<h2 id="gallery-heading" class="archive-kicker">A few good conversations</h2>
			<div class="video-grid">
				{#each FEATURED_PODCAST_EPISODES as episode, index}
					<a class="video-card" href={`https://www.youtube.com/watch?v=${episode.id}`}>
						<div class="video-thumbnail">
							<img
								src={`https://i.ytimg.com/vi/${episode.id}/hqdefault.jpg`}
								alt=""
								width="480"
								height="360"
								loading={index < 3 ? 'eager' : 'lazy'}
								decoding="async"
							/>
							<span class="video-play" aria-hidden="true">▶</span>
						</div>
						<h3>{episode.guests}</h3>
						<p>{episode.title}</p>
					</a>
				{/each}
			</div>
		</section>
		<section class="podcast-praise" aria-labelledby="praise-heading">
			<h2 id="praise-heading" class="archive-kicker">A few kind words</h2>
			<div class="praise-grid">
				{#each praise as item}
					<figure>
						<blockquote cite={item.source}>“{item.quote}”</blockquote>
						<figcaption><a href={item.source}>{item.author} ↗</a></figcaption>
					</figure>
				{/each}
			</div>
		</section>
	</article>

	<div class="legacy-intro">
		<h2>From the archive</h2>
		<p class="plain-muted">
			Three original swyx.io feeds, <strong>{episodeCount}</strong> episodes. My earlier conversations,
			career chats, and audio experiments, all still here.
		</p>
	</div>
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
	.podcast-header {
		margin-bottom: 1.25rem;
	}

	.current-show-actions {
		gap: 0 0.6rem;
		margin: 0.45rem 0 0;
		font-size: 0.875rem;
	}

	.current-show-actions a,
	.current-show-actions > span {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
	}

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

	.legacy-intro {
		margin: 3rem 0 1rem;
		border-top: 1px solid var(--page-border);
		padding-top: 1.75rem;
	}

	.legacy-intro h2 {
		margin: 0 0 0.55rem;
		font-family: var(--font-display);
		font-size: 1.8rem;
	}

	.legacy-intro p {
		max-width: 42rem;
		margin: 0;
		line-height: 1.65;
	}

	.video-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.75rem 1.2rem;
		margin-top: 0.8rem;
	}

	.video-card {
		min-width: 0;
		color: var(--page-text);
		text-decoration: none;
	}

	.video-thumbnail {
		position: relative;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		border: 1px solid var(--page-border);
		background: var(--page-surface);
	}

	.video-thumbnail img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.video-play {
		position: absolute;
		right: 0.5rem;
		bottom: 0.5rem;
		display: grid;
		place-items: center;
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 50%;
		background: rgb(0 0 0 / 80%);
		color: white;
		font-size: 0.7rem;
	}

	.video-card h3 {
		margin: 0.65rem 0 0.15rem;
		font-family: var(--font-display);
		font-size: 1.15rem;
		line-height: 1.2;
	}

	.video-card p {
		margin: 0;
		color: var(--page-muted);
		font-size: 0.8rem;
		line-height: 1.45;
	}

	.video-card:hover h3 {
		color: var(--page-accent);
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.video-card:focus-visible {
		outline: 2px solid var(--page-accent);
		outline-offset: 5px;
	}

	.podcast-standing {
		margin: 0.8rem 0 0;
		color: var(--page-gold);
		font-size: 0.9rem;
	}

	.podcast-standing > span {
		margin-right: 0.3rem;
	}

	.standing-source {
		margin-left: 0.3rem;
		color: var(--page-muted);
		font-size: 0.75rem;
	}

	.podcast-praise {
		margin-top: 1.75rem;
	}

	.praise-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.5rem;
		margin-top: 0.8rem;
	}

	.praise-grid figure {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		margin: 0;
		border-top: 1px solid var(--page-border);
		padding-top: 0.8rem;
	}

	.praise-grid blockquote {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.1rem;
		line-height: 1.45;
	}

	.praise-grid figcaption {
		margin-top: auto;
		font-size: 0.8rem;
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
		.video-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.praise-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.show-header {
			grid-template-columns: minmax(0, 4rem) minmax(0, 1fr);
		}

		.episode-list li {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (max-width: 28rem) {
		.video-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
