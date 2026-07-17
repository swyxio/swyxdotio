const META_DESCRIPTION_MAX_LENGTH = 180;

/**
 * Produce a compact plain-text description from frontmatter or the first
 * meaningful prose line in a Markdown document.
 *
 * @param {string} content
 * @param {unknown} suppliedDescription
 * @param {number} [maxLength]
 * @returns {string}
 */
export function extractContentDescription(
	content,
	suppliedDescription,
	maxLength = META_DESCRIPTION_MAX_LENGTH
) {
	const candidates =
		typeof suppliedDescription === 'string'
			? [suppliedDescription]
			: content.split(/\r?\n/).filter(isProseCandidate);

	for (const candidate of candidates) {
		const plainText = markdownToPlainText(candidate);
		if (plainText) return truncateAtWord(plainText, maxLength);
	}

	return '';
}

/** @param {string} line */
function isProseCandidate(line) {
	const trimmed = line.trim();
	if (!trimmed) return false;
	if (/^(?:```|~~~|---+$|\*\*\*+$|___+$|#{1,6}\s)/.test(trimmed)) return false;
	if (/^!\[[^\]]*\]\([^)]*\)$/.test(trimmed)) return false;
	if (/^\[[^\]]+\]:\s*\S+/.test(trimmed)) return false;
	if (/^\{%.+%\}$/.test(trimmed)) return false;
	if (/^<[^>]+>$/.test(trimmed)) return false;
	return true;
}

/** @param {string} text */
function markdownToPlainText(text) {
	return decodeHtmlEntities(text)
		.replace(/^\s*(?:>\s*)+/, '')
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/<[^>]*>?/g, '')
		.replace(/[*_`~]/g, '')
		.replace(/^\s*(?:[-+]|\d+\.)\s+/, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Decode the small HTML-entity surface that can arrive from legacy article
 * metadata. Card templates still sanitize the result before rendering.
 * @param {string} text
 */
export function decodeHtmlEntities(text) {
	const named = { amp: '&', apos: "'", gt: '>', lt: '<', quot: '"' };
	return text.replace(/&(?:#(\d+)|#x([\da-f]+)|(amp|apos|gt|lt|quot));/gi, (match, decimal, hex, name) => {
		if (name) return named[/** @type {keyof typeof named} */ (name.toLowerCase())];
		const codePoint = Number.parseInt(decimal || hex, hex ? 16 : 10);
		if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
		try {
			return String.fromCodePoint(codePoint);
		} catch {
			return match;
		}
	});
}

/**
 * @param {string} text
 * @param {number} maxLength
 */
function truncateAtWord(text, maxLength) {
	if (text.length <= maxLength) return text;
	const shortened = text
		.slice(0, Math.max(0, maxLength - 1))
		.replace(/\s+\S*$/, '')
		.trimEnd();
	return `${shortened || text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
