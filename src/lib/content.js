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
import { extractContentDescription } from './content-description.js';
import { isBlogSlug, normalizeBlogSlug } from './slug';
import {
	isContentManifestStale,
	readContentManifest,
	writeContentManifest
} from './content-manifest';

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
/** @type {Promise<import('./types').ContentItem[]> | undefined} */
let backgroundRefresh;
// let etag = null // todo - implmement etag header

const GITHUB_FETCH_MAX_ATTEMPTS = 3;
const GITHUB_FETCH_RETRY_DELAY_MS = 100;

/**
 * @param {string} text
 * @returns {string}
 */
function readingTime(text) {
	let minutes = Math.ceil(text.trim().split(' ').length / 225);
	return minutes > 1 ? `${minutes} minutes` : `${minutes} minute`;
}

/**
 * @param {string} url
 * @returns {string}
 */
function safeEndpoint(url) {
	try {
		const parsedUrl = new URL(url);
		return parsedUrl.origin + parsedUrl.pathname;
	} catch {
		return 'invalid GitHub URL';
	}
}

/**
 * @param {unknown} err
 * @returns {string}
 */
function errorName(err) {
	return err instanceof Error ? err.name : typeof err;
}

/**
 * @param {number} attempt
 * @returns {Promise<void>}
 */
function waitForRetry(attempt) {
	const delay = Math.min(GITHUB_FETCH_RETRY_DELAY_MS * attempt, 500);
	return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * @param {number} status
 * @returns {boolean}
 */
function isTransientStatus(status) {
	return status === 403 || status === 429 || status >= 500;
}

/**
 * @param {typeof globalThis.fetch} providedFetch
 * @param {string} url
 * @param {Record<string, string>} headers
 * @returns {Promise<{ issues: import('./types').GithubIssue[], next: string | null }>}
 */
async function fetchGithubIssuesPage(providedFetch, url, headers) {
	for (let attempt = 1; attempt <= GITHUB_FETCH_MAX_ATTEMPTS; attempt++) {
		let res;
		try {
			res = await providedFetch(url, { headers });
		} catch (err) {
			const willRetry = attempt < GITHUB_FETCH_MAX_ATTEMPTS;
			console.error('GitHub content fetch failed', {
				endpoint: safeEndpoint(url),
				attempt,
				maxAttempts: GITHUB_FETCH_MAX_ATTEMPTS,
				failure: 'fetch',
				errorName: errorName(err),
				willRetry
			});
			if (willRetry) {
				await waitForRetry(attempt);
				continue;
			}
			throw new Error('GitHub content fetch failed after retries');
		}

		if (!res.ok) {
			const willRetry = isTransientStatus(res.status) && attempt < GITHUB_FETCH_MAX_ATTEMPTS;
			console.error('GitHub content fetch failed', {
				endpoint: safeEndpoint(url),
				attempt,
				maxAttempts: GITHUB_FETCH_MAX_ATTEMPTS,
				failure: 'http',
				status: res.status,
				statusText: res.statusText,
				willRetry
			});
			if (willRetry) {
				await waitForRetry(attempt);
				continue;
			}
			throw new Error(`GitHub content fetch failed (${res.status} ${res.statusText})`);
		}

		let issues;
		try {
			issues = await res.json();
		} catch (err) {
			const willRetry = attempt < GITHUB_FETCH_MAX_ATTEMPTS;
			console.error('GitHub content fetch failed', {
				endpoint: safeEndpoint(url),
				attempt,
				maxAttempts: GITHUB_FETCH_MAX_ATTEMPTS,
				failure: 'non-json',
				status: res.status,
				errorName: errorName(err),
				willRetry
			});
			if (willRetry) {
				await waitForRetry(attempt);
				continue;
			}
			throw new Error('GitHub content fetch returned non-JSON after retries');
		}

		if (!Array.isArray(issues)) {
			const willRetry = attempt < GITHUB_FETCH_MAX_ATTEMPTS;
			console.error('GitHub content fetch failed', {
				endpoint: safeEndpoint(url),
				attempt,
				maxAttempts: GITHUB_FETCH_MAX_ATTEMPTS,
				failure: 'unexpected-json-shape',
				status: res.status,
				willRetry
			});
			if (willRetry) {
				await waitForRetry(attempt);
				continue;
			}
			throw new Error('GitHub content fetch returned unexpected JSON after retries');
		}

		return { issues, next: nextLink(res.headers.get('Link')) };
	}

	throw new Error('GitHub content fetch failed after retries');
}

/**
 * @param {typeof globalThis.fetch | undefined} providedFetch
 * @returns {Promise<import('./types').ContentItem[]>}
 */
async function fetchContentFromGithub(providedFetch) {
	// use a diff var so as to not have race conditions while fetching
	// TODO: make sure to handle this better when doing etags or cache restore

	/** @type {import('./types').ContentItem[]} */
	let _allBlogposts = [];
	const contentFetch = providedFetch ?? globalThis.fetch;
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
			per_page: '100'
		});
	// pull issues created by owner only if allowed author = repo owner
	if (APPROVED_POSTERS_GH_USERNAME.length === 1 && APPROVED_POSTERS_GH_USERNAME[0] === REPO_OWNER) {
		url += '&' + new URLSearchParams({ creator: REPO_OWNER });
	}
	do {
		const page = await fetchGithubIssuesPage(contentFetch, next ?? url, ghHeaders);
		page.issues.forEach(
			/** @param {import('./types').GithubIssue} issue */
			(issue) => {
				if (
					// labels check not needed anymore as we have set the labels param in github api
					// issue.labels.some((label) => GH_PUBLISHED_TAGS.includes(label.name)) &&
					APPROVED_POSTERS_GH_USERNAME.includes(issue.user.login)
				) {
					const blogpost = parseIssue(issue);
					if (blogpost) _allBlogposts.push(blogpost);
				}
			}
		);
		next = page.next;
	} while (next && limit++ < 1000); // just a failsafe against infinite loop - feel free to remove
	_allBlogposts.sort((a, b) => b.date.valueOf() - a.date.valueOf()); // use valueOf to make TS happy https://stackoverflow.com/a/60688789/1106414
	return _allBlogposts;
}

/**
 * @param {typeof globalThis.fetch | undefined} providedFetch
 * @param {import('./content-manifest').ContentManifestStore | undefined} contentManifest
 * @param {{ requireManifestWrite?: boolean }} [options]
 * @returns {Promise<import('./types').ContentItem[]>}
 */
export async function refreshContentManifest(
	providedFetch,
	contentManifest,
	{ requireManifestWrite = false } = {}
) {
	const refreshedBlogposts = await fetchContentFromGithub(providedFetch);
	allBlogposts = refreshedBlogposts;
	try {
		const persisted = await writeContentManifest(contentManifest, refreshedBlogposts);
		if (requireManifestWrite && !persisted) {
			throw new Error('CONTENT_MANIFEST KV binding not configured');
		}
	} catch (err) {
		console.error('Content manifest write failed', { errorName: errorName(err) });
		if (requireManifestWrite) throw err;
	}
	return refreshedBlogposts;
}

/**
 * @param {typeof globalThis.fetch | undefined} providedFetch
 * @param {import('./content-manifest').ContentManifestStore | undefined} contentManifest
 * @param {{ context?: { waitUntil(promise: Promise<unknown>): void } }} [options]
 * @returns {Promise<import('./types').ContentItem[]>}
 */
export async function listContent(providedFetch, contentManifest, { context } = {}) {
	const persistedManifest = await readContentManifest(contentManifest);
	if (persistedManifest) {
		allBlogposts = persistedManifest.blogposts;
		if (context?.waitUntil && isContentManifestStale(persistedManifest)) {
			if (!backgroundRefresh) {
				backgroundRefresh = refreshContentManifest(providedFetch, contentManifest)
					.catch((err) => {
						console.error('Background content manifest refresh failed', {
							errorName: errorName(err)
						});
						return allBlogposts;
					})
					.finally(() => {
						backgroundRefresh = undefined;
					});
			}
			context.waitUntil(backgroundRefresh);
		}
		return persistedManifest.blogposts;
	}
	try {
		return await refreshContentManifest(providedFetch, contentManifest);
	} catch (err) {
		if (allBlogposts.length > 0) {
			console.error('GitHub content refresh failed; serving stale cache', {
				cachedBlogposts: allBlogposts.length,
				errorName: errorName(err)
			});
			return allBlogposts;
		}
		throw err;
	}
}

/**
 * @param {typeof globalThis.fetch} providedFetch from sveltekit
 * @param {string} slug of the file to retrieve
 * @param {import('./content-manifest').ContentManifestStore | undefined} contentManifest
 * @param {{ context?: { waitUntil(promise: Promise<unknown>): void } }} [options]
 * @returns {Promise<import('./types').ContentItem>}
 */
export async function getContent(providedFetch, slug, contentManifest, options) {
	console.log('loading allBlogposts');
	allBlogposts = await listContent(providedFetch, contentManifest, options);
	console.log('loaded ' + allBlogposts.length + ' blogposts');
	if (!allBlogposts.length)
		throw new Error('failed to load blogposts for some reason. check GH_TOKEN');
	if (!allBlogposts.length) throw new Error('no blogposts');
	// find the blogpost that matches this slug
	const blogpost = allBlogposts.find((post) => post.slug === slug);
	if (blogpost) {
		// render markdown -> trusted HTML string via marked + shiki (see ./markdown.js)
		// youtube/tweet shortcodes and GitHub autolinks are handled as marked extensions
		const content = await renderMarkdown(blogpost.content ?? '');

		return { ...blogpost, content };
	} else {
		throw new Error('Blogpost not found for slug: ' + slug);
	}
}

/**
 * @param {import('./types').GithubIssue} issue
 * @returns {import('./types').ContentItem | null}
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
			slug = data.devToUrl.split('/')[4]; // if from devto, but no slug, it used the devto slug
		} else {
			slug = slugify(title, { remove: /[*+~.()'"!:@]/g }); // otherwise titles with : colons wont parse
		}
		slug = normalizeBlogSlug(slug);
		if (!isBlogSlug(slug)) {
			console.warn('Skipping published issue with invalid or reserved blog slug', {
				issueUrl: issue.html_url,
				slug
			});
			return null;
		}

		const description = extractContentDescription(content, data.description);

		let tags = [];
		if (data.tags)
			tags = Array.isArray(data.tags)
				? data.tags
				: [...data.tags.split(',').map((/** @type {string} */ tag) => tag.trim())];
		else if (data.categories) {
			tags = Array.isArray(data.categories)
				? data.categories
				: [...data.categories.split(',').map((/** @type {string} */ tag) => tag.trim())];
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
			isPrivate: Boolean(data.isPrivate ?? data.private ?? false),
			image: data.image ?? data.cover_image,
			canonical: data.canonical || data.canonical_url, // for canonical URLs of something published elsewhere
			slug,
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
