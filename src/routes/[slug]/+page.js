import { error } from '@sveltejs/kit';
import { REPO_URL } from '$lib/siteConfig';
import { isBlogSlug } from '$lib/slug';

// we choose NOT to prerender blog pages because it is easier to edit and see changes immediately
// instead we set cache control headers
// export const prerender = true

// March 2023 update - we are going back to prerender because we are seeing 6 seconds render times
// https://www.webpagetest.org/result/230309_AiDcTC_7S0/1/details/#waterfall_view_step1
export const prerender = 'auto';

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
	if (listData?.status > 400) {
		console.error('latest posts returned an error', listData.status, await listData.text());
	} else if (listData) {
		list = (await listData.json()).slice(0, 10);
	}
	setHeaders({
		'cache-control': 'public, max-age=3600' // 1 hour
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
