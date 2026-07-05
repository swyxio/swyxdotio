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
 * The archive view needs only scan-friendly metadata. Keep this smaller than
 * `toContentListItem` so /ideas can render fast and load heavier data on demand.
 *
 * @param {Record<string, any>} item
 * @returns {Record<string, any>}
 */
export function toArchiveContentItem(item) {
	return {
		title: item.title,
		slug: item.slug,
		url: item.url,
		date: item.date,
		category: item.category,
		type: item.type,
		tags: item.tags,
		venues: item.venues,
		readingTime: item.readingTime,
		devToReactions: item.devToReactions,
		ghReactions: item.ghMetadata?.reactions?.total_count ?? 0,
		instances: item.instances?.map((/** @type {Record<string, any>} */ instance) => ({
			date: instance.date,
			venue: instance.venue,
			video: instance.video
		}))
	};
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
