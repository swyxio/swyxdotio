import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../src/routes/podcast/[slug]/rss.xml/+server.js';

test('podcast RSS streams the feed with explicit headers and its R2 ETag', async () => {
	const xml = '<rss><channel><title>Example podcast</title></channel></rss>';
	const response = await GET({
		params: { slug: 'learn-in-podcast' },
		platform: {
			env: {
				PODCAST_MEDIA: {
					async get(key) {
						assert.equal(key, 'feeds/learn-in-podcast.xml');
						return {
							body: new Response(xml).body,
							httpEtag: '"feed-etag"',
							writeHttpMetadata() {
								throw new Error('Local R2 proxy cannot serialize Node Headers');
							}
						};
					}
				}
			}
		}
	});

	assert.equal(response.status, 200);
	assert.equal(response.headers.get('content-type'), 'application/rss+xml; charset=utf-8');
	assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
	assert.equal(response.headers.get('etag'), '"feed-etag"');
	assert.equal(await response.text(), xml);
});

test('podcast RSS distinguishes a missing feed from unavailable storage', async () => {
	const params = { slug: 'missing-show' };
	assert.equal((await GET({ params })).status, 503);
	assert.equal(
		(await GET({ params, platform: { env: { PODCAST_MEDIA: { get: async () => null } } } })).status,
		404
	);
	assert.equal(
		(
			await GET({
				params,
				platform: {
					env: {
						PODCAST_MEDIA: {
							get: async () => {
								throw new Error('Unavailable');
							}
						}
					}
				}
			})
		).status,
		503
	);
});
