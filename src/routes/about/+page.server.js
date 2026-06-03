import { renderMarkdown } from '$lib/markdown';
import content from './content.md?raw';

// Static page: rendered once at build time.
export const prerender = true;

export async function load() {
	const html = await renderMarkdown(content);
	return { html };
}
