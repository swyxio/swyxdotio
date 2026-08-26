<script>
	export let compact = false;
	// The Subscribe page supplies its own invitation; other placements keep the full card.
	export let embedded = false;
</script>

<section
	class="plain-section site-card newsletter-card w-full"
	class:compact
	class:embedded
	id="newsletter"
>
	{#if !embedded}
		<h3 class="mb-2 text-xl font-bold">
			{compact ? 'Stay in correspondence' : 'Subscribe to the newsletter'}
		</h3>
		<p class="mb-3">
			{#if compact}Occasional letters on builders, markets, and the strange future. Join &gt;10,000
				readers.{:else}Join &gt;10,000 subscribers getting occasional updates on new posts and
				projects.{/if}
		</p>
	{/if}
	<form
		class="flex max-w-lg flex-wrap gap-2"
		action="https://buttondown.email/api/emails/embed-subscribe/swyx"
		method="post"
		target="popupwindow"
		on:submit={() => window.open('https://buttondown.email/swyx', 'popupwindow')}
	>
		<label class:sr-only={!embedded} for="bd-email">
			{embedded ? 'Email address' : 'Email for newsletter'}
		</label>
		<input
			class="plain-input min-w-0 flex-1"
			type="email"
			id="bd-email"
			name="email"
			placeholder="tim@apple.com"
			autocomplete="email"
			required={true}
		/>
		<button class="plain-button" type="submit">Subscribe</button>
	</form>
	<p class="plain-muted mt-3 text-sm">
		I also write an <a href="https://lspace.swyx.io/">AI newsletter</a> and a
		<a href="https://dx.tips/">DevRel/DevTools newsletter</a>.
	</p>
</section>

<style>
	.newsletter-card {
		border-left: 3px solid var(--page-gold);
		background: var(--page-surface);
	}

	.newsletter-card h3 {
		font-size: 1.55rem;
		font-weight: 600;
	}

	.newsletter-card form :global(button) {
		border-color: var(--page-accent);
		background: var(--page-accent);
		color: var(--page-surface);
		text-decoration: none;
	}
	.embedded {
		margin: 1.4rem 0 0;
		border: 0;
		border-radius: 0;
		padding: 0;
		background: transparent;
	}
	.embedded form label {
		flex-basis: 100%;
		font-size: 0.85rem;
	}
	.embedded form :global(input),
	.embedded form :global(button) {
		min-height: 2.75rem;
	}
	.embedded .plain-muted {
		max-width: 36rem;
		line-height: 1.65;
	}
	.compact {
		margin: 0;
		border: 0;
		border-radius: 0;
		padding: 1rem;
		background: transparent;
	}
	.compact h3 {
		margin: 0 0 0.7rem;
		color: var(--page-text);
		font-size: 1.1rem;
	}
	.compact > p {
		font-family: Georgia, serif;
		font-size: 0.74rem;
		line-height: 1.45;
	}
	.compact form {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.35rem;
	}
	.compact form :global(input),
	.compact form :global(button) {
		min-width: 0;
		padding: 0.35rem 0.4rem;
		font-size: 0.7rem;
	}
	.compact .plain-muted {
		font-size: 0.64rem;
	}
</style>
