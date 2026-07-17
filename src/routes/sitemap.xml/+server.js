import { buildSitemap } from '$lib/sitemap';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ fetch }) {
	const res = await fetch('/api/listContent.json');
	if (!res.ok) throw new Error(`failed to load sitemap content (${res.status})`);
	const posts = /** @type {import('$lib/types').ContentItem[]} */ (await res.json()).filter(
		(post) => post.type === 'blog'
	);

	return new Response(buildSitemap(posts), {
		headers: {
			'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
			'Content-Type': 'application/xml'
		}
	});
}
