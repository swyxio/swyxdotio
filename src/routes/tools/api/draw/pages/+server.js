import { forwardDrawingRequest } from './workspace.js';

export const prerender = false;

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	return forwardDrawingRequest(event);
}

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	return forwardDrawingRequest(event, { mutation: true });
}
