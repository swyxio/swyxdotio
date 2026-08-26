const ARCHIVES = new Map([
	['mixtape.swyx.io', 'https://swyx.io/podcasts#learn-in-podcast'],
	['temporal.swyx.io', 'https://swyx.io/podcasts#the-temporal-podcast'],
	['careerchats.swyx.io', 'https://swyx.io/podcasts#career-chats']
]);

export default {
	/** @param {Request} request */
	fetch(request) {
		const archive = ARCHIVES.get(new URL(request.url).hostname);
		if (!archive) {
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
				Location: archive,
				'Cache-Control': 'public, max-age=3600'
			}
		});
	}
};
