import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';

export const DEFAULT_STAGING_ROOT = '.podcast-migration';
export const DEFAULT_MEDIA_BASE = 'https://media.swyx.io/';
export const MANIFEST_VERSION = 1;

const XML_OPTIONS = {
	preserveOrder: true,
	ignoreAttributes: false,
	parseAttributeValue: false,
	parseTagValue: false,
	trimValues: false,
	commentPropName: '#comment'
};

const MIME_EXTENSIONS = new Map([
	['audio/mpeg', '.mp3'],
	['audio/mp4', '.m4a'],
	['audio/x-m4a', '.m4a'],
	['audio/ogg', '.ogg'],
	['audio/wav', '.wav'],
	['image/jpeg', '.jpg'],
	['image/png', '.png'],
	['image/webp', '.webp'],
	['image/gif', '.gif'],
	['video/mp4', '.mp4'],
	['application/pdf', '.pdf'],
	['application/json', '.json'],
	['application/json+chapters', '.json'],
	['application/rss+xml', '.xml'],
	['application/x-subrip', '.srt'],
	['text/plain', '.txt']
]);

export function parseXml(xml, label = 'XML document') {
	const validation = XMLValidator.validate(xml);
	if (validation !== true) {
		throw new Error(`${label} is not valid XML: ${validation.err.msg}`);
	}

	return new XMLParser(XML_OPTIONS).parse(xml);
}

export function buildXml(document) {
	const builder = new XMLBuilder({
		...XML_OPTIONS,
		format: true,
		indentBy: '\t',
		suppressEmptyNode: false
	});
	return builder.build(document);
}

export function parseArgs(argv, { boolean = [], multiple = [] } = {}) {
	const booleanNames = new Set(boolean);
	const multipleNames = new Set(multiple);
	const parsed = { _: [] };

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (!arg.startsWith('--')) {
			parsed._.push(arg);
			continue;
		}

		const separator = arg.indexOf('=');
		const name = arg.slice(2, separator === -1 ? undefined : separator);
		if (!name) throw new Error('Invalid empty option');

		let value;
		if (booleanNames.has(name)) {
			value = separator === -1 ? true : arg.slice(separator + 1) !== 'false';
		} else {
			value = separator === -1 ? argv[++index] : arg.slice(separator + 1);
			if (!value || value.startsWith('--')) throw new Error(`Missing value for --${name}`);
		}

		if (multipleNames.has(name)) {
			parsed[name] ??= [];
			parsed[name].push(value);
		} else if (parsed[name] !== undefined) {
			throw new Error(`Option --${name} may only be provided once`);
		} else {
			parsed[name] = value;
		}
	}

	return parsed;
}

export function parsePositiveInteger(value, fallback, label) {
	if (value === undefined) return fallback;
	const number = Number(value);
	if (!Number.isInteger(number) || number < 1) {
		throw new Error(`${label} must be a positive integer`);
	}
	return number;
}

export function assertSlug(slug) {
	if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		throw new Error(`Invalid slug "${slug ?? ''}". Use lowercase letters, numbers, and hyphens.`);
	}
	return slug;
}

export function canonicalFeedUrl(slug) {
	return `https://swyx.io/podcast/${assertSlug(slug)}/rss.xml`;
}

export function joinUrl(base, key) {
	return `${base.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
}

export async function readJson(filePath, fallback = null) {
	try {
		return JSON.parse(await readFile(filePath, 'utf8'));
	} catch (error) {
		if (error.code === 'ENOENT') return fallback;
		throw error;
	}
}

export async function writeJson(filePath, value) {
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function createManifest({ slug, sourceUrl, mediaBase }) {
	const timestamp = new Date().toISOString();
	return {
		version: MANIFEST_VERSION,
		slug,
		sourceUrl,
		mediaBase,
		canonicalFeedUrl: canonicalFeedUrl(slug),
		createdAt: timestamp,
		updatedAt: timestamp,
		assets: [],
		uploads: []
	};
}

export function stagePaths(stagingRoot, slug) {
	const stageDir = resolve(stagingRoot, assertSlug(slug));
	return {
		stageDir,
		originalXml: join(stageDir, 'original.xml'),
		replacementXml: join(stageDir, 'replacement.xml'),
		manifestJson: join(stageDir, 'manifest.json'),
		reportJson: join(stageDir, 'report.json')
	};
}

function tagName(node) {
	return Object.keys(node).find((key) => key !== ':@');
}

function children(node) {
	const tag = tagName(node);
	return tag && Array.isArray(node[tag]) ? node[tag] : [];
}

function directChildren(node, name) {
	return children(node).filter((child) => tagName(child) === name);
}

function firstDirectChild(node, name) {
	return directChildren(node, name)[0];
}

function findFirst(nodes, name) {
	for (const node of nodes) {
		if (tagName(node) === name) return node;
		const match = findFirst(children(node), name);
		if (match) return match;
	}
	return null;
}

function attributes(node) {
	node[':@'] ??= {};
	return node[':@'];
}

function getAttribute(node, name) {
	return node[':@']?.[`@_${name}`] ?? node[':@']?.[name];
}

function setAttribute(node, name, value) {
	const nodeAttributes = attributes(node);
	const existingName = Object.hasOwn(nodeAttributes, name) ? name : `@_${name}`;
	nodeAttributes[existingName] = value;
}

function textValue(node) {
	return children(node).find((child) => Object.hasOwn(child, '#text'))?.['#text'] ?? '';
}

function setTextValue(node, value) {
	const text = children(node).find((child) => Object.hasOwn(child, '#text'));
	if (text) {
		text['#text'] = value;
	} else {
		children(node).push({ '#text': value });
	}
}

function appendElement(parent, name, attributesToSet = {}, text) {
	const element = { [name]: [] };
	for (const [attributeName, value] of Object.entries(attributesToSet)) {
		setAttribute(element, attributeName, value);
	}
	if (text !== undefined) element[name].push({ '#text': text });
	children(parent).push(element);
	return element;
}

function rssAndChannel(document) {
	const rss = findFirst(document, 'rss');
	if (!rss) throw new Error('RSS document does not contain an <rss> element');
	const channel = firstDirectChild(rss, 'channel');
	if (!channel) throw new Error('RSS document does not contain a <channel> element');
	return { rss, channel };
}

function absoluteUrl(value, sourceUrl) {
	if (!value) return null;
	try {
		return new URL(value, sourceUrl).href;
	} catch {
		throw new Error(`Invalid asset URL "${value}" in ${sourceUrl}`);
	}
}

function registerReference(references, sourceUrl, kind, apply) {
	if (!sourceUrl) return;
	references.push({ sourceUrl, kind, apply });
}

function isMediaImage(tag, node) {
	if (!tag.startsWith('media:')) return false;
	const localName = tag.slice('media:'.length);
	return (
		['thumbnail', 'image'].includes(localName) ||
		getAttribute(node, 'medium') === 'image' ||
		getAttribute(node, 'type')?.startsWith('image/')
	);
}

function collectMediaImages(node, sourceUrl, references) {
	for (const child of children(node)) {
		const tag = tagName(child);
		if (tag && isMediaImage(tag, child)) {
			const assetUrl = absoluteUrl(getAttribute(child, 'url'), sourceUrl);
			registerReference(references, assetUrl, 'image', (replacementUrl) => {
				setAttribute(child, 'url', replacementUrl);
			});
		}
		collectMediaImages(child, sourceUrl, references);
	}
}

export function collectFeed(document, sourceUrl) {
	const { rss, channel } = rssAndChannel(document);
	const references = [];

	for (const image of directChildren(channel, 'itunes:image')) {
		const assetUrl = absoluteUrl(getAttribute(image, 'href'), sourceUrl);
		registerReference(references, assetUrl, 'artwork', (replacementUrl) => {
			setAttribute(image, 'href', replacementUrl);
		});
	}

	for (const image of directChildren(channel, 'image')) {
		const url = firstDirectChild(image, 'url');
		const assetUrl = absoluteUrl(url && textValue(url), sourceUrl);
		registerReference(references, assetUrl, 'artwork', (replacementUrl) => {
			setTextValue(url, replacementUrl);
		});
	}

	const items = directChildren(channel, 'item');
	const guidValues = [];
	const enclosures = [];
	let enclosureCount = 0;

	for (const item of items) {
		const guid = firstDirectChild(item, 'guid');
		guidValues.push(guid ? String(textValue(guid)) : '');

		for (const enclosure of directChildren(item, 'enclosure')) {
			const assetUrl = absoluteUrl(getAttribute(enclosure, 'url'), sourceUrl);
			enclosures.push({
				sourceUrl: assetUrl,
				length: getAttribute(enclosure, 'length'),
				type: getAttribute(enclosure, 'type')
			});
			registerReference(references, assetUrl, 'enclosure', (replacementUrl, asset) => {
				setAttribute(enclosure, 'url', replacementUrl);
				setAttribute(enclosure, 'length', String(asset.size));
				setAttribute(enclosure, 'type', asset.contentType);
			});
			enclosureCount += 1;
		}

		for (const image of directChildren(item, 'itunes:image')) {
			const assetUrl = absoluteUrl(getAttribute(image, 'href'), sourceUrl);
			registerReference(references, assetUrl, 'image', (replacementUrl) => {
				setAttribute(image, 'href', replacementUrl);
			});
		}

		for (const tag of ['podcast:chapters', 'podcast:transcript']) {
			for (const auxiliary of directChildren(item, tag)) {
				const assetUrl = absoluteUrl(getAttribute(auxiliary, 'url'), sourceUrl);
				registerReference(references, assetUrl, 'auxiliary', (replacementUrl) => {
					setAttribute(auxiliary, 'url', replacementUrl);
				});
			}
		}

		collectMediaImages(item, sourceUrl, references);
	}

	return { rss, channel, items, guidValues, enclosureCount, enclosures, references };
}

export function ensureCanonicalFeedLinks(document, slug) {
	const { rss, channel } = rssAndChannel(document);
	const feedUrl = canonicalFeedUrl(slug);
	const rssAttributes = attributes(rss);

	if (!rssAttributes['@_xmlns:atom'] && !rssAttributes['xmlns:atom']) {
		setAttribute(rss, 'xmlns:atom', 'http://www.w3.org/2005/Atom');
	}
	if (!rssAttributes['@_xmlns:itunes'] && !rssAttributes['xmlns:itunes']) {
		setAttribute(rss, 'xmlns:itunes', 'http://www.itunes.com/dtds/podcast-1.0.dtd');
	}

	let atomSelf = directChildren(channel, 'atom:link').find(
		(node) => getAttribute(node, 'rel') === 'self'
	);
	if (!atomSelf) {
		atomSelf = appendElement(channel, 'atom:link', { href: feedUrl, rel: 'self', type: 'application/rss+xml' });
	}
	setAttribute(atomSelf, 'href', feedUrl);
	setAttribute(atomSelf, 'type', 'application/rss+xml');

	let newFeedUrl = firstDirectChild(channel, 'itunes:new-feed-url');
	if (!newFeedUrl) newFeedUrl = appendElement(channel, 'itunes:new-feed-url', {}, feedUrl);
	setTextValue(newFeedUrl, feedUrl);

	return feedUrl;
}

function isLegacyPodcastPage(value) {
	return /^https?:\/\/(?:[\w-]+\.)*transistor\.fm(?:[/?#]|$)/i.test(value) || /^https?:\/\/mixtape\.swyx\.io(?:[/?#]|$)/i.test(value);
}

function enclosureShareCode(value) {
	return value.match(/media\.transistor\.fm\/([^/?#]+)\//i)?.[1];
}

export function rewriteLegacyProviderLinks(document, { slug, references, assets, mediaBase }) {
	const feedUrl = canonicalFeedUrl(slug);
	const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
	const enclosureByShareCode = new Map();

	for (const reference of references.filter((candidate) => candidate.kind === 'enclosure')) {
		const shareCode = enclosureShareCode(reference.sourceUrl);
		const asset = assetsById.get(assetId(reference.sourceUrl, reference.kind));
		if (shareCode && asset?.objectKey) enclosureByShareCode.set(shareCode, joinUrl(mediaBase, asset.objectKey));
	}

	const { channel } = rssAndChannel(document);
	const items = directChildren(channel, 'item');
	for (const item of items) {
		const link = firstDirectChild(item, 'link');
		const enclosure = firstDirectChild(item, 'enclosure');
		if (link && enclosure && isLegacyPodcastPage(textValue(link))) {
			setTextValue(link, getAttribute(enclosure, 'url'));
		}
	}

	for (const generator of directChildren(channel, 'generator')) {
		setTextValue(generator, 'swyxdotio podcast migration');
	}

	const rewrite = (value) =>
		value
			.replace(/https?:\/\/share\.transistor\.fm\/s\/([^/?#&\s"'<>]+)(#[^&\s"'<>]*)?/gi, (url, shareCode, fragment = '') => {
				const enclosureUrl = enclosureByShareCode.get(shareCode);
				return enclosureUrl ? `${enclosureUrl}${fragment}` : feedUrl;
			})
			.replace(/https?:\/\/(?:[\w-]+\.)*transistor\.fm[^&\s"'<>]*/gi, feedUrl)
			.replace(/https?:\/\/mixtape\.swyx\.io[^&\s"'<>]*/gi, feedUrl);

	const visit = (node) => {
		for (const [key, value] of Object.entries(node)) {
			if (typeof value === 'string') node[key] = rewrite(value);
			else if (Array.isArray(value)) value.forEach(visit);
			else if (value && typeof value === 'object') visit(value);
		}
	};
	document.forEach(visit);
}

function assetId(sourceUrl, kind) {
	return createHash('sha256').update(`${kind}\0${sourceUrl}`).digest('hex').slice(0, 24);
}

function sanitizeFilename(value) {
	const cleaned = value
		.normalize('NFKD')
		.replace(/[^\w.-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
	return cleaned || 'asset';
}

function filenameFor(sourceUrl, contentType) {
	let filename;
	try {
		filename = sanitizeFilename(decodeURIComponent(basename(new URL(sourceUrl).pathname)));
	} catch {
		filename = 'asset';
	}
	const extension = MIME_EXTENSIONS.get(contentType?.split(';')[0].trim().toLowerCase());
	return extname(filename) || !extension ? filename : `${filename}${extension}`;
}

function assetCategory(kind) {
	if (kind === 'enclosure') return 'enclosures';
	if (kind === 'artwork') return 'artwork';
	if (kind === 'auxiliary') return 'auxiliary';
	return 'images';
}

function relativeAssetPath(category, digest, filename) {
	return join('assets', category, `${digest.slice(0, 16)}-${filename}`);
}

export function syncManifestAssets(manifest, references) {
	const current = new Map(manifest.assets.map((asset) => [asset.id, asset]));
	const next = [];

	for (const reference of references) {
		const id = assetId(reference.sourceUrl, reference.kind);
		if (next.some((asset) => asset.id === id)) continue;
		next.push(
			current.get(id) ?? {
				id,
				kind: reference.kind,
				sourceUrl: reference.sourceUrl,
				status: 'pending'
			}
		);
	}

	manifest.assets = next;
	manifest.updatedAt = new Date().toISOString();
	return manifest.assets;
}

export async function hashFile(filePath) {
	const hash = createHash('sha256');
	let size = 0;
	for await (const chunk of createReadStream(filePath)) {
		hash.update(chunk);
		size += chunk.length;
	}
	return { sha256: hash.digest('hex'), size };
}

export function localAssetPath(stageDir, localPath) {
	const absoluteStageDir = resolve(stageDir);
	const absolutePath = resolve(stageDir, localPath);
	if (absolutePath !== absoluteStageDir && !absolutePath.startsWith(`${absoluteStageDir}${sep}`)) {
		throw new Error(`Asset path escapes staging directory: ${localPath}`);
	}
	return absolutePath;
}

async function isCompleteDownload(asset, stageDir) {
	if (asset.status !== 'downloaded' || !asset.localPath || !asset.sha256 || !asset.size) return false;
	try {
		const actual = await hashFile(localAssetPath(stageDir, asset.localPath));
		return actual.size === asset.size && actual.sha256 === asset.sha256 && actual.size > 0;
	} catch (error) {
		if (error.code === 'ENOENT') return false;
		throw error;
	}
}

export async function downloadAsset(asset, { slug, stageDir, force = false }) {
	if (!force && (await isCompleteDownload(asset, stageDir))) return { asset, resumed: true };

	const partialPath = join(stageDir, 'assets', `.partial-${asset.id}`);
	await mkdir(dirname(partialPath), { recursive: true });
	await rm(partialPath, { force: true });

	const response = await fetch(asset.sourceUrl, {
		redirect: 'follow',
		headers: { 'user-agent': 'swyxdotio-podcast-migration/1.0' }
	});
	if (!response.ok || !response.body) {
		throw new Error(`Download failed (${response.status}) for ${asset.sourceUrl}`);
	}

	const hash = createHash('sha256');
	let size = 0;
	const meter = new Transform({
		transform(chunk, encoding, callback) {
			hash.update(chunk);
			size += chunk.length;
			callback(null, chunk);
		}
	});

	try {
		await pipeline(Readable.fromWeb(response.body), meter, createWriteStream(partialPath));
		if (size === 0) throw new Error(`Downloaded empty asset from ${asset.sourceUrl}`);

		const sha256 = hash.digest('hex');
		const contentType = response.headers.get('content-type')?.split(';')[0].trim() || 'application/octet-stream';
		const filename = filenameFor(asset.sourceUrl, contentType);
		const category = assetCategory(asset.kind);
		const localPath = relativeAssetPath(category, sha256, filename);
		const destination = localAssetPath(stageDir, localPath);
		await mkdir(dirname(destination), { recursive: true });
		await rename(partialPath, destination);

		Object.assign(asset, {
			status: 'downloaded',
			contentType,
			size,
			sha256,
			objectKey: `podcasts/${slug}/${category}/${sha256.slice(0, 16)}-${filename}`,
			localPath,
			downloadedAt: new Date().toISOString()
		});
		delete asset.error;
		return { asset, resumed: false };
	} catch (error) {
		await rm(partialPath, { force: true });
		throw error;
	}
}

export async function mapLimit(values, concurrency, callback) {
	const results = new Array(values.length);
	let nextIndex = 0;
	let failure;

	async function worker() {
		while (!failure) {
			const index = nextIndex++;
			if (index >= values.length) return;
			try {
				results[index] = await callback(values[index], index);
			} catch (error) {
				failure ??= error;
				throw error;
			}
		}
	}

	await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
	return results;
}

export function createManifestSaver(manifestPath, manifest) {
	let pending = Promise.resolve();
	return () => {
		manifest.updatedAt = new Date().toISOString();
		pending = pending.then(() => writeJson(manifestPath, manifest));
		return pending;
	};
}

export function applyAssetUrls(references, assets, mediaBase) {
	const byId = new Map(assets.map((asset) => [asset.id, asset]));
	for (const reference of references) {
		const asset = byId.get(assetId(reference.sourceUrl, reference.kind));
		if (!asset?.objectKey) throw new Error(`Missing object key for ${reference.sourceUrl}`);
		reference.apply(joinUrl(mediaBase, asset.objectKey), asset);
	}
}

function compareArrays(label, sourceValues, replacementValues, errors) {
	if (sourceValues.length !== replacementValues.length) {
		errors.push(`${label} count differs: source=${sourceValues.length}, replacement=${replacementValues.length}`);
		return;
	}
	for (let index = 0; index < sourceValues.length; index += 1) {
		if (sourceValues[index] !== replacementValues[index]) {
			errors.push(`${label} differs at item ${index + 1}`);
		}
	}
}

export async function validateStage({ stagingRoot = DEFAULT_STAGING_ROOT, slug }) {
	const paths = stagePaths(stagingRoot, slug);
	const errors = [];
	const manifest = await readJson(paths.manifestJson);
	if (!manifest) throw new Error(`Missing manifest: ${paths.manifestJson}`);

	const source = collectFeed(parseXml(await readFile(paths.originalXml, 'utf8'), paths.originalXml), manifest.sourceUrl);
	const replacementXml = await readFile(paths.replacementXml, 'utf8');
	const replacement = collectFeed(parseXml(replacementXml, paths.replacementXml), manifest.canonicalFeedUrl);

	compareArrays('GUID', source.guidValues, replacement.guidValues, errors);
	if (source.items.length !== replacement.items.length) {
		errors.push(`Item count differs: source=${source.items.length}, replacement=${replacement.items.length}`);
	}
	if (source.enclosureCount !== replacement.enclosureCount) {
		errors.push(`Enclosure count differs: source=${source.enclosureCount}, replacement=${replacement.enclosureCount}`);
	}
	if (/https?:\/\/[^&\s"'<>]*(?:transistor\.fm|mixtape\.swyx\.io)/i.test(replacementXml)) {
		errors.push('Replacement feed still contains a legacy Transistor URL');
	}
	const replacementEnclosures = new Map(replacement.enclosures.map((enclosure) => [enclosure.sourceUrl, enclosure]));

	for (const asset of manifest.assets) {
		if (asset.status !== 'downloaded') {
			errors.push(`Asset ${asset.id} is not downloaded`);
			continue;
		}
		if (!asset.size || !asset.sha256 || !asset.localPath || !asset.objectKey) {
			errors.push(`Asset ${asset.id} is missing size, hash, local path, or object key`);
			continue;
		}
		try {
			const actual = await hashFile(localAssetPath(paths.stageDir, asset.localPath));
			if (actual.size === 0) errors.push(`Asset ${asset.id} is empty`);
			if (actual.size !== asset.size) errors.push(`Asset ${asset.id} size differs from manifest`);
			if (actual.sha256 !== asset.sha256) errors.push(`Asset ${asset.id} hash differs from manifest`);
			if (asset.kind === 'enclosure') {
				const enclosure = replacementEnclosures.get(joinUrl(manifest.mediaBase, asset.objectKey));
				if (!enclosure) {
					errors.push(`Enclosure ${asset.id} is missing from replacement feed`);
				} else {
					if (Number(enclosure.length) !== asset.size) errors.push(`Enclosure ${asset.id} length differs from asset`);
					if (enclosure.type !== asset.contentType) errors.push(`Enclosure ${asset.id} type differs from asset`);
				}
			}
		} catch (error) {
			errors.push(`Asset ${asset.id} cannot be read: ${error.message}`);
		}
	}

	const report = {
		slug,
		sourceUrl: manifest.sourceUrl,
		canonicalFeedUrl: manifest.canonicalFeedUrl,
		valid: errors.length === 0,
		checkedAt: new Date().toISOString(),
		counts: {
			items: source.items.length,
			enclosures: source.enclosureCount,
			assets: manifest.assets.length
		},
		errors
	};
	await writeJson(paths.reportJson, report);
	return report;
}

export async function pathExists(filePath) {
	try {
		await stat(filePath);
		return true;
	} catch (error) {
		if (error.code === 'ENOENT') return false;
		throw error;
	}
}
