import YAML from 'yaml';
// Bundle the data files into the worker (Cloudflare has no runtime fs).
// Vite's `?raw` suffix inlines the file contents as a string at build time.
import podcastsYml from '../../podcasts.yml?raw';
import talksYml from '../../talks.yml?raw';

/**
 * @typedef {import('./types').ContentItem & { instances?: { date?: Date | string, venue?: string, video?: string }[] }} SpeakingItem
 */

/** @returns {Promise<SpeakingItem[]>} */
export async function listSpeaking() {
	const x = podcastsYml;
	const y = talksYml;
	const podcasts = /** @type {SpeakingItem[]} */ (YAML.parse(x)).map((podcast) => {
		podcast.category = 'podcast';
		podcast.date = new Date(podcast.date);
		return podcast;
	});
	const talks = /** @type {SpeakingItem[]} */ (YAML.parse(y)).map((talk) => {
		talk.category = 'talk';
		talk.date = new Date(talk.instances?.[0]?.date ?? 0);
		return talk;
	});
	return podcasts.concat(talks);
}

// export async function getBlogpost(slug) {
// 	const _path = resolve('content', slug + '.md');
// 	const src = await fs.readFile(_path, 'utf8');
// 	const data = grayMatter(src);
// 	// const content = await parseMarkdown({ filePath: _path, markdown: data.content })
// 	const content = (await compile(data.content, {})).code;
// 	return { content, data: data.data, slug: data.data.slug ?? basename(_path, '.md') };
// }

// async function* getFiles(dir) {
// 	const dirents = await fs.readdir(dir, { withFileTypes: true });
// 	for (const dirent of dirents) {
// 		const res = resolve(dir, dirent.name);
// 		if (dirent.isDirectory()) {
// 			yield* getFiles(res);
// 		} else {
// 			yield res;
// 		}
// 	}
// }

// export async function parseMarkdown({ filePath, markdown }) {
// 	// const result = await remark().use(remarkHtml).process(markdown);
// 	var post_vfile = new VFile({ path: filePath, contents: markdown });
// 	const file = await unified()
// 		.use(_preset)
// 		.process(post_vfile)
// 		.catch((err) => {
// 			console.error(reporter(post_vfile));
// 			throw err;
// 		});
// 	file.extname = '.html';
// 	return file.toString();
// }
