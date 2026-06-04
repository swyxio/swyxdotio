import { loadPersonalTools } from '$lib/personal-tools-auth';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const tools = await loadPersonalTools(event);
	const next = event.url.searchParams.get('next');
	return {
		...tools,
		next: next?.startsWith('/tools/') ? next : '/tools'
	};
}
