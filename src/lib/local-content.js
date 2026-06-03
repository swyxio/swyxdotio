import YAML from 'yaml';
// Bundle the data files into the worker (Cloudflare has no runtime fs).
// Vite's `?raw` suffix inlines the file contents as a string at build time.
import podcastsYml from '../../podcasts.yml?raw';
import talksYml from '../../talks.yml?raw';

export async function listSpeaking() {
	const x = podcastsYml;
	const y = talksYml;
	const podcasts = YAML.parse(x).map((x) => {
		x.category = 'podcast';
		x.date = new Date(x.date);
		return x;
	});
	const talks = YAML.parse(y).map((x) => {
		x.category = 'talk';
		x.date = new Date(x.instances[0].date);
		return x;
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
