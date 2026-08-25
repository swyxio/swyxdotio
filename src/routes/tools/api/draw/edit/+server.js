import { cancelDrawingImage, editDrawingImage, pollDrawingImage } from '$lib/server/draw-fal.js';

export const prerender = false;

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	return editDrawingImage(event);
}

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	return pollDrawingImage(event);
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE(event) {
	return cancelDrawingImage(event);
}
