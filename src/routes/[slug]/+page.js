import { error } from '@sveltejs/kit';
import { REPO_URL } from '$lib/siteConfig';
import { isBlogSlug } from '$lib/slug';

// Posts are rendered on-demand (SSR on Cloudflare Workers) and cached at the
// edge via the Cache API (see src/hooks.server.js). New posts therefore appear
// without a rebuild; freshness on edits is handled by the /api/revalidate
// webhook which purges the affected URLs.
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, setHeaders }) {
	const slug = params.slug;
	if (!isBlogSlug(slug)) {
		throw error(404, 'Not found');
	}
	let [pageData, listData] = await Promise.all([
		fetch(`/api/ideas/${slug}.json`),
		fetch(`/api/latestPosts.json`).catch((err) => {
			console.error('error fetching latest posts for blog post page', err);
			return null;
		})
	]);
	if (pageData.status > 400) {
		throw error(pageData.status, await pageData.text());
	}
	let list = [];
	if (listData && listData.status > 400) {
		console.error('latest posts returned an error', listData.status, await listData.text());
	} else if (listData) {
		list = (await listData.json()).slice(0, 10);
	}
	setHeaders({
		// browser revalidates; shared/edge cache holds for a day and may serve
		// stale for a week while revalidating. Edits are purged via /api/revalidate.
		'cache-control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800'
	});
	return {
		json: await pageData.json(),
		list,
		slug,
		REPO_URL
	};
	// } catch (err) {
	// 	console.error('error fetching blog post at [slug].svelte: ' + slug, res, err);
	// 	throw error(500, 'error fetching blog post at [slug].svelte: ' + slug + ': ' + res);
	// }
}
