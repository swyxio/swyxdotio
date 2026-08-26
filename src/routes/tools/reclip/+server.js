import { recordServerToolActivity } from '$lib/server/tools-activity.js';
import { error, redirect } from '@sveltejs/kit';
import { requirePersonalToolsOwner } from '$lib/personal-tools-auth';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const user = await requirePersonalToolsOwner(event, '/tools/reclip');
	const target = event.platform?.env?.RECLIP_URL;
	if (!target) {
		await recordServerToolActivity(event, user.id, 'reclip.open', 'failed');
		throw error(503, 'Reclip URL is not configured');
	}
	let url;
	try {
		url = new URL(target);
		if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid target');
	} catch {
		await recordServerToolActivity(event, user.id, 'reclip.open', 'failed');
		throw error(500, 'Reclip URL is invalid');
	}
	await recordServerToolActivity(event, user.id, 'reclip.open', 'succeeded');
	throw redirect(302, url.href);
}
