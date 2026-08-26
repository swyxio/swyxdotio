const ARCHIVE = 'https://swyx.io/podcasts#learn-in-podcast';

export default {
	/** @param {Request} request */
	fetch(request) {
		if (new URL(request.url).hostname !== 'mixtape.swyx.io') {
			return new Response('Not found', { status: 404 });
		}
		if (!['GET', 'HEAD'].includes(request.method)) {
			return new Response('Method not allowed', {
				status: 405,
				headers: { Allow: 'GET, HEAD' }
			});
		}
		return new Response(null, {
			status: 301,
			headers: {
				Location: ARCHIVE,
				'Cache-Control': 'public, max-age=3600'
			}
		});
	}
};
