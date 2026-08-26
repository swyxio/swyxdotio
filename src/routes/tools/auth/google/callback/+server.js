import { finishGoogleSignIn } from '$lib/server/tools-google-auth.js';
/** @type {import('./$types').RequestHandler} */
export const GET = (event) => finishGoogleSignIn(event);
