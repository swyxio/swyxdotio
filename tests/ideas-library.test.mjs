import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createIdeasSearchSnippet, ideasPlainText } from '../src/lib/ideas-search-snippet.js';
import { withIdeasYearHeadings } from '../src/lib/ideas-library-rows.js';

test('year headings remain stable when keyed archive rows shrink, reorder, or clear for search', () => {
	const items = [
		{ slug: 'one', date: '2026-08-01' },
		{ slug: 'two', date: '2026-06-01' },
		{ slug: 'three', date: '2025-03-01' },
		{ slug: 'four', date: '2024-02-01' }
	];
	const archive = withIdeasYearHeadings(items);
	assert.deepEqual(
		archive.map((row) => row.yearHeading),
		[2026, null, 2025, 2024]
	);

	const filtered = withIdeasYearHeadings([items[3]]);
	assert.deepEqual(
		filtered.map((row) => row.yearHeading),
		[2024]
	);
	assert.deepEqual(withIdeasYearHeadings([]), []);
	const search = withIdeasYearHeadings([items[3], items[0], items[2]], false);
	assert.deepEqual(
		search.map((row) => row.yearHeading),
		[null, null, null]
	);

	// An outgoing keyed row is still self-contained after its old neighbor disappears.
	assert.equal(archive[3].yearHeading, 2024);
	assert.equal(archive[1].yearHeading, null);
	assert.equal(items[0].yearHeading, undefined);
	assert.deepEqual(
		withIdeasYearHeadings(items).map((row) => row.yearHeading),
		[2026, null, 2025, 2024]
	);
});

test('search excerpts remove Markdown structure while preserving readable words', () => {
	const markdown = [
		'# Why **Temporal**',
		'',
		'[Durable execution](https://temporal.io/docs) makes _workflows_ easier.',
		'',
		'- Use `await` for work.',
		'- A second point.',
		'',
		'![Architecture](https://example.com/diagram.png)',
		'',
		'> Some &quot;quoted&quot; advice &amp; an &#x1f44d;.',
		'',
		'```js',
		'const answer = 42;',
		'```'
	].join('\n');
	const text = ideasPlainText(markdown);
	assert.match(text, /Why Temporal Durable execution makes workflows easier\./);
	assert.match(text, /Use await for work\. A second point\./);
	assert.match(text, /Some "quoted" advice & an 👍\./);
	assert.match(text, /const answer = 42;/);
	assert.doesNotMatch(text, /https?:|\]\(|```|\*\*|Architecture|^#/);
});

test('excerpts return safe text fragments, not trusted HTML', () => {
	const parts = createIdeasSearchSnippet(
		'<script>alert("bad")</script>\n\nRead **Temporal** &lt;details&gt; <img src=x onerror=alert(1)>.',
		'temporal'
	);
	assert.deepEqual(
		parts.filter((part) => part.matched),
		[{ text: 'Temporal', matched: true }]
	);
	const text = parts.map((part) => part.text).join('');
	assert.match(text, /Read Temporal <details>/);
	assert.doesNotMatch(text, /alert|onerror|<script|<img|<b|style=/);
});

test('excerpts find a late matching passage and respect literal search characters', () => {
	const markdown = `${'An earlier paragraph about something else. '.repeat(20)}Learning C++ with Temporal is useful. ${'More context. '.repeat(30)}`;
	const parts = createIdeasSearchSnippet(markdown, 'C++ temporal');
	const text = parts.map((part) => part.text).join('');
	assert.ok(text.startsWith('…'));
	assert.ok(text.endsWith('…'));
	assert.ok(text.length <= 222);
	assert.deepEqual(
		parts.filter((part) => part.matched).map((part) => part.text),
		['C++', 'Temporal']
	);
});

test('tables and reference links become plain text without raw link metadata', () => {
	const text = ideasPlainText(
		'| Topic | Detail |\n| --- | --- |\n| **AI** | [Learn][intro] |\n\n[intro]: https://example.com'
	);
	assert.equal(text, 'Topic Detail AI Learn');
});

test('empty snippets and no-match queries remain readable', () => {
	assert.deepEqual(createIdeasSearchSnippet('', 'test'), []);
	assert.deepEqual(createIdeasSearchSnippet('A simple **note**.', ''), [
		{ text: 'A simple note.', matched: false }
	]);
	assert.deepEqual(createIdeasSearchSnippet('A simple **note**.', 'missing'), [
		{ text: 'A simple note.', matched: false }
	]);
});

test('Ideas retains durable query parameters, lazy corpus, safe excerpts, and async recovery', async () => {
	const source = await readFile(
		new URL('../src/routes/ideas/+page.svelte', import.meta.url),
		'utf8'
	);
	assert.match(source, /queryParameters\(IDEAS_QUERY_PARAMETERS, IDEAS_QUERY_OPTIONS\)/);
	assert.doesNotMatch(source, /\bqueryParam\(/);
	assert.match(source, /\$filters = \{ \.\.\.\$filters, filter: '', show: \[\] \}/);
	assert.match(source, /fetch\('\/api\/listArchive\.json'\)/);
	assert.match(source, /fetch\('\/api\/searchContent\.json'\)/);
	assert.match(source, /await loadSearchContent\(\)/);
	assert.match(source, /version !== requestVersion/);
	assert.match(source, /searchLoad = undefined/);
	assert.match(source, /archiveLoad = undefined/);
	assert.match(source, /\{:else if isLoading\}/);
	assert.match(source, /\{:else if !loadError\}/);
	assert.match(source, /role="status"/);
	assert.match(source, /\$\{list\.length\.toLocaleString\('en-US'\)\} of `/);
	assert.match(source, /role="alert"/);
	assert.match(source, /type="search"/);
	assert.match(source, /event\.key === 'Escape'/);
	assert.match(
		source,
		/target\.closest\('input, textarea, select, \[contenteditable\], \[role="textbox"\]'\)/
	);
	assert.match(source, /min-height: 44px/);
	assert.match(source, /use:loadOnScroll=\{loadMore\}/);
	assert.match(source, /\{#key list\.length\}/);
	assert.match(source, /const pageSize = 80/);
	assert.match(source, /Math\.min\(visibleCount \+ pageSize, totalResults\)/);
	assert.match(source, /if \(isLoading \|\| loadError \|\| list\.length >= totalResults\) return/);
	assert.match(source, /if \(filterKey\) visibleCount = pageSize/);
	assert.match(source, /'Load more'/);
	assert.match(source, /class="library-end"/);
	assert.doesNotMatch(source, /Number\.POSITIVE_INFINITY|Load the rest of the library/);
	assert.match(source, /item\.yearHeading !== null/);
	assert.doesNotMatch(source, /yearOf\(list\[|list\[index - 1\]/);
	assert.doesNotMatch(source, /\{@html|categoryIcon|tag-chip|type-emoji|<details/);
});

test('Ideas and home use the same illustrated essay shelf, not competing featured lists', async () => {
	const [ideas, home, shelf] = await Promise.all(
		[
			'../src/routes/ideas/+page.svelte',
			'../src/routes/+page.svelte',
			'../src/components/FeaturedEssayShelf.svelte'
		].map((path) => readFile(new URL(path, import.meta.url), 'utf8'))
	);
	for (const page of [ideas, home]) {
		assert.match(page, /<FeaturedEssayShelf\s*\/>/);
		assert.doesNotMatch(page, /MostPopular|\{#each FEATURED_ESSAYS/);
		assert.match(page, /--site-max-width: 1160px/);
	}
	assert.match(shelf, /import \{ FEATURED_ESSAYS \} from '\$lib\/featured-essays'/);
	assert.match(shelf, /\{#each FEATURED_ESSAYS as essay, index \(essay.href\)\}/);
	assert.match(shelf, /src=\{essay\.illustration\}/);
	assert.match(shelf, /\{essay.description\}/);
	assert.match(shelf, /Things worth thinking about/);
	assert.match(shelf, /width: 100vw/);
	assert.match(shelf, /overflow-x: auto/);
	assert.doesNotMatch(shelf, /<details/);
});

test('Ideas uses a compact masthead, readable archive type, and touch-sized controls', async () => {
	const source = await readFile(
		new URL('../src/routes/ideas/+page.svelte', import.meta.url),
		'utf8'
	);
	assert.doesNotMatch(source, /editorial-header|editorial-kicker|popular-posts/);
	assert.match(source, /class="search-control"/);
	assert.match(source, /grid-template-columns: minmax\(16rem, 1fr\) auto/);
	assert.match(source, /\.ideas-title\s*\{[^}]*font-family: var\(--font-reading\)/);
	assert.match(source, /\.ideas-row\s*\{[^}]*min-height: 44px/);
	assert.match(source, /\.ideas-filter\s*\{[^}]*min-height: 44px/);
	assert.match(source, /\.ideas-filters\s*\{[^}]*min-width: 0/);
	assert.match(source, /class="entry-category" title=\{item.venues\}>\{item.category\}/);
	assert.match(source, /class="ideas-stage"/);
});

test('archive view-count batches include only registered article content', async () => {
	const source = await readFile(
		new URL('../src/routes/ideas/+page.svelte', import.meta.url),
		'utf8'
	);
	const loader = source.slice(
		source.indexOf('async function loadReadCounts('),
		source.indexOf('function toggleReadCountVisibility(')
	);
	// A talk with no video (for example, fullstack-heaps) is not an article.
	// Including it makes the read-count endpoint reject the whole batch.
	assert.match(loader, /\.filter\(\(item\) => item\.type === 'blog'\)/);
	assert.doesNotMatch(loader, /!isExternalItem\(item\)/);
});
