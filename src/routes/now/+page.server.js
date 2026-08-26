import { renderMarkdown } from '$lib/markdown';
import content from './content.md?raw';

export const prerender = true;

export async function load() {
	return { html: await renderMarkdown(content) };
}
