import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { filterPortfolio, formatValuation, formatValuationDate } from '../src/lib/portfolio.js';

const root = new URL('../', import.meta.url);
const companies = JSON.parse(await readFile(new URL('src/lib/data/portfolio.json', root), 'utf8'));

test('catalog retains all original entries, exits, and individual backings', () => {
	assert.equal(companies.length, 57);
	assert.equal(new Set(companies.map((company) => company.id)).size, companies.length);
	assert.deepEqual(
		companies.filter((company) => company.status === 'exited').map((company) => company.name),
		['Astral', 'Promptfoo', 'Gabber', 'Codegen', 'Brev', 'Gel', 'Dynamic']
	);
	assert.equal(companies.filter((company) => company.status === 'closed').length, 2);
	assert.equal(companies.filter((company) => company.status === 'individual').length, 2);
	for (const company of companies) {
		assert.ok(company.description && company.category, company.name);
		assert.match(company.id, /^[a-z0-9-]+$/);
		if (company.website) assert.equal(new URL(company.website).protocol, 'https:');
	}
});

test('every public valuation has a positive amount, dated source, and no future date', () => {
	for (const company of companies) {
		const valuation = company.valuation;
		if (valuation === null) continue;
		assert.ok(Number.isFinite(valuation.amountUsd) && valuation.amountUsd > 0, company.name);
		assert.match(valuation.date, /^\d{4}-\d{2}-\d{2}$/);
		assert.ok(Date.parse(valuation.date) <= Date.parse('2026-08-26'), company.name);
		assert.equal(new URL(valuation.sourceUrl).protocol, 'https:');
		assert.ok(valuation.sourceTitle);
	}
	assert.equal(companies.find((company) => company.id === 'matx').valuation.prefix, '>');
	assert.match(companies.find((company) => company.id === 'circle').valuation.dateLabel, /^2023/);
	assert.equal(companies.find((company) => company.id === 'railway').valuation, null);
});

test('logos are local, nonempty assets with recorded provenance', async () => {
	for (const company of companies.filter((company) => company.logo)) {
		assert.match(company.logo, /^\/portfolio\/[a-z0-9-]+\.(png|svg|ico|jpg|webp)$/);
		assert.equal(new URL(company.logoSource).protocol, 'https:');
		const file = await stat(new URL(`static${company.logo}`, root));
		assert.ok(file.size > 0 && file.size < 500_000, company.name);
	}
});

test('search matches multiple words across descriptions and composes with category and status', () => {
	assert.deepEqual(
		filterPortfolio(companies, { query: '  CLOUD   sandbox ', category: 'AI infrastructure' }).map(
			(company) => company.id
		),
		['e2b', 'morph']
	);
	assert.deepEqual(
		filterPortfolio(companies, { query: 'OpenAI', status: 'exited' }).map((company) => company.id),
		['astral', 'promptfoo']
	);
	assert.equal(filterPortfolio(companies, { category: 'AI coding', status: 'closed' }).length, 0);
	assert.equal(filterPortfolio(companies, { query: 'not-a-real-company' }).length, 0);
	assert.equal(filterPortfolio(companies).length, companies.length);
});

test('sorting leaves the source order alone and keeps unknown valuations last', () => {
	const ids = companies.map((company) => company.id);
	const sorted = filterPortfolio(companies, { sort: 'valuation' });
	assert.equal(sorted[0].id, 'cognition');
	const unknown = sorted.findIndex((company) => company.valuation === null);
	assert.ok(sorted.slice(unknown).every((company) => company.valuation === null));
	const alphabetic = filterPortfolio(companies, { sort: 'name' });
	assert.equal(alphabetic[0].id, '100ms');
	assert.deepEqual(
		companies.map((company) => company.id),
		ids
	);
});

test('valuation formatting preserves meaningful precision and stable UTC dates', () => {
	assert.equal(formatValuation(4_650_000_000), '$4.65B');
	assert.equal(formatValuation(10_500_000_000), '$10.5B');
	assert.equal(formatValuation(125_000_000), '$125M');
	assert.equal(formatValuationDate('2026-06-01'), 'Jun 2026');
});
