import { getToolsActivityLogs, postToolsActivity } from '$lib/server/tools-activity.js';

/** @type {import('./$types').RequestHandler} */
export const GET = (event) => getToolsActivityLogs(event);

/** @type {import('./$types').RequestHandler} */
export const POST = (event) => postToolsActivity(event);
