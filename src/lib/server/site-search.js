import { searchTerms } from '../search-terms.js';
import { create, insert, search as bm25Search } from '@orama/orama';
import { publicContentUrl } from '../sitemap.js';
import { COMMON_DESTINATIONS, SEARCH_TYPES, normalizeSearch } from '../site-search.js';
import { extractContentDescription } from '../content-description.js';
import { searchPassages } from '../search-passages.js';
import { createIdeasSearchSnippet } from '../ideas-search-snippet.js';
/** @typedef {import('../site-search.js').SearchResult} SearchResult */
/** @param {Record<string,any>[]} items */
export function projectSearchCatalog(items, redirects = /** @type {[string,string][]} */ ([])) {
	const records = COMMON_DESTINATIONS.map((r) => ({
		...r,
		source: 'swyx.io',
		category: 'page',
		slug: '',
		date: ''
	}));
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
			slug: item.slug || '',
			category: String(item.category || 'note').toLowerCase(),
			date: Number.isNaN(+date) ? '' : date.toISOString(),
			source: new URL(url, 'https://swyx.io').hostname.replace(/^www\./, ''),
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
/** @type {ReturnType<typeof createSearchIndex> & {key:string} | undefined} */
let index;
/** @param {SearchResult[]} records @param {Record<string,any>[]} [items] */
export function createSearchIndex(records, items = []) {
	const engine = create({
		schema: {
			title: 'string',
			heading: 'string',
			body: 'string',
			topics: 'string',
			path: 'string'
		},
		components: {
			tokenizer: {
				language: 'english',
				tokenize: (text) => normalizeSearch(text).match(/[\p{L}\p{N}]+/gu) || []
			}
		}
	});
	/** @type {{id:string,record:SearchResult,text:string,heading:string,anchor:string}[]} */
	const passages = [];
	for (const record of records) {
		const item =
			record.type === 'article'
				? items.find(
						(item) =>
							!item.isPrivate &&
							item.category !== 'talk' &&
							item.category !== 'podcast' &&
							item.slug === record.slug
					)
				: null;
		const body = item?.content ? searchPassages(item.content) : [];
		for (const passage of [{ text: record.snippet, heading: '', anchor: '' }, ...body]) {
			const id = String(passages.length);
			passages.push({ id, record, ...passage });
			insert(engine, {
				id,
				title: record.title,
				heading: passage.heading,
				body: passage.text,
				topics: record.tags.join(' '),
				path: record.url
			});
		}
	}
	return { records, engine, passages };
}
/** @param {SearchResult[]} records @param {Record<string,any>[]} [items] */
export function cachedSearchIndex(records, items = []) {
	const key = JSON.stringify([
		records,
		items.filter((i) => !i.isPrivate).map((i) => [i.slug, i.content])
	]);
	if (!index || index.key !== key) index = { key, ...createSearchIndex(records, items) };
	return index;
}
/** @param {URLSearchParams} params */
export function parseSearchParams(params) {
	const q = (params.get('q') || '').trim();
	const type = params.get('type') || 'all';
	const year = params.get('year') || '';
	const tag = params.get('tag') || '';
	const source = (params.get('source') || '').toLowerCase();
	const categories = (params.get('categories') || '').toLowerCase().split(',').filter(Boolean);
	const scope = params.get('scope') || 'all';
	if (
		q.length > 120 ||
		!SEARCH_TYPES.some(([t]) => t === type) ||
		(year && !/^\d{4}$/.test(year)) ||
		tag.length > 80 ||
		source.length > 100 ||
		categories.length > 8 ||
		categories.some((c) => !/^[a-z]+$/.test(c)) ||
		!['all', 'content'].includes(scope)
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
		limit > 100
	)
		throw new Error('Invalid search pagination');
	return { q, type, year, tag: normalizeSearch(tag), source, categories, scope, page, limit };
}
/** @param {ReturnType<typeof createSearchIndex>} catalog @param {ReturnType<typeof parseSearchParams>} params */
export function searchCatalog(
	catalog,
	params,
	semantic = /** @type {{id:string,score:number}[]|null} */ (null)
) {
	const { q, type, year, tag, source, categories, scope, page, limit } = params;
	const needle = normalizeSearch(q);
	/** @param {SearchResult} r */
	const selected = (r) =>
		(type === 'all' || r.type === type) &&
		(!year || r.year === year) &&
		(!tag || r.tags.includes(tag)) &&
		(!categories.length || categories.includes(r.category || '')) &&
		(scope !== 'content' || r.type !== 'page');
	/** @type {Map<string, SearchResult & {score:number}>} */
	const ranked = new Map();
	if (needle) {
		// This engine has no asynchronous plugins or hooks.
		let found = /** @type {import('@orama/orama').Results<any>} */ (
			bm25Search(catalog.engine, {
				term: searchTerms(needle).join(' '),
				properties: ['title', 'heading', 'body', 'topics', 'path'],
				boost: { title: 10, heading: 4, topics: 3, body: 1, path: 1 },
				tolerance: 0,
				threshold: 0,
				limit: catalog.passages.length
			})
		);
		if (!found.hits.length && needle.length > 4 && searchTerms(needle).length <= 3)
			found = /** @type {import('@orama/orama').Results<any>} */ (
				bm25Search(catalog.engine, {
					term: searchTerms(needle).join(' '),
					properties: ['title', 'heading', 'body', 'topics', 'path'],
					boost: { title: 10, heading: 4, topics: 3, body: 1, path: 1 },
					tolerance: 2,
					threshold: 0,
					limit: catalog.passages.length
				})
			);
		// Reciprocal rank fusion makes BM25 and cosine ranks comparable. Count each
		// article once per retrieval list so long articles cannot overwhelm the ranking.

		/** @param {{id:string,score:number}[]} hits */
		const uniqueDocuments = (hits) => {
			const seen = new Set();
			return hits.filter((hit) => {
				const id = catalog.passages[Number(hit.id)].record.id;
				if (seen.has(id)) return false;
				seen.add(id);
				return true;
			});
		};
		const lexical = uniqueDocuments(found.hits);
		const semanticUnique = uniqueDocuments(semantic || []);

		const fused = new Map();
		lexical.forEach((h, i) =>
			fused.set(catalog.passages[Number(h.id)].record.id, 1 / (60 + i + 1))
		);
		semanticUnique.forEach((h, i) => {
			const id = catalog.passages[Number(h.id)].record.id;
			fused.set(id, (fused.get(id) || 0) + 1 / (60 + i + 1));
		});
		const hits = semantic ? [...semanticUnique, ...lexical] : found.hits;
		for (const hit of hits) {
			const passage = catalog.passages[Number(hit.id)],
				record = passage.record;
			if (!selected(record) || ranked.has(record.id)) continue;
			const snippetParts = createIdeasSearchSnippet(passage.text, q);
			const url =
				passage.anchor && record.url.startsWith('/')
					? record.url.split('#')[0] + '#' + passage.anchor
					: record.url;
			ranked.set(record.id, {
				...record,
				url,
				snippet: snippetParts.map((p) => p.text).join(''),
				snippetParts,
				section: passage.heading,
				score: semantic ? fused.get(record.id) || 0 : hit.score
			});
		}
	}
	let matches = needle ? [...ranked.values()] : catalog.records.filter(selected);
	/** @param {SearchResult} r */
	const rank = (r) => {
		const title = normalizeSearch(r.title);
		return title === needle ? 0 : title.startsWith(needle) ? 1 : 2;
	};
	if (needle)
		matches.sort(
			(a, b) =>
				rank(a) - rank(b) ||
				('score' in b ? Number(b.score) : 0) - ('score' in a ? Number(a.score) : 0) ||
				String(b.date || '').localeCompare(String(a.date || ''))
		);
	// Counts describe this query with all the other active filters applied.
	const domains = [
		...new Set(catalog.records.map((r) => r.source).filter((s) => typeof s === 'string'))
	];
	const sourceCounts = Object.fromEntries(
		domains.map((s) => [s, matches.filter((r) => r.source === s).length])
	);
	const sources = domains
		.filter((s) => sourceCounts[s] || s === source)
		.sort((a, b) => sourceCounts[b] - sourceCounts[a] || a.localeCompare(b));
	matches = matches.filter((r) => !source || r.source === source);
	return {
		results: matches.slice((page - 1) * limit, page * limit),
		total: matches.length,
		years: [...new Set(catalog.records.map((r) => r.year).filter(Boolean))].sort().reverse(),
		tags: [...new Set(catalog.records.flatMap((r) => r.tags))].sort(),
		sources,
		sourceCounts,
		mode: semantic ? 'hybrid' : 'bm25',
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
