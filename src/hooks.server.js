// Edge caching for dynamic (on-demand) routes on Cloudflare Workers.
//
// Strategy: any GET response that opts in via `Cache-Control: s-maxage=...`
// is stored in the Cloudflare Cache API (`caches.default`). Subsequent
// requests are served from the edge cache in O(1) without re-rendering or
// hitting the GitHub API. Freshness is driven by `s-maxage`, and edits are made
// live instantly by the `/api/revalidate` webhook which purges the affected
// URLs. Cloudflare Cache API ignores `stale-while-revalidate` on cache.put().
//
// In dev / non-Cloudflare runtimes `caches` is undefined and we no-op.

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

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	// `caches.default` is Cloudflare-specific; undefined in dev / non-CF runtimes.
	const cache = /** @type {any} */ (globalThis.caches)?.default;
	const cacheable = event.request.method === 'GET' && !!cache;
	const cacheUrl = new URL(event.request.url);
	if (
		cacheUrl.pathname === '/api/listContent.json' ||
		cacheUrl.pathname === '/api/latestPosts.json'
	) {
		cacheUrl.search = '';
	}
	const cacheRequest = new Request(cacheUrl.toString(), event.request);

	// Cache reads must never break the request — fall through to render on any error.
	if (cacheable) {
		try {
			const hit = await cache.match(cacheRequest);
			if (hit) return hit;
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

	return response;
}
