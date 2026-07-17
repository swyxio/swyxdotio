import { MY_TWITTER_HANDLE, SITE_TITLE, SITE_URL } from './siteConfig.js';
import {
	articleStructuredData,
	profilePageStructuredData,
	websiteStructuredData
} from './structured-data.js';

export const OG_DESIGN_VERSION = '1';

/**
 * @typedef {'identity' | 'collection' | 'audio' | 'portfolio' | 'newsletter'} PageCardKind
 * @typedef {'home' | 'about' | 'ideas' | 'podcasts' | 'portfolio' | 'subscribe'} PageCardKey
 * @typedef {{
 *   kind: PageCardKind;
 *   title: string;
 *   description: string;
 *   label: string;
 *   path: string;
 *   imageAlt: string;
 * }} PageCard
 * @typedef {{
 *   title: string;
 *   documentTitle: string;
 *   description: string;
 *   canonical: string;
 *   image: string;
 *   imageAlt: string;
 *   type: 'article' | 'website';
 *   twitterHandle: string;
 *   structuredData?: Record<string, any>;
 * }} SocialMetadata
 */

/** @type {Record<PageCardKey, PageCard>} */
export const PAGE_SOCIAL_CARDS = {
	home: {
		kind: 'identity',
		title: 'Shawn @swyx Wang',
		description: 'Writer, Founder, and Devtools Startup Advisor based in San Francisco.',
		label: 'swyx.io',
		path: '/',
		imageAlt: 'Shawn @swyx Wang — writer, founder, and devtools startup advisor'
	},
	about: {
		kind: 'identity',
		title: 'About swyx',
		description: 'Learn more about Shawn @swyx Wang, his work, values, and projects.',
		label: 'About',
		path: '/about',
		imageAlt: 'About Shawn @swyx Wang'
	},
	ideas: {
		kind: 'collection',
		title: 'Ideas',
		description: 'For free: great ideas, lightly used.',
		label: 'Public notebook',
		path: '/ideas',
		imageAlt: 'Ideas from the public notebook of swyx'
	},
	podcasts: {
		kind: 'audio',
		title: 'Podcasts',
		description:
			'Browse the swyx podcast feeds and listen to the complete first-party episode archives.',
		label: 'Audio home base',
		path: '/podcasts',
		imageAlt: 'Podcasts by swyx'
	},
	portfolio: {
		kind: 'portfolio',
		title: 'Advising and Investing',
		description: 'Devtools startup advising and investing by Shawn @swyx Wang.',
		label: 'Advisor / Investor',
		path: '/portfolio',
		imageAlt: 'Advising and investing portfolio of Shawn @swyx Wang'
	},
	subscribe: {
		kind: 'newsletter',
		title: 'The swyx newsletter',
		description:
			'Join 10k+ developers getting good reads, fun picks, and first looks at my work before I publish.',
		label: 'Weekly',
		path: '/subscribe',
		imageAlt: 'Subscribe to the weekly swyx newsletter'
	}
};

/**
 * @param {PageCardKey} key
 * @returns {SocialMetadata}
 */
export function getPageSocialMeta(key) {
	const card = PAGE_SOCIAL_CARDS[key];
	const documentTitles = {
		home: SITE_TITLE,
		about: `About | ${SITE_TITLE}`,
		ideas: 'Swyx Idea Showcase',
		podcasts: 'Podcasts · swyx',
		portfolio: `Portfolio | ${SITE_TITLE}`,
		subscribe: "swyx's Newsletter"
	};
	/** @type {SocialMetadata} */
	const metadata = {
		title: card.title,
		documentTitle: documentTitles[key],
		description: card.description,
		canonical: new URL(card.path, SITE_URL).href,
		image: new URL(`/og/page/${key}.png?v=${OG_DESIGN_VERSION}`, SITE_URL).href,
		imageAlt: card.imageAlt,
		type: 'website',
		twitterHandle: MY_TWITTER_HANDLE
	};
	if (key === 'home') metadata.structuredData = websiteStructuredData();
	if (key === 'about') metadata.structuredData = profilePageStructuredData();
	return metadata;
}

/**
 * @param {import('./types').ContentItem} article
 * @param {string} canonical
 * @returns {SocialMetadata}
 */
export function getArticleSocialMeta(article, canonical) {
	const updated = article.ghMetadata?.updated_at ?? article.date;
	const updatedVersion = normaliseVersionDate(updated);
	const version = `${updatedVersion}-${OG_DESIGN_VERSION}`;
	const imagePath = `/og/article/${encodeURIComponent(article.slug)}.png?v=${encodeURIComponent(version)}`;
	const normalizedCanonical = normalizeCanonical(canonical);

	/** @type {SocialMetadata} */
	const metadata = {
		title: article.title,
		documentTitle: article.title,
		description: article.description ?? '',
		canonical: normalizedCanonical,
		image: new URL(imagePath, SITE_URL).href,
		imageAlt: `Public notebook card for ${article.title}`,
		type: 'article',
		twitterHandle: MY_TWITTER_HANDLE
	};
	metadata.structuredData = articleStructuredData(article, metadata);
	return metadata;
}

/** @param {string} canonical */
function normalizeCanonical(canonical) {
	try {
		const url = new URL(canonical, SITE_URL);
		if (url.hostname === 'www.swyx.io') url.hostname = 'swyx.io';
		return url.href;
	} catch {
		return canonical;
	}
}

/** @param {Date | string} value */
function normaliseVersionDate(value) {
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.valueOf()) ? 'unversioned' : date.toISOString();
}
