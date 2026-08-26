import { exportToolsActivityLogs } from '$lib/server/tools-activity.js';

/** @type {import('./$types').RequestHandler} */
export const GET = (event) => exportToolsActivityLogs(event);
