import { OG_DESIGN_VERSION, PAGE_SOCIAL_CARDS } from '../social-meta.js';
import { decodeHtmlEntities, extractContentDescription } from '../content-description.js';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export { OG_DESIGN_VERSION };

/** @typedef {'article' | 'identity' | 'collection' | 'audio' | 'portfolio' | 'newsletter'} CardKind */

/**
 * @typedef {object} NotebookCard
 * @property {CardKind} kind
 * @property {string} title
 * @property {string} description
 * @property {string} label
 * @property {string=} date
 * @property {string=} image
 * @property {string=} imageAlt
 * @property {number} titleSize
 * @property {string} annotation
 */

const PAGE_ANNOTATIONS = {
	home: 'learn in public',
	about: 'hello, world',
	ideas: 'essays · notes · talks',
	podcasts: 'press play',
	portfolio: 'advisor / investor',
	subscribe: 'worth opening'
};

/** @param {string} title */
export function titleSize(title) {
	if (title.length <= 35) return 76;
	if (title.length <= 65) return 64;
	if (title.length <= 95) return 54;
	return 48;
}

/** @param {unknown} value */
export function truncateTitle(value) {
	const title = `${value ?? ''}`.trim();
	return title.length > 110 ? `${title.slice(0, 109).trimEnd()}…` : title;
}

/** @param {Date | string | number | undefined} value */
export function formatCardDate(value) {
	if (!value) return undefined;
	const date = new Date(value);
	if (Number.isNaN(date.valueOf())) return undefined;
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(date);
}

/**
 * @param {string} key
 * @returns {NotebookCard | null}
 */
export function getPageCard(key) {
	const pageKey = /** @type {keyof typeof PAGE_SOCIAL_CARDS} */ (key);
	const base = PAGE_SOCIAL_CARDS[pageKey];
	if (!base) return null;
	const title = truncateTitle(base.title);
	return {
		kind: base.kind,
		title,
		description: base.description,
		label: base.label,
		imageAlt: base.imageAlt,
		annotation: PAGE_ANNOTATIONS[pageKey],
		titleSize: titleSize(title)
	};
}

/**
 * @param {import('../types').ContentItem} article
 * @param {string=} image
 * @returns {NotebookCard}
 */
export function getArticleCard(article, image) {
	const title = truncateTitle(decodeHtmlEntities(article.title));
	const imageAlt =
		typeof article.frontmatter?.image_alt === 'string'
			? article.frontmatter.image_alt
			: typeof article.frontmatter?.cover_image_alt === 'string'
				? article.frontmatter.cover_image_alt
				: undefined;
	return {
		kind: 'article',
		title,
		description: extractContentDescription('', article.description || article.subtitle || ''),
		label: article.category || 'note',
		date: formatCardDate(article.date),
		image,
		imageAlt,
		titleSize: titleSize(title),
		annotation: 'swyx’s public notebook'
	};
}
