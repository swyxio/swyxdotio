import { recordServerToolActivity } from '$lib/server/tools-activity.js';
import { PODCAST_SHOWS } from '$lib/podcast-admin';
import { loadPersonalTools, requirePersonalToolsOwner } from '$lib/personal-tools-auth';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const user = await requirePersonalToolsOwner(event, '/tools/podcast');
	await recordServerToolActivity(event, user.id, 'podcast.open', 'succeeded');
	return {
		...(await loadPersonalTools(event)),
		defaultPublishDate: new Date().toISOString().slice(0, 10),
		shows: PODCAST_SHOWS
	};
}
