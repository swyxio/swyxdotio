// Edge caching for dynamic (on-demand) routes on Cloudflare Workers.
//
// Strategy: any GET response that opts in via `Cache-Control: s-maxage=...`
// is stored in the Cloudflare Cache API (`caches.default`). Subsequent
// requests are served from the edge cache in O(1) without re-rendering or
// hitting the GitHub API. Freshness is driven by `s-maxage`, and edits are made
// live after the `/api/revalidate` webhook rolls the KV-backed cache generation.
// Cloudflare Cache API ignores `stale-while-revalidate` on cache.put().
//
// In dev / non-Cloudflare runtimes `caches` is undefined and we no-op.
import { readContentCacheGeneration } from '$lib/content-manifest';

// Security headers applied to all SSR/dynamic responses. On Cloudflare Workers
// the `_headers` file only covers static-asset responses (served by the asset
// handler), NOT responses rendered by this Worker — so we set them here to keep
// parity with the old Pages behavior across every page.
const SECURITY_HEADERS = {
	'X-Frame-Options': 'DENY',
	'X-XSS-Protection': '1; mode=block',
	'X-Content-Type-Options': 'nosniff',
	'X-Clacks-Overhead': 'GNU Terry Pratchett'
};

/**
 * Cache API entries keep their shared TTL internally, but public responses must
 * not be recached ahead of the Worker or versioned lookups cannot run.
 * @param {Response} response
 */

function toClientResponse(response, preservePublicCache = false) {
	const clientResponse = new Response(response.body, response);
	if (!preservePublicCache) {
		clientResponse.headers.set('Cache-Control', 'private, max-age=0, no-store');
	}
	return clientResponse;
}

/** @param {URL} url */
export function isVersionedOgRequest(url) {
	return url.pathname.startsWith('/og/') && url.searchParams.has('v');
}

/** @param {URL} url */
export function isPublicReadCountRequest(url) {
	return url.pathname.startsWith('/api/reads/');
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	// `caches.default` is Cloudflare-specific; undefined in dev / non-CF runtimes.
	const cache = /** @type {any} */ (globalThis.caches)?.default;
	const cacheUrl = new URL(event.request.url);
	const cacheable = event.request.method === 'GET' && !!cache;
	const preservePublicCache = isVersionedOgRequest(cacheUrl) || isPublicReadCountRequest(cacheUrl);
	if (
		cacheUrl.pathname === '/api/listContent.json' ||
		cacheUrl.pathname === '/api/latestPosts.json' ||
		cacheUrl.pathname === '/api/searchContent.json'
	) {
		cacheUrl.search = '';
	}
	if (cacheable) {
		const version = event.platform?.env?.CF_VERSION_METADATA?.id ?? 'local';
		const generation =
			(await readContentCacheGeneration(event.platform?.env?.CONTENT_MANIFEST)) ?? 'initial';
		cacheUrl.searchParams.set('__swyxCache', `${version}:${generation}`);
		// Clear entries written before cache keys were versioned. This is local
		// to the serving colo and can be removed after the transition TTL passes.
		const legacyCacheUrl = new URL(event.request.url);
		legacyCacheUrl.search = '';
		try {
			await cache.delete(new Request(legacyCacheUrl.toString(), event.request));
		} catch {
			/* ignore legacy cache cleanup failures */
		}
	}
	const cacheRequest = new Request(cacheUrl.toString(), event.request);

	// Cache reads must never break the request — fall through to render on any error.
	if (cacheable) {
		try {
			const hit = await cache.match(cacheRequest);
			if (hit) return toClientResponse(hit, preservePublicCache);
		} catch {
			/* ignore cache read failures */
		}
	}

	const response = await resolve(event);

	// Apply security headers before caching so the cached copy carries them too.
	for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
		response.headers.set(k, v);
	}

	if (cacheable && response.status === 200) {
		const cc = response.headers.get('cache-control') || '';
		// only cache responses that explicitly opt in to shared caching
		if (cc.includes('s-maxage')) {
			const toCache = response.clone();
			// IMPORTANT: call waitUntil/put on their owner objects so `this` is bound
			// correctly — destructuring them triggers "Illegal invocation" on Workers.
			const ctx = event.platform?.context;
			try {
				if (ctx?.waitUntil) {
					ctx.waitUntil(cache.put(cacheRequest, toCache));
				} else {
					// best-effort if no execution context is available
					await cache.put(cacheRequest, toCache);
				}
			} catch {
				/* ignore cache write failures */
			}
		}
	}

	return cacheable ? toClientResponse(response, preservePublicCache) : response;
}
