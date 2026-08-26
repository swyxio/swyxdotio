<script>
	import { logDuration, logEstimateMoney, logMoney, logTime } from '$lib/tools-logs-view.js';
	/** @type {import('$lib/tools-logs-view.js').ToolLogGenerationRun[]} */
	export let runs = [];
	export let showAccounts = false;
	export let limit = 20;
	/** @type {(run:import('$lib/tools-logs-view.js').ToolLogGenerationRun) => void} */
	export let onSelect;
</script>

<section class="generation-runs" aria-labelledby="generation-runs-title">
	<div class="heading">
		<h2 id="generation-runs-title">Runs · matching admitted jobs</h2>
		<span>Top {limit} · click to inspect a run</span>
	</div>
	<p class="context">
		Filters can show only part of a run. These counts are admitted jobs, not planned outputs or
		simultaneous GPU executions.
	</p>
	{#if runs.length}
		<ul>
			{#each runs as run (run.id + ':' + (run.account?.id ?? 'mine'))}
				<li>
					<button
						class="run"
						on:click={() => onSelect(run)}
						disabled={showAccounts && !run.account?.id}
						aria-label={`Inspect run ${run.id}${showAccounts ? ` for ${run.account?.email || run.account?.name || run.account?.id || 'unavailable account'}` : ''}`}
					>
						<span class="identity"
							><strong class="run-id">{run.id}</strong>{#if showAccounts}<small
									>{run.account?.email ||
										run.account?.name ||
										run.account?.id ||
										'Account unavailable'}</small
								>{/if}<small>{logTime(run.firstAdmittedAt)} UTC</small></span
						>
						<span class="outcomes"
							><strong>{run.jobs} matching {run.jobs === 1 ? 'job' : 'jobs'}</strong><small
								>{run.succeeded} succeeded ·
								<span class:failed={run.failed > 0}>{run.failed} failed</span></small
							><small>{run.pending} pending · {run.cancelled} cancelled</small></span
						>
						<span class="estimate"
							><span>Catalog estimate · known jobs</span><strong
								>{run.estimatedCostUsd === null
									? 'Unavailable'
									: logEstimateMoney(run.estimatedCostUsd)}</strong
							><small
								>{run.estimateCoverage}/{run.jobs} jobs estimated · {logMoney(
									run.estimatedReservedUsd
								)} reserved</small
							></span
						>
						<span class="timing"
							><span>Observed run span</span><strong>{logDuration(run.observedElapsedMs)}</strong
							><small>{run.timingCoverage}/{run.jobs} jobs timed · not GPU time</small></span
						>
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">
			No run IDs were recorded for these matching requests. Older or individual requests may still
			appear in Activity below.
		</p>
	{/if}
</section>

<style>
	.generation-runs {
		margin: 1rem 0;
		padding: 1rem 0;
		border-bottom: 1px solid var(--page-border);
	}
	.heading {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		align-items: baseline;
		flex-wrap: wrap;
	}
	h2 {
		margin: 0;
		font-size: 1.05rem;
	}
	.heading > span,
	.context,
	.empty {
		color: var(--page-muted);
		font-size: 0.75rem;
		line-height: 1.5;
	}
	.context {
		margin: 0.5rem 0 0.7rem;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 23rem;
		overflow-y: auto;
	}
	li {
		border-top: 1px solid var(--page-border);
	}
	.run {
		display: grid;
		grid-template-columns: 1.2fr 0.9fr 1.2fr 1fr;
		align-items: start;
		gap: 1rem;
		width: 100%;
		padding: 0.7rem 0.25rem;
		font: inherit;
		text-align: left;
		color: var(--page-text);
		background: transparent;
		border: 0;
		cursor: pointer;
	}
	.run:hover {
		background: color-mix(in srgb, var(--page-accent) 5%, var(--page-bg));
	}
	.run:focus-visible {
		outline: 2px solid var(--page-accent);
		outline-offset: -2px;
	}
	.run:disabled {
		cursor: default;
		opacity: 0.7;
	}
	.run > span {
		min-width: 0;
		font-size: 0.72rem;
	}
	.run strong,
	.run small,
	.run span > span {
		display: block;
	}
	.run strong {
		font-size: 0.82rem;
		font-weight: 500;
		line-height: 1.5;
		font-variant-numeric: tabular-nums;
	}
	.run small {
		font-size: 0.68rem;
		color: var(--page-muted);
		line-height: 1.5;
	}
	.run-id,
	.identity small {
		overflow-wrap: anywhere;
	}
	.estimate > span,
	.timing > span {
		color: var(--page-muted);
	}
	.failed {
		color: #b44030;
	}
	@media (max-width: 650px) {
		.run {
			grid-template-columns: 1fr 1fr;
			gap: 0.6rem 0.75rem;
			padding-block: 0.8rem;
		}
		ul {
			max-height: 28rem;
		}
	}
</style>
