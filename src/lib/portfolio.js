/**
 * Public company marks, not the value of my holdings. A null valuation means
 * no public figure was verified; it must never be treated as zero.
 * @typedef {{ amountUsd: number, date: string, sourceUrl: string, sourceTitle: string, qualifier?: string, prefix?: string, dateLabel?: string }} Valuation
 * @typedef {{ id: string, name: string, website: string | null, description: string, category: string, status: string, logo: string | null, logoSource: string | null, valuation: Valuation | null, relatedUrl?: string, note?: string, acquirer?: string }} PortfolioCompany
 */

/**
 * @param {PortfolioCompany[]} companies
 * @param {{ query?: string, category?: string, status?: string, sort?: string }} filters
 */
export function filterPortfolio(
	companies,
	{ query = '', category = '', status = '', sort = '' } = {}
) {
	const words = query.trim().toLocaleLowerCase('en-US').split(/\s+/).filter(Boolean);
	const result = companies.filter((company) => {
		const haystack = [company.name, company.description, company.category, company.acquirer ?? '']
			.join(' ')
			.toLocaleLowerCase('en-US');
		return (
			(!category || company.category === category) &&
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
	const unit = amountUsd >= 1_000_000_000 ? 1_000_000_000 : 1_000_000;
	return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amountUsd / unit)}${unit === 1_000_000_000 ? 'B' : 'M'}`;
}

/** @param {string} date */
export function formatValuationDate(date) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(`${date}T00:00:00Z`));
}
