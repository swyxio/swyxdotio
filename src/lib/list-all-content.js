import { listContent } from './content';
import { listSpeaking } from './local-content';

/**
 * @param {Function | undefined} providedFetch
 * @param {App.Platform | undefined} platform
 * @returns {Promise<Record<string, any>[]>}
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
