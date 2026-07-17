import { SITE_TITLE, SITE_URL } from './siteConfig.js';

const PERSON_ID = `${SITE_URL}/about#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;

const PERSON_SAME_AS = [
	'https://x.com/swyx',
	'https://github.com/swyxio',
	'https://www.youtube.com/@swyxTV'
];

export function personStructuredData() {
	return {
		'@type': 'Person',
		'@id': PERSON_ID,
		name: 'Shawn Wang',
		alternateName: 'swyx',
		url: `${SITE_URL}/about`,
		image: `${SITE_URL}/swyx.jpg`,
		sameAs: PERSON_SAME_AS,
		jobTitle: 'Writer, Founder, and Devtools Startup Advisor'
	};
}

export function websiteStructuredData() {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		'@id': WEBSITE_ID,
		url: `${SITE_URL}/`,
		name: SITE_TITLE,
		description: 'The personal site and public notebook of Shawn @swyx Wang.',
		author: personStructuredData()
	};
}

export function profilePageStructuredData() {
	return {
		'@context': 'https://schema.org',
		'@type': 'ProfilePage',
		'@id': `${SITE_URL}/about#profile`,
		url: `${SITE_URL}/about`,
		name: 'About swyx',
		isPartOf: { '@id': WEBSITE_ID },
		mainEntity: personStructuredData()
	};
}

/**
 * @param {import('./types').ContentItem} article
 * @param {import('./social-meta').SocialMetadata} social
 */
export function articleStructuredData(article, social) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		'@id': `${social.canonical}#article`,
		mainEntityOfPage: social.canonical,
		headline: article.title,
		description: social.description,
		image: social.image,
		datePublished: toIsoDate(article.date),
		dateModified: toIsoDate(article.ghMetadata?.updated_at ?? article.date),
		author: personStructuredData(),
		isPartOf: { '@id': WEBSITE_ID }
	};
}

/** @param {Date | string} value */
function toIsoDate(value) {
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}
