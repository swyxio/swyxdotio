import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
	projectSearchCatalog,
	createSearchIndex,
	cachedSearchIndex,
	searchCatalog,
	parseSearchParams,
	parseSearchRedirects
} from '../src/lib/server/site-search.js';
const records = projectSearchCatalog([
	{
		slug: 'cfp-advice',
		title: 'CFP Advice',
		category: 'tech',
		description: 'Writing better proposals',
		date: '2020-01-18',
		tags: ['Speaking'],
		content: 'PRIVATE BODY SENTINEL'
	},
	{
		slug: 'cfp-tips',
		title: 'CFP Advice for Beginners',
		category: 'talk',
		instances: [{ video: 'https://example.com/cfp-tips' }],
		date: '2021-02-01',
		tags: ['Speaking']
	},
	{ slug: 'unicode', title: 'Café 中文', category: 'tech', date: '2022-01-01' },
	{ slug: 'private', title: 'Private', isPrivate: true },
	{
		title: 'Appearance',
		category: 'podcast',
		url: 'https://example.com/episode',
		date: '2023-01-01'
	},
	{ slug: 'unsafe', title: 'Unsafe', category: 'podcast', url: 'javascript:alert(1)' },
	{ slug: 'cfp-advice', title: 'Duplicate', category: 'tech' }
]);
const catalog = createSearchIndex(records);
const search = (q, filters = {}) =>
	searchCatalog(catalog, parseSearchParams(new URLSearchParams({ q, ...filters })));
test('bounded public projections and canonical routes', () => {
	assert.equal(records.filter((x) => x.url === '/cfp-advice').length, 1);
	assert(!JSON.stringify(records).includes('PRIVATE BODY SENTINEL'));
	assert(!records.some((x) => x.title === 'Private' || x.title === 'Unsafe'));
	assert.equal(records.find((x) => x.title === 'Appearance').url, 'https://example.com/episode');
	assert(records.some((x) => x.url === '/now'));
	assert.equal(
		projectSearchCatalog([
			{ title: 'Alias', slug: 'old', category: 'tech', canonical: 'https://www.swyx.io/new/' }
		]).find((x) => x.title === 'Alias').url,
		'/new'
	);
});
test('exact, prefix, typo, diacritics and Unicode queries', () => {
	assert.equal(search('CFP Advice').results[0].url, '/cfp-advice');
	assert.equal(search('cfp ad').results[0].url, '/cfp-advice');
	assert(search('cfp advcie').results.some((x) => x.url === '/cfp-advice'));
	assert.equal(search('Cafe').results[0].url, '/unicode');
	assert.equal(search('中文').results[0].url, '/unicode');
});
test('combined facets and pagination retain vocabulary', () => {
	const r = search('cfp', { type: 'talk', year: '2021', tag: 'Speaking' });
	assert.equal(r.total, 1);
	assert.equal(r.results[0].url, 'https://example.com/cfp-tips');
	assert(r.years.includes('2020'));
	assert(r.tags.includes('speaking'));
	const first = search('', { limit: '2' }),
		second = search('', { limit: '2', page: '2' });
	assert.equal(first.total, second.total);
	assert(!first.results.some((x) => second.results.some((y) => y.id === x.id)));
});
test('topic filters combine article, podcast and talk topics without case duplicates', () => {
	const mixed = createSearchIndex(
		projectSearchCatalog([
			{ title: 'Article', slug: 'article-ai', tags: ['ai'] },
			{ title: 'Podcast', category: 'podcast', url: 'https://example.com/ai', tags: [' AI '] },
			{
				title: 'Talk',
				category: 'talk',
				instances: [{ video: 'https://example.com/talk' }],
				categories: ['AI', 'ai'],
				tags: ['Tools']
			}
		])
	);
	const result = searchCatalog(mixed, parseSearchParams(new URLSearchParams({ tag: 'AI' })));
	assert.equal(result.total, 3);
	assert.deepEqual(result.results.map((r) => r.type).sort(), ['article', 'podcast', 'talk']);
	assert.deepEqual(result.tags, ['ai', 'tools']);
	assert.deepEqual(result.results.find((r) => r.type === 'talk').tags, ['tools', 'ai']);
});
test('invalid bounds rejected and changed records rebuild derived index', () => {
	for (const params of [
		{ q: 'x'.repeat(121) },
		{ type: 'secret' },
		{ page: '0' },
		{ limit: '101' },
		{ year: 'x' }
	])
		assert.throws(() => parseSearchParams(new URLSearchParams(params)));
	assert.equal(cachedSearchIndex(records), cachedSearchIndex([...records]));
	assert.notEqual(cachedSearchIndex(records), cachedSearchIndex(records.slice(1)));
});

test('legacy canonical destinations follow the existing redirect table', () => {
	const redirects = parseSearchRedirects(
		readFileSync(new URL('../_redirects', import.meta.url), 'utf8')
	);
	const records = projectSearchCatalog(
		[
			{
				title: 'Dynamo',
				slug: 'dynamodb-book',
				canonical: 'https://www.swyx.io/writing/dynamodb-book'
			},
			{
				title: 'Forms',
				slug: 'no-controlled-forms',
				canonical: 'https://www.swyx.io/writing/no-controlled-dom'
			}
		],
		redirects
	);
	assert.equal(records.find((r) => r.title === 'Dynamo').url, '/dynamodb-book');
	assert.equal(records.find((r) => r.title === 'Forms').url, '/no-controlled-forms');
});

test('body-only matches return bounded passages and exact rendered section destinations', async () => {
	const { renderMarkdown } = await import('../src/lib/markdown.js');
	const { searchPassages } = await import('../src/lib/search-passages.js');
	const content =
		'## Topic\n\nNothing here.\n\n## Topic\n\nUnicorns understand durable orchestration.\n\n> ### Nested\n>\n> Recursive platypus configuration.';
	const items = [
		{ title: 'A neutral title', slug: 'neutral', category: 'essay', content },
		{ title: 'Hidden', slug: 'hidden', isPrivate: true, content: 'unicorns hidden-only-secret' }
	];
	const index = createSearchIndex(projectSearchCatalog(items), items);
	const result = searchCatalog(index, parseSearchParams(new URLSearchParams({ q: 'unicorns' })));
	assert.equal(result.results[0].url, '/neutral#topic-1');
	assert.equal(result.results[0].section, 'Topic');
	assert(
		result.results[0].snippetParts.some((p) => p.matched && p.text.toLowerCase() === 'unicorns')
	);
	assert(!JSON.stringify(result).includes('hidden-only-secret'));
	assert(!('content' in result.results[0]));
	assert(result.results[0].snippet.length < 250);
	const html = await renderMarkdown(content);
	for (const passage of searchPassages(content))
		if (passage.anchor) assert(html.includes(`id="${passage.anchor}"`));
});

test('concurrent article renders and index construction preserve duplicate heading IDs', async () => {
	const { renderMarkdown } = await import('../src/lib/markdown.js');
	const { searchPassages } = await import('../src/lib/search-passages.js');
	const md = '## Topic\n\n```js\nconst x=1;\n```\n\n## Topic\n\nUnique phrase.';
	const pending = renderMarkdown(md);
	searchPassages('## Topic\n\n## Other');
	const [a, b] = await Promise.all([pending, renderMarkdown(md)]);
	for (const html of [a, b]) {
		assert(html.includes('id="topic"'));
		assert(html.includes('id="topic-1"'));
		assert(!html.includes('id="topic-2"'));
	}
});

test('source facets ignore their own selection and order the strongest query sources first', () => {
	const all = search('cfp');
	const filtered = search('cfp', { source: 'swyx.io' });
	assert.equal(filtered.total, 1);
	assert.deepEqual(filtered.sourceCounts, all.sourceCounts);
	assert.equal(filtered.sourceCounts['example.com'], 1);
	const updated = [{ title: 'Title', slug: 'title', content: 'old rarephrase' }];
	const records = projectSearchCatalog(updated);
	const before = cachedSearchIndex(records, updated);
	const after = cachedSearchIndex(records, [{ ...updated[0], content: 'new zebra' }]);
	assert.notEqual(before, after);
	assert.equal(
		searchCatalog(after, parseSearchParams(new URLSearchParams({ q: 'rarephrase' }))).total,
		0
	);
});

test('semantic candidates share filters, deduplicate documents and use passage links', () => {
	const items = [
		{ title: 'Conference Guide', slug: 'guide', content: '## Start\n\nSpeak confidently.' }
	];
	const index = createSearchIndex(projectSearchCatalog(items), items);
	const body = index.passages.find((p) => p.anchor === 'start');
	const result = searchCatalog(
		index,
		parseSearchParams(new URLSearchParams({ q: 'presentations', scope: 'content' })),
		[
			{ id: body.id, score: 0.8 },
			{ id: body.id, score: 0.7 }
		]
	);
	assert.equal(result.mode, 'hybrid');
	assert.equal(result.total, 1);
	assert.equal(result.results[0].url, '/guide#start');
	assert.equal(
		searchCatalog(
			index,
			parseSearchParams(new URLSearchParams({ q: 'presentations', type: 'podcast' })),
			[{ id: body.id, score: 0.8 }]
		).total,
		0
	);
});

test('long natural questions retain relevant lexical results when semantics is unavailable', () => {
	const items = [
		{
			title: 'CFP Advice',
			slug: 'cfp',
			content:
				'## Pick a Topic\n\nFind your interests.\n\n## Pick a Conference\n\nKnow the conference audience and plan your presentation.'
		}
	];
	const index = createSearchIndex(projectSearchCatalog(items), items);
	const result = searchCatalog(
		index,
		parseSearchParams(
			new URLSearchParams({
				q: 'how do I choose a topic for my conference presentation',
				scope: 'content'
			})
		),
		null
	);
	assert.equal(result.mode, 'bm25');
	assert.equal(result.total, 1);
	assert.equal(result.results[0].url, '/cfp#pick-a-conference');
	assert(result.results[0].snippetParts.some((p) => p.matched));
});
