<script>
	import { FEATURED_ESSAYS } from '$lib/featured-essays';
</script>

<section class="featured-section" aria-labelledby="featured-essays-heading">
	<div class="section-header">
		<h2 id="featured-essays-heading">
			<span aria-hidden="true">✥</span> Things worth thinking about
		</h2>
		<a href="/ideas?show=Essay">All essays →</a>
	</div>
	<div class="essay-shelf" role="region" aria-label="Featured essays; scroll horizontally for more">
		{#each FEATURED_ESSAYS as essay, index (essay.href)}
			<a class="essay-card" href={essay.href}>
				<div class="essay-title">
					<img
						class="essay-vignette"
						src={essay.illustration}
						alt=""
						width="74"
						height="74"
						loading={index < 4 ? 'eager' : 'lazy'}
						decoding="async"
					/>
					<h3>{essay.title}</h3>
				</div>
				<p>{essay.description}</p>
				<div class="essay-bottom">
					<span>Read essay <span aria-hidden="true">→</span></span><span class="folio"
						>§ {String(index + 1).padStart(2, '0')}</span
					>
				</div>
			</a>
		{/each}
	</div>
	<p class="shelf-hint">
		Eleven starting points. Scroll for the rest <span aria-hidden="true">⟶</span>
	</p>
</section>

<style>
	.featured-section {
		grid-area: essays;
		min-width: 0;
		margin: 0.1rem 0 1rem;
	}
	.section-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.6rem;
		margin-bottom: 0.65rem;
	}
	.section-header h2 {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin: 0;
		font: 1.23rem var(--font-display);
	}
	.section-header h2 > span {
		color: var(--page-gold);
		font-size: 1rem;
	}
	.section-header > a {
		flex-shrink: 0;
		font-size: 0.72rem;
		text-decoration: none;
	}
	.essay-shelf {
		--rail-gutter: max(var(--site-gutter), calc((100vw - var(--site-max-width)) / 2));
		width: 100vw;
		margin-inline: calc((100% - 100vw) / 2);
		display: flex;
		gap: 0.8rem;
		overflow-x: auto;
		overscroll-behavior-inline: contain;
		padding: 0.2rem var(--rail-gutter) 0.8rem;
		scroll-padding-inline: var(--rail-gutter);
		scroll-snap-type: x mandatory;
		scrollbar-color: var(--page-gold) transparent;
		scrollbar-width: thin;
	}
	.essay-card {
		position: relative;
		display: flex;
		flex: 0 0 calc((100% - 2.4rem) / 3.4);
		flex-direction: column;
		min-width: 15rem;
		min-height: 12.3rem;
		border: 1px solid #cdbb97;
		border-radius: 2px 5px 2px 4px;
		background: #f3ead5;
		padding: 0.85rem;
		color: #342d21;
		box-shadow:
			0 2px 3px #3029190a,
			inset 0 0 24px #b79b6420;
		text-decoration: none;
		scroll-snap-align: start;
		transition:
			border-color 140ms ease,
			transform 140ms ease;
	}
	.essay-card::before {
		position: absolute;
		inset: 4px;
		border: 1px solid #c1a57235;
		pointer-events: none;
		content: '';
	}
	:global(.dark) .essay-card {
		background: #e8dbb9;
		border-color: #b59e6c;
		box-shadow:
			0 3px 8px #0003,
			inset 0 0 28px #a27a3633;
	}
	.essay-card:hover,
	.essay-card:focus-visible {
		color: #342d21;
		border-color: #91683a;
		transform: translateY(-2px);
	}
	.essay-title {
		display: grid;
		grid-template-columns: 4.4rem minmax(0, 1fr);
		align-items: center;
		gap: 0.6rem;
		min-height: 4.6rem;
		border-bottom: 1px solid #b49b704b;
		padding-bottom: 0.6rem;
	}
	.essay-vignette {
		width: 4.4rem;
		height: 4.4rem;
		object-fit: contain;
		background: transparent;
		filter: saturate(0.6);
	}
	.essay-title h3 {
		margin: 0;
		font: 1.12rem/1.12 var(--font-display);
		color: #322b20;
	}
	.essay-card > p {
		margin: 0.65rem 0 0.75rem;
		color: #544936;
		font-family: Georgia, serif;
		font-size: 0.76rem;
		line-height: 1.45;
	}
	.essay-bottom {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: auto;
		font-family: Georgia, serif;
		font-size: 0.72rem;
		color: #5d4230;
	}
	.folio {
		color: #807052;
		font-size: 0.61rem;
	}
	.shelf-hint {
		margin: 0.1rem 0 0;
		color: var(--page-muted);
		font-family: Georgia, serif;
		font-style: italic;
		font-size: 0.65rem;
		text-align: right;
	}

	@media (max-width: 960px) {
		.essay-card {
			flex-basis: calc((100% - 1.6rem) / 2.7);
		}
	}

	@media (max-width: 600px) {
		.section-header h2 {
			font-size: 1.08rem;
			gap: 0.3rem;
		}
		.section-header > a {
			font-size: 0.64rem;
		}
		.essay-card {
			flex-basis: 85%;
			min-height: 11.7rem;
		}
	}
</style>
