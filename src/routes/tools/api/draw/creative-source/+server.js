import { runCreativeSource } from '$lib/server/draw-creative-sources.js';

export const prerender = false;

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	return runCreativeSource(event);
}
