<script>
	export let ribbon = false;
</script>

<aside class="book-callout" class:ribbon aria-labelledby="coding-career-handbook-title">
	{#if ribbon}<div class="banner-emblem" aria-hidden="true">☼</div>{/if}
	<div class="book-cover" aria-hidden="true">
		<span>The Coding</span>
		<span>Career</span>
		<span>Handbook</span>
		<span class="book-ornament">✶</span>
	</div>
	<div class="book-copy">
		<p class="book-status">Open Sourced August 18, 2026</p>
		<h2 id="coding-career-handbook-title">The Coding Career Handbook is now free.</h2>
		<p>Read the complete book online, or help make the source a little better.</p>
		<div class="book-actions">
			<a class="primary-action" href="https://learninpublic.org/">Read free</a>
			<a href="https://forge.smol.ai/swyx/codingcareer">View source</a>
		</div>
	</div>
</aside>

<style>
	.book-callout {
		display: grid;
		grid-template-columns: 5.4rem minmax(0, 1fr);
		align-items: start;
		gap: 1rem;
		margin-block: 0;
		border: 1px solid var(--page-border);
		border-radius: 0.65rem;
		padding: 1.05rem;
		background: var(--page-surface);
	}

	.book-cover {
		display: flex;
		min-height: 8rem;
		flex-direction: column;
		justify-content: center;
		border: 1px solid color-mix(in srgb, var(--page-gold) 70%, transparent);
		border-radius: 0.18rem 0.35rem 0.35rem 0.18rem;
		background: #74342f;
		padding: 0.55rem 0.45rem;
		color: #f4e7ca;
		font-family: var(--font-display);
		font-size: 0.78rem;
		line-height: 1.15;
		box-shadow: 0.2rem 0.2rem 0 color-mix(in srgb, var(--page-gold) 45%, transparent);
	}

	.book-ornament {
		margin-top: 0.7rem;
		color: #eacb88;
		font-size: 1.2rem;
	}

	.book-status {
		margin: 0 0 0.45rem;
		color: var(--page-accent);
		font-family: var(--font-mono);
		font-size: 0.63rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	h2 {
		margin: 0;
		font-size: 1.22rem;
		line-height: 1.16;
		letter-spacing: -0.015em;
	}

	.book-copy > p:not(.book-status) {
		margin: 0.4rem 0 0;
		color: var(--page-muted);
		font-size: 0.84rem;
		line-height: 1.45;
	}

	.book-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-top: 0.7rem;
	}

	.book-actions a {
		border: 1px solid var(--page-border);
		border-radius: 0.45rem;
		padding: 0.32rem 0.52rem;
		background: var(--page-surface);
		color: var(--page-text);
		font-weight: 750;
		font-size: 0.75rem;
		text-decoration: none;
	}

	.book-actions a:hover {
		border-color: var(--page-accent);
		color: var(--page-accent);
	}

	.book-actions .primary-action {
		border-color: var(--page-accent);
		background: var(--page-accent);
		color: var(--page-surface);
	}

	.book-actions .primary-action:hover {
		background: color-mix(in srgb, var(--page-accent) 88%, black);
		color: var(--page-surface);
	}

	.ribbon {
		position: relative;
		display: block;
		border: 3px double #b09260;
		border-radius: 0;
		background: #723e35;
		padding: 0.75rem 0.65rem 1rem;
		color: #f5e7c6;
		text-align: center;
		box-shadow:
			inset 0 0 0 5px #723e35,
			inset 0 0 0 6px #bc9b5b80,
			4px 0 8px #30251815;
	}
	.ribbon::after {
		position: absolute;
		bottom: -19px;
		left: -3px;
		width: calc(100% + 6px);
		height: 20px;
		background: #723e35;
		clip-path: polygon(0 0, 100% 0, 50% 100%);
		content: '';
	}
	.ribbon .book-cover {
		display: none;
	}
	.banner-emblem {
		margin: -0.3rem 0 0.6rem;
		color: #d3b26f;
		font-size: 2.5rem;
		line-height: 1.15;
	}
	.ribbon .book-status {
		margin-bottom: 0.65rem;
		color: #e0c78f;
		font-size: 0.49rem;
		font-weight: 400;
		line-height: 1.5;
	}
	.ribbon h2 {
		color: #f5e7c6;
		font-size: 1.42rem;
		font-weight: 600;
		line-height: 1.1;
	}
	.ribbon .book-copy > p:not(.book-status) {
		display: none;
	}
	.ribbon .book-actions {
		display: grid;
		gap: 0.4rem;
		margin-top: 0.9rem;
	}
	.ribbon .book-actions a {
		border: 1px solid #b89c65;
		border-radius: 2px;
		background: transparent;
		color: #f5e7c6;
		font-family: Georgia, serif;
		font-size: 0.7rem;
		font-weight: 400;
		padding: 0.35rem 0.25rem;
	}
	.ribbon .book-actions .primary-action {
		background: #e5cc93;
		color: #402e22;
	}
	.ribbon .book-actions a:hover {
		background: #f5e7c6;
		color: #402e22;
	}
	@media (max-width: 600px) {
		.ribbon {
			display: grid;
			grid-template-columns: 3.7rem minmax(0, 1fr);
			align-items: center;
			gap: 0.7rem;
			padding: 0.65rem 0.85rem;
			text-align: left;
		}
		.ribbon::after {
			display: none;
		}
		.banner-emblem {
			margin: 0;
			font-size: 3rem;
		}
		.ribbon .book-status {
			display: none;
		}
		.ribbon h2 {
			font-size: 1.1rem;
		}
		.ribbon .book-copy > p:not(.book-status) {
			display: none;
		}
		.ribbon .book-actions {
			display: flex;
			gap: 0.45rem;
			margin-top: 0.5rem;
		}
		.ribbon .book-actions a {
			padding: 0.3rem 0.55rem;
		}
	}
</style>
