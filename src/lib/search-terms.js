// Common function words should not turn a natural question into a broad typo
// search or move an excerpt away from its meaningful matching words.
export const SEARCH_STOP_WORDS = new Set(
	'a an and are as at be by can do does for from how i in is it my of on or our should that the their this to was we what when where which who why will with you your'.split(
		' '
	)
);
/** @param {string} query */
export function searchTerms(query) {
	const terms = query.trim().split(/\s+/).filter(Boolean);
	const meaningful = terms.filter((term) => !SEARCH_STOP_WORDS.has(term.toLowerCase()));
	return meaningful.length ? meaningful : terms;
}
