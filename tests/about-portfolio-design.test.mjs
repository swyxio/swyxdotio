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
