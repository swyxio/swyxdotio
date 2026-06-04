import { abortPodcastUpload } from '$lib/podcast-admin';
import { privateJson, requirePodcastStudio } from '$lib/podcast-admin-route';

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	const bucket = await requirePodcastStudio(event);
	await abortPodcastUpload(bucket, await event.request.json());
	return privateJson({ aborted: true });
}
