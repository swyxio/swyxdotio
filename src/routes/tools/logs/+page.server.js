import { redirect } from '@sveltejs/kit';
import { loadPersonalTools } from '$lib/personal-tools-auth.js';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const session = await loadPersonalTools(event);
	if (!session.user) throw redirect(303, '/tools?next=/tools/logs');
	return { user: session.user };
}
