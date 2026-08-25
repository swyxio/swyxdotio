import { editDrawingImage } from '$lib/server/draw-fal.js';

export const prerender = false;

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	return editDrawingImage(event);
}
