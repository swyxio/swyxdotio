// Standalone regression checks for the marked + shiki renderer.
// Run with: node tests/markdown.test.mjs
import assert from 'node:assert';
import { renderMarkdown } from '../src/lib/markdown.js';

let failures = 0;
async function check(name, fn) {
	try {
		await fn();
		console.log('  ok -', name);
	} catch (err) {
		failures++;
		console.error('FAIL -', name, '\n   ', err.message);
	}
}

await check('youtube shortcode renders an iframe embed', async () => {
	const html = await renderMarkdown('{% youtube dQw4w9WgXcQ %}');
	assert.match(html, /<iframe/);
	assert.match(html, /dQw4w9WgXcQ/);
});

await check('tweet shortcode renders a tweet blockquote', async () => {
	const html = await renderMarkdown('{% tweet 1234567890 %}');
	assert.match(html, /twitter-tweet/);
	assert.match(html, /1234567890/);
});

await check('headings get ids (for TOC + anchors)', async () => {
	const html = await renderMarkdown('## Hello World\n\ntext');
	assert.match(html, /<h2[^>]*id="hello-world"/);
});

await check('heading titles are permalinks without visible slug labels', async () => {
	const html = await renderMarkdown('## Pick a Topic');
	assert.match(
		html,
		/<h2 id="pick-a-topic"><a class="heading-link" href="#pick-a-topic">Pick a Topic<\/a><\/h2>/
	);
	assert.doesNotMatch(html, />#pick-a-topic</);
});

await check('inline TOC uses the rendered IDs, including duplicates and subheadings', async () => {
	const html = await renderMarkdown('## Table of Contents\n\n## Topic\n\n### Detail\n\n## Topic');
	const nav = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/)?.[1];
	assert.ok(nav);
	assert.match(nav, /href="#topic">Topic/);
	assert.match(nav, /data-level="3"><a href="#detail">Detail/);
	assert.match(nav, /href="#topic-1">Topic/);
	assert.doesNotMatch(nav, /href="#table-of-contents"/);
});

await check('TOC is only inserted at an authored Table of Contents heading', async () => {
	assert.doesNotMatch(await renderMarkdown('## Topic'), /class="article-toc"/);
	assert.doesNotMatch(await renderMarkdown('## Table of Contents'), /class="article-toc"/);
});

await check('an authored TOC list is not duplicated', async () => {
	const html = await renderMarkdown('## Table of Contents\n\n- [Topic](#topic)\n\n## Topic');
	assert.doesNotMatch(html, /class="article-toc"/);
	assert.match(html, /<li><a href="#topic">Topic<\/a><\/li>/);
});

await check('authored heading links are preserved without nested anchors', async () => {
	const html = await renderMarkdown('## Table of Contents\n\n## [Topic](https://example.com)');
	assert.match(html, /<h2 id="topic"><a href="https:\/\/example.com">Topic<\/a><\/h2>/);
	assert.match(html, /<li data-level="2"><a href="#topic">Topic<\/a><\/li>/);
});

await check('GitHub issue refs autolink', async () => {
	const html = await renderMarkdown('see #123 for details');
	assert.match(html, /href="https:\/\/github\.com\/[^"]+\/issues\/123"/);
});

await check('GitHub @mentions autolink', async () => {
	const html = await renderMarkdown('thanks @swyx for this');
	assert.match(html, /href="https:\/\/github\.com\/swyx"/);
});

await check('mentions inside inline code are NOT linked', async () => {
	const html = await renderMarkdown('use `@decorator` syntax');
	assert.doesNotMatch(html, /href="https:\/\/github\.com\/decorator"/);
});

await check('code fences are highlighted by shiki', async () => {
	const html = await renderMarkdown('```js\nconst x = 1;\n```');
	assert.match(html, /class="shiki/);
	assert.match(html, /<span style="color/);
});

await check('plain paragraphs render', async () => {
	const html = await renderMarkdown('just **bold** text');
	assert.match(html, /<strong>bold<\/strong>/);
});

console.log(failures ? `\n${failures} check(s) failed` : '\nAll markdown checks passed');
process.exit(failures ? 1 : 0);
