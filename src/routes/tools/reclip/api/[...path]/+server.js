import { proxyReclip } from '$lib/server/reclip-proxy.js';

/** @type {import('./$types').RequestHandler} */
export const GET = proxyReclip;
/** @type {import('./$types').RequestHandler} */
export const POST = proxyReclip;
