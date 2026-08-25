import { forwardDrawingRequest } from '../workspace.js';

export const prerender = false;

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	return forwardDrawingRequest(event);
}

/** @type {import('./$types').RequestHandler} */
export async function PUT(event) {
	return forwardDrawingRequest(event, { mutation: true });
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE(event) {
	return forwardDrawingRequest(event, { mutation: true });
}
