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
				repository: 'https://github.com/sw-yx/swyxdotio'
			}
		],
		[remarkGithub, { repository: 'https://github.com/sw-yx/swyxdotio/' }],
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
		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',
		adapter: adapter({
			split: false
		})
		// vite: {
		// 	plugins: [yaml()]
		// }
	}
};

export default config;
