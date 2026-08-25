import { AI_CONTENT_SIGNAL, buildLlmsIndex } from '$lib/llms';

export const CRAWLER_CACHE_CONTROL =
	'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800';

/** @param {typeof globalThis.fetch} fetch */
export async function loadLlmsIndex(fetch) {
	const response = await fetch('/api/listContent.json');
	if (!response.ok) throw new Error(`failed to load AI discovery content (${response.status})`);
	return buildLlmsIndex(await response.json());
}

/**
 * @param {string} body
 * @param {string} contentType
 */
export function crawlerResponse(body, contentType) {
	return new Response(body, {
		headers: {
			'Cache-Control': CRAWLER_CACHE_CONTROL,
			'Content-Signal': AI_CONTENT_SIGNAL,
			'Content-Type': `${contentType}; charset=utf-8`
		}
	});
}
