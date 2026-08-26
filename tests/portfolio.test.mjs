import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import {
	PORTFOLIO_TIERS,
	filterPortfolio,
	formatPortfolioValuation,
	formatValuation,
	formatValuationDate
} from '../src/lib/portfolio.js';

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
		assert.match(valuation.date, /^\d{4}-\d{2}(-\d{2})?$/);
		assert.ok(Date.parse(valuation.date) <= Date.parse('2026-08-26'), company.name);
		assert.equal(new URL(valuation.sourceUrl).protocol, 'https:');
		assert.ok(valuation.sourceTitle);
	}
	assert.equal(companies.find((company) => company.id === 'matx').valuation.prefix, '>');
	assert.match(companies.find((company) => company.id === 'circle').valuation.dateLabel, /^2023/);
	for (const company of companies.filter(
		(company) => company.valuation?.kind === 'filing-derived'
	)) {
		assert.equal(company.valuation.prefix, '≈');
		assert.match(company.valuation.qualifier, /[Ff]iling-derived/);
	}
});

test('original tiers retain their exact memberships independently of status', () => {
	const groups = companies.reduce((groups, company) => {
		(groups[company.tier] ??= []).push(company.id);
		return groups;
	}, {});
	assert.deepEqual(Object.keys(groups), PORTFOLIO_TIERS);
	assert.deepEqual(groups, {
		'Well known names': [
			'temporal',
			'cognition',
			'supabase',
			'railway',
			'workos',
			'matx',
			'artificial-analysis',
			'browserbase',
			'fireworks',
			'e2b',
			'daytona',
			'resend',
			'modal',
			'conductor',
			'chroma',
			'restate',
			'logan-kilpatrick',
			'matthew-berman'
		],
		'You should know': [
			'datalab',
			'viktor',
			'brightwave',
			'quadratic',
			'flutterflow',
			'circle',
			'airbyte',
			'sphere',
			'val-town',
			'stackblitz'
		],
		'Smaller names': [
			'preference-model',
			'littlebird',
			'clarify',
			'phonic',
			'keycard',
			'confident-security',
			'lightweight-labs',
			'wordware',
			'polyhive',
			'sailplane',
			'morph',
			'fireproof',
			'arcjet',
			'cosine',
			'responsive',
			'budibase',
			'100ms',
			'expand',
			'catamaran',
			'replay'
		],
		Done: [
			'astral',
			'promptfoo',
			'gabber',
			'codegen',
			'brev',
			'gel',
			'dynamic',
			'begin',
			'dimension'
		]
	});
	assert.deepEqual(
		filterPortfolio(companies, { tier: 'Done', status: 'closed' }).map((company) => company.id),
		['begin', 'dimension']
	);
	assert.equal(
		filterPortfolio(companies, { tier: 'Smaller names', category: 'AI coding' }).length,
		1
	);
	assert.equal(filterPortfolio(companies, { tier: 'You should know', status: 'exited' }).length, 0);
});

test('funding evidence stays distinct from valuations and has its own dated source', () => {
	const funded = companies.filter((company) => company.funding);
	for (const { funding } of funded) {
		if (funding.amountUsd !== null)
			assert.ok(funding.amountUsd > 0 && Number.isFinite(funding.amountUsd));
		assert.ok(funding.stage && funding.sourceTitle);
		assert.equal(new URL(funding.sourceUrl).protocol, 'https:');
		assert.ok(Date.parse(funding.date) <= Date.parse('2026-08-26'));
	}
	const fixture = [
		{ ...companies[0], id: 'funding-only', valuation: null, funding: { amountUsd: 1e12 } },
		{ ...companies[1], id: 'valued', valuation: { amountUsd: 1e6 } }
	];
	assert.equal(filterPortfolio(fixture, { sort: 'valuation' })[0].id, 'valued');
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
	assert.equal(formatValuationDate('2023-04'), 'Apr 2023');
	assert.equal(formatValuation(350_000), '$350K');
	assert.equal(
		formatPortfolioValuation({ amountUsd: 8_500_000, maxAmountUsd: 10_000_000 }),
		'$8.5M–$10M'
	);
	assert.equal(formatPortfolioValuation({ amountUsd: 409_010_000, prefix: '≈' }), '≈$409.01M');
});
