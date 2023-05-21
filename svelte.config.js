import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-netlify';
import { mdsvex } from 'mdsvex';
import remarkGithub from 'remark-github';
import remarkGfm from 'remark-gfm';
import remarkAbbr from 'remark-abbr';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
// import yaml from '@rollup/plugin-yaml' // didnt work at all

// mdsvex config
const mdsvexConfig = {
	extensions: ['.svelte.md', '.md', '.svx'],
	layout: {
		_: './src/mdsvexlayout.svelte' // default mdsvex layout
	},
	remarkPlugins: [
		[
			remarkGfm,
			{
				// Use your own repository
				repository: 'https://github.com/swyxio/swyxdotio'
			}
		],
		[remarkGithub, { repository: 'https://github.com/swyxio/swyxdotio/' }],
		remarkAbbr
	],
	rehypePlugins: [
		rehypeSlug,
		[
			rehypeAutolinkHeadings,
			{
				behavior: 'wrap'
			}
		]
	]
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.html', '.svx', ...mdsvexConfig.extensions],
	preprocess: [
		mdsvex(mdsvexConfig),
		preprocess({
			postcss: true
		})
	],

	kit: {
		adapter: adapter({
			split: false
		})
		// https://kit.svelte.dev/docs/configuration#csp
		// csp: {
		// 	directives: {
		// 		'script-src': ['self']
		// 	},
		// 	reportOnly: {
		// 		'script-src': ['self']
		// 	}
		// }
	}
};

export default config;
