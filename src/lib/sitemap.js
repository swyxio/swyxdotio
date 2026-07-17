import { SITE_URL } from './siteConfig.js';

export const PUBLIC_PAGE_PATHS = ['/', '/about', '/ideas', '/podcasts', '/portfolio', '/subscribe'];

/**
 * @param {import('./types').ContentItem[]} posts
 * @param {string[]} [pagePaths]
 */
export function buildSitemap(posts, pagePaths = PUBLIC_PAGE_PATHS) {
	const entries = new Map();

	for (const path of pagePaths) {
		const url = new URL(path, SITE_URL).href;
		entries.set(url, { url });
	}

	for (const post of posts) {
		if (post.isPrivate) continue;
		const localUrl = localCanonicalUrl(post);
		if (!localUrl) continue;
		entries.set(localUrl, {
			url: localUrl,
			lastModified: toIsoDate(post.ghMetadata?.updated_at ?? post.date)
		});
	}

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${[...entries.values()].map(renderEntry).join('\n')}
</urlset>`;
}

/** @param {import('./types').ContentItem} post */
function localCanonicalUrl(post) {
	const fallback = new URL(`/${post.slug}`, SITE_URL);
	if (!post.canonical) return fallback.href;

	try {
		const canonical = new URL(post.canonical, SITE_URL);
		if (canonical.hostname !== 'swyx.io' && canonical.hostname !== 'www.swyx.io') return null;
		canonical.protocol = 'https:';
		canonical.hostname = 'swyx.io';
		canonical.port = '';
		canonical.hash = '';
		canonical.search = '';
		return canonical.href;
	} catch {
		return fallback.href;
	}
}

/** @param {{ url: string; lastModified?: string }} entry */
function renderEntry(entry) {
	const lastModified = entry.lastModified ? `\n    <lastmod>${entry.lastModified}</lastmod>` : '';
	return `  <url>\n    <loc>${escapeXml(entry.url)}</loc>${lastModified}\n  </url>`;
}

/** @param {Date | string} value */
function toIsoDate(value) {
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

/** @param {string} value */
function escapeXml(value) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}
