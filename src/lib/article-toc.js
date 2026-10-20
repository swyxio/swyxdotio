import { parseFragment } from 'parse5';

/**
 * Check the rendered article body for a TOC heading before sending the page.
 * Use the same heading and ignore rules as the client-side TOC. The article's
 * title is a separate heading, so one matching body heading is enough.
 * @param {string} html
 */
export function hasArticleSections(html) {
	/** @type {import('parse5').DefaultTreeAdapterTypes.Node[]} */
	const nodes = [parseFragment(html)];
	while (nodes.length) {
		const node = nodes.pop();
		if (!node) break;
		if ('tagName' in node && /^h[123]$/.test(node.tagName)) {
			const id = node.attrs.find((attribute) => attribute.name === 'id')?.value;
			if (
				id !== 'table-of-contents' &&
				!node.attrs.some((attribute) => attribute.name === 'data-toc-ignore')
			) {
				return true;
			}
		}
		if ('childNodes' in node) nodes.push(...node.childNodes);
	}
	return false;
}
