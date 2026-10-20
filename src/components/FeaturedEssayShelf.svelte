<script>
	import { FEATURED_ESSAYS } from '$lib/featured-essays';
</script>

<section class="featured-section" aria-labelledby="featured-essays-heading">
	<div class="section-header">
		<div>
			<p class="eyebrow">A FEW PLACES TO START</p>
			<h2 id="featured-essays-heading">Things worth thinking about</h2>
		</div>
		<a href="/ideas?show=Essay">All essays <span aria-hidden="true">↗</span></a>
	</div>
	<div class="essay-shelf" role="region" aria-label="Featured essays; scroll horizontally for more">
		{#each FEATURED_ESSAYS as essay, index (essay.href)}
			<a class="essay-card" href={essay.href}>
				<span class="essay-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
				<span class="essay-category">{essay.category}</span>
				<h3>{essay.title}</h3>
				<p>{essay.description}</p>
				<span class="essay-more">Read essay <span aria-hidden="true">↗</span></span>
			</a>
		{/each}
	</div>
	<p class="shelf-hint">Scroll for more <span aria-hidden="true">→</span></p>
</section>

<style>
	.featured-section {
		min-width: 0;
		margin: 2.4rem 0 2rem;
	}
	.section-header {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}
	.eyebrow {
		margin: 0 0 0.4rem;
		color: var(--page-gold);
		font: 600 0.72rem/1.4 var(--font-body);
		letter-spacing: 0.1em;
	}
	.section-header h2 {
		margin: 0;
		font: 650 clamp(1.4rem, 2.4vw, 1.8rem)/1.2 var(--font-body);
		letter-spacing: -0.025em;
	}
	.section-header > a {
		flex-shrink: 0;
		font-size: 0.86rem;
		text-decoration: none;
	}
	.essay-shelf {
		display: flex;
		gap: 1.5rem;
		overflow-x: auto;
		overscroll-behavior-inline: contain;
		padding: 0.1rem 0 0.9rem;
		scroll-snap-type: x proximity;
		scrollbar-color: var(--page-gold) transparent;
		scrollbar-width: thin;
	}
	.essay-card {
		position: relative;
		display: flex;
		flex: 0 0 calc((100% - 3rem) / 3);
		flex-direction: column;
		min-width: 15rem;
		min-height: 11.5rem;
		border-top: 3px solid var(--essay-color, #b75642);
		padding: 1rem 0.25rem 0 0;
		color: var(--page-text);
		text-decoration: none;
		scroll-snap-align: start;
	}
	.essay-card:nth-child(3n + 2) {
		--essay-color: #427d86;
	}
	.essay-card:nth-child(3n) {
		--essay-color: #b48a3a;
	}
	.essay-card:hover h3,
	.essay-card:focus-visible h3 {
		color: var(--page-link);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}
	.essay-number {
		position: absolute;
		top: 0.85rem;
		right: 0;
		color: var(--page-muted);
		font: 0.75rem/1.4 var(--font-mono);
	}
	.essay-category {
		padding-right: 2rem;
		color: var(--page-muted);
		font: 600 0.72rem/1.4 var(--font-body);
		letter-spacing: 0.03em;
	}
	.essay-card h3 {
		margin: 0.55rem 0 0.4rem;
		font: 650 1.13rem/1.3 var(--font-body);
	}
	.essay-card p {
		max-width: 27rem;
		margin: 0 0 0.8rem;
		color: var(--page-muted);
		font: 0.91rem/1.6 var(--font-body);
	}
	.essay-more {
		margin-top: auto;
		color: var(--page-link);
		font: 600 0.8rem/1.5 var(--font-body);
	}
	.shelf-hint {
		margin: 0.3rem 0 0;
		color: var(--page-muted);
		font: 0.75rem/1.4 var(--font-body);
		text-align: right;
	}
	@media (max-width: 800px) {
		.essay-card {
			flex-basis: calc((100% - 1.5rem) / 2);
		}
	}
	@media (max-width: 600px) {
		.featured-section {
			margin-block: 2rem;
		}
		.section-header {
			align-items: start;
		}
		.section-header > a {
			padding-top: 1.6rem;
		}
		.essay-shelf {
			gap: 1.25rem;
		}
		.essay-card {
			flex-basis: 100%;
			min-height: 10.5rem;
		}
	}
</style>
