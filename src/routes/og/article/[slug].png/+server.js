import { error } from '@sveltejs/kit';
import { readContentManifest } from '$lib/content-manifest.js';
import { resolveArticleCard } from '$lib/og/article.js';
import { fetchCardImage } from '$lib/og/images.js';
import { renderNotebookCard } from '$lib/og/render.js';

export const prerender = false;

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, platform, fetch }) {
	const manifest = await readContentManifest(platform?.env?.CONTENT_MANIFEST);
	const card = resolveArticleCard(manifest, params.slug);
	if (!card) throw error(404, 'Unknown article');

	const article = manifest?.blogposts.find((item) => item.slug === params.slug);
	card.image = await fetchCardImage(article?.image, fetch);
	return renderNotebookCard(card);
}
