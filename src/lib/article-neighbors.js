/**
 * Find nearby public articles in publication order without sending the archive to the browser.
 * @param {import('./types').ContentItem[]} posts
 * @param {string} slug
 */
export function articleNeighbors(posts, slug) {
	const ordered = posts
		.filter(
			(post) =>
				!post.isPrivate && post.slug && post.title && Number.isFinite(new Date(post.date).valueOf())
		)
		.slice()
		.sort(
			(a, b) =>
				new Date(b.date).valueOf() - new Date(a.date).valueOf() || a.slug.localeCompare(b.slug)
		);
	const index = ordered.findIndex((post) => post.slug === slug);
	if (index < 0) return { newer: [], older: [] };
	const compact = (/** @type {import('./types').ContentItem[]} */ items) =>
		items.map(({ slug, title }) => ({ slug, title }));
	return {
		newer: compact(ordered.slice(Math.max(0, index - 2), index).reverse()),
		older: compact(ordered.slice(index + 1, index + 3))
	};
}
