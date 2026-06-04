// Markdown -> HTML rendering for blog posts.
// Replaces the old mdsvex + remark/rehype pipeline with `marked` + `shiki`.
// Output is a trusted HTML string consumed via {@html ...} in the post page.
import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { createHighlighter } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { GH_USER_REPO } from './siteConfig.js';

const THEME = 'github-dark';

// Languages we actually use in posts. `text` is a built-in plaintext fallback.
const LANGS = [
	'javascript',
	'typescript',
	'jsx',
	'tsx',
	'json',
	'bash',
	'shell',
	'html',
	'css',
	'svelte',
	'python',
	'yaml',
	'markdown',
	'go',
	'rust',
	'sql',
	'diff',
	'toml',
	'graphql'
];

/** @type {Promise<import('shiki').Highlighter> | null} */
let highlighterPromise = null;
function getHighlighter() {
	if (!highlighterPromise) {
		// Workers disallow runtime WASM compilation, so opt out of Shiki's
		// default Oniguruma engine and use native JavaScript RegExp instead.
		highlighterPromise = createHighlighter({
			themes: [THEME],
			langs: LANGS,
			engine: createJavaScriptRegexEngine()
		});
	}
	return highlighterPromise;
}

// --- YouTube embed (ported from the old `{% youtube %}` regex hack) ---
/** @param {string} url */
function youtubeParser(url) {
	const rx =
		/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/;
	const m = url.match(rx);
	return m ? m[1] : url.slice(-11);
}
/** @param {string} arg */
function youtubeEmbed(arg) {
	const videoId = arg.startsWith('https://') ? youtubeParser(arg) : arg;
	return `<iframe
		class="w-full object-contain"
		srcdoc="
			<style>
				body, .youtubeembed { width:100%; height:100%; margin:0; position:absolute; display:flex; justify-content:center; object-fit:cover; }
			</style>
			<a href='https://www.youtube.com/embed/${videoId}?autoplay=1' class='youtubeembed'>
				<img src='https://img.youtube.com/vi/${videoId}/sddefault.jpg' class='youtubeembed' />
				<svg version='1.1' viewBox='0 0 68 48' width='68px' style='position: relative;'>
					<path d='M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z' fill='#f00'></path>
					<path d='M 45,24 27,14 27,34' fill='#fff'></path>
				</svg>
			</a>
		"
		title="video" name="video"
		allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
		frameBorder="0" webkitallowfullscreen="true" mozallowfullscreen="true"
		width="600" height="400" allowFullScreen aria-hidden="true"></iframe>`;
}
/** @param {string} arg */
function tweetEmbed(arg) {
	const url = arg.startsWith('https://twitter.com/') ? arg : `https://twitter.com/x/status/${arg}`;
	return `<blockquote class="twitter-tweet" data-lang="en" data-dnt="true" data-theme="dark"><a href="${url}"></a></blockquote>
		<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`;
}

// --- marked extensions ---

// Block shortcodes: {% youtube ... %} and {% tweet ... %}
const shortcodeExtension = {
	name: 'shortcode',
	level: 'block',
	/** @param {string} src */
	start(src) {
		return src.match(/\{% /)?.index;
	},
	/** @param {string} src */
	tokenizer(src) {
		const m = /^\{% (youtube|tweet|twitter) (.*?) %\}\s*/.exec(src);
		if (m) return { type: 'shortcode', raw: m[0], kind: m[1], arg: m[2].trim() };
	},
	/** @param {import('marked').Tokens.Generic} token */
	renderer(token) {
		if (token.kind === 'youtube') return youtubeEmbed(token.arg);
		return tweetEmbed(token.arg);
	}
};

// GitHub issue references: #123 -> link to the repo's issues.
const ghIssueExtension = {
	name: 'ghIssue',
	level: 'inline',
	/** @param {string} src */
	start(src) {
		return src.match(/#\d/)?.index;
	},
	/** @param {string} src */
	tokenizer(src) {
		const m = /^#(\d+)\b/.exec(src);
		if (m) return { type: 'ghIssue', raw: m[0], num: m[1] };
	},
	/** @param {import('marked').Tokens.Generic} token */
	renderer(token) {
		return `<a href="https://github.com/${GH_USER_REPO}/issues/${token.num}">#${token.num}</a>`;
	}
};

// GitHub @mentions -> link to the user's profile.
// Note: backtick code spans are consumed before inline extensions run, so
// mentions inside `inline code` are left untouched. Emails are a known edge case.
const ghMentionExtension = {
	name: 'ghMention',
	level: 'inline',
	/** @param {string} src */
	start(src) {
		return src.match(/@[a-zA-Z0-9]/)?.index;
	},
	/** @param {string} src */
	tokenizer(src) {
		const m = /^@([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?)\b/.exec(src);
		if (m) return { type: 'ghMention', raw: m[0], user: m[1] };
	},
	/** @param {import('marked').Tokens.Generic} token */
	renderer(token) {
		return `<a href="https://github.com/${token.user}">@${token.user}</a>`;
	}
};

// Pre-highlight code tokens with Shiki, then emit as raw HTML.
const shikiWalk = {
	async: true,
	/** @param {import('marked').Token} token */
	async walkTokens(token) {
		if (token.type !== 'code') return;
		const highlighter = await getHighlighter();
		const loaded = highlighter.getLoadedLanguages();
		const lang = token.lang && loaded.includes(token.lang) ? token.lang : 'text';
		const html = highlighter.codeToHtml(token.text, { lang, theme: THEME });
		// Convert the code token into a raw HTML token so the renderer passes it through.
		const htmlToken = /** @type {import('marked').Tokens.HTML} */ (/** @type {unknown} */ (token));
		htmlToken.type = 'html';
		htmlToken.block = true;
		htmlToken.text = html;
	}
};

function createRenderer() {
	const marked = new Marked({ gfm: true, breaks: false });
	marked.use(gfmHeadingId());
	marked.use({ extensions: [shortcodeExtension, ghIssueExtension, ghMentionExtension] });
	marked.use(shikiWalk);
	return marked;
}

/** @type {Marked | undefined} */
let _marked;

/**
 * Render a markdown string to a trusted HTML string.
 * @param {string} md
 * @returns {Promise<string>}
 */
export async function renderMarkdown(md) {
	if (!_marked) _marked = createRenderer();
	return _marked.parse(md ?? '');
}
