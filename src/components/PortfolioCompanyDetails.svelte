<script>
	import { tick } from 'svelte';
	import PortfolioFundingHistory from './PortfolioFundingHistory.svelte';
	import PortfolioExitMark from './PortfolioExitMark.svelte';
	import { formatPortfolioValuation, formatValuationDate } from '$lib/portfolio';

	/** @type {import('$lib/portfolio').PortfolioCompany | null} */
	export let company = null;
	/** @type {HTMLDialogElement | undefined} */
	let dialog;
	$: if (company && dialog) openDialog();
	async function openDialog() {
		await tick();
		if (company && dialog && !dialog.open) dialog.showModal();
	}
	function close() {
		dialog?.close();
	}
</script>

<dialog
	bind:this={dialog}
	class="company-dialog"
	aria-labelledby="company-details-title"
	on:close={() => (company = null)}
>
	{#if company}
		<header class="dialog-header">
			<div class="identity">
				{#if company.status === 'exited' && company.exit}<PortfolioExitMark {company} compact />
				{:else if company.logo}<img src={company.logo} alt="" width="40" height="40" />{/if}
				<div>
					<h2 id="company-details-title">{company.name}</h2>
					<p class="metadata">{company.category} · {company.tier}</p>
				</div>
			</div>
			<button type="button" class="close-button" aria-label="Close company details" on:click={close}
				>×</button
			>
		</header>
		<div class="dialog-body">
			{#if company.acquirer}<p class="exit-destination">
					Exited to <strong>{company.acquirer}</strong>{#if company.exit}
						· <a href={company.exit.sourceUrl}>Announcement ↗</a>{/if}
				</p>
			{:else if company.status === 'closed'}<p class="metadata">Closed</p>
			{:else if company.status === 'individual'}<p class="metadata">Individual backing</p>{/if}
			<p class="description">{company.description}</p>
			{#if company.note}<p class="personal-note">{company.note}</p>{/if}
			<div class="profile-links">
				{#if company.website}<a href={company.website}>Visit website ↗</a>{/if}
				{#if company.descriptionSourceUrl}<a
						href={company.descriptionSourceUrl}
						title={company.descriptionSourceTitle}>Description source ↗</a
					>{/if}
				{#if company.relatedUrl}<a href={company.relatedUrl}>More on {company.name} ↗</a>{/if}
			</div>
			<section class="valuation" aria-label="Last public valuation">
				<h3>Last public valuation</h3>
				{#if company.valuation}
					<div class="valuation-line">
						<a class="mark" href={company.valuation.sourceUrl} title={company.valuation.sourceTitle}
							>{formatPortfolioValuation(company.valuation)} ↗</a
						><time datetime={company.valuation.date}
							>{company.valuation.dateLabel ?? formatValuationDate(company.valuation.date)}</time
						>
					</div>
					{#if company.valuation.qualifier}<p class="metadata">
							{company.valuation.qualifier}
						</p>{/if}
				{:else}<p class="metadata">
						{company.status === 'individual' ? 'Not applicable' : 'No public figure found'}
					</p>{/if}
				<p class="metadata">Public company mark in USD, not the value of my holdings.</p>
				{#if company.valuationRumor}
					<p class="rumor">
						<a href={company.valuationRumor.sourceUrl}
							>Rumored {formatPortfolioValuation(company.valuationRumor)} ↗</a
						>
					</p>
					<p class="metadata">
						{company.valuationRumor.qualifier} ·
						<time datetime={company.valuationRumor.date}
							>{formatValuationDate(company.valuationRumor.date)}</time
						>{#if company.valuationRumor.xUrl}
							· <a href={company.valuationRumor.xUrl}>Discussion on X ↗</a>{/if}
					</p>
				{/if}
			</section>
			{#if company.fundingRounds?.length}
				<section class="funding" aria-label="Funding and lead investors">
					<PortfolioFundingHistory
						rounds={company.fundingRounds}
						companyName={company.name}
						expanded
					/>
				</section>
			{/if}
		</div>
	{/if}
</dialog>

<style>
	:global(html:has(.company-dialog[open])) {
		overflow: hidden;
	}
	.company-dialog {
		position: fixed;
		inset: 0;
		margin: auto;
		width: min(620px, calc(100% - 2rem));
		max-width: none;
		max-height: min(85dvh, 850px);
		padding: 0;
		border: 1px solid var(--page-border);
		border-radius: 0.65rem;
		background: var(--page-bg);
		color: var(--page-text);
		box-shadow: 0 20px 80px #0003;
		overflow: auto;
		overscroll-behavior: contain;
	}
	.company-dialog::backdrop {
		background: #15151b66;
	}
	.dialog-header {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1.25rem 1.25rem 1rem;
		background: var(--page-bg);
		border-bottom: 1px solid var(--page-border);
	}
	.identity {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}
	.identity > img {
		object-fit: contain;
		border-radius: 0.4rem;
		background: white;
		flex-shrink: 0;
	}
	h2 {
		font: 600 1.75rem/1.15 var(--font-display);
		overflow-wrap: anywhere;
	}
	.metadata,
	time {
		color: var(--page-muted);
		font-size: 0.875rem;
		line-height: 1.55;
	}
	.close-button {
		flex: 0 0 44px;
		width: 44px;
		height: 44px;
		border: 1px solid var(--page-border);
		border-radius: 0.35rem;
		font-size: 1.75rem;
		line-height: 1;
		color: var(--page-text);
	}
	.dialog-body {
		padding: 1.25rem;
	}
	.description {
		font-size: 1.0625rem;
		line-height: 1.6;
	}
	.personal-note {
		margin-top: 0.75rem;
		color: var(--page-muted);
		font-style: italic;
	}
	.profile-links {
		display: flex;
		flex-wrap: wrap;
		column-gap: 1rem;
		margin-top: 0.5rem;
		font-size: 0.875rem;
	}
	.profile-links a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	a {
		text-underline-offset: 3px;
	}
	.valuation,
	.funding {
		border-top: 1px solid var(--page-border);
		padding-top: 1rem;
		margin-top: 1rem;
	}
	h3 {
		font-size: 0.8125rem;
		color: var(--page-muted);
		font-weight: 600;
	}
	.valuation-line {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		margin-top: 0.3rem;
	}
	.mark {
		font: 600 1.5rem var(--font-mono);
		text-decoration: none;
	}
	.valuation .metadata {
		margin-top: 0.3rem;
	}
	.rumor {
		margin-top: 0.75rem;
	}
	.exit-destination {
		margin-bottom: 1rem;
		color: var(--page-gold);
	}
	.funding :global(.funding-history) {
		font-size: 0.9375rem;
	}
	.funding :global(summary) {
		font-weight: 600;
		color: var(--page-text);
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--page-accent);
		outline-offset: 3px;
	}
	@media (max-width: 540px) {
		.company-dialog {
			inset: auto 0 0;
			margin: 0;
			width: 100%;
			max-height: 85dvh;
			border-radius: 1rem 1rem 0 0;
			border-bottom: 0;
		}
		.dialog-header {
			padding: 1rem;
		}
		.dialog-body {
			padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
		}
		h2 {
			font-size: 1.5rem;
		}
	}
</style>
