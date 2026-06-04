export const RESERVED_BLOG_SLUGS = new Set([
	'about',
	'ideas',
	'podcasts',
	'portfolio',
	'subscribe',
	'tools'
]);

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeBlogSlug(value) {
	return `${value}`.toLowerCase();
}

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isBlogSlug(slug) {
	return /^[a-z0-9][a-z0-9_-]*$/.test(slug) && !RESERVED_BLOG_SLUGS.has(slug);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function assertBlogSlug(value) {
	const slug = normalizeBlogSlug(value);
	if (!isBlogSlug(slug)) throw new Error(`Invalid or reserved blog slug: ${slug}`);
	return slug;
}
