/**
 * @param {Record<string, any>} item
 * @returns {Record<string, any>}
 */
function cleanDescription(item) {
	return {
		...item,
		description: item.description?.replace(/[[\]]/gm, ' ')
	};
}

/**
 * The default list response powers cards, RSS, and sitemap generation. Article
 * bodies stay in KV until an article or the optional search corpus needs them.
 *
 * @param {Record<string, any>} item
 * @returns {Record<string, any>}
 */
export function toContentListItem(item) {
	const { content, frontmatter, ...metadata } = item;
	return cleanDescription(metadata);
}

/**
 * Full-body search remains available, but the browser only downloads this
 * heavier projection after the reader interacts with the search box.
 *
 * @param {Record<string, any>} item
 * @returns {Record<string, any>}
 */
export function toSearchContentItem(item) {
	return {
		...toContentListItem(item),
		content: item.content
	};
}
