import { PODCAST_SHOWS } from '$lib/podcast-admin';
import { loadPersonalTools, requirePersonalToolsOwner } from '$lib/personal-tools-auth';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	await requirePersonalToolsOwner(event, '/tools/podcast');
	return {
		...(await loadPersonalTools(event)),
		defaultPublishDate: new Date().toISOString().slice(0, 10),
		shows: PODCAST_SHOWS
	};
}
