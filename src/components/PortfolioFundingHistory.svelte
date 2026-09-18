<script>
	import { formatValuation, formatValuationDate } from '$lib/portfolio';
	/** @type {import('$lib/portfolio').FundingRound[]} */
	export let rounds;
	export let companyName;
	export let expanded = false;
	export let compact = false;
</script>

<details class="funding-history" open={expanded}>
	<summary aria-label={`${companyName}: funding and lead investors`}
		>{compact
			? `${rounds.length} ${rounds.length === 1 ? 'round' : 'rounds'}`
			: `Funding & leads · ${rounds.length}`}</summary
	>
	{#each rounds as round}
		<div class="funding-round">
			<a
				href={round.sourceUrl}
				title={round.sourceTitle}
				aria-label={`${companyName}: ${round.sourceTitle}`}
			>
				{round.stage} ·
				{#if round.date}<time datetime={round.date}
						>{round.dateLabel ?? formatValuationDate(round.date)}</time
					>{:else}{round.dateLabel ?? 'Round date not disclosed'}{/if} ↗
			</a>
			{#if round.amountUsd !== null}<p>
					{round.prefix ?? ''}{formatValuation(round.amountUsd)}
					{round.kind === 'total' ? 'total raised' : 'raised'}
				</p>{/if}
			{#if round.qualifier}<p>{round.qualifier}</p>{/if}
			{#if round.kind !== 'total'}
				{#if round.leads.length}<p class="round-leads">
						<a
							href={round.leadSourceUrl ?? round.sourceUrl}
							title={round.leadSourceTitle ?? round.sourceTitle}
							>Led by {round.leads.join(', ')} ↗</a
						>
					</p>
				{:else}<p>Lead not publicly verified</p>{/if}
			{/if}
		</div>
	{/each}
</details>

<style>
	.funding-history {
		margin-top: 0.35rem;
		font-size: 0.8125rem;
		line-height: 1.5;
		overflow-wrap: anywhere;
		border: 0;
		padding: 0;
		border-radius: 0;
		background: transparent;
	}
	p {
		color: var(--page-muted);
		margin-top: 0.2rem;
	}
	a,
	summary {
		text-underline-offset: 3px;
	}
	.round-leads a {
		color: var(--page-text);
	}
	summary {
		cursor: pointer;
		color: var(--page-link);
		margin: 0;
		padding: 0;
		background: transparent;
		font: inherit;
	}
	.funding-round {
		margin-top: 0.65rem;
	}
	.funding-round + .funding-round {
		padding-top: 0.65rem;
		border-top: 1px solid var(--page-border);
	}
	a:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--page-accent);
		outline-offset: 3px;
	}
</style>
