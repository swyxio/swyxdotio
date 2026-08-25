import { runDrawingAgent } from '$lib/server/draw-agent.js';

export const prerender = false;

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	return runDrawingAgent(event);
}
