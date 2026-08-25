/**
 * @typedef {{
 *   label?: string,
 *   category?: string,
 *   description?: string,
 *   keywords?: string | readonly string[]
 * }} WorkspaceCommand
 */

/**
 * @param {unknown} value
 */
function normalizeSearchText(value) {
	return typeof value === 'string'
		? value
				.normalize('NFKD')
				.replace(/\p{Diacritic}/gu, '')
				.toLowerCase()
		: '';
}

/**
 * @param {string} value
 * @param {string} token
 */
function scoreSearchText(value, token) {
	if (!value) return 0;
	if (value === token) return 100;
	if (value.startsWith(token)) return 80;
	if (value.split(/[^\p{Letter}\p{Number}]+/u).some((word) => word.startsWith(token))) {
		return 65;
	}
	if (value.includes(token)) return 45;
	if (token.length < 2) return 0;

	let tokenIndex = 0;
	for (const character of value) {
		if (character === token[tokenIndex]) tokenIndex += 1;
		if (tokenIndex === token.length) return 15;
	}

	return 0;
}

/**
 * Search components, presets, pages, and actions without changing their objects.
 * Every query token must match somewhere, while direct label matches rank first.
 * An empty query keeps the caller's meaningful default or recent-items order.
 *
 * @template {WorkspaceCommand} T
 * @param {readonly T[]} commands
 * @param {string} query
 * @param {{ limit?: number }} [options]
 * @returns {T[]}
 */
export function searchWorkspaceCommands(commands, query, { limit = 24 } = {}) {
	const resultLimit = Math.max(0, limit);
	const tokens = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
	if (tokens.length === 0) return commands.slice(0, resultLimit);

	return commands
		.map((command, index) => {
			const label = normalizeSearchText(command.label);
			const category = normalizeSearchText(command.category);
			const description = normalizeSearchText(command.description);
			const keywords = Array.isArray(command.keywords)
				? command.keywords.map(normalizeSearchText)
				: [normalizeSearchText(command.keywords)];

			let score = 0;
			for (const token of tokens) {
				const tokenScore = Math.max(
					scoreSearchText(label, token) * 4,
					scoreSearchText(category, token) * 2,
					...keywords.map((keyword) => scoreSearchText(keyword, token) * 2),
					scoreSearchText(description, token)
				);
				if (!tokenScore) return null;
				score += tokenScore;
			}

			return { command, index, score };
		})
		.filter((result) => result !== null)
		.sort((left, right) => right.score - left.score || left.index - right.index)
		.slice(0, resultLimit)
		.map(({ command }) => command);
}

/**
 * @param {string | number | undefined} updatedAt
 */
function drawingPageTimestamp(updatedAt) {
	if (typeof updatedAt === 'number') {
		return Number.isFinite(updatedAt) ? updatedAt : Number.NEGATIVE_INFINITY;
	}
	if (typeof updatedAt !== 'string' || updatedAt.trim() === '') {
		return Number.NEGATIVE_INFINITY;
	}

	const numericTimestamp = Number(updatedAt);
	const timestamp = Number.isFinite(numericTimestamp) ? numericTimestamp : Date.parse(updatedAt);
	return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

/**
 * Keep the drawing currently in view easy to find, followed by recently edited
 * drawings. Missing timestamps retain their previous relative positions.
 *
 * @template {{ id: string, updatedAt?: string | number }} T
 * @param {readonly T[]} pages
 * @param {string | null | undefined} activePageId
 * @returns {T[]}
 */
export function orderRecentDrawingPages(pages, activePageId) {
	return pages
		.map((page, index) => ({ page, index, timestamp: drawingPageTimestamp(page.updatedAt) }))
		.sort((left, right) => {
			const activeDifference =
				Number(right.page.id === activePageId) - Number(left.page.id === activePageId);
			if (activeDifference) return activeDifference;
			if (left.timestamp !== right.timestamp) return right.timestamp - left.timestamp;
			return left.index - right.index;
		})
		.map(({ page }) => page);
}
