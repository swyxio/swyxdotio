export const MIN_SHARE_QUOTE_LENGTH = 12;
export const MAX_SHARE_QUOTE_LENGTH = 220;

const IGNORED_SELECTOR =
	'input, textarea, [contenteditable]:not([contenteditable="false"]), nav, footer';

/** @param {string} value */
export function normalizeShareQuote(value) {
	return String(value || '')
		.replace(/\s+/g, ' ')
		.trim();
}

/** @param {string} value */
export function truncateShareQuote(value) {
	const normalized = normalizeShareQuote(value);
	if (normalized.length <= MAX_SHARE_QUOTE_LENGTH) return normalized;

	const candidate = normalized.slice(0, MAX_SHARE_QUOTE_LENGTH - 1);
	const lastSpace = candidate.lastIndexOf(' ');
	const cleanEnd =
		lastSpace >= Math.floor(MAX_SHARE_QUOTE_LENGTH * 0.72)
			? candidate.slice(0, lastSpace)
			: candidate;
	return `${cleanEnd.replace(/[\s,;:\-–—]+$/u, '')}…`;
}

/** @param {string} value */
export function isShareableQuote(value) {
	return normalizeShareQuote(value).length >= MIN_SHARE_QUOTE_LENGTH;
}

/** @param {Node | null | undefined} node */
function elementForNode(node) {
	if (!node) return null;
	return node.nodeType === 1 ? /** @type {Element} */ (node) : node.parentElement;
}

/**
 * Selected text is intentionally inspected only in the browser and is never
 * included in presence events or network requests.
 * @param {Selection | null} selection
 * @param {Document} documentRef
 */
export function getEligibleSelection(selection, documentRef) {
	if (!selection || selection.isCollapsed || selection.rangeCount < 1) return null;
	const quote = truncateShareQuote(selection.toString());
	if (!isShareableQuote(quote)) return null;

	const main = documentRef.querySelector('main');
	if (!main) return null;
	const range = selection.getRangeAt(0);
	const start = elementForNode(range.startContainer);
	const end = elementForNode(range.endContainer);
	if (!start || !end || !main.contains(start) || !main.contains(end)) return null;
	if (start.closest(IGNORED_SELECTOR) || end.closest(IGNORED_SELECTOR)) return null;

	const rect = range.getBoundingClientRect();
	if (!rect || (!rect.width && !rect.height)) return null;
	return { quote, rect };
}

/** @param {Document} documentRef */
export function canonicalShareUrl(documentRef) {
	const canonical = documentRef.querySelector('link[rel="canonical"]')?.getAttribute('href');
	try {
		return new URL(canonical || documentRef.location.href, documentRef.location.href).href;
	} catch {
		return documentRef.location.href;
	}
}

/**
 * @param {{ quote?: string; title: string; url: string }} input
 */
export function buildSharePayload({ quote = '', title, url }) {
	const cleanQuote = quote ? truncateShareQuote(quote) : '';
	const cleanTitle = normalizeShareQuote(title);
	const text = cleanQuote ? `“${cleanQuote}”\n\n— ${cleanTitle}` : cleanTitle;
	const copyText = `${text}\n${url}`;
	const xIntent = new URL('https://twitter.com/intent/tweet');
	xIntent.searchParams.set('text', text);
	xIntent.searchParams.set('url', url);

	return {
		title: cleanTitle,
		text,
		url,
		copyText,
		xIntent: xIntent.href
	};
}
