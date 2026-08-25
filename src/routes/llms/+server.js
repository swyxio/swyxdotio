import { AI_CONTENT_SIGNAL } from '$lib/llms';
import { loadLlmsIndex } from '$lib/server/llms';

/** @param {string} value */
function escapeHtml(value) {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ fetch, request }) {
	const index = await loadLlmsIndex(fetch);
	const accept = request.headers.get('accept') ?? '';
	const wantsMarkdown = accept.includes('text/markdown');
	const wantsHtml = accept.includes('text/html') && !wantsMarkdown;
	const contentType = wantsHtml ? 'text/html' : wantsMarkdown ? 'text/markdown' : 'text/plain';
	const body = wantsHtml
		? `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI discovery · swyx.io</title><link rel="canonical" href="https://swyx.io/llms"><link rel="alternate" type="text/plain" href="/llms.txt"><link rel="alternate" type="text/markdown" href="/llms.md"></head><body><main><p><a href="/">swyx.io</a> · <a href="/llms.txt">Plain text</a> · <a href="/llms.md">Markdown</a></p><pre style="white-space:pre-wrap;word-wrap:break-word">${escapeHtml(index)}</pre></main></body></html>`
		: index;

	return new Response(body, {
		headers: {
			'Cache-Control': 'private, max-age=0, no-store',
			'Content-Signal': AI_CONTENT_SIGNAL,
			'Content-Type': `${contentType}; charset=utf-8`,
			Vary: 'Accept'
		}
	});
}
