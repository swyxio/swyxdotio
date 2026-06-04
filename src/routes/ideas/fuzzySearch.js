import uFuzzy from '@leeoniya/ufuzzy';

/** @typedef {import('$lib/types').ContentItem & { highlightedResults?: string }} SearchContentItem */

// https://github.com/leeoniya/uFuzzy#options
const u = new uFuzzy({ intraMode: 1 });

// debounce async function returning a promise
// https://dev.to/gabe_ragland/debouncing-with-async-await-in-js-26ci
/**
 * @param {(items: SearchContentItem[], selectedCategories: string[] | null, search: string | null) => SearchContentItem[]} func
 * @param {number} wait
 * @returns {(items: SearchContentItem[], selectedCategories: string[] | null, search: string | null) => Promise<SearchContentItem[]>}
 */
function debounce(func, wait) {
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timeout;
	return (...args) => {
		return new Promise((resolve) => {
			const later = () => {
				timeout = undefined;
				resolve(func(...args));
			};
			const callNow = !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) resolve(func(...args));
		});
	};
}

/**
 * @param {SearchContentItem[]} items
 * @param {string[] | null} selectedCategories
 * @param {string | null} search
 * @returns {SearchContentItem[]}
 */
function _fuzzySearch(items, selectedCategories, search) {
	let filteredItems = items;
	if (selectedCategories?.length) {
		filteredItems = items.filter((item) => {
			return selectedCategories
				.map((element) => {
					return element.toLowerCase();
				})
				.includes(item.category.toLowerCase());
		});
	}
	if (search) {
		const haystack = filteredItems.map((v) =>
			[
				v.title,
				v.subtitle,
				v.slug,
				v.venues,
				v.tags?.map((tag) => 'hashtag-' + tag), // add #tag so as to enable tag search
				v.content,
				v.description || v.desc
			]
				.filter(Boolean)
				.join(' ')
		);
		const idxs = u.filter(haystack, search);
		if (!idxs) return [];
		const info = u.info(idxs, haystack, search);
		const order = u.sort(info, haystack, search);
		/**
		 * @param {string} part
		 * @param {boolean} matched
		 */
		const mark = (part, matched) =>
			matched
				? '<b style="color:var(--brand-accent);background-color:darkblue">' + part + '</b>'
				: part;
		const list = order.map((i) => {
			const x = filteredItems[info.idx[order[i]]];
			const hl = uFuzzy
				.highlight(
					haystack[info.idx[order[i]]]
						// sanitize html as we dont actually want to render it
						.replaceAll('<', ' ')
						.replaceAll('/>', '  ')
						.replaceAll('>', ' '),
					info.ranges[order[i]],
					mark
				)
				// highlight whats left
				.slice(
					Math.max(info.ranges[order[i]][0] - 200, 0),
					Math.min(info.ranges[order[i]][1] + 200, haystack[info.idx[order[i]]].length)
				)
				// slice clean words
				.split(' ')
				.slice(1, -1)
				.join(' ');
			return { ...x, highlightedResults: hl };
		});
		return list;
	} else {
		return filteredItems;
	}
}

/**
 * @param {SearchContentItem[]} items
 * @param {string[] | null} selectedCategories
 * @param {string | null} search
 * @returns {Promise<SearchContentItem[]>}
 */
export function fuzzySearch(items, selectedCategories, search) {
	return debounce(_fuzzySearch, 100)(items, selectedCategories, search);
}
