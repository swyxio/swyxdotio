import { getToolsUser } from './tools-auth.js';

const MAX_BODY_BYTES = 128 * 1024;
const jobPath = /^(status|file)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** @param {number} status @param {string} message */
function failure(status, message) {
	return Response.json(
		{ error: message },
		{ status, headers: { 'Cache-Control': 'private, no-store' } }
	);
}

/** Read no more than the maximum even when Content-Length is missing. @param {Request} request */
async function limitedBody(request) {
	if (!request.body) return new Uint8Array();
	const reader = request.body.getReader();
	const chunks = [];
	let size = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > MAX_BODY_BYTES) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
	const body = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return body;
}

/** @param {import('@sveltejs/kit').RequestEvent} event */
export async function proxyReclip(event) {
	const user = await getToolsUser(event);
	if (!user) return failure(401, 'Sign in with Google');
	if (!user.isOwner) return failure(403, 'This tool is available only to the site owner.');
	const path = event.params.path ?? '';
	const method = event.request.method;
	if (
		event.url.search ||
		!(
			(method === 'POST' && /^(info|download)$/.test(path)) ||
			(method === 'GET' && jobPath.test(path))
		)
	)
		return failure(404, 'Not found');

	const headers = new Headers();
	let body;
	if (method === 'POST') {
		if (
			event.request.headers.get('origin') !== event.url.origin ||
			(event.request.headers.has('sec-fetch-site') &&
				event.request.headers.get('sec-fetch-site') !== 'same-origin')
		)
			return failure(403, 'Cross-origin request denied');
		if (!/^application\/json(?:\s*;|\s*$)/i.test(event.request.headers.get('content-type') || ''))
			return failure(415, 'Content-Type must be application/json');
		body = await limitedBody(event.request);
		if (!body) return failure(413, 'Request too large');
		headers.set('content-type', 'application/json');
	} else {
		const range = event.request.headers.get('range');
		if (range) headers.set('range', range);
	}

	const service = event.platform?.env?.RECLIP_SERVICE;
	if (!service) return failure(503, 'Downloader unavailable');
	try {
		const request = new Request(`https://reclip.internal/api/${path}`, { method, headers, body });
		const upstream = await service.fetch(request);
		const responseHeaders = new Headers({
			'Cache-Control': 'private, no-store',
			'Referrer-Policy': 'no-referrer',
			'X-Content-Type-Options': 'nosniff'
		});
		for (const name of [
			'content-type',
			'content-length',
			'content-range',
			'content-disposition',
			'accept-ranges',
			'etag'
		]) {
			const value = upstream.headers.get(name);
			if (value) responseHeaders.set(name, value);
		}
		return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
	} catch {
		return failure(502, 'Downloader unavailable');
	}
}
