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
	assert.equal(companies.length, 61);
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
		assert.ok(Date.parse(valuation.date) <= Date.parse('2026-09-17'), company.name);
		assert.equal(new URL(valuation.sourceUrl).protocol, 'https:');
		assert.ok(valuation.sourceTitle);
	}
	assert.equal(companies.find((company) => company.id === 'matx').valuation.kind, 'filing-derived');
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
			'stackblitz',
			'prime-intellect'
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
			'replay',
			'kepler-ai',
			'flow-engineering',
			'harbor'
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
		assert.ok(Date.parse(funding.date) <= Date.parse('2026-09-17'));
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

test('every exit has a public announcement and a real local acquirer image', async () => {
	for (const company of companies) {
		if (company.status !== 'exited') {
			assert.equal(company.exit, undefined, company.name);
			continue;
		}
		assert.ok(company.acquirer && company.exit.sourceTitle, company.name);
		assert.equal(new URL(company.exit.sourceUrl).protocol, 'https:');
		assert.equal(new URL(company.exit.acquirerLogoSource).protocol, 'https:');
		assert.match(company.exit.acquirerLogo, /^\/portfolio\/acquirers\/[a-z]+\.(png|svg)$/);
		const bytes = await readFile(new URL(`static${company.exit.acquirerLogo}`, root));
		assert.ok(bytes.length > 0 && bytes.length < 50_000);
		if (company.exit.acquirerLogo.endsWith('.png')) {
			assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
		} else {
			assert.match(bytes.toString(), /<svg /);
			assert.doesNotMatch(bytes.toString(), /<script|<foreignObject|\bon\w+=/i);
		}
	}
	assert.deepEqual(
		filterPortfolio(companies, { query: 'OpenAI', status: 'exited' }).map((company) => company.id),
		['astral', 'promptfoo']
	);
});

test('search matches multiple words across descriptions and composes with category and status', () => {
	assert.deepEqual(
		filterPortfolio(companies, { query: '  run   code ', category: 'AI infrastructure' }).map(
			(company) => company.id
		),
		['e2b']
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

test('research covers every entry with dated public provenance or an explicit identity gap', async () => {
	const audit = await readFile(new URL('docs/portfolio-research-2026-09-17.md', root), 'utf8');
	for (const company of companies) {
		assert.equal(company.reviewedAt, '2026-09-17', company.name);
		assert.ok(audit.includes(`## ${company.name}\n`), company.name);
		if (company.id === 'catamaran') assert.equal(company.descriptionSourceUrl, null);
		else {
			assert.equal(new URL(company.descriptionSourceUrl).protocol, 'https:', company.name);
			assert.ok(company.descriptionSourceTitle, company.name);
		}
	}
	const cognition = companies.find((company) => company.id === 'cognition');
	assert.equal(cognition.funding.prefix, '>');
});

test('rumors have dated sources and cannot replace valuation marks or affect sorting', () => {
	for (const company of companies.filter((company) => company.valuationRumor)) {
		const rumor = company.valuationRumor;
		assert.ok(rumor.amountUsd > 0 && Number.isFinite(rumor.amountUsd));
		assert.ok(Date.parse(rumor.date) <= Date.parse(company.reviewedAt));
		assert.equal(new URL(rumor.sourceUrl).protocol, 'https:');
		assert.match(rumor.qualifier, /Unconfirmed/);
	}
	const fixture = [
		{ ...companies[0], id: 'rumor-only', valuation: null, valuationRumor: { amountUsd: 1e12 } },
		{ ...companies[1], id: 'valued', valuation: { amountUsd: 1e6 } }
	];
	assert.equal(filterPortfolio(fixture, { sort: 'valuation' })[0].id, 'valued');
});
