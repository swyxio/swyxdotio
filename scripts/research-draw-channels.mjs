/**
 * Read-only public YouTube research; no cookies, login, API key, media download,
 * inference or publication. Run explicitly with Node 22+ to refresh the local
 * catalog. The public web response schema is not a supported API: fail closed
 * when its sort chips or channel identities change.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const output = new URL('../src/lib/draw-reference-catalog.json', import.meta.url);
const definitions = [
	{
		slug: 'dwarkesh-patel',
		handle: '@DwarkeshPatel',
		id: 'UCXl4i9dYBrFOabk0xGmbkRA',
		sources: ['https://www.dwarkesh.com/about'],
		note: 'Official podcast channel. Videos may include shorter excerpts alongside full interviews.'
	},
	{
		slug: 'matthew-berman',
		handle: '@matthew_berman',
		id: 'UCawZsQWqfGSbCI5yjkdVkTA',
		sources: ['https://forwardfuture.com/'],
		note: 'The AI creator linked from Forward Future. The similarly named @MatthewBerman is a different channel and is excluded.'
	},
	{
		slug: 'matt-pocock',
		handle: '@mattpocockuk',
		id: 'UCswG6FSbgZjbWtdf_hMLaow',
		sources: ['https://www.mattpocock.com/youtube'],
		note: 'AI/software channel linked by mattpocock.com. His separate @MattPocock voice/accent channel is excluded.'
	},
	{
		slug: 'ai-engineer',
		handle: '@aiDotEngineer',
		id: 'UCLKPca3kwwd-B59HNr-_lvA',
		sources: ['https://ai.engineer/'],
		note: 'Official AI Engineer conference channel. Observed examples are not an approved event-specific thumbnail kit.'
	},
	{
		slug: 'latent-space',
		handle: '@LatentSpacePod',
		id: 'UCxBcwypKK-W3GHd_RZ9FZrQ',
		sources: ['https://www.youtube.com/@LatentSpaceTV'],
		note: 'Podcast channel. The separate Latent Space TV channel explicitly directs podcast viewers to @LatentSpacePod; its community livestreams are excluded.'
	},
	{
		slug: 'theo',
		handle: '@t3dotgg',
		id: 'UCbRP3c757lWg9M-U7TyEkXA',
		sources: ['https://t3.gg/'],
		note: 'Main Theo channel linked from t3.gg. Separate rant, throwaway and clip channels are excluded.'
	},
	{
		slug: 'theprimeagen',
		handle: '@ThePrimeagen',
		id: 'UC8ENHE5xdFSwx71u3fDH5Xw',
		sources: ['https://github.com/ThePrimeagen'],
		note: 'ThePrimeagen main channel, not the separately linked The PrimeTime (@ThePrimeTimeagen, UCUyeluBRhGPCW4rPe_UvBZQ). Do not combine their rankings.'
	}
];

/** @param {unknown} value @param {string} key @returns {any[]} */
function find(value, key) {
	if (Array.isArray(value)) return value.flatMap((item) => find(item, key));
	if (!value || typeof value !== 'object') return [];
	const record = /** @type {Record<string,unknown>} */ (value);
	return [
		...(key in record ? [record[key]] : []),
		...Object.values(record).flatMap((item) => find(item, key))
	];
}

/** @param {string} html @param {RegExp} pattern */
function embeddedJson(html, pattern) {
	const encoded = pattern.exec(html)?.[1];
	if (!encoded) throw new Error('Public page JSON is unavailable.');
	return JSON.parse(encoded);
}

/** Fixed public read endpoints only. @param {string} url @param {Record<string,unknown>} [body] */
async function publicRead(url, body) {
	const target = new URL(url);
	if (target.hostname !== 'www.youtube.com' || target.protocol !== 'https:')
		throw new Error('Only public YouTube reads are allowed.');
	if (body && target.pathname !== '/youtubei/v1/browse')
		throw new Error('Only public browse POSTs are allowed.');
	const response = await fetch(target, {
		headers: {
			'Accept-Language': 'en-US,en;q=0.9',
			...(body ? { 'Content-Type': 'application/json' } : {})
		},
		...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
		redirect: 'error',
		signal: AbortSignal.timeout(25_000)
	});
	if (!response.ok) throw new Error(`Public YouTube returned HTTP ${response.status}.`);
	return response.text();
}

/** Only the selected Videos tab / its replacement grid, never a channel home carousel. @param {any} data */
function selectedGrid(data) {
	const tab = find(data, 'tabRenderer').find((item) => item.selected);
	if (tab && tab.title !== 'Videos') throw new Error('The selected channel tab is not Videos.');
	const grids = find(tab?.content ?? data, 'richGridRenderer');
	const grid =
		grids[0] ??
		find(data, 'reloadContinuationItemsCommand').find(
			(item) => find(item, 'lockupViewModel').length
		);
	if (!grid) throw new Error('The public Videos grid is unavailable.');
	return grid;
}

/** @param {any} data @param {'Latest'|'Popular'} label @param {any} context */
async function sortedGrid(data, label, context) {
	const chips = find(data, 'chipViewModel');
	const chip = chips.find((item) => item.text === label);
	const dropdown = find(data, 'listItemViewModel').find(
		(item) => item.title?.content === label && item.entityKey === `:${label}`
	);
	if (!chip && !dropdown) throw new Error(`${label} sort control unavailable.`);
	if (chip?.selected || dropdown?.isSelected)
		return {
			data: selectedGrid(data),
			proof: `${label} sort control selected in public Videos page`
		};
	const command =
		chip?.tapCommand?.innertubeCommand ??
		find(dropdown, 'commands')
			.flat()
			.find((item) => item.continuationCommand);
	if (
		command?.commandMetadata?.webCommandMetadata?.apiUrl !== '/youtubei/v1/browse' ||
		typeof command.continuationCommand?.token !== 'string'
	)
		throw new Error(`${label} public browse continuation unavailable.`);
	const raw = await publicRead('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', {
		context,
		continuation: command.continuationCommand.token
	});
	const result = JSON.parse(raw);
	return {
		data: selectedGrid(result),
		proof: `${label} chip public browse response SHA256 ${createHash('sha256').update(raw).digest('hex')}`
	};
}

/** @param {any} grid @param {string} channelId @param {string} sourceUrl @param {string} retrievedAt */
function examplesFrom(grid, channelId, sourceUrl, retrievedAt) {
	const videos = find(grid, 'lockupViewModel').filter(
		(item) => item.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO'
	);
	const unique = [...new Map(videos.map((item) => [item.contentId, item])).values()].slice(0, 5);
	return unique.map((video) => {
		const id = video.contentId;
		const metadata = video.metadata?.lockupMetadataViewModel;
		const title = metadata?.title?.content;
		const thumbnails = video.contentImage?.thumbnailViewModel?.image?.sources ?? [];
		const thumbnail = [...thumbnails]
			.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
			.find((item) => /^https:\/\/i\.ytimg\.com\//.test(item.url));
		if (!/^[A-Za-z0-9_-]{11}$/.test(id) || typeof title !== 'string' || !thumbnail)
			throw new Error('Video metadata is incomplete.');
		const parts = find(metadata?.metadata, 'metadataParts').flat();
		const view = parts.find(
			(part) =>
				part.leadingIcon?.name === 'PLAY_ARROW_OUTLINED' ||
				/views?$/.test(part.accessibilityLabel ?? part.text?.content ?? '')
		);
		const published = parts.find((part) =>
			/ago$/.test(part.accessibilityLabel ?? part.text?.content ?? '')
		);
		const duration = find(video.contentImage, 'thumbnailBadgeViewModel').find((badge) =>
			/^[0-9:]+$/.test(badge.text ?? '')
		)?.text;
		return {
			id: `yt-${id}`,
			videoId: id,
			channelId,
			title,
			url: `https://www.youtube.com/watch?v=${id}`,
			thumbnailUrl: thumbnail.url,
			...(published
				? { publishedLabel: published.accessibilityLabel ?? published.text.content }
				: {}),
			...(view ? { viewLabel: view.accessibilityLabel ?? view.text.content } : {}),
			...(duration ? { duration } : {}),
			sourceUrl,
			retrievedAt
		};
	});
}

const prior = JSON.parse(await readFile(output, 'utf8'));
/** @type {any[]} */
const channels = [];
/** @type {Map<string,any>} */
const examples = new Map();
const retrievedAt = new Date().toISOString();
for (const definition of definitions) {
	const url = `https://www.youtube.com/${definition.handle}`;
	const sourceUrl = `${url}/videos?hl=en&gl=US`;
	const channel = {
		id: definition.id,
		slug: definition.slug,
		name: '',
		handle: definition.handle,
		url,
		sourceUrls: [sourceUrl, ...definition.sources],
		latestIds: [],
		topIds: [],
		coverage: { latest: 'unavailable', top: 'unavailable' },
		notes: definition.note
	};
	try {
		const html = await publicRead(sourceUrl);
		const data = embeddedJson(html, /var ytInitialData = (\{.*?\});/s);
		const context = embeddedJson(html, /ytcfg.set\((\{.*?\})\);/s).INNERTUBE_CONTEXT;
		const metadata = data.metadata?.channelMetadataRenderer;
		if (metadata?.externalId !== definition.id)
			throw new Error('Channel identity differs from the verified identity.');
		channel.name = metadata.title;
		for (const [field, label] of [
			['latest', 'Latest'],
			['top', 'Popular']
		]) {
			try {
				const selected = await sortedGrid(data, /** @type {'Latest'|'Popular'} */ (label), context);
				const entries = examplesFrom(selected.data, definition.id, sourceUrl, retrievedAt);
				channel[`${field}Ids`] = entries.map((item) => item.id);
				channel.coverage[field] =
					entries.length === 5 ? 'complete' : entries.length ? 'partial' : 'unavailable';
				console.log(`${channel.handle} ${label}: ${selected.proof}`);
				for (const entry of entries) {
					// A refresh intentionally drops visual annotations: a thumbnail can change
					// at the same URL, so fresh metadata alone is not visual verification.
					if (!examples.has(entry.id)) examples.set(entry.id, entry);
				}
			} catch (error) {
				channel.notes += ` ${label} unavailable: ${error instanceof Error ? error.message : 'Unknown retrieval failure'}`;
			}
		}
	} catch (error) {
		channel.name =
			prior.channels.find((item) => item.id === definition.id)?.name ?? definition.handle;
		channel.notes += ` Retrieval unavailable: ${error instanceof Error ? error.message : 'Unknown failure'}`;
	}
	channels.push(channel);
	console.log(
		`${channel.handle}: latest ${channel.latestIds.length}/5; Popular ${channel.topIds.length}/5`
	);
}
const catalog = {
	schemaVersion: 1,
	retrievedAt,
	definition:
		'Latest = first five videos in the official channel Videos tab with Latest selected. Top = first five returned by its Popular sort control, not a sort of the latest sample or a verified complete all-time inventory. Separate Shorts and Live tabs are excluded. Published/view labels are observed rounded display labels, not exact dates or counts. Examples can belong to both collections.',
	channels,
	examples: [...examples.values()]
};
await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(
	`${catalog.examples.length} unique public examples; ${channels.reduce((sum, item) => sum + item.latestIds.length + item.topIds.length, 0)}/70 collection slots. No media downloaded.`
);
