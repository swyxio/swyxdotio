import assert from 'node:assert/strict';
import test from 'node:test';

import { decodeHtmlEntities, extractContentDescription } from '../src/lib/content-description.js';

test('uses and cleans an explicit frontmatter description', () => {
	assert.equal(
		extractContentDescription('Ignored body', '**Build** with [Svelte](https://svelte.dev).'),
		'Build with Svelte.'
	);
});

test('finds the first meaningful prose line and removes blockquote syntax', () => {
	const markdown = `# A title

![Cover](https://example.com/cover.png)

> Translations welcome! (Português)

More copy.`;

	assert.equal(extractContentDescription(markdown, undefined), 'Translations welcome! (Português)');
});

test('skips non-prose Markdown before the opening paragraph', () => {
	const markdown = `---

{% youtube abc123 %}

The **first useful** line.`;

	assert.equal(extractContentDescription(markdown, undefined), 'The first useful line.');
});

test('truncates cleanly at a word boundary', () => {
	assert.equal(
		extractContentDescription('one two three four five', undefined, 15),
		'one two three…'
	);
});

test('returns an empty string when no prose exists', () => {
	assert.equal(
		extractContentDescription('# Heading\n\n![Image](https://example.com/a.png)', undefined),
		''
	);
});

test('decodes legacy HTML entities before producing plain text', () => {
	assert.equal(decodeHtmlEntities('Swyx&#39;s &amp; friends'), "Swyx's & friends");
	assert.equal(extractContentDescription('', '&gt; A quoted description'), 'A quoted description');
});
