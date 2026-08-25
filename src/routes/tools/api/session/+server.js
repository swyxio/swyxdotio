import {
	clearPersonalToolsSession,
	createPersonalToolsSession,
	isPersonalToolsSessionAuthenticated
} from '$lib/personal-tools-auth';
import { privateJson } from '$lib/podcast-admin-route';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	return privateJson({ authenticated: await isPersonalToolsSessionAuthenticated(event) });
}

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	const body = await event.request.json().catch(() => ({}));
	await createPersonalToolsSession(event, body.password);
	return privateJson({ authenticated: true });
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE(event) {
	clearPersonalToolsSession(event);
	return privateJson({ authenticated: false });
}
