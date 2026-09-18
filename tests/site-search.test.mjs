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
	assert(r.tags.includes('Speaking'));
	const first = search('', { limit: '2' }),
		second = search('', { limit: '2', page: '2' });
	assert.equal(first.total, second.total);
	assert(!first.results.some((x) => second.results.some((y) => y.id === x.id)));
});
test('invalid bounds rejected and changed records rebuild derived index', () => {
	for (const params of [
		{ q: 'x'.repeat(121) },
		{ type: 'secret' },
		{ page: '0' },
		{ limit: '31' },
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
