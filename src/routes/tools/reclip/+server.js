import { error, redirect } from '@sveltejs/kit';
import { requirePersonalToolsSession } from '$lib/personal-tools-auth';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	await requirePersonalToolsSession(event, '/tools/reclip');
	const target = event.platform?.env?.RECLIP_URL;
	if (!target) throw error(503, 'Reclip URL is not configured');
	const url = new URL(target);
	if (!['http:', 'https:'].includes(url.protocol)) throw error(500, 'Reclip URL is invalid');
	throw redirect(302, url.href);
}
