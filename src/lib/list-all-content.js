import { listContent } from './content';
import { listSpeaking } from './local-content';

/**
 * @param {typeof globalThis.fetch | undefined} providedFetch
 * @param {App.Platform | undefined} platform
 * @returns {Promise<import('./types').ContentItem[]>}
 */
export async function listAllContent(providedFetch, platform) {
	const blogposts = await listContent(providedFetch, platform?.env?.CONTENT_MANIFEST, {
		context: platform?.context
	});
	const speaking = await listSpeaking();
	return blogposts
		.concat(speaking)
		.sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf());
}
