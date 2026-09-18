import { Marked } from 'marked';
import { headingIds } from './heading-ids.js';
import { ideasPlainText } from './ideas-search-snippet.js';

/** Rendered heading IDs match the article, including nested and duplicate headings.
 * @param {string} markdown
 * @returns {{text:string,heading:string,anchor:string}[]}
 */
export function searchPassages(markdown) {
	const parser = new Marked({ gfm: true });
	parser.use(headingIds());
	const html = /** @type {string} */ (parser.parse(markdown));
	const headings = [...html.matchAll(/<h([1-6]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)];
	const passages = [];
	let heading = '',
		anchor = '',
		start = 0;
	for (const h of [...headings, null]) {
		const text = ideasPlainText(html.slice(start, h?.index ?? html.length));
		const words = text.split(/\s+/).filter(Boolean);
		for (let offset = 0; offset < words.length; offset += 180) {
			passages.push({ text: words.slice(offset, offset + 210).join(' '), heading, anchor });
		}
		if (h) {
			heading = ideasPlainText(h[3]);
			anchor = h[2];
			start = (h.index ?? 0) + h[0].length;
		}
	}
	return passages;
}
