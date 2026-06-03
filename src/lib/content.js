import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import grayMatter from 'gray-matter';

import {
	GH_USER_REPO,
	APPROVED_POSTERS_GH_USERNAME,
	GH_PUBLISHED_TAGS,
	REPO_OWNER
} from './siteConfig';
import slugify from 'slugify';
import { renderMarkdown } from './markdown';

/**
 * Minimal parser for the GitHub `Link` header — returns the `next` page URL
 * if present. Replaces `parse-link-header` (which depends on node builtins).
 * @param {string | null} header
 * @returns {string | null}
 */
function nextLink(header) {
	if (!header) return null;
	for (const part of header.split(',')) {
		const m = part.match(/<([^>]+)>;\s*rel="?next"?/);
		if (m) return m[1];
	}
	return null;
}

/** @type {import('./types').ContentItem[]} */
let allBlogposts = [];
// let etag = null // todo - implmement etag header


/**
 * @param {string} text
 * @returns {string}
 */
function readingTime(text) {
	let minutes = Math.ceil(text.trim().split(' ').length / 225);
	return minutes > 1 ? `${minutes} minutes` : `${minutes} minute`;
}

export async function listContent(providedFetch) {
	// use a diff var so as to not have race conditions while fetching
	// TODO: make sure to handle this better when doing etags or cache restore

	/** @type {import('./types').ContentItem[]} */
	let _allBlogposts = [];
	let next = null;
	let limit = 0; // just a failsafe against infinite loop - feel free to remove
	// env.GH_TOKEN works on both Cloudflare (platform.env) and Node (process.env).
	// GitHub's API REQUIRES a User-Agent header — Node's fetch sets one automatically
	// but Cloudflare Workers' fetch does not, so we set it explicitly or GitHub returns
	// "Request forbidden by administrative rules" (a non-JSON 403 body).
	const ghHeaders = {
		'User-Agent': GH_USER_REPO,
		...(env.GH_TOKEN ? { Authorization: `token ${env.GH_TOKEN}` } : {})
	};
	let url =
		`https://api.github.com/repos/${GH_USER_REPO}/issues?` +
		new URLSearchParams({
			state: 'all',
			labels: GH_PUBLISHED_TAGS.toString(),
			per_page: '100',
		});
	// pull issues created by owner only if allowed author = repo owner
	if (APPROVED_POSTERS_GH_USERNAME.length === 1 && APPROVED_POSTERS_GH_USERNAME[0] === REPO_OWNER) {
		url += '&' + new URLSearchParams({ creator: REPO_OWNER });
	}
	do {
		const res = await providedFetch(next ?? url, {
			headers: ghHeaders
		});

		const issues = await res.json();
		if ('message' in issues && res.status > 400) {
			if (allBlogposts.length > 0) {
				console.error(
					'failed to refresh blogposts from GitHub; serving cached blogposts',
					res.status,
					res.statusText,
					issues.message
				);
				return allBlogposts;
			}
			throw new Error(res.status + ' ' + res.statusText + '\n' + (issues && issues.message));
		}
		issues.forEach(
			/** @param {import('./types').GithubIssue} issue */
			(issue) => {
				if (
					// labels check not needed anymore as we have set the labels param in github api
					// issue.labels.some((label) => GH_PUBLISHED_TAGS.includes(label.name)) &&
					APPROVED_POSTERS_GH_USERNAME.includes(issue.user.login)
				) {
					_allBlogposts.push(parseIssue(issue));
				}
			}
		);
		next = nextLink(res.headers.get('Link'));
	} while (next && limit++ < 1000); // just a failsafe against infinite loop - feel free to remove
	_allBlogposts.sort((a, b) => b.date.valueOf() - a.date.valueOf()); // use valueOf to make TS happy https://stackoverflow.com/a/60688789/1106414
	allBlogposts = _allBlogposts;
	return _allBlogposts;
}

/**
 * @param {Function} providedFetch from sveltekit
 * @param {string} slug of the file to retrieve
 * @returns {Promise<import('./types').ContentItem[]>}
 */
export async function getContent(providedFetch, slug) {
	// get all blogposts if not already done - or in development
	if (dev || allBlogposts.length === 0) {
		console.log('loading allBlogposts');
		allBlogposts = await listContent(providedFetch);
		console.log('loaded ' + allBlogposts.length + ' blogposts');
		if (!allBlogposts.length)
			throw new Error('failed to load blogposts for some reason. check GH_TOKEN');
	}
	if (!allBlogposts.length) throw new Error('no blogposts');
	// find the blogpost that matches this slug
	const blogpost = allBlogposts.find((post) => post.slug === slug);
	if (blogpost) {
		// render markdown -> trusted HTML string via marked + shiki (see ./markdown.js)
		// youtube/tweet shortcodes and GitHub autolinks are handled as marked extensions
		const content = await renderMarkdown(blogpost.content);

		return { ...blogpost, content };
	} else {
		throw new Error('Blogpost not found for slug: ' + slug);
	}
}

/**
 * @param {import('./types').GithubIssue} issue
 * @returns {import('./types').ContentItem}
 */
function parseIssue(issue) {
	const src = issue.body;
	try {
		const { content, data } = grayMatter(src);
		let title = data.title ?? issue.title;
		let slug;
		if (data.slug) {
			slug = data.slug;
		} else if (data.devToUrl) {
			slug = data.devToUrl.split('/')[4] // if from devto, but no slug, it used the devto slug
		} else {
			slug = slugify(title, {remove: /[*+~.()'"!:@]/g}); // otherwise titles with : colons wont parse
		}

		let description = data.description ?? content.trim().split('\n')[0];
		// extract plain text from the (usually single-line) description
		description = description.replace(/\n/g, ' ');
		// strip basic markdown emphasis/link syntax so the meta description is clean text
		description = description
			.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // [text](url) / ![alt](url) -> text
			.replace(/[*_`~]/g, ''); // emphasis / code markers
		// strip html
		description = description.replace(/<[^>]*>?/gm, '');
		// strip markdown
		// description = description.replace(/[[\]]/gm, '');
	
		// you may wish to use a truncation approach like this instead...
		// let description = (data.content.length > 300) ? data.content.slice(0, 300) + '...' : data.content

		let tags = [];
		if (data.tags)
			tags = Array.isArray(data.tags)
				? data.tags
				: [...data.tags.split(',').map((tag) => tag.trim())];
		else if (data.categories) {
			tags = Array.isArray(data.categories)
				? data.categories
				: [...data.categories.split(',').map((tag) => tag.trim())];
			console.log(`${slug} is still using the categories field`);
		} else {
			// console.log(`WARN: ${slug} has no tags`) // todo: go thru and check thru old content
		}
		tags = tags.map((tag) => tag.toLowerCase());

		return {
			type: 'blog', // futureproof in case you want to add other types of content
			content,
			frontmatter: data,
			title,
			subtitle: data.subtitle,
			description,
			category: data.category?.toLowerCase() || 'note', // all posts assumed to be "note"s unless otherwise specified
			tags,
			image: data.image ?? data.cover_image,
			canonical: data.canonical || data.canonical_url, // for canonical URLs of something published elsewhere
			slug: `${slug}`.toLowerCase(),
			date: new Date(data.date ?? data.devToPublishedAt ?? issue.created_at),
			readingTime: readingTime(content),
			ghMetadata: {
				issueUrl: issue.html_url,
				commentsUrl: issue.comments_url,
				title: issue.title,
				created_at: issue.created_at,
				updated_at: issue.updated_at,
				reactions: issue.reactions
			}
		};
	} catch (err) {
		console.log(issue.title, err);
		throw err;
	}
}
