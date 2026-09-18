<script>
	import SocialMeta from '../../components/SocialMeta.svelte';
	import PortfolioFundingHistory from '../../components/PortfolioFundingHistory.svelte';
	import PortfolioExitMark from '../../components/PortfolioExitMark.svelte';
	import PortfolioCompanyDetails from '../../components/PortfolioCompanyDetails.svelte';
	import { getPageSocialMeta } from '$lib/social-meta';
	import {
		PORTFOLIO_TIERS,
		filterPortfolio,
		formatPortfolioValuation,
		formatValuationDate
	} from '$lib/portfolio';

	/** @type {{ companies: import('$lib/portfolio').PortfolioCompany[], reviewedAt: string }} */
	export let data;
	const reviewDate = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(`${data.reviewedAt}T00:00:00Z`));
	const social = getPageSocialMeta('portfolio');
	let query = '';
	let category = '';
	let tier = '';
	let status = '';
	let sort = 'valuation';
	let compact = true;
	let filtersOpen = false;
	/** @type {import('$lib/portfolio').PortfolioCompany | null} */
	let selectedCompany = null;
	/** @type {HTMLButtonElement | undefined} */
	let filtersButton;
	$: categories = [...new Set(data.companies.map((company) => company.category))].sort();
	$: companies = filterPortfolio(data.companies, { query, category, tier, status, sort });
	$: activeFilterCount = [category, tier, status].filter(Boolean).length;
	$: hasFilters = Boolean(query || activeFilterCount);
	function resetFilters() {
		query = '';
		category = '';
		tier = '';
		status = '';
	}
	/** @param {KeyboardEvent} event */
	function closeFilters(event) {
		if (event.key === 'Escape' && !event.defaultPrevented && filtersOpen && !selectedCompany) {
			filtersOpen = false;
			filtersButton?.focus();
		}
	}
</script>

<svelte:window on:keydown={closeFilters} />

<SocialMeta {...social} />
<PortfolioCompanyDetails bind:company={selectedCompany} />

<article class="site-shell portfolio-page" class:compact>
	<header class="portfolio-intro">
		<h1>Advising &amp; investing</h1>
		<p class="intro-copy">
			Largest shareholdings: <a href="/why-temporal">Temporal</a> and
			<a href="/cognition">Cognition</a>.
		</p>
		<details class="investing-context">
			<summary>About my investing</summary>
			<p>
				For the last 5ish years, I’ve been advising and investing in startups, having started the
				<a href="https://dx.tips/angel-101">devtools-angels community</a>.
			</p>
			<p class="plain-muted help-copy">
				I mostly help with devrel and developer community strategy, hiring the first few devrels,
				and AI product feedback and launch guidance.
				<a href="#disclosure">Editorial disclosure ↓</a>
			</p>
		</details>
	</header>

	<section aria-labelledby="directory-heading">
		<div class="directory-heading">
			<h2 id="directory-heading" class="sr-only">The portfolio</h2>
			<p class="plain-muted">Companies and people I’ve backed.</p>
		</div>
		<form
			class="portfolio-controls"
			on:submit|preventDefault={() => {}}
			role="search"
			aria-label="Filter portfolio"
		>
			<label class="search-field">
				<span class="sr-only">Search</span>
				<svg
					class="search-icon"
					aria-hidden="true"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg
				>
				<input
					type="search"
					bind:value={query}
					placeholder="Search companies, products, or keywords…"
				/>
			</label>
			<button
				type="button"
				class="filters-toggle"
				bind:this={filtersButton}
				aria-expanded={filtersOpen}
				aria-controls="portfolio-filter-panel"
				on:click={() => (filtersOpen = !filtersOpen)}
			>
				<svg
					aria-hidden="true"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"><path d="M4 7h16M7 12h10M10 17h4" /></svg
				>
				Filters{#if activeFilterCount}<span class="filter-count">{activeFilterCount}</span
					>{/if}<span aria-hidden="true">{filtersOpen ? '−' : '+'}</span>
			</button>
			<label class="sort-field">
				<span class="sr-only">Sort by</span>
				<select bind:value={sort}>
					<option value="">Original order</option>
					<option value="name">Name: A–Z</option>
					<option value="valuation">Valuation: high–low</option>
					<option value="valuation-asc">Valuation: low–high</option>
				</select>
			</label>
			<div id="portfolio-filter-panel" class="filter-panel" hidden={!filtersOpen}>
				<label>
					<span>Category</span>
					<select bind:value={category}>
						<option value="">All categories</option>
						{#each categories as option}<option value={option}>{option}</option>{/each}
					</select>
				</label>
				<label>
					<span>Original tier</span>
					<select bind:value={tier}>
						<option value="">All tiers</option>
						{#each PORTFOLIO_TIERS as option}<option value={option}>{option}</option>{/each}
					</select>
				</label>
				<label>
					<span>Status</span>
					<select bind:value={status}>
						<option value="">All entries</option>
						<option value="current">Current</option>
						<option value="exited">Exited</option>
						<option value="closed">Closed</option>
						<option value="individual">Individuals</option>
					</select>
				</label>
				<button type="button" class="reset-filters" disabled={!hasFilters} on:click={resetFilters}
					>Reset filters</button
				>
			</div>
		</form>
		<div class="directory-meta">
			<p role="status" aria-live="polite">
				{hasFilters ? `${companies.length} of ${data.companies.length}` : data.companies.length} entries
			</p>
			{#if hasFilters}<button type="button" on:click={resetFilters}>Reset filters</button>{/if}
			<p class="review-date">Checked <time datetime={data.reviewedAt}>{reviewDate}</time></p>
			<div class="view-options" role="group" aria-label="Portfolio density">
				<button type="button" aria-pressed={compact} on:click={() => (compact = true)}
					>Compact</button
				>
				<button type="button" aria-pressed={!compact} on:click={() => (compact = false)}
					>Detailed</button
				>
			</div>
		</div>

		<!-- svelte-ignore a11y_no_redundant_roles (preserve table semantics with mobile CSS grid) -->
		<table role="table" aria-describedby="valuation-note">
			<caption class="sr-only"
				>Advising and investing portfolio, including descriptions, categories, and last verified
				public valuations.</caption
			>
			<!-- svelte-ignore a11y_no_redundant_roles (preserve table semantics with mobile CSS grid) -->
			<thead role="rowgroup">
				<!-- svelte-ignore a11y_no_redundant_roles (preserve table semantics with mobile CSS grid) -->
				<tr role="row">
					<th role="columnheader" scope="col">Company / person</th>
					<th role="columnheader" scope="col">What they do</th>
					<th role="columnheader" scope="col">Category / status</th>
					<th
						role="columnheader"
						scope="col"
						class="valuation-column"
						aria-sort={sort === 'valuation'
							? 'descending'
							: sort === 'valuation-asc'
								? 'ascending'
								: 'none'}
					>
						<button
							type="button"
							class="valuation-sort"
							on:click={() => (sort = sort === 'valuation' ? 'valuation-asc' : 'valuation')}
							aria-label={`Sort by valuation: ${sort === 'valuation' ? 'low to high' : 'high to low'}`}
						>
							Last public valuation <span aria-hidden="true"
								>{sort === 'valuation' ? '↓' : sort === 'valuation-asc' ? '↑' : '↕'}</span
							>
						</button>
					</th>
				</tr>
			</thead>
			<!-- svelte-ignore a11y_no_redundant_roles (preserve table semantics with mobile CSS grid) -->
			<tbody role="rowgroup">
				{#each companies as company (company.id)}
					<!-- svelte-ignore a11y_no_redundant_roles (preserve table semantics with mobile CSS grid) -->
					<tr role="row" id={company.id} class:exit-row={company.status === 'exited'}>
						<th role="rowheader" scope="row" class="company-cell">
							<div class="company-identity">
								{#if company.status === 'exited' && company.exit}
									<PortfolioExitMark {company} {compact} />
								{:else}
									<div class="company-logo" aria-hidden="true">
										{#if company.logo}
											<img
												src={company.logo}
												alt=""
												width="36"
												height="36"
												loading="lazy"
												decoding="async"
											/>
										{:else}
											<span title="No public logo available"
												>{company.name
													.split(' ')
													.map((word) => word[0])
													.slice(0, 2)
													.join('')}</span
											>
										{/if}
									</div>
								{/if}
								<div>
									<button
										type="button"
										class="company-name"
										aria-haspopup="dialog"
										aria-label={`View details for ${company.name}`}
										on:click={() => (selectedCompany = company)}
										>{company.name} <span class="details-hint" aria-hidden="true">›</span></button
									>
								</div>
							</div>
						</th>
						<td role="cell" class="description-cell">
							<span class="company-description" title={compact ? company.description : undefined}
								>{company.description}</span
							>
							{#if company.descriptionSourceUrl}<a
									class="related-link"
									href={company.descriptionSourceUrl}
									title={company.descriptionSourceTitle}
									aria-label={`${company.name}: ${company.descriptionSourceTitle}`}
									>{compact ? '↗' : 'Source ↗'}</a
								>{/if}
							{#if !compact && company.note}<span class="company-note">{company.note}</span>{/if}
							{#if !compact && company.relatedUrl}<a
									class="related-link"
									href={company.relatedUrl}
									aria-label={`More on ${company.name}`}>More ↗</a
								>{/if}
						</td>
						<td role="cell" class="category-cell">
							<span class="category-label">{company.category}</span>
							<div class="company-context">
								{#if company.status === 'exited' && company.exit}
									<span class="exit-label">Exited to</span>
									<strong class="exit-destination">{company.acquirer}</strong>
									<a
										class="exit-announcement"
										href={company.exit.sourceUrl}
										title={company.exit.sourceTitle}
										aria-label={`${company.name} → ${company.acquirer}: ${company.exit.sourceTitle}`}
										>{compact ? 'Announcement ↗' : 'Read announcement ↗'}</a
									>
								{:else}
									<span class="tier-label">{company.tier}</span>
									{#if company.acquirer}<span class="company-status"
											>Exited → {company.acquirer}</span
										>
									{:else if company.status === 'closed'}<span class="company-status">Closed</span>
									{:else if company.status === 'individual'}<span class="company-status"
											>Individual backing</span
										>{/if}
								{/if}
							</div>
						</td>
						<td role="cell" class="valuation-cell">
							<div class="valuation-mark">
								<span class="mobile-label" aria-hidden="true">Last public valuation</span>
								{#if company.valuation}
									<a
										class="valuation-value"
										href={company.valuation.sourceUrl}
										title={`${company.valuation.sourceTitle}${company.valuation.qualifier ? ` · ${company.valuation.qualifier}` : ''}`}
										aria-label={`${company.name}: ${formatPortfolioValuation(company.valuation)}. ${company.valuation.sourceTitle}`}
									>
										{formatPortfolioValuation(company.valuation)}
										<span aria-hidden="true">↗</span>
									</a>
									<time datetime={company.valuation.date}
										>{company.valuation.dateLabel ??
											formatValuationDate(company.valuation.date)}</time
									>
									{#if !compact && company.valuation.qualifier}<small
											>{company.valuation.qualifier}</small
										>{/if}
								{:else}
									<span class="unavailable"
										>{company.status === 'individual'
											? 'Not applicable'
											: 'No public figure found'}</span
									>
								{/if}
								{#if !compact && company.valuationRumor}
									<a
										class="funding-link rumor-link"
										href={company.valuationRumor.sourceUrl}
										title={company.valuationRumor.sourceTitle}
									>
										Rumored {formatPortfolioValuation(company.valuationRumor)} ↗
									</a>
									<small
										>{company.valuationRumor.qualifier} ·
										<time datetime={company.valuationRumor.date}
											>{formatValuationDate(company.valuationRumor.date)}</time
										>
										{#if company.valuationRumor.xUrl}
											· <a
												href={company.valuationRumor.xUrl}
												aria-label={`${company.name}: discussion on X`}>X ↗</a
											>{/if}
									</small>
								{/if}
							</div>
							{#if company.fundingRounds?.length}
								<PortfolioFundingHistory
									rounds={company.fundingRounds}
									companyName={company.name}
									expanded={!compact}
									{compact}
								/>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if companies.length === 0}
			<div class="empty-state">
				<h3>No matching entries</h3>
				<p>
					Try another keyword or category, or <button type="button" on:click={resetFilters}
						>reset the filters</button
					>.
				</p>
			</div>
		{/if}
		<p id="valuation-note" class="valuation-note">
			Public data checked <time datetime={data.reviewedAt}>{reviewDate}</time>. Valuations are dated
			public company marks in USD, not the value of my holdings. Filing-derived estimates are
			labeled; older rounds stay dated and may not reflect today’s value. Linked funding rounds
			include verified leads where available—“raised” is funding, not valuation. Round history is
			partial; investor participation alone does not establish a lead. Rumored fundraising targets
			are shown separately and do not affect valuation sorting. Acquisition prices are not treated
			as funding valuations. Tiers preserve my original groups, not a financial ranking. Initials
			stand in where a public logo isn’t available.
		</p>
	</section>

	<footer class="portfolio-notes">
		<div>
			<h2 id="disclosure">A note on editorial independence</h2>
			<p>
				My portfolio companies do not get guaranteed spots in <a href="https://www.latent.space"
					>Latent Space</a
				>
				or <a href="https://www.ai.engineer">AI Engineer</a>. Familiarity with them and their
				progress can make them more likely to be featured, but only if they’re a fit. Orders of
				magnitude more of my self-worth, identity, principles, and value are in LS and AIE. I will
				not “sell out” just to “pump my bags”.
			</p>
		</div>
		<div>
			<h2>Getting in touch</h2>
			<p>
				I’m no longer taking new advising inquiries. If you’re fundraising—primarily pre-seed, seed,
				or Series A—please get a warm intro from someone who knows me. Thanks for your interest!
			</p>
		</div>
	</footer>
</article>

<style>
	.portfolio-page {
		--site-max-width: 1160px;
		margin-block: 1.5rem 4rem;
	}
	.portfolio-intro {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: baseline;
		gap: 0.3rem 1rem;
		margin-bottom: 1rem;
	}
	h1 {
		grid-column: 1 / -1;
		font: 600 clamp(2rem, 4vw, 2.75rem)/1.12 var(--font-display);
		letter-spacing: -0.035em;
		margin-bottom: 0.4rem;
	}
	.intro-copy {
		font-size: 1rem;
		line-height: 1.6;
	}
	.investing-context {
		border: 0;
		padding: 0;
		border-radius: 0;
		background: transparent;
		margin-top: 0.35rem;
		max-width: 760px;
	}
	.investing-context > summary {
		color: var(--page-muted);
		font-size: 0.875rem;
		cursor: pointer;
		padding: 0;
		margin: 0;
		background: transparent;
		width: fit-content;
		line-height: 1.8;
	}
	.investing-context > summary:hover {
		color: var(--page-link);
	}
	.investing-context[open] {
		grid-column: 1 / -1;
	}
	.investing-context p {
		margin-top: 0.7rem;
		font-size: 1rem;
		line-height: 1.65;
	}
	h2 {
		font: 600 1.5rem var(--font-display);
	}
	.directory-heading {
		position: absolute;
	}
	.directory-heading > p {
		display: none;
	}
	.review-date {
		margin-left: auto;
	}

	.portfolio-controls {
		display: grid;
		grid-template-columns: minmax(200px, 1fr) auto 230px;
		gap: 0.6rem;
		align-items: start;
	}
	.portfolio-controls label {
		display: grid;
		gap: 0.35rem;
		min-width: 0;
	}
	.portfolio-controls label > span:not(.sr-only) {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--page-muted);
	}
	.search-field {
		position: relative;
	}
	.search-icon {
		position: absolute;
		width: 18px;
		height: 18px;
		top: 13px;
		left: 13px;
		color: var(--page-muted);
		pointer-events: none;
	}
	.search-field input {
		padding-left: 2.25rem;
	}
	input,
	select,
	.filters-toggle {
		width: 100%;
		min-width: 0;
		height: 44px;
		padding: 0.5rem 0.7rem;
		font: inherit;
		font-size: 0.9375rem;
		color: var(--page-text);
		background: var(--page-surface);
		border: 1px solid var(--control-border);
		border-radius: 0.3rem;
	}
	input::placeholder {
		color: var(--page-muted);
		opacity: 1;
	}
	button {
		color: var(--page-link);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	button:disabled {
		color: var(--page-muted);
		opacity: 0.6;
		cursor: default;
	}
	input:focus-visible,
	select:focus-visible,
	button:focus-visible,
	a:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--page-accent);
		outline-offset: 3px;
	}
	.filters-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		text-decoration: none;
	}
	.filters-toggle svg {
		width: 18px;
		height: 18px;
	}
	.filters-toggle[aria-expanded='true'] {
		border-color: var(--page-text);
	}
	.filter-count {
		font: 600 0.75rem var(--font-mono);
		background: var(--page-section-bg);
		padding: 0.1rem 0.35rem;
		border-radius: 0.25rem;
	}
	.filter-panel {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
		align-items: end;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--page-section-bg);
		border: 1px solid var(--page-border);
		border-radius: 0.3rem;
	}
	.filter-panel[hidden] {
		display: none;
	}
	.reset-filters {
		min-height: 44px;
		padding-inline: 0.5rem;
		font-size: 0.875rem;
	}
	.directory-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-block: 0.6rem;
		color: var(--page-muted);
		font-size: 0.8125rem;
		min-height: 56px;
	}
	.directory-meta > button {
		min-height: 44px;
	}
	.view-options {
		display: flex;
		gap: 2px;
		padding: 2px;
		border: 1px solid var(--page-border);
		border-radius: 0.3rem;
	}
	.view-options button {
		min-height: 36px;
		padding: 0.35rem 0.75rem;
		border-radius: 0.2rem;
		color: var(--page-muted);
		text-decoration: none;
		font-size: 0.8125rem;
	}
	.view-options button[aria-pressed='true'] {
		background: var(--page-text);
		color: var(--page-bg);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
		font-size: 1rem;
	}
	thead th {
		color: var(--page-muted);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.65rem 0.75rem;
		text-align: left;
		border-block: 1px solid var(--page-border);
		background: var(--page-section-bg);
	}
	thead th:nth-child(1) {
		width: 23%;
	}
	thead th:nth-child(2) {
		width: 39%;
	}
	thead th:nth-child(3) {
		width: 17%;
	}
	thead th:nth-child(4) {
		width: 21%;
	}
	.valuation-sort {
		color: inherit;
		font: inherit;
		font-weight: 600;
		text-decoration: none;
	}
	.valuation-sort:hover {
		color: var(--page-link);
		text-decoration: underline;
	}
	tbody tr {
		border-bottom: 1px solid var(--page-border);
	}
	tbody tr:hover {
		background: var(--page-row-hover);
	}
	tbody th,
	td {
		padding: 1rem 0.75rem;
		vertical-align: top;
		text-align: left;
		font-weight: 400;
	}
	.compact tbody th,
	.compact td {
		padding-block: 0.65rem;
	}
	.company-identity {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}
	.company-logo {
		flex: 0 0 36px;
		width: 36px;
		height: 36px;
		border-radius: 0.4rem;
		display: grid;
		place-items: center;
		background: #fff;
		color-scheme: light;
		box-shadow: 0 0 0 1px var(--page-border);
		overflow: hidden;
	}
	.company-logo img {
		width: 32px;
		height: 32px;
		max-height: 32px;
		object-fit: contain;
		background: transparent;
	}
	.company-logo span {
		color: #6c675d;
		font: 0.8rem var(--font-mono);
	}
	.company-name {
		font-size: 1rem;
		font-weight: 650;
		color: var(--page-text);
		text-decoration: none;
	}
	.company-name:hover {
		color: var(--page-link);
		text-decoration: underline;
	}
	.company-name {
		text-align: left;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
	.details-hint {
		color: var(--page-muted);
		font-weight: 400;
	}
	.company-context {
		margin-top: 0.3rem;
	}
	.company-status,
	.tier-label {
		display: block;
		color: var(--page-muted);
		font-size: 0.75rem;
		line-height: 1.5;
	}
	.company-status {
		margin-top: 0.15rem;
	}
	.description-cell {
		color: var(--page-muted);
		line-height: 1.5;
	}
	.compact .company-description {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
	}
	.compact .description-cell {
		position: relative;
		padding-right: 2.4rem;
	}
	.compact .related-link {
		position: absolute;
		top: 0.6rem;
		right: 0.5rem;
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		margin: 0;
		color: var(--page-muted);
		text-decoration: none;
		font-size: 1rem;
	}
	.compact .related-link:hover {
		color: var(--page-link);
	}
	.company-note {
		display: block;
		font-size: 0.875rem;
		font-style: italic;
		margin-top: 0.3rem;
	}
	.related-link {
		white-space: nowrap;
		font-size: 0.8125rem;
		margin-left: 0.3rem;
	}
	.category-label {
		display: inline-block;
		background: var(--page-section-bg);
		border-radius: 0.25rem;
		padding: 0.15rem 0.4rem;
		font-size: 0.75rem;
		line-height: 1.5;
	}
	.valuation-column,
	.valuation-cell {
		text-align: right;
	}
	.valuation-value {
		font: 600 1.125rem var(--font-mono);
		text-decoration: none;
		white-space: nowrap;
	}
	.valuation-value:hover {
		text-decoration: underline;
	}
	.valuation-value span {
		font-size: 0.75rem;
	}
	.valuation-cell time,
	.valuation-cell small {
		display: block;
		color: var(--page-muted);
		font-size: 0.75rem;
		line-height: 1.5;
		margin-top: 0.15rem;
	}
	.valuation-cell small time {
		display: inline;
	}
	.funding-link {
		display: block;
		margin-top: 0.35rem;
		font-size: 0.875rem;
	}
	.unavailable {
		color: var(--page-muted);
		font-size: 0.8125rem;
	}
	.mobile-label {
		display: none;
	}
	.exit-row {
		background: color-mix(in srgb, var(--page-gold) 6%, transparent);
	}
	.exit-label {
		display: block;
		font: 0.65rem var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--page-gold);
	}
	.exit-destination {
		display: block;
		font-weight: 650;
		line-height: 1.4;
		margin-block: 0.1rem;
	}
	.exit-announcement {
		font-size: 0.8125rem;
	}
	.valuation-note {
		font-size: 0.8125rem;
		color: var(--page-muted);
		line-height: 1.65;
		margin-top: 1rem;
		max-width: 850px;
	}
	.portfolio-notes {
		display: grid;
		grid-template-columns: 1.6fr 1fr;
		gap: 3rem;
		margin-top: 3rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--page-border);
	}
	.portfolio-notes h2 {
		margin-bottom: 0.5rem;
	}
	.portfolio-notes p {
		color: var(--page-muted);
		font-size: 1rem;
		line-height: 1.65;
	}
	.empty-state {
		padding: 2.5rem 1rem;
		text-align: center;
		border-bottom: 1px solid var(--page-border);
	}
	.empty-state h3 {
		font-weight: 600;
	}
	.empty-state p {
		color: var(--page-muted);
		margin-top: 0.4rem;
	}
	@media (max-width: 980px) {
		thead th:nth-child(1) {
			width: 24%;
		}
		thead th:nth-child(2) {
			width: 35%;
		}
		thead th:nth-child(3) {
			width: 19%;
		}
		thead th:nth-child(4) {
			width: 22%;
		}
		.valuation-sort {
			font-size: 0.7rem;
		}
	}
	@media (max-width: 780px) {
		.portfolio-page {
			margin-top: 1rem;
		}
		.directory-heading {
			align-items: start;
			gap: 0.5rem;
		}
		.directory-heading > p:first-of-type {
			display: none;
		}
		.review-date {
			text-align: left;
		}
		table,
		tbody {
			display: block;
		}
		thead {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
		tbody tr {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 155px;
			gap: 0.5rem 1rem;
			padding-block: 0.85rem;
		}
		tbody th,
		td,
		.compact tbody th,
		.compact td {
			padding: 0;
		}
		.company-cell {
			grid-area: 1 / 1;
		}
		.valuation-cell {
			grid-area: 1 / 2 / 4 / 3;
		}
		.description-cell {
			grid-area: 2 / 1;
		}
		.compact .description-cell {
			padding-right: 1.75rem;
		}
		.compact .related-link {
			top: 0;
			right: 0;
		}
		.category-cell {
			grid-area: 3 / 1;
		}
		.company-context {
			display: inline;
		}
		.tier-label {
			display: inline;
			margin-left: 0.4rem;
		}
		.exit-row .company-context {
			display: block;
		}
		.portfolio-notes {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		.filter-panel {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		.reset-filters {
			grid-column: 1 / -1;
			justify-self: start;
		}
	}
	@media (max-width: 540px) {
		h1 {
			font-size: 2rem;
		}
		.portfolio-intro {
			grid-template-columns: 1fr;
			gap: 0;
		}
		.investing-context {
			margin-top: 0.25rem;
		}
		.review-date {
			display: none;
		}
		.view-options {
			margin-left: auto;
		}
		.portfolio-controls {
			grid-template-columns: 100px minmax(0, 1fr);
		}
		.search-field {
			grid-column: 1 / -1;
		}
		input,
		select {
			font-size: 1rem;
		}
		.filter-panel {
			grid-template-columns: 1fr;
			padding: 0.75rem;
		}
		.directory-meta {
			gap: 0.5rem;
			flex-wrap: wrap;
		}
		.view-options button {
			min-height: 40px;
			padding-inline: 0.65rem;
		}
		tbody tr {
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 0.4rem 0.65rem;
		}
		.company-cell {
			grid-area: 1 / 1;
		}
		.valuation-cell {
			display: contents;
		}
		.valuation-mark {
			grid-area: 1 / 2;
			text-align: right;
		}
		.valuation-cell :global(.funding-history) {
			grid-area: 3 / 2;
			text-align: right;
			margin: 0;
		}
		.valuation-cell :global(.funding-history[open]) {
			grid-area: 4 / 1 / 5 / -1;
			text-align: left;
		}
		.valuation-cell :global(.funding-history > summary) {
			min-height: 24px;
		}
		.description-cell {
			grid-area: 2 / 1 / 3 / -1;
			margin-top: 0.15rem;
		}
		.category-cell {
			grid-area: 3 / 1;
		}
		.compact .description-cell {
			padding-right: 2.75rem;
		}
		.company-name {
			font-size: 1rem;
		}
		.company-identity {
			gap: 0.5rem;
		}
		.valuation-value {
			font-size: 1rem;
		}
		.unavailable {
			display: inline-block;
			max-width: 110px;
			font-size: 0.75rem;
		}
		.valuation-note {
			font-size: 0.8125rem;
		}
	}
	@media (pointer: coarse) {
		.compact .related-link {
			width: 44px;
			height: 44px;
		}
		.investing-context > summary,
		.view-options button {
			min-height: 44px;
		}
		.compact .description-cell {
			padding-right: 3rem;
		}
	}
</style>
