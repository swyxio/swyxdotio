import uFuzzy from '@leeoniya/ufuzzy';
import { publicContentUrl } from '../sitemap.js';
import { COMMON_DESTINATIONS, SEARCH_TYPES, normalizeSearch } from '../site-search.js';
import { extractContentDescription } from '../content-description.js';
const fuzzy = new uFuzzy({
	intraMode: 1,
	unicode: true,
	interSplit: "[^\\p{L}\\d']+",
	intraSplit: '\\p{Ll}\\p{Lu}',
	intraBound: '\\p{L}\\d|\\d\\p{L}|\\p{Ll}\\p{Lu}',
	intraChars: "[\\p{L}\\d']",
	intraContr: "'\\p{L}{1,2}\\b"
});
/** @typedef {import('../site-search.js').SearchResult} SearchResult */
/** @param {Record<string,any>[]} items */
export function projectSearchCatalog(items, redirects = /** @type {[string,string][]} */ ([])) {
	const records = [...COMMON_DESTINATIONS];
	const seen = new Set(records.map((r) => r.url));
	for (const item of items) {
		if (item.isPrivate || !item.title) continue;
		const type =
			item.category === 'talk' ? 'talk' : item.category === 'podcast' ? 'podcast' : 'article';
		let url =
			type === 'podcast'
				? item.url
				: type === 'talk'
					? item.instances?.[0]?.video
					: item.canonical || (item.slug ? `/${item.slug}` : null);
		if (type === 'article' && item.canonical) {
			const localCanonical = publicContentUrl(/** @type {import('../types').ContentItem} */ (item));
			if (localCanonical) url = new URL(localCanonical).pathname;
		}
		// A talk without a recording may share a published article slug; otherwise it has no full page.
		if (
			type === 'talk' &&
			!url &&
			item.slug &&
			items.some(
				(x) =>
					x.slug === item.slug && x.category !== 'talk' && x.category !== 'podcast' && !x.isPrivate
			)
		)
			url = `/${item.slug}`;
		if (url) {
			try {
				const destination = new URL(url, 'https://swyx.io');
				if (!['http:', 'https:'].includes(destination.protocol)) continue;
				if (['swyx.io', 'www.swyx.io'].includes(destination.hostname))
					url = destination.pathname + destination.search + destination.hash;
			} catch {
				continue;
			}
		}

		if (url?.startsWith('/')) url = resolveSearchRedirect(url, redirects);
		if (!url || !/^(\/[^/]|\/$|https?:\/\/)/.test(url) || seen.has(url)) continue;
		seen.add(url);
		const date = new Date(item.date);
		const year = Number.isNaN(+date) || date.getFullYear() < 1900 ? '' : String(date.getFullYear());
		records.push({
			id: `${type}:${url}`,
			title: String(item.title),
			url,
			type,
			snippet: extractContentDescription(
				'',
				item.description ||
					item.desc ||
					item.decscription ||
					item.subtitle ||
					item.venues ||
					item.instances
						?.map((/** @type {any} */ x) => x.venue)
						.filter(Boolean)
						.join(' · ') ||
					''
			),
			year,
			tags: [
				...new Set(
					[
						...(Array.isArray(item.tags) ? item.tags : []),
						...(Array.isArray(item.categories) ? item.categories : [])
					]
						.map((tag) => normalizeSearch(String(tag)))
						.filter(Boolean)
				)
			]
		});
	}
	return records;
}
/** @type {{key:string,records:SearchResult[],haystack:string[]} | undefined} */
let index;
/** @param {SearchResult[]} records */
export function createSearchIndex(records) {
	return {
		records,
		haystack: records.map((r) =>
			normalizeSearch(`${r.title} ${r.url} ${r.snippet} ${r.tags.join(' ')}`)
		)
	};
}
/** @param {SearchResult[]} records */
export function cachedSearchIndex(records) {
	const key = JSON.stringify(records);
	if (!index || index.key !== key) index = { key, ...createSearchIndex(records) };
	return index;
}
/** @param {URLSearchParams} params */
export function parseSearchParams(params) {
	const q = (params.get('q') || '').trim();
	const type = params.get('type') || 'all';
	const year = params.get('year') || '';
	const tag = params.get('tag') || '';
	if (
		q.length > 120 ||
		!SEARCH_TYPES.some(([t]) => t === type) ||
		(year && !/^\d{4}$/.test(year)) ||
		tag.length > 80
	)
		throw new Error('Invalid search filters');
	const page = Number(params.get('page') || 1);
	const limit = Number(params.get('limit') || 20);
	if (
		!Number.isInteger(page) ||
		page < 1 ||
		page > 1000 ||
		!Number.isInteger(limit) ||
		limit < 1 ||
		limit > 30
	)
		throw new Error('Invalid search pagination');
	return { q, type, year, tag: normalizeSearch(tag), page, limit };
}
/** @param {ReturnType<typeof createSearchIndex>} catalog @param {ReturnType<typeof parseSearchParams>} params */
export function searchCatalog(catalog, params) {
	const { q, type, year, tag, page, limit } = params;
	const needle = normalizeSearch(q);
	let matches = catalog.records;
	if (needle) {
		const [idxs, info, order] = fuzzy.search(catalog.haystack, needle, 1, Infinity);
		matches =
			info && order
				? order.map((i) => catalog.records[info.idx[i]])
				: (idxs || []).map((i) => catalog.records[i]);
		const rank = (/** @type {SearchResult} */ r) => {
			const title = normalizeSearch(r.title);
			return title === needle ? 0 : title.startsWith(needle) ? 1 : title.includes(needle) ? 2 : 3;
		};
		matches.sort((a, b) => rank(a) - rank(b));
	}
	const years = [...new Set(catalog.records.map((r) => r.year).filter(Boolean))].sort().reverse();
	const tags = [...new Set(catalog.records.flatMap((r) => r.tags))].sort();
	matches = matches.filter(
		(r) =>
			(type === 'all' || r.type === type) &&
			(!year || r.year === year) &&
			(!tag || r.tags.includes(tag))
	);
	return {
		results: matches.slice((page - 1) * limit, page * limit),
		total: matches.length,
		years,
		tags,
		...params
	};
}

/** @param {string} source @returns {[string,string][]} */
export function parseSearchRedirects(source) {
	return source
		.split(/\r?\n/)
		.filter((line) => line.trim() && !line.trim().startsWith('#'))
		.map((line) => line.trim().split(/\s+/))
		.filter((parts) => parts.length >= 3 && /^30[1278]$/.test(parts[2]))
		.map((parts) => [parts[0], parts[1]]);
}
/** @param {string} url @param {[string,string][]} rules */
export function resolveSearchRedirect(url, rules) {
	const seen = new Set();
	for (let hop = 0; hop < 5 && !seen.has(url); hop++) {
		seen.add(url);
		const path = new URL(url, 'https://swyx.io').pathname;
		const rule = rules.find(([source]) =>
			source.endsWith('*') ? path.startsWith(source.slice(0, -1)) : path === source
		);
		if (!rule) break;
		const [source, destination] = rule;
		url = destination.replaceAll(
			':splat',
			source.endsWith('*') ? path.slice(source.length - 1) : ''
		);
		if (!url.startsWith('/')) break;
	}
	return url;
}
