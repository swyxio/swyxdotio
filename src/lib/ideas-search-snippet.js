import { Lexer } from 'marked';

/** @typedef {{ text: string; matched: boolean }} SearchSnippetPart */

/**
 * @param {import('marked').Token[]} tokens
 * @returns {string}
 */
function tokenText(tokens) {
	return tokens
		.map((token) => {
			if (token.type === 'html') return String(token.text).replace(/<[^>]*>/g, ' ');
			if (token.type === 'image' || token.type === 'def') return '';
			if (token.type === 'list') {
				const list = /** @type {import('marked').Tokens.List} */ (token);
				return list.items.map((item) => tokenText(item.tokens)).join(' ');
			}
			if (token.type === 'table') {
				const table = /** @type {import('marked').Tokens.Table} */ (token);
				return [table.header, ...table.rows]
					.map((row) => row.map((cell) => tokenText(cell.tokens)).join(' '))
					.join(' ');
			}
			const text =
				'tokens' in token && token.tokens
					? tokenText(token.tokens)
					: 'text' in token
						? String(token.text)
						: ' ';
			return ['heading', 'paragraph', 'blockquote', 'code'].includes(token.type)
				? `${text} `
				: text;
		})
		.join('');
}

/** @type {Record<string, string>} */
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/**
 * @param {string} entity
 * @param {string} name
 */
function decodeEntity(entity, name) {
	if (name.startsWith('#')) {
		const code = /^#x/i.test(name)
			? Number.parseInt(name.slice(2), 16)
			: Number.parseInt(name.slice(1), 10);
		return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
	}
	return entities[name.toLowerCase()] ?? entity;
}

/** Plain text only: callers render text nodes, never the output as HTML.
 * @param {string} markdown
 */
export function ideasPlainText(markdown) {
	const source = markdown.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
	return tokenText(Lexer.lex(source))
		.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, decodeEntity)
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Keep the matching passage readable without trusting search-generated markup.
 * @param {string} markdown
 * @param {string} query
 * @param {number} [length]
 * @returns {SearchSnippetPart[]}
 */
export function createIdeasSearchSnippet(markdown, query, length = 220) {
	const text = ideasPlainText(markdown);
	if (!text) return [];
	const terms = [...new Set(query.trim().split(/\s+/).filter(Boolean))].sort(
		(a, b) => b.length - a.length
	);
	const pattern = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
	const firstMatch = pattern ? text.search(new RegExp(pattern, 'i')) : -1;
	let start = Math.max(0, firstMatch - 65);
	if (start > 0) {
		const nextSpace = text.indexOf(' ', start);
		if (nextSpace !== -1 && nextSpace < firstMatch) start = nextSpace + 1;
	}
	let end = Math.min(text.length, start + length);
	if (end < text.length) {
		const lastSpace = text.lastIndexOf(' ', end);
		if (lastSpace > start) end = lastSpace;
	}
	const excerpt = `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
	if (!pattern) return [{ text: excerpt, matched: false }];

	/** @type {SearchSnippetPart[]} */
	const parts = [];
	let position = 0;
	for (const match of excerpt.matchAll(new RegExp(pattern, 'gi'))) {
		const index = match.index ?? 0;
		if (index > position) parts.push({ text: excerpt.slice(position, index), matched: false });
		parts.push({ text: match[0], matched: true });
		position = index + match[0].length;
	}
	if (position < excerpt.length) parts.push({ text: excerpt.slice(position), matched: false });
	return parts;
}
