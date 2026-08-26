import { withServerToolActivity } from '$lib/server/tools-activity.js';
import { completeArchiveUpload } from '$lib/podcast-admin';
import { privateJson, requirePodcastStudio } from '$lib/podcast-admin-route';

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	const bucket = await requirePodcastStudio(event);
	return withServerToolActivity(event, 'podcast.archive.complete', async () => {
		return privateJson(await completeArchiveUpload(bucket, await event.request.json()));
	});
}
