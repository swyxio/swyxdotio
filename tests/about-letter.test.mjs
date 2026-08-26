import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { introductions, speakerBios } from '../src/lib/about/copy.js';
import { getPageSocialMeta } from '../src/lib/social-meta.js';
import { PUBLIC_PAGE_PATHS } from '../src/lib/sitemap.js';
import { renderMarkdown } from '../src/lib/markdown.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('intro lengths are deliberately written and bios remain distinct third-person copy', () => {
	assert.deepEqual(
		introductions.map((v) => v.label),
		['Short', 'Medium', 'Long']
	);
	const words = introductions.map((v) => v.paragraphs.join(' ').split(/\s+/).length);
	assert.ok(words[0] < words[1] && words[1] < words[2]);
	assert.ok(words[0] < 45 && words[1] >= 80 && words[2] >= 200);
	assert.deepEqual(
		speakerBios.map((v) => v.label),
		['Short', 'Standard']
	);
	for (const bio of speakerBios) assert.match(bio.paragraphs[0], /^Shawn Wang/);
});

test('the letter has six sections and aligned commentary, never a second column of primary sections', async () => {
	const [page, section] = await Promise.all([
		read('src/routes/about/+page.svelte'),
		read('src/lib/about/LetterSection.svelte')
	]);
	assert.match(page, /What brings you here\?/);
	assert.equal((page.match(/<LetterSection /g) || []).length, 6);
	assert.equal((page.match(/slot="commentary"/g) || []).length, 6);
	for (const id of [
		'start-here',
		'current-work',
		'founders',
		'speaking',
		'speaker-bio',
		'my-story'
	]) {
		assert.ok(page.includes(`href="#${id}"`));
		assert.ok(page.includes(`<LetterSection id="${id}"`));
	}
	assert.match(section, /<aside class="margin-note"/);
	assert.match(section, /grid-template-columns: minmax\(0, 1fr\) 12rem/);
	assert.match(section, /@media \(max-width: 900px\)/);
	assert.doesNotMatch(section, /position: sticky|display: none/);
	assert.match(page, /href="\/now"/);
	assert.match(page, /Previous bios &amp; older links/);
	assert.doesNotMatch(page, /use without asking/);
});

test('version controls provide pressed state, scoped copy feedback, and readable text on clipboard failure', async () => {
	const component = await read('src/lib/about/TextVersions.svelte');
	assert.match(component, /aria-pressed=\{selected === index\}/);
	assert.match(component, /aria-controls=/);
	assert.match(component, /role="status"/);
	assert.match(component, /navigator\.clipboard\.writeText/);
	assert.match(component, /attempt === request/);
	assert.match(component, /select and copy the text below/);
	assert.doesNotMatch(component, /localStorage|fetch\(/);
});

test('/now is a dated standalone public page with a clearly historical update', async () => {
	const [page, content, loader] = await Promise.all([
		read('src/routes/now/+page.svelte'),
		read('src/routes/now/content.md'),
		read('src/routes/now/+page.server.js')
	]);
	assert.match(page, /datetime="2026-08-26"/);
	assert.doesNotMatch(page, /new Date\(/);
	assert.match(loader, /prerender = true/);
	const html = await renderMarkdown(content);
	assert.match(html, /Previously · January 2025/);
	assert.match(html, /archived update, not a current status report/);
	assert.match(html, /not taking new advising inquiries/);
	assert.ok(PUBLIC_PAGE_PATHS.includes('/now'));
	assert.equal(getPageSocialMeta('now').canonical, 'https://swyx.io/now');
	assert.doesNotMatch(content, /\/tools|tools\.aieconf/);
});
