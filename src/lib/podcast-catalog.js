import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
	trimValues: true
});

/**
 * @template T
 * @param {T | T[] | undefined} value
 * @returns {T[]}
 */
function asArray(value) {
	if (value === undefined) return [];
	return Array.isArray(value) ? value : [value];
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function asText(value) {
	return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatDate(value) {
	const date = new Date(asText(value));
	return Number.isNaN(date.valueOf()) ? '' : date.toISOString().slice(0, 10);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatDuration(value) {
	const text = asText(value).trim();
	if (!/^\d+$/.test(text)) return text;
	const seconds = Number(text);
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainder = seconds % 60;
	return hours
		? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
		: `${minutes}:${String(remainder).padStart(2, '0')}`;
}

/**
 * @param {string} xml
 * @param {{ slug: string, label: string, summary: string }} show
 */
export function parsePodcastFeed(xml, show) {
	const channel = parser.parse(xml)?.rss?.channel;
	if (!channel) throw new Error(`${show.slug}: podcast feed is missing its channel`);

	const imageUrl = asText(channel?.['itunes:image']?.href || channel?.image?.url);
	const episodes = asArray(channel.item).map((item) => ({
		title: asText(item.title) || 'Untitled episode',
		publishedAt: formatDate(item.pubDate),
		duration: formatDuration(item['itunes:duration']),
		audioUrl: asText(item.enclosure?.url),
		guid: asText(item.guid?.['#text'] ?? item.guid)
	}));

	return {
		...show,
		title: asText(channel.title) || show.label,
		description: asText(channel.description) || show.summary,
		imageUrl,
		feedUrl: `/podcast/${show.slug}/rss.xml`,
		episodes
	};
}
