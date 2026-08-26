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
	assert.match(source, /Open full-size ↗/);
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

test('World’s Fair photos lead the press kit while older conferences remain under show more', async () => {
	const [source, markdown] = await Promise.all([
		read('src/routes/about/+page.svelte'),
		read('src/routes/about/photos.md')
	]);
	const featured = [...source.matchAll(/src: '(\/about-photos\/worlds-fair-[a-z-]+\.webp)'/g)];
	assert.equal(featured.length, 4);
	assert.equal((source.match(/href: 'https:\/\/images\.pixieset\.com\/123558811\/[a-f0-9]+-xxlarge\.jpg'/g) || []).length, 4);
	assert.match(source, /https:\/\/aiengineer\.pixieset\.com\/worldsfair2026\//);
	assert.doesNotMatch(source, /React Miami|React Advanced|tools\.aieconf\.com/);
	assert.match(source, /aspect-ratio: 3 \/ 2;\s*object-fit: contain/);
	assert.match(source, /width="720"\s*height="480"\s*loading="lazy"\s*decoding="async"/);
	let totalBytes = 0;
	for (const [, path] of featured) {
		const bytes = await readFile(new URL(`static${path}`, root));
		assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
		assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
		totalBytes += bytes.length;
	}
	assert.ok(totalBytes < 200_000, 'The featured photos stay lightweight');
	const html = await renderMarkdown(markdown);
	assert.match(html, /<details>\s*<summary>More sizes, event photos, and avatars<\/summary>/);
	assert.match(html, /<h3 id="earlier-speaking-photos">Earlier speaking photos<\/h3>/);
	for (const name of ['React Miami', 'React Advanced', 'Niseko headshot', 'Thursday Nights in AI']) {
		assert.ok(html.includes(name), `Older photo remains available: ${name}`);
	}
});

test('every additional press photo has a small local preview and its original link', async () => {
	const [source, markdown] = await Promise.all([
		read('src/routes/about/+page.svelte'),
		read('src/routes/about/photos.md')
	]);
	const html = await renderMarkdown(markdown);
	const previews = [...html.matchAll(/<a\s+class="photo-preview"\s+href="([^"]+)"[\s\S]*?<\/a>/g)];
	assert.equal(previews.length, 21);
	assert.equal((html.match(/class="photo-preview-grid"/g) || []).length, 4);
	const paths = new Set();
	let totalBytes = 0;
	for (const [preview, href] of previews) {
		assert.match(href, /^https:\/\//);
		assert.match(preview, /aria-label="Open original: /);
		assert.match(preview, /loading="lazy"/);
		assert.match(preview, /decoding="async"/);
		assert.match(preview, /alt="[^"]+"/);
		assert.match(preview, /<figcaption>/);
		const path = preview.match(/src="(\/about-photos\/[a-z-]+\.webp)"/)?.[1];
		assert.ok(path, 'Each preview uses a local thumbnail');
		paths.add(path);
		const bytes = await readFile(new URL(`static${path}`, root));
		assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
		assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
		assert.ok(bytes.length < 100_000, `${path} is too large for a thumbnail`);
		totalBytes += bytes.length;
	}
	assert.equal(paths.size, 21);
	assert.ok(totalBytes < 750_000, 'The complete gallery stays lightweight');
	assert.match(html, /drive\.google\.com\/drive\/folders\//);
	assert.match(html, /twitter\.com\/Thoritie\/status\//);
	assert.doesNotMatch(html, /<img[^>]+src="https?:/);
	assert.match(source, /object-fit: contain/);
	assert.match(source, /\.photo-preview:focus-visible/);
	assert.match(source, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
	assert.equal((source.match(/src: '\/about-photos\//g) || []).length, 4);
});

test('Portfolio presents its entries in an accessible, uncollapsed responsive table', async () => {
	const source = await read('src/routes/portfolio/+page.svelte');
	assert.equal((source.match(/<h1>/g) || []).length, 1);
	assert.doesNotMatch(source, /site-card|<details/);
	assert.match(source, /<table role="table" aria-describedby="valuation-note">/);
	assert.match(source, /scope="col">Company \/ person/);
	assert.match(source, /scope="row" class="company-cell"/);
	assert.match(source, /@media \(max-width: 700px\)/);
	const companies = JSON.parse(await read('src/lib/data/portfolio.json'));
	for (const id of ['daytona', 'replay', 'artificial-analysis']) {
		assert.ok(companies.find((company) => company.id === id).note, `Missing personal note: ${id}`);
	}
});

test('Portfolio keeps disclosure and advising boundaries accessible after the companies', async () => {
	const source = await read('src/routes/portfolio/+page.svelte');
	assert.match(source, /href="#disclosure"/);
	assert.match(source, /<h2 id="disclosure">A note on editorial independence<\/h2>/);
	assert.ok(source.indexOf('</table>') < source.indexOf('id="disclosure"'));
	assert.match(source, /Original order/);
	assert.match(source, /do not get guaranteed spots/);
	assert.match(source, /pump my bags/);
	assert.match(source, /no longer taking new advising inquiries/);
	assert.match(source, /AI product feedback and launch guidance/);
});
