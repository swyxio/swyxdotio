import { error } from '@sveltejs/kit';
import { uploadArchivePart } from '$lib/podcast-admin';
import { privateJson, requirePodcastStudio } from '$lib/podcast-admin-route';

/** @type {import('./$types').RequestHandler} */
export async function PUT(event) {
	const bucket = await requirePodcastStudio(event);
	const body = await event.request.arrayBuffer();
	if (!body.byteLength) throw error(400, 'Upload part is empty');
	return privateJson(
		await uploadArchivePart(
			bucket,
			{
				objectKey: event.url.searchParams.get('objectKey'),
				uploadId: event.url.searchParams.get('uploadId'),
				partNumber: event.url.searchParams.get('partNumber')
			},
			body
		)
	);
}
