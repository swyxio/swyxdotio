import { loadPersonalTools } from '$lib/personal-tools-auth';
import { safeToolsNext } from '$lib/server/tools-auth';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	return {
		...(await loadPersonalTools(event)),
		next: safeToolsNext(event.url.searchParams.get('next')),
		authError: event.url.searchParams.has('authError')
			? 'Google sign-in did not finish. Please try again.'
			: ''
	};
}
