<script>
	import SocialMeta from '../../components/SocialMeta.svelte';
	import { getPageSocialMeta } from '$lib/social-meta';
	/** @type {{ html: string }} */
	export let data;
	const social = getPageSocialMeta('portfolio');
</script>

<SocialMeta {...social} />

<article class="site-shell portfolio-page">
	{@html data.html}
</article>

<style>
	.portfolio-page {
		margin-block: clamp(2rem, 4vw, 3.5rem) 4rem;
	}

	.portfolio-page :global(.portfolio-introduction) {
		margin-bottom: 2rem;
	}

	.portfolio-page :global(h1) {
		margin: 0 0 1rem;
		font-family: var(--font-display);
		font-size: clamp(2.25rem, 4.5vw, 3.4rem);
		line-height: 1.08;
		letter-spacing: -0.025em;
	}

	.portfolio-page :global(.portfolio-introduction p:last-child) {
		margin-bottom: 0;
		font-family: var(--font-body);
		font-size: 0.9rem;
		color: var(--page-muted);
	}

	.portfolio-page :global(.portfolio-group) {
		margin-top: 2rem;
		padding-top: 1.2rem;
		border-top: 1px solid var(--page-border);
	}

	.portfolio-page :global(.portfolio-group h2) {
		margin: 0 0 1rem;
		font-family: var(--font-display);
		font-size: 1.8rem;
		line-height: 1.2;
	}

	.portfolio-page :global(.portfolio-group ul) {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0 2.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.portfolio-page :global(.portfolio-group li) {
		min-width: 0;
		padding-block: 0.7rem;
		border-bottom: 1px solid var(--page-border);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.125rem;
		line-height: 1.6;
	}

	.portfolio-page :global(.portfolio-notes) {
		margin-top: 3rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--page-border);
	}

	.portfolio-page :global(.portfolio-notes h2) {
		scroll-margin-top: 1.5rem;
	}

	@media (max-width: 42rem) {
		.portfolio-page :global(.portfolio-group ul) {
			grid-template-columns: minmax(0, 1fr);
		}

		.portfolio-page :global(.portfolio-group) {
			margin-top: 1.5rem;
		}
	}
</style>
