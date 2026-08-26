import { withServerToolActivity } from '$lib/server/tools-activity.js';
import { abortArchiveUpload } from '$lib/podcast-admin';
import { privateJson, requirePodcastStudio } from '$lib/podcast-admin-route';

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	const bucket = await requirePodcastStudio(event);
	return withServerToolActivity(event, 'podcast.archive.abort', async () => {
		await abortArchiveUpload(bucket, await event.request.json());
		return privateJson({ aborted: true });
	});
}
