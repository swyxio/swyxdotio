<script>
	import SocialMeta from '../../components/SocialMeta.svelte';
	import { getPageSocialMeta } from '$lib/social-meta';
	import {
		PORTFOLIO_TIERS,
		filterPortfolio,
		formatValuation,
		formatPortfolioValuation,
		formatValuationDate
	} from '$lib/portfolio';

	/** @type {{ companies: import('$lib/portfolio').PortfolioCompany[], reviewedAt: string }} */
	export let data;
	const social = getPageSocialMeta('portfolio');
	let query = '';
	let category = '';
	let tier = '';
	let status = '';
	let sort = '';
	$: categories = [...new Set(data.companies.map((company) => company.category))].sort();
	$: companies = filterPortfolio(data.companies, { query, category, tier, status, sort });
	$: hasFilters = Boolean(query || category || tier || status || sort);
	function resetFilters() {
		query = '';
		category = '';
		tier = '';
		status = '';
		sort = '';
	}
</script>

<SocialMeta {...social} />

<article class="site-shell portfolio-page">
	<header class="portfolio-intro">
		<p class="eyebrow">The people building what’s next</p>
		<h1>Advising &amp; investing</h1>
		<p class="intro-copy">
			My largest shareholdings are <a href="/why-temporal">Temporal</a> and
			<a href="/cognition">Cognition</a>. For the last 5ish years, I’ve been advising and investing
			in startups, having started the
			<a href="https://dx.tips/angel-101">devtools-angels community</a>.
		</p>
		<p class="plain-muted help-copy">
			I mostly help with devrel and developer community strategy, hiring the first few devrels, and
			AI product feedback and launch guidance.
			<a href="#disclosure">Editorial disclosure ↓</a>
		</p>
	</header>

	<section aria-labelledby="directory-heading">
		<div class="directory-heading">
			<h2 id="directory-heading">The portfolio</h2>
			<p class="plain-muted">A selection of companies and people I’ve backed.</p>
		</div>
		<form
			class="portfolio-controls"
			on:submit|preventDefault={() => {}}
			role="search"
			aria-label="Filter portfolio"
		>
			<label class="search-field">
				<span>Search</span>
				<input type="search" bind:value={query} placeholder="Company, product, or keyword…" />
			</label>
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
			<label>
				<span>Sort by</span>
				<select bind:value={sort}>
					<option value="">Original order</option>
					<option value="name">Name: A–Z</option>
					<option value="valuation">Valuation: high–low</option>
				</select>
			</label>
		</form>
		<div class="directory-meta">
			<p role="status" aria-live="polite">{companies.length} of {data.companies.length} entries</p>
			{#if hasFilters}<button type="button" on:click={resetFilters}>Reset filters</button>{/if}
			<p class="review-date">
				Public data checked <time datetime={data.reviewedAt}>August 26, 2026</time>
			</p>
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
					<th role="columnheader" scope="col">Category</th>
					<th role="columnheader" scope="col">Status / tier</th>
					<th role="columnheader" scope="col" class="valuation-column">Last public valuation</th>
				</tr>
			</thead>
			<!-- svelte-ignore a11y_no_redundant_roles (preserve table semantics with mobile CSS grid) -->
			<tbody role="rowgroup">
				{#each companies as company (company.id)}
					<!-- svelte-ignore a11y_no_redundant_roles (preserve table semantics with mobile CSS grid) -->
					<tr role="row" id={company.id}>
						<th role="rowheader" scope="row" class="company-cell">
							<div class="company-identity">
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
								<div>
									{#if company.website}<a class="company-name" href={company.website}
											>{company.name}</a
										>
									{:else}<span class="company-name">{company.name}</span>{/if}
								</div>
							</div>
						</th>
						<td role="cell" class="description-cell">
							{company.description}
							{#if company.note}<span class="company-note">{company.note}</span>{/if}
							{#if company.relatedUrl}<a
									class="related-link"
									href={company.relatedUrl}
									aria-label={`More on ${company.name}`}>More ↗</a
								>{/if}
						</td>
						<td role="cell" class="category-cell"
							><span class="category-label">{company.category}</span></td
						>
						<td role="cell" class="tier-cell">
							<span class="tier-label">{company.tier}</span>
							{#if company.acquirer}<span class="company-status">Exited → {company.acquirer}</span>
							{:else if company.status === 'closed'}<span class="company-status">Closed</span>
							{:else if company.status === 'individual'}<span class="company-status"
									>Individual backing</span
								>{/if}
						</td>
						<td role="cell" class="valuation-cell">
							<span class="mobile-label" aria-hidden="true">Last public valuation</span>
							{#if company.valuation}
								<a
									class="valuation-value"
									href={company.valuation.sourceUrl}
									title={company.valuation.sourceTitle}
									aria-label={`${company.name}: ${formatPortfolioValuation(company.valuation)}. ${company.valuation.sourceTitle}`}
								>
									{formatPortfolioValuation(company.valuation)}
									<span aria-hidden="true">↗</span>
								</a>
								<time datetime={company.valuation.date}
									>{company.valuation.dateLabel ??
										formatValuationDate(company.valuation.date)}</time
								>
								{#if company.valuation.qualifier}<small>{company.valuation.qualifier}</small>{/if}
							{:else}
								<span class="unavailable"
									>{company.status === 'individual'
										? 'Not applicable'
										: 'No public figure found'}</span
								>
								{#if company.funding}
									<a
										class="funding-link"
										href={company.funding.sourceUrl}
										title={company.funding.sourceTitle}
									>
										{#if company.funding.amountUsd !== null}
											{formatValuation(company.funding.amountUsd)}
											{company.funding.kind === 'total' ? 'total raised' : 'raised'} ↗
										{:else}Funding announced ↗{/if}
									</a>
									<small
										>{company.funding.stage} ·
										<time datetime={company.funding.date}
											>{company.funding.dateLabel ??
												formatValuationDate(company.funding.date)}</time
										></small
									>
								{/if}
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
			Valuations are dated public company marks in USD, not the value of my holdings. Filing-derived
			estimates are labeled; older rounds stay dated and may not reflect today’s value. Where no
			valuation was found, a linked funding round is shown when available—“raised” is funding, not
			valuation. Acquisition prices are not treated as funding valuations. Tiers preserve my
			original groups, not a financial ranking. Initials stand in where a public logo isn’t
			available.
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
		margin-block: 2.5rem 4rem;
	}
	.portfolio-intro {
		max-width: 780px;
		margin-bottom: 3rem;
	}
	.eyebrow {
		color: var(--page-muted);
		font: 0.72rem var(--font-mono);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		margin-bottom: 0.8rem;
	}
	h1 {
		font-family: var(--font-display);
		font-size: clamp(2.4rem, 5vw, 3.6rem);
		font-weight: 600;
		letter-spacing: -0.035em;
		line-height: 1.12;
		margin-bottom: 1.15rem;
	}
	.intro-copy {
		font-size: 1.08rem;
		line-height: 1.7;
	}
	.help-copy {
		margin-top: 0.8rem;
		font-size: 0.95rem;
	}
	h2 {
		font-family: var(--font-display);
		font-size: 1.55rem;
		font-weight: 600;
	}
	.directory-heading {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.3rem 1rem;
		border-top: 2px solid var(--page-text);
		padding-top: 1rem;
		margin-bottom: 1.2rem;
	}
	.directory-heading p {
		font-size: 0.85rem;
	}
	.portfolio-controls {
		display: grid;
		grid-template-columns: minmax(200px, 1fr) 170px 175px 130px 175px;
		gap: 0.75rem;
	}
	.portfolio-controls label {
		display: grid;
		gap: 0.35rem;
		min-width: 0;
	}
	.portfolio-controls label > span {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--page-muted);
	}
	input,
	select {
		width: 100%;
		min-width: 0;
		height: 44px;
		padding: 0.5rem 0.65rem;
		font: inherit;
		font-size: 0.875rem;
		color: var(--page-text);
		background: var(--page-surface);
		border: 1px solid var(--control-border);
		border-radius: 0.35rem;
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
	input:focus-visible,
	select:focus-visible,
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--page-accent);
		outline-offset: 3px;
	}
	.directory-meta {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		padding-block: 0.85rem;
		color: var(--page-muted);
		font-size: 0.75rem;
	}
	.review-date {
		margin-left: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
		font-size: 0.875rem;
	}
	thead {
		background: var(--page-section-bg);
	}
	thead th {
		color: var(--page-muted);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.025em;
		padding: 0.7rem 0.8rem;
		text-align: left;
		border-block: 1px solid var(--page-border);
	}
	thead th:nth-child(1) {
		width: 22%;
	}
	thead th:nth-child(2) {
		width: 30%;
	}
	thead th:nth-child(3) {
		width: 15%;
	}
	thead th:nth-child(4) {
		width: 16%;
	}
	thead th:nth-child(5) {
		width: 17%;
	}
	tbody tr {
		border-bottom: 1px solid var(--page-border);
	}
	tbody tr:hover {
		background: var(--page-row-hover);
	}
	tbody th,
	td {
		padding: 1.1rem 0.8rem;
		vertical-align: top;
		text-align: left;
		font-weight: 400;
	}
	.company-identity {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}
	.company-logo {
		flex: 0 0 40px;
		width: 40px;
		height: 40px;
		border-radius: 0.5rem;
		display: grid;
		place-items: center;
		background: #fff;
		color-scheme: light;
		box-shadow: 0 0 0 1px var(--page-border);
		overflow: hidden;
	}
	.company-logo img {
		width: 36px;
		height: 36px;
		max-height: 36px;
		object-fit: contain;
		background: transparent;
		border-radius: 0.3rem;
	}
	.company-logo span {
		color: #6c675d;
		font: 0.8rem var(--font-mono);
	}
	.company-name {
		font-size: 0.92rem;
		font-weight: 650;
		color: var(--page-text);
		text-decoration: none;
	}
	a.company-name:hover {
		color: var(--page-link);
		text-decoration: underline;
	}
	.company-status {
		display: block;
		color: var(--page-muted);
		font-size: 0.7rem;
		line-height: 1.4;
		margin-top: 0.25rem;
	}
	.tier-label {
		display: inline-block;
		color: var(--page-gold);
		font-size: 0.75rem;
		font-weight: 600;
	}
	.funding-link {
		display: block;
		margin-top: 0.35rem;
		font-size: 0.75rem;
	}
	.valuation-cell small time {
		display: inline;
	}
	.description-cell {
		line-height: 1.6;
		color: var(--page-muted);
	}
	.company-note {
		display: block;
		font-size: 0.75rem;
		font-style: italic;
		margin-top: 0.25rem;
	}
	.related-link {
		white-space: nowrap;
		font-size: 0.75rem;
		margin-left: 0.25rem;
	}
	.category-label {
		display: inline-block;
		background: var(--page-section-bg);
		border-radius: 0.3rem;
		padding: 0.2rem 0.5rem;
		font-size: 0.7rem;
		line-height: 1.5;
	}
	thead .valuation-column,
	.valuation-cell {
		text-align: right;
	}
	.valuation-value {
		font: 600 1.05rem var(--font-mono);
		text-decoration: none;
	}
	.valuation-value:hover {
		text-decoration: underline;
	}
	.valuation-value span {
		font-size: 0.7rem;
	}
	.valuation-cell time,
	.valuation-cell small {
		display: block;
		color: var(--page-muted);
		font-size: 0.7rem;
		line-height: 1.5;
		margin-top: 0.2rem;
	}
	.unavailable {
		color: var(--page-muted);
		font-size: 0.75rem;
	}
	.mobile-label {
		display: none;
	}
	.valuation-note {
		font-size: 0.75rem;
		color: var(--page-muted);
		line-height: 1.7;
		margin-top: 1rem;
		max-width: 850px;
	}
	.empty-state {
		padding: 3rem 1rem;
		text-align: center;
		border-bottom: 1px solid var(--page-border);
	}
	.empty-state h3 {
		font-weight: 600;
		margin-bottom: 0.4rem;
	}
	.empty-state p {
		color: var(--page-muted);
		font-size: 0.9rem;
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
		font-size: 1.2rem;
		margin-bottom: 0.65rem;
	}
	.portfolio-notes p {
		color: var(--page-muted);
		font-size: 0.85rem;
		line-height: 1.7;
	}
	@media (max-width: 980px) {
		.portfolio-controls {
			grid-template-columns: 1fr 1fr;
		}
		.search-field {
			grid-column: 1 / -1;
		}
		.portfolio-notes {
			gap: 1.5rem;
		}
	}
	@media (max-width: 700px) {
		.portfolio-page {
			margin-top: 1.75rem;
		}
		.portfolio-intro {
			margin-bottom: 2rem;
		}
		.intro-copy {
			font-size: 1rem;
		}
		.portfolio-controls {
			gap: 0.7rem;
		}
		input,
		select {
			font-size: 1rem;
		}
		.search-field {
			grid-column: 1 / -1;
		}
		.review-date {
			margin-left: 0;
			width: 100%;
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
			grid-template-columns: minmax(0, 1fr) auto;
			column-gap: 1rem;
			padding-block: 1.2rem;
		}
		tbody tr:first-child {
			border-top: 1px solid var(--page-border);
		}
		tbody th,
		td {
			padding: 0;
		}
		.company-cell,
		.description-cell {
			grid-column: 1 / -1;
		}
		.company-name {
			font-size: 1rem;
		}
		.description-cell {
			margin-block: 0.8rem;
		}
		.category-cell {
			grid-area: 3 / 1;
			padding-top: 0.15rem;
		}
		.tier-cell {
			grid-area: 4 / 1;
			padding-top: 0.5rem;
		}
		.valuation-cell {
			grid-area: 3 / 2 / 5 / 3;
			max-width: 10rem;
		}
		.mobile-label {
			display: block;
			color: var(--page-muted);
			font-size: 0.65rem;
			margin-bottom: 0.25rem;
		}
		.portfolio-notes {
			grid-template-columns: 1fr;
		}
	}
</style>
