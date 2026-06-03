// On-demand revalidation: GitHub Issues webhook -> purge the Cloudflare edge cache
// for the affected post + list pages, so edits go live in seconds instead of
// waiting for the s-maxage TTL.
//
// Configure a GitHub webhook (content-type application/json, event: Issues)
// pointing at https://<site>/api/revalidate with secret = GH_WEBHOOK_SECRET.
import { error, json } from '@sveltejs/kit';
import grayMatter from 'gray-matter';
import slugify from 'slugify';
import { SITE_URL } from '$lib/siteConfig';
import { refreshContentManifest } from '$lib/content';
import { env } from '$env/dynamic/private';

export const prerender = false;

/** Constant-time-ish HMAC SHA-256 verification of the GitHub signature. */
async function verifySignature(secret, payload, signatureHeader) {
	if (!signatureHeader?.startsWith('sha256=')) return false;
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
	const expected =
		'sha256=' + [...new Uint8Array(sigBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
	// length-safe compare
	if (expected.length !== signatureHeader.length) return false;
	let mismatch = 0;
	for (let i = 0; i < expected.length; i++) {
		mismatch |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
	}
	return mismatch === 0;
}

/** Derive the post slug from the issue, mirroring parseIssue() in content.js. */
function deriveSlug(issue) {
	try {
		const { data } = grayMatter(issue.body || '');
		let slug;
		if (data.slug) slug = data.slug;
		else if (data.devToUrl) slug = data.devToUrl.split('/')[4];
		else slug = slugify(data.title ?? issue.title, { remove: /[*+~.()'"!:@]/g });
		return `${slug}`.toLowerCase();
	} catch {
		return null;
	}
}

/** Derive the previous slug when an edit renamed the post URL. */
function derivePreviousSlug(payload) {
	const previousBody = payload.changes?.body?.from;
	const previousTitle = payload.changes?.title?.from;
	if (!previousBody && !previousTitle) return null;
	return deriveSlug({
		...payload.issue,
		body: previousBody ?? payload.issue.body,
		title: previousTitle ?? payload.issue.title
	});
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform, fetch }) {
	const secret = env.GH_WEBHOOK_SECRET;
	if (!secret) throw error(500, 'GH_WEBHOOK_SECRET not configured');

	const raw = await request.text();
	const signature = request.headers.get('x-hub-signature-256');
	if (!(await verifySignature(secret, raw, signature))) {
		throw error(401, 'invalid signature');
	}

	const event = request.headers.get('x-github-event');
	if (event !== 'issues') {
		return json({ ok: true, skipped: `event ${event}` });
	}

	/** @type {{ action: string, issue: any, changes?: { body?: { from?: string }, title?: { from?: string } } }} */
	const payload = JSON.parse(raw);
	const slug = deriveSlug(payload.issue);
	const previousSlug = derivePreviousSlug(payload);
	let refreshedBlogposts;
	try {
		refreshedBlogposts = await refreshContentManifest(fetch, platform?.env?.CONTENT_MANIFEST, {
			requireManifestWrite: true
		});
	} catch (err) {
		console.error('Content manifest refresh failed; keeping existing edge cache', err);
		throw error(502, 'content manifest refresh failed');
	}

	// URLs whose cached render is affected by a publish/edit.
	const paths = [
		'/',
		'/ideas',
		'/rss.xml',
		'/sitemap.xml',
		'/api/listContent.json',
		'/api/latestPosts.json'
	];
	if (slug) {
		paths.push(`/${slug}`, `/api/ideas/${slug}.json`);
	}
	if (previousSlug && previousSlug !== slug) {
		paths.push(`/${previousSlug}`, `/api/ideas/${previousSlug}.json`);
	}
	const canonicalUrls = paths.map((p) => new URL(p, SITE_URL).toString());
	const requestOrigin = new URL(request.url).origin;
	const urls = [
		...new Set([...canonicalUrls, ...paths.map((p) => new URL(p, requestOrigin).toString())])
	];

	// Purge the Cloudflare edge cache (Cache API) for each URL.
	const cache = globalThis.caches?.default;
	let purged = 0;
	if (cache) {
		await Promise.all(
			urls.map(async (u) => {
				if (await cache.delete(u)) purged++;
			})
		);
	}

	// Optionally also issue a zone-wide purge via the Cloudflare API (covers
	// the global CDN, not just the local colo's Cache API).
	const apiToken = env.CF_API_TOKEN;
	const zoneId = env.CF_ZONE_ID;
	if (apiToken && zoneId) {
		try {
			const purgeResponse = await fetch(
				`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiToken}`,
						'content-type': 'application/json'
					},
					body: JSON.stringify({ files: canonicalUrls })
				}
			);
			if (!purgeResponse.ok) {
				console.error('cloudflare purge_cache failed', {
					status: purgeResponse.status,
					statusText: purgeResponse.statusText
				});
			}
		} catch (err) {
			console.error('cloudflare purge_cache failed', err);
		}
	}

	return json({
		ok: true,
		action: payload.action,
		slug,
		previousSlug,
		urls,
		purged,
		refreshedBlogposts: refreshedBlogposts.length
	});
}
