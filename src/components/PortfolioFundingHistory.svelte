<script>
	import { formatValuation, formatValuationDate } from '$lib/portfolio';
	/** @type {import('$lib/portfolio').FundingRound[]} */
	export let rounds;
	export let companyName;
</script>

<div class="funding-history">
	{#each rounds.slice(0, 1) as round}
		<div class="funding-round">
			<a
				href={round.sourceUrl}
				title={round.sourceTitle}
				aria-label={`${companyName}: ${round.sourceTitle}`}
			>
				{#if round.amountUsd !== null}{round.prefix ?? ''}{formatValuation(round.amountUsd)}
					{round.kind === 'total' ? 'total raised' : 'raised'} ↗
				{:else}Funding announced ↗{/if}
			</a>
			<p>
				{round.stage} ·
				{#if round.date}<time datetime={round.date}
						>{round.dateLabel ?? formatValuationDate(round.date)}</time
					>{:else}{round.dateLabel ?? 'Round date not disclosed'}{/if}
			</p>
			{#if round.qualifier}<p>{round.qualifier}</p>{/if}
			{#if round.kind !== 'total'}
				{#if round.leads.length}
					<p class="round-leads">
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
	{#if rounds.length > 1}
		<details>
			<summary aria-label={`${companyName}: earlier funding rounds`}
				>{rounds.length - 1} earlier {rounds.length === 2 ? 'round' : 'rounds'}</summary
			>
			{#each rounds.slice(1) as round}
				<div class="funding-round earlier-round">
					<a href={round.sourceUrl} title={round.sourceTitle}>
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
	{/if}
</div>

<style>
	.funding-history {
		margin-top: 0.65rem;
		font-size: 0.875rem;
		line-height: 1.5;
		overflow-wrap: anywhere;
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
	details {
		margin-top: 0.6rem;
	}
	summary {
		cursor: pointer;
		color: var(--page-link);
	}
	.earlier-round {
		margin-top: 0.65rem;
		padding-top: 0.65rem;
		border-top: 1px solid var(--page-border);
	}
	a:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--page-accent);
		outline-offset: 3px;
	}
</style>
