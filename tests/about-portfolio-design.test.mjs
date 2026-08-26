import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { renderMarkdown } from '../src/lib/markdown.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('About separates current work, story, and explicitly dated speaker bios', async () => {
	const [source, content] = await Promise.all([
		read('src/routes/about/+page.svelte'),
		read('src/routes/about/content.md')
	]);
	const html = await renderMarkdown(content);
	assert.match(source, /<h1>Shawn Wang \(swyx\)<\/h1>/);
	assert.match(source, /class="reading-prose about-copy"/);
	assert.match(source, /src="\/swyx-ski\.jpeg"/);
	assert.doesNotMatch(source, /site-card/);
	for (const id of ['current-work', 'my-story', 'speaker-bio']) {
		assert.ok(source.includes(`href="#${id}"`));
		assert.ok(html.includes(`<h2 id="${id}">`));
	}
	assert.match(html, /January 2025 version/);
	assert.match(html, /Please confirm titles before reusing this bio/);
	assert.match(html, /Earlier bio · February 2024/);
	assert.doesNotMatch(html, /swyxkit\.netlify\.app|Tech behind this site/);
	for (const name of ['Netlify', 'Amazon Web Services', 'Temporal', 'Airbyte', 'Two Sigma']) {
		assert.ok(html.includes(name), `Missing work history: ${name}`);
	}
});

test('the press kit has real thumbnails, labeled originals, and no known broken Summit links', async () => {
	const [source, photos] = await Promise.all([
		read('src/routes/about/+page.svelte'),
		read('src/routes/about/photos.md')
	]);
	assert.equal((source.match(/title: '/g) || []).length, 4);
	assert.match(source, /<h2 id="press-photos">Press photos<\/h2>/);
	assert.match(source, /Open original ↗/);
	assert.match(source, /loading="lazy"/);
	const html = await renderMarkdown(photos);
	assert.doesNotMatch(html, />https?:\/\//);
	assert.doesNotMatch(html, /aie-cms-uploads\.s3/);
	for (const name of [
		'transparent background',
		'React Advanced',
		'React Miami',
		'JSConf',
		'Cartoon avatars'
	]) {
		assert.ok(html.includes(name), `Missing photo source: ${name}`);
	}
});

test('Portfolio keeps all 57 entries in four semantic, uncollapsed groups', async () => {
	const [source, content] = await Promise.all([
		read('src/routes/portfolio/+page.svelte'),
		read('src/routes/portfolio/content.md')
	]);
	const html = await renderMarkdown(content);
	assert.equal((html.match(/<h1 /g) || []).length, 1);
	assert.doesNotMatch(source, /site-card/);
	assert.doesNotMatch(html, /<details/);
	const groups = [
		...html.matchAll(
			/<section class="portfolio-group" aria-labelledby="([^"]+)">([\s\S]*?)<\/section>/g
		)
	];
	assert.deepEqual(
		groups.map((group) => [group[1], (group[2].match(/<li>/g) || []).length]),
		[
			['well-known-names', 18],
			['you-should-know', 10],
			['smaller-names', 20],
			['done', 9]
		]
	);
	for (const group of groups) {
		assert.ok(group[2].includes(`<h2 id="${group[1]}">`));
	}
	assert.match(source, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
	assert.match(source, /@media \(max-width: 42rem\)/);
	for (const annotation of [
		'Daytona (sandboxes for agents... i know i know)',
		'Replay.io (still alive!)',
		'Begin.com (dead)',
		'Dimension.dev (dead)',
		'Artifical Analysis (Gartner of AI)'
	]) {
		assert.ok(content.includes(annotation), `Missing candid annotation: ${annotation}`);
	}
});

test('Portfolio keeps disclosure and advising boundaries accessible after the companies', async () => {
	const content = await read('src/routes/portfolio/content.md');
	const html = await renderMarkdown(content);
	assert.match(html, /href="#disclosure"/);
	assert.match(html, /<h2 id="disclosure">Disclosure<\/h2>/);
	assert.ok(html.indexOf('id="done"') < html.indexOf('id="disclosure"'));
	assert.match(html, /no particular order/);
	assert.match(html, /My portcos do not get any guaranteed spots/);
	assert.match(html, /pump my bags/);
	assert.match(html, /no longer taking new advising inquiries/);
	assert.match(html, /give AI product feedback and launch guidance/);
});
