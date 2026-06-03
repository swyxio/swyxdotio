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
