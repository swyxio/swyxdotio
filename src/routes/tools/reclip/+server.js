import { recordServerToolActivity } from '$lib/server/tools-activity.js';
import { requirePersonalToolsOwner } from '$lib/personal-tools-auth';
import page from './reclip.html?raw';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const user = await requirePersonalToolsOwner(event, '/tools/reclip');
	await recordServerToolActivity(event, user.id, 'reclip.open', 'succeeded');
	return new Response(page, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'private, no-store',
			'Referrer-Policy': 'no-referrer',
			'X-Content-Type-Options': 'nosniff',
			'X-Robots-Tag': 'noindex, nofollow, noarchive'
		}
	});
}
