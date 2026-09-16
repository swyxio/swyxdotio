import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET() {
	throw redirect(302, 'https://drive.swyx.io/');
}
