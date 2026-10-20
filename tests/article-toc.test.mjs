import assert from 'node:assert/strict';
import test from 'node:test';
import { hasArticleSections } from '../src/lib/article-toc.js';

test('detects headings in rendered articles, including malformed authored HTML', () => {
	for (const html of [
		'<h2>Section</h2>',
		'<div><H3 class="part">Section</H3></div>',
		'</p><h1>Section</h1>'
	]) {
		assert.equal(hasArticleSections(html), true, html);
	}
});

test('ignores headings that cannot appear in the article contents', () => {
	for (const html of [
		'<p>No sections.</p>',
		'<pre><code>&lt;h2&gt;Example&lt;/h2&gt;</code></pre>',
		'<script>const example = "<h2>Example</h2>"</script>',
		'<template><h2>Template</h2></template>',
		'<noscript><h2>No scripts</h2></noscript>',
		'<h2 id="table-of-contents">Contents</h2><h3 data-toc-ignore>Ignored</h3>',
		'<h4>Too deep</h4>'
	]) {
		assert.equal(hasArticleSections(html), false, html);
	}
});
