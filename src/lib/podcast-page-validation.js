/** @param {any} page @param {number} offset */
export function isValidEpisodePage(page, offset) {
	if (!page || !Array.isArray(page.episodes)) return false;
	if (page.nextOffset === null) return true;
	return (
		page.episodes.length > 0 && Number.isSafeInteger(page.nextOffset) && page.nextOffset > offset
	);
}
