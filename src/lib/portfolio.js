/**
 * Public company marks, not the value of my holdings. A null valuation means
 * no public figure was verified; it must never be treated as zero.
 * @typedef {{ amountUsd: number, maxAmountUsd?: number, date: string, sourceUrl: string, sourceTitle: string, qualifier?: string, prefix?: string, dateLabel?: string, kind?: 'reported' | 'database-reported' | 'filing-derived' }} Valuation
 * @typedef {{ amountUsd: number | null, date: string, dateLabel?: string, stage: string, kind?: 'round' | 'total', sourceUrl: string, sourceTitle: string }} FundingRound
 * @typedef {{ id: string, name: string, website: string | null, description: string, category: string, tier: string, status: string, logo: string | null, logoSource: string | null, valuation: Valuation | null, funding?: FundingRound, relatedUrl?: string, note?: string, acquirer?: string }} PortfolioCompany
 */

// These are the original editorial groups, not financial rankings or funding stages.
export const PORTFOLIO_TIERS = ['Well known names', 'You should know', 'Smaller names', 'Done'];

/**
 * @param {PortfolioCompany[]} companies
 * @param {{ query?: string, category?: string, tier?: string, status?: string, sort?: string }} filters
 */
export function filterPortfolio(
	companies,
	{ query = '', category = '', tier = '', status = '', sort = '' } = {}
) {
	const words = query.trim().toLocaleLowerCase('en-US').split(/\s+/).filter(Boolean);
	const result = companies.filter((company) => {
		const haystack = [
			company.name,
			company.description,
			company.category,
			company.tier,
			company.acquirer ?? ''
		]
			.join(' ')
			.toLocaleLowerCase('en-US');
		return (
			(!category || company.category === category) &&
			(!tier || company.tier === tier) &&
			(!status || company.status === status) &&
			words.every((word) => haystack.includes(word))
		);
	});
	if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'en-US'));
	if (sort === 'valuation')
		result.sort((a, b) => (b.valuation?.amountUsd ?? -1) - (a.valuation?.amountUsd ?? -1));
	return result;
}

/** @param {number} amountUsd */
export function formatValuation(amountUsd) {
	const unit =
		amountUsd >= 1_000_000_000 ? 1_000_000_000 : amountUsd >= 1_000_000 ? 1_000_000 : 1_000;
	return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amountUsd / unit)}${unit === 1_000_000_000 ? 'B' : unit === 1_000_000 ? 'M' : 'K'}`;
}

/** @param {Valuation} valuation */
export function formatPortfolioValuation(valuation) {
	const amount = formatValuation(valuation.amountUsd);
	return `${valuation.prefix ?? ''}${amount}${valuation.maxAmountUsd ? `–${formatValuation(valuation.maxAmountUsd)}` : ''}`;
}

/** @param {string} date */
export function formatValuationDate(date) {
	const normalized = date.length === 7 ? `${date}-01` : date;
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(`${normalized}T00:00:00Z`));
}
