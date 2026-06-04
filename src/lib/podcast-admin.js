import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import { PODCAST_SHOWS } from '$lib/podcast-shows';

export { PODCAST_SHOWS };

export const PODCAST_UPLOAD_PART_BYTES = 10 * 1024 * 1024;

/** @typedef {{ [key: string]: unknown, ':@'?: Record<string, string> }} OrderedXmlNode */
/** @typedef {Record<string, unknown>} JsonObject */
/** @typedef {{ partNumber: number, etag: string }} UploadedPart */
/**
 * @typedef {{
 *   slug: string;
 *   episodeId: string;
 *   uploadId: string;
 *   objectKey: string;
 *   title: string;
 *   description: string;
 *   publishedAt: Date;
 *   duration: string;
 *   size: number;
 *   parts: UploadedPart[];
 * }} PodcastEpisodeUpload
 */
/**
 * @typedef {{
 *   title: string;
 *   description: string;
 *   publishedAt: string | Date;
 *   guid: string;
 *   mediaUrl: string;
 *   size: number;
 *   duration?: string;
 * }} PodcastFeedEpisode
 */
/**
 * @typedef {{
 *   version: number;
 *   id: string;
 *   slug: string;
 *   title: string;
 *   description: string;
 *   publishedAt: string;
 *   duration: string;
 *   guid: string;
 *   objectKey: string;
 *   mediaUrl: string;
 *   size: number;
 *   status: 'pending' | 'published' | 'failed';
 *   createdAt: string;
 *   publishedToFeedAt?: string;
 *   error?: string;
 * }} PodcastEpisodeMetadata
 */

const XML_OPTIONS = {
	preserveOrder: true,
	ignoreAttributes: false,
	parseAttributeValue: false,
	parseTagValue: false,
	trimValues: false,
	commentPropName: '#comment'
};

/**
 * @param {OrderedXmlNode} node
 * @returns {string | undefined}
 */
function tagName(node) {
	return Object.keys(node).find((key) => key !== ':@');
}

/**
 * @param {OrderedXmlNode} node
 * @returns {OrderedXmlNode[]}
 */
function children(node) {
	const tag = tagName(node);
	const childNodes = tag ? node[tag] : undefined;
	return Array.isArray(childNodes) ? /** @type {OrderedXmlNode[]} */ (childNodes) : [];
}

/**
 * @param {OrderedXmlNode[]} nodes
 * @param {string} name
 * @returns {OrderedXmlNode | null}
 */
function findFirst(nodes, name) {
	for (const node of nodes) {
		if (tagName(node) === name) return node;
		const match = findFirst(children(node), name);
		if (match) return match;
	}
	return null;
}

/**
 * @param {OrderedXmlNode} node
 * @param {string} name
 * @returns {OrderedXmlNode | undefined}
 */
function directChild(node, name) {
	return children(node).find((child) => tagName(child) === name);
}

/**
 * @param {string} name
 * @param {string} [text]
 * @param {Record<string, string>} [attributes]
 * @returns {OrderedXmlNode}
 */
function element(name, text, attributes) {
	/** @type {OrderedXmlNode} */
	const node = { [name]: text === undefined ? [] : [{ '#text': text }] };
	if (attributes) {
		node[':@'] = Object.fromEntries(
			Object.entries(attributes).map(([attributeName, value]) => [`@_${attributeName}`, value])
		);
	}
	return node;
}

/**
 * @param {string} filename
 * @returns {string}
 */
function sanitizeFilename(filename) {
	const cleaned = filename
		.normalize('NFKD')
		.replace(/[^\w.-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
	return cleaned || 'episode.mp3';
}

/**
 * @param {unknown} value
 * @param {string} label
 * @param {number} maxLength
 * @returns {string}
 */
function requireText(value, label, maxLength) {
	const text = typeof value === 'string' ? value.trim() : '';
	if (!text) throw new Error(`${label} is required`);
	if (text.length > maxLength) throw new Error(`${label} must be at most ${maxLength} characters`);
	return text;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function requireShowSlug(value) {
	const slug = requireText(value, 'Show', 80);
	if (!PODCAST_SHOWS.some((show) => show.slug === slug))
		throw new Error('Choose a valid podcast show');
	return slug;
}

/**
 * @param {unknown} value
 * @returns {Date}
 */
function requireDate(value) {
	const date = requireText(value, 'Publish date', 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Publish date must use YYYY-MM-DD');
	const parsed = new Date(`${date}T12:00:00.000Z`);
	if (Number.isNaN(parsed.valueOf())) throw new Error('Publish date is invalid');
	return parsed;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function optionalDuration(value) {
	const duration = typeof value === 'string' ? value.trim() : '';
	if (!duration) return '';
	if (!/^(?:\d+:)?[0-5]?\d:[0-5]\d$/.test(duration)) {
		throw new Error('Duration must use MM:SS or HH:MM:SS');
	}
	return duration;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function requireUploadId(value) {
	const uploadId = requireText(value, 'Upload ID', 2048);
	if (!/^[a-zA-Z0-9_-]+$/.test(uploadId)) throw new Error('Upload ID is invalid');
	return uploadId;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function requireEpisodeId(value) {
	const episodeId = requireText(value, 'Episode ID', 80);
	if (!/^[a-f0-9-]+$/.test(episodeId)) throw new Error('Episode ID is invalid');
	return episodeId;
}

/**
 * @param {unknown} value
 * @param {string} slug
 * @param {string} episodeId
 * @returns {string}
 */
function requireObjectKey(value, slug, episodeId) {
	const objectKey = requireText(value, 'Object key', 400);
	if (!objectKey.startsWith(`podcasts/${slug}/enclosures/manual/${episodeId}-`)) {
		throw new Error('Object key is invalid');
	}
	return objectKey;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function requireArchiveObjectKey(value) {
	const objectKey = requireText(value, 'Object key', 500);
	if (objectKey.includes('..')) throw new Error('Object key is invalid');
	const match =
		/^podcasts\/([a-z0-9-]+)\/(artwork|images|enclosures|transcripts|chapters)\/[a-z0-9._/-]+$/.exec(
			objectKey
		);
	if (!match || !PODCAST_SHOWS.some((show) => show.slug === match[1])) {
		throw new Error('Object key is outside the podcast archive namespace');
	}
	return objectKey;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function requireArchiveContentType(value) {
	const contentType = requireText(value, 'Content type', 120);
	if (
		![
			'audio/mpeg',
			'audio/mp4',
			'audio/x-m4a',
			'audio/ogg',
			'audio/wav',
			'image/jpeg',
			'image/png',
			'image/webp',
			'image/gif',
			'application/json',
			'text/plain'
		].includes(contentType)
	) {
		throw new Error('Content type is not allowed for podcast archive uploads');
	}
	return contentType;
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {number}
 */
function requirePositiveInteger(value, label) {
	const number = Number(value);
	if (!Number.isSafeInteger(number) || number < 1) throw new Error(`${label} is invalid`);
	return number;
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {JsonObject}
 */
function requireJsonObject(value, label) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${label} is invalid`);
	}
	return /** @type {JsonObject} */ (value);
}

/**
 * @param {unknown[]} parts
 * @returns {UploadedPart[]}
 */
function readParts(parts) {
	return parts.map((part) => {
		const input = requireJsonObject(part, 'Upload part');
		return {
			partNumber: requirePositiveInteger(input.partNumber, 'Part number'),
			etag: requireText(input.etag, 'Part ETag', 240)
		};
	});
}

/**
 * @param {unknown} value
 * @returns {UploadedPart[]}
 */
function requireParts(value) {
	if (!Array.isArray(value) || !value.length) throw new Error('Upload has no completed parts');
	return readParts(value);
}

/**
 * @param {JsonObject} input
 * @returns {PodcastEpisodeUpload}
 */
export function readPodcastEpisodeJson(input) {
	const slug = requireShowSlug(input.slug);
	const episodeId = requireEpisodeId(input.episodeId);
	return {
		slug,
		episodeId,
		uploadId: requireUploadId(input.uploadId),
		objectKey: requireObjectKey(input.objectKey, slug, episodeId),
		title: requireText(input.title, 'Title', 240),
		description: requireText(input.description, 'Description', 8000),
		publishedAt: requireDate(input.publishedAt),
		duration: optionalDuration(input.duration),
		size: requirePositiveInteger(input.size, 'File size'),
		parts: Array.isArray(input.parts) ? readParts(input.parts) : []
	};
}

/**
 * @param {string} xml
 * @param {PodcastFeedEpisode} episode
 * @returns {string}
 */
export function prependPodcastEpisode(xml, episode) {
	const validation = XMLValidator.validate(xml);
	if (validation !== true)
		throw new Error(`Stored podcast feed is invalid XML: ${validation.err.msg}`);

	const document = /** @type {OrderedXmlNode[]} */ (new XMLParser(XML_OPTIONS).parse(xml));
	const rss = findFirst(document, 'rss');
	const channel = rss && directChild(rss, 'channel');
	if (!channel) throw new Error('Stored podcast feed is missing its channel');
	const publishedAt =
		episode.publishedAt instanceof Date ? episode.publishedAt : new Date(episode.publishedAt);
	if (Number.isNaN(publishedAt.valueOf())) throw new Error('Episode publish date is invalid');

	const item = element('item');
	const itemChildren = children(item);
	itemChildren.push(element('title', episode.title));
	itemChildren.push(element('description', episode.description));
	itemChildren.push(element('pubDate', publishedAt.toUTCString()));
	itemChildren.push(element('guid', episode.guid, { isPermaLink: 'false' }));
	itemChildren.push(
		element('enclosure', undefined, {
			url: episode.mediaUrl,
			length: String(episode.size),
			type: 'audio/mpeg'
		})
	);
	if (episode.duration) itemChildren.push(element('itunes:duration', episode.duration));
	itemChildren.push(element('itunes:explicit', 'false'));

	const channelChildren = children(channel);
	const firstItem = channelChildren.findIndex((child) => tagName(child) === 'item');
	channelChildren.splice(firstItem === -1 ? channelChildren.length : firstItem, 0, item);

	return new XMLBuilder({
		...XML_OPTIONS,
		format: true,
		indentBy: '\t',
		suppressEmptyNode: false
	}).build(document);
}

/**
 * @param {R2Bucket | undefined} bucket
 * @param {JsonObject} input
 */
export async function beginPodcastUpload(bucket, input) {
	if (!bucket) throw new Error('Podcast storage is not configured');
	const slug = requireShowSlug(input.slug);
	const filename = sanitizeFilename(requireText(input.filename, 'Filename', 240));
	if (!filename.endsWith('.mp3')) throw new Error('Upload must be an .mp3 file');
	const episodeId = crypto.randomUUID();
	const objectKey = `podcasts/${slug}/enclosures/manual/${episodeId}-${filename}`;
	const upload = await bucket.createMultipartUpload(objectKey, {
		httpMetadata: {
			contentType: 'audio/mpeg',
			cacheControl: 'public, max-age=31536000, immutable'
		},
		customMetadata: { source: 'podcast-studio' }
	});
	return {
		slug,
		episodeId,
		objectKey,
		uploadId: upload.uploadId,
		partBytes: PODCAST_UPLOAD_PART_BYTES
	};
}

/**
 * @param {R2Bucket | undefined} bucket
 * @param {JsonObject} input
 * @param {ArrayBuffer} body
 */
export async function uploadPodcastPart(bucket, input, body) {
	if (!bucket) throw new Error('Podcast storage is not configured');
	const upload = bucket.resumeMultipartUpload(
		requireObjectKey(
			input.objectKey,
			requireShowSlug(input.slug),
			requireEpisodeId(input.episodeId)
		),
		requireUploadId(input.uploadId)
	);
	return upload.uploadPart(requirePositiveInteger(input.partNumber, 'Part number'), body);
}

/**
 * @param {R2Bucket | undefined} bucket
 * @param {JsonObject} input
 */
export async function abortPodcastUpload(bucket, input) {
	if (!bucket) throw new Error('Podcast storage is not configured');
	const upload = bucket.resumeMultipartUpload(
		requireObjectKey(
			input.objectKey,
			requireShowSlug(input.slug),
			requireEpisodeId(input.episodeId)
		),
		requireUploadId(input.uploadId)
	);
	await upload.abort();
}

/**
 * @param {R2Bucket | undefined} bucket
 * @param {JsonObject} input
 */
export async function beginArchiveUpload(bucket, input) {
	if (!bucket) throw new Error('Podcast storage is not configured');
	const objectKey = requireArchiveObjectKey(input.objectKey);
	const contentType = requireArchiveContentType(input.contentType);
	const upload = await bucket.createMultipartUpload(objectKey, {
		httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
		customMetadata: { source: 'podcast-archive-migration' }
	});
	return { objectKey, uploadId: upload.uploadId, partBytes: PODCAST_UPLOAD_PART_BYTES };
}

/**
 * @param {R2Bucket | undefined} bucket
 * @param {JsonObject} input
 * @param {ArrayBuffer} body
 */
export async function uploadArchivePart(bucket, input, body) {
	if (!bucket) throw new Error('Podcast storage is not configured');
	const upload = bucket.resumeMultipartUpload(
		requireArchiveObjectKey(input.objectKey),
		requireUploadId(input.uploadId)
	);
	return upload.uploadPart(requirePositiveInteger(input.partNumber, 'Part number'), body);
}

/**
 * @param {R2Bucket | undefined} bucket
 * @param {JsonObject} input
 */
export async function completeArchiveUpload(bucket, input) {
	if (!bucket) throw new Error('Podcast storage is not configured');
	const upload = bucket.resumeMultipartUpload(
		requireArchiveObjectKey(input.objectKey),
		requireUploadId(input.uploadId)
	);
	await upload.complete(requireParts(input.parts));
	return { uploaded: true };
}

/**
 * @param {R2Bucket | undefined} bucket
 * @param {JsonObject} input
 */
export async function abortArchiveUpload(bucket, input) {
	if (!bucket) throw new Error('Podcast storage is not configured');
	const upload = bucket.resumeMultipartUpload(
		requireArchiveObjectKey(input.objectKey),
		requireUploadId(input.uploadId)
	);
	await upload.abort();
}

/**
 * @param {R2Bucket} bucket
 * @param {string} slug
 * @param {PodcastFeedEpisode} episode
 */
async function updateFeed(bucket, slug, episode) {
	const feedKey = `feeds/${slug}.xml`;
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const current = await bucket.get(feedKey);
		if (!current) {
			throw new Error(
				'The base podcast feed is not in R2 yet. Finish the archive migration before publishing.'
			);
		}
		const currentXml = await current.text();
		const historyKey = `feed-history/${slug}/${new Date().toISOString()}-${crypto.randomUUID()}.xml`;
		await bucket.put(historyKey, currentXml, {
			httpMetadata: {
				contentType: 'application/rss+xml; charset=utf-8',
				cacheControl: 'private, no-store'
			}
		});
		const stored = await bucket.put(feedKey, prependPodcastEpisode(currentXml, episode), {
			httpMetadata: {
				contentType: 'application/rss+xml; charset=utf-8',
				cacheControl: 'public, max-age=0, must-revalidate'
			},
			onlyIf: { etagMatches: current.etag }
		});
		if (stored) return;
		await new Promise((resolve) => setTimeout(resolve, 50 + Math.floor(Math.random() * 100)));
	}
	throw new Error(
		'The podcast feed changed during this upload. Retry after the other update finishes.'
	);
}

/**
 * @param {R2Bucket | undefined} bucket
 * @param {JsonObject} input
 * @returns {Promise<PodcastEpisodeMetadata>}
 */
export async function completePodcastUpload(bucket, input) {
	if (!bucket) throw new Error('Podcast storage is not configured');
	const episode = readPodcastEpisodeJson(input);
	if (!episode.parts.length) throw new Error('Upload has no completed parts');
	const upload = bucket.resumeMultipartUpload(episode.objectKey, episode.uploadId);
	await upload.complete(episode.parts);
	const mediaUrl = `https://media.swyx.io/${episode.objectKey}`;
	const metadataKey = `admin/episodes/${episode.slug}/${episode.episodeId}.json`;
	/** @type {PodcastEpisodeMetadata} */
	const metadata = {
		version: 1,
		id: episode.episodeId,
		slug: episode.slug,
		title: episode.title,
		description: episode.description,
		publishedAt: episode.publishedAt.toISOString(),
		duration: episode.duration,
		guid: `swyx-podcast-studio:${episode.slug}:${episode.episodeId}`,
		objectKey: episode.objectKey,
		mediaUrl,
		size: episode.size,
		status: 'pending',
		createdAt: new Date().toISOString()
	};
	await bucket.put(metadataKey, JSON.stringify(metadata, null, 2), {
		httpMetadata: { contentType: 'application/json', cacheControl: 'private, no-store' }
	});
	try {
		await updateFeed(bucket, episode.slug, metadata);
		metadata.status = 'published';
		metadata.publishedToFeedAt = new Date().toISOString();
	} catch (error) {
		metadata.status = 'failed';
		metadata.error = error instanceof Error ? error.message : 'Podcast feed update failed';
		throw error;
	} finally {
		await bucket.put(metadataKey, JSON.stringify(metadata, null, 2), {
			httpMetadata: { contentType: 'application/json', cacheControl: 'private, no-store' }
		});
	}
	return metadata;
}
