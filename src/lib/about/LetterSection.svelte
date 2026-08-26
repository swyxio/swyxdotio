<script>
	/** @type {string} */
	export let id;
	/** @type {string} */
	export let title;
	/** @type {string} */
	export let number;
</script>

<section class="letter-section" aria-labelledby={id}>
	<div class="letter-main reading-prose">
		<h2 {id}><span aria-hidden="true">{number}.</span> {title}</h2>
		<slot />
	</div>
	<aside class="margin-note" aria-label={`A side note on ${title.toLowerCase()}`}>
		<slot name="commentary" />
	</aside>
</section>

<style>
	.letter-section {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 12rem;
		gap: 3rem;
		align-items: start;
		margin-block: 2.6rem;
	}
	.letter-main {
		min-width: 0;
		max-width: 68ch;
	}
	h2 {
		margin: 0 0 0.75rem;
		font-size: 1.65rem;
		scroll-margin-top: 1.5rem;
	}
	h2 span {
		display: inline-block;
		margin-right: 0.3rem;
		font-size: 0.85em;
		font-weight: 400;
		color: var(--page-muted);
	}
	.letter-main :global(p:last-child),
	.margin-note :global(p:last-child) {
		margin-bottom: 0;
	}
	.margin-note {
		margin-top: 0.25rem;
		padding: 0.4rem 0 0.4rem 1.2rem;
		border-left: 1px solid var(--page-border);
		color: var(--page-muted);
		font: italic 0.96rem/1.6 var(--font-reading);
	}
	.margin-note :global(p) {
		margin: 0 0 0.9rem;
	}
	@media (max-width: 900px) {
		.letter-section {
			grid-template-columns: minmax(0, 1fr);
			gap: 1rem;
			margin-block: 2.3rem;
		}
		.margin-note {
			margin: 0 0 0 1.1rem;
			max-width: 48ch;
			padding-block: 0.15rem;
		}
	}
	@media (max-width: 480px) {
		h2 {
			font-size: 1.45rem;
		}
	}
</style>
