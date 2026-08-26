import { renderMarkdown } from '$lib/markdown';
import content from './content.md?raw';
import photos from './photos.md?raw';

// Static page: rendered once at build time.
export const prerender = true;

export async function load() {
	const [html, photoHtml] = await Promise.all([renderMarkdown(content), renderMarkdown(photos)]);
	return { html, photoHtml };
}
