// Edge caching for dynamic (on-demand) routes on Cloudflare Pages.
//
// Strategy: any GET response that opts in via `Cache-Control: s-maxage=...`
// is stored in the Cloudflare Cache API (`caches.default`). Subsequent
// requests are served from the edge cache in O(1) without re-rendering or
// hitting the GitHub API. Freshness is driven by `s-maxage` +
// `stale-while-revalidate`, and edits are made live instantly by the
// `/api/revalidate` webhook which purges the affected URLs.
//
// In dev / non-Cloudflare runtimes `caches` is undefined and we no-op.

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	// `caches.default` is Cloudflare-specific; undefined in dev / non-CF runtimes.
	const cache = /** @type {any} */ (globalThis.caches)?.default;
	const cacheable = event.request.method === 'GET' && !!cache;

	// Cache reads must never break the request — fall through to render on any error.
	if (cacheable) {
		try {
			const hit = await cache.match(event.request);
			if (hit) return hit;
		} catch {
			/* ignore cache read failures */
		}
	}

	const response = await resolve(event);

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
					ctx.waitUntil(cache.put(event.request, toCache));
				} else {
					// best-effort if no execution context is available
					await cache.put(event.request, toCache);
				}
			} catch {
				/* ignore cache write failures */
			}
		}
	}

	return response;
}
