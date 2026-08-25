import { SITE_DESCRIPTION, SITE_URL } from './siteConfig.js';
import { PUBLIC_PAGE_PATHS, publicContentUrl } from './sitemap.js';

export const AI_CONTENT_SIGNAL = 'search=yes, ai-input=yes';

/** @type {Record<string, string>} */
const PAGE_DESCRIPTIONS = {
	'/': 'Recent writing and updates from Shawn Wang (swyx).',
	'/about': 'Background, biography, and contact information.',
	'/ideas': 'Complete archive of essays, notes, talks, and tutorials.',
	'/podcasts': 'Podcasts and audio conversations.',
	'/portfolio': 'Projects, work, and investments.',
	'/subscribe': 'Newsletter subscription and updates.'
};

/** @param {unknown} value */
function oneLine(value) {
	return String(value ?? '')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * @param {import('./types').ContentItem[]} posts
 */
export function buildLlmsIndex(posts) {
	const lines = [
		'# Shawn Wang (swyx)',
		'',
		`> ${SITE_DESCRIPTION}`,
		'',
		'Shawn Wang writes about AI engineering, developer tools, learning in public, and software careers.',
		'',
		'## Site',
		...PUBLIC_PAGE_PATHS.map((path) => {
			const title =
				path === '/' ? 'Home' : path.slice(1).replace(/^./, (letter) => letter.toUpperCase());
			return `- [${title}](${new URL(path, SITE_URL).href}): ${PAGE_DESCRIPTIONS[path]}`;
		}),
		`- [RSS feed](${SITE_URL}/rss.xml): New writing and updates.`,
		`- [XML sitemap](${SITE_URL}/sitemap.xml): Every canonical public page.`,
		'',
		'## Writing'
	];
	const seen = new Set();

	for (const post of posts) {
		if (post.type !== 'blog') continue;
		const canonical = publicContentUrl(post);
		if (!canonical || seen.has(canonical)) continue;
		seen.add(canonical);
		const description = oneLine(post.description ?? post.subtitle ?? post.desc);
		const markdownUrl = new URL(`/${post.slug}.md`, SITE_URL).href;
		lines.push(
			`- [${oneLine(post.title)}](${canonical})${description ? `: ${description}` : ''} ([Markdown](${markdownUrl}))`
		);
	}

	return `${lines.join('\n')}\n`;
}

/** @param {import('./types').ContentItem} post */
export function buildArticleMarkdown(post) {
	const canonical = publicContentUrl(post);
	if (!canonical) throw new Error('Cannot expose a private or externally canonical article');
	const description = oneLine(post.description ?? post.subtitle ?? post.desc);
	const date = new Date(post.date);
	const metadata = [
		`# ${oneLine(post.title)}`,
		'',
		`Original: ${canonical}`,
		...(Number.isNaN(date.valueOf()) ? [] : [`Published: ${date.toISOString().slice(0, 10)}`]),
		...(description ? ['', `> ${description}`] : [])
	];
	const content = String(post.content ?? '').trim();
	return `${metadata.join('\n')}${content ? `\n\n${content}` : ''}\n`;
}
