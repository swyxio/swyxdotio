import { PODCAST_SHOWS } from '$lib/podcast-admin';
import { loadPersonalTools, personalToolsActions } from '$lib/personal-tools-auth';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	return {
		...(await loadPersonalTools(event)),
		defaultPublishDate: new Date().toISOString().slice(0, 10),
		shows: PODCAST_SHOWS
	};
}

/** @type {import('./$types').Actions} */
export const actions = personalToolsActions;
