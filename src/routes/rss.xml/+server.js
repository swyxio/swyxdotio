import { SITE_TITLE, SITE_URL } from '$lib/siteConfig';

/**
 * Escape a string for safe inclusion in XML.
 * @param {unknown} str
 */
function xml(str) {
	return String(str ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ fetch }) {
	const res = await fetch('/api/listContent.json');
	if (!res.ok) throw new Error(`failed to load RSS content (${res.status})`);
	const allBlogs = /** @type {import('$lib/types').ContentItem[]} */ (await res.json()).filter(
		(post) => post.type === 'blog'
	);
	const items = allBlogs
		.map(
			(post) => `
		<item>
			<title>${xml(post.title)}</title>
			<link>${SITE_URL}/${xml(post.slug)}</link>
			<guid isPermaLink="true">${SITE_URL}/${xml(post.slug)}</guid>
			<pubDate>${new Date(post.date).toUTCString()}</pubDate>
			<description>${xml(post.description)}</description>
		</item>`
		)
		.join('');

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
	<channel>
		<title>${xml(SITE_TITLE + ' RSS Feed')}</title>
		<link>${SITE_URL}</link>
		<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
		<description>${xml(SITE_TITLE)}</description>${items}
	</channel>
</rss>`;

	return new Response(body, {
		headers: {
			'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
			'Content-Type': 'application/rss+xml'
		}
	});
}

// misc notes for future users

// 	// use this if you want your content in a local '/content' folder rather than github issues
// 	// let allBlogs = import.meta.globEager('/content/**/*.md')
// 	Object.entries(allBlogs).forEach(([path, obj]) => {
// 		feed.item({
// 			title: obj.title,
// 			url: SITE_URL + `/${path.slice(9).slice(0, -3)}`,
// 			date: obj.date,
// 			description: obj.description
// 		});
// 	});
