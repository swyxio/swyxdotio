import { error } from '@sveltejs/kit';
import { listContent } from '$lib/content';
import { buildArticleMarkdown } from '$lib/llms';
import { crawlerResponse } from '$lib/server/llms';
import { publicContentUrl } from '$lib/sitemap';
import { isBlogSlug } from '$lib/slug';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ fetch, params, platform }) {
	const slug = params.slug;
	if (!slug || !isBlogSlug(slug)) throw error(404, 'Article not found');

	const posts = await listContent(fetch, platform?.env?.CONTENT_MANIFEST, {
		context: platform?.context
	});
	const post = posts.find((candidate) => candidate.slug === slug);
	if (!post || !publicContentUrl(post)) throw error(404, 'Article not found');

	return crawlerResponse(buildArticleMarkdown(post), 'text/markdown');
}
