<script>
	/** @type {string} */
	export let name;
	/** @type {string} */
	export let logo;
	/** @type {string} */
	export let description;
	/** @type {string} */
	export let contact;
	/** @type {string} */
	export let source;
	/** @type {{value: string, label: string}[]} */
	export let stats;
	export let monochrome = false;
</script>

<div class="sponsorship-option">
	<header>
		<img src={logo} alt="" width="48" height="48" class:monochrome />
		<div>
			<h3>{name}</h3>
			<p class="description">{description}</p>
		</div>
	</header>
	<div class="sponsor-body">
		<dl aria-label={`${name} audience milestones`}>
			{#each stats as stat}
				<div class="stat">
					<dt>{stat.label}</dt>
					<dd>{stat.value}</dd>
				</div>
			{/each}
		</dl>
		<div class="sponsor-actions">
			<a class="sponsor-link" href={`mailto:${contact}`}
				>Sponsor {name} <span aria-hidden="true">→</span></a
			>
			<a class="audience-link" href={source}>Audience details <span aria-hidden="true">↗</span></a>
		</div>
	</div>
</div>

<style>
	.sponsorship-option {
		margin: 1.6rem 0 1.6rem 0.8rem;
		padding: 0.25rem 0 0.25rem 1.25rem;
		border-left: 2px solid var(--page-border);
	}
	header {
		display: grid;
		grid-template-columns: 48px minmax(0, 1fr);
		align-items: center;
		gap: 1rem;
	}
	img {
		width: 48px;
		height: 48px;
		object-fit: contain;
		background: transparent;
		margin: 0;
	}
	.monochrome {
		filter: invert(1);
	}
	:global(.dark) .monochrome {
		filter: none;
	}
	h3 {
		margin: 0;
		font: 700 1.4rem/1.2 var(--font-reading);
	}
	.description {
		margin: 0.35rem 0 0;
		color: var(--page-muted);
		font: 0.9rem/1.5 var(--font-reading);
	}
	.sponsor-body {
		margin-left: 4rem;
	}
	dl {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
		margin: 1rem 0;
	}
	.stat {
		display: grid;
		grid-template-rows: auto 1fr;
		gap: 0.25rem;
	}
	dt {
		grid-row: 2;
		color: var(--page-muted);
		font: 0.85rem/1.4 var(--font-body);
	}
	dd {
		grid-row: 1;
		margin: 0;
		font: 700 1.65rem/1.15 var(--font-reading);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.sponsor-actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem 1.1rem;
		font: 0.9rem/1.4 var(--font-reading);
	}
	.sponsor-link {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		min-height: 44px;
		padding: 0.45rem 0.75rem;
		border: 1px solid var(--page-link);
		font-weight: 600;
		text-decoration: none;
	}
	.sponsor-link:hover {
		text-decoration: underline;
	}
	.audience-link {
		padding-block: 0.75rem;
	}
	a:focus-visible {
		outline: 2px solid var(--page-link);
		outline-offset: 3px;
	}
	@media (max-width: 600px) {
		.sponsorship-option {
			margin-left: 0.25rem;
			padding-left: 0.85rem;
		}
		header {
			gap: 0.75rem;
		}
		.sponsor-body {
			margin-left: 0;
		}
		dl {
			grid-template-columns: 1fr;
			gap: 0;
		}
		.stat {
			grid-template-columns: 8rem minmax(0, 1fr);
			grid-template-rows: auto;
			align-items: center;
			gap: 0.75rem;
			padding-block: 0.65rem;
			border-bottom: 1px solid var(--page-border);
		}
		dt {
			grid-column: 2;
			grid-row: 1;
		}
		dd {
			grid-column: 1;
			font-size: 1.4rem;
		}
	}
</style>
