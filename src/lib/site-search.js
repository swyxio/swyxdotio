import { PAGE_SOCIAL_CARDS } from './social-meta.js';
/** @typedef {{id:string,title:string,url:string,type:string,snippet:string,year:string,tags:string[]}} SearchResult */
export const SEARCH_TYPES = [
	['all', 'Everything'],
	['page', 'Pages'],
	['article', 'Writing'],
	['talk', 'Talks'],
	['podcast', 'Podcasts']
];
/** @type {SearchResult[]} */
export const COMMON_DESTINATIONS = Object.entries(PAGE_SOCIAL_CARDS).map(([key, page]) => ({
	id: `page:${key}`,
	title:
		key === 'home'
			? 'Home'
			: key === 'ideas'
				? 'Writing'
				: key === 'portfolio'
					? 'Investing & portfolio'
					: key === 'subscribe'
						? 'Subscribe'
						: page.title,
	url: page.path,
	type: 'page',
	snippet: page.description,
	year: '',
	tags: []
}));
/** @param {string} text */
export const normalizeSearch = (text) =>
	text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
/** @param {string} query @param {string} [type] */
export function commonMatches(query, type = 'all') {
	const q = normalizeSearch(query);
	return COMMON_DESTINATIONS.filter(
		(item) =>
			(type === 'all' || item.type === type) &&
			normalizeSearch(`${item.title} ${item.snippet}`).includes(q)
	);
}
/** @param {string} q @param {string} [type] */
export function searchUrl(q, type = 'all') {
	const params = new URLSearchParams({ q });
	if (type !== 'all') params.set('type', type);
	return `/search?${params}`;
}
