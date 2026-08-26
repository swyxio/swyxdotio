import { withServerToolActivity } from '$lib/server/tools-activity.js';
import { beginPodcastUpload } from '$lib/podcast-admin';
import { privateJson, requirePodcastStudio } from '$lib/podcast-admin-route';

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	const bucket = await requirePodcastStudio(event);
	return withServerToolActivity(event, 'podcast.upload.start', async () => {
		return privateJson(await beginPodcastUpload(bucket, await event.request.json()));
	});
}
