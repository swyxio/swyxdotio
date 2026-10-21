import { loadPersonalTools, requirePersonalToolsOwner } from '$lib/personal-tools-auth';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	await requirePersonalToolsOwner(event, '/tools/tabs');
	return loadPersonalTools(event);
}
