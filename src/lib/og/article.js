import { getArticleCard } from './cards.js';
import { isBlogSlug } from '../slug.js';

/**
 * Resolve only persisted, public content. The endpoint deliberately has no
 * title/description query-string escape hatch.
 * @param {import('../content-manifest').ContentManifest | null} manifest
 * @param {string} slug
 */
export function resolveArticleCard(manifest, slug) {
	if (!isBlogSlug(slug) || !manifest) return null;
	const article = manifest.blogposts.find((item) => item.slug === slug && !item.isPrivate);
	return article ? getArticleCard(article) : null;
}
