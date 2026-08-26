import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	redirect(302, `https://cal.swyx.io/app${url.search}`);
}
