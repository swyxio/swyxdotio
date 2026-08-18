import assert from 'node:assert/strict';
import test from 'node:test';

import tailWorker, {
	collectFaultBuckets,
	writeFaultBuckets
} from '../workers/fault-attribution/index.js';
import {
	classifyRoute,
	durationBucket,
	faultBucket,
	isRuntimeFaultOutcome,
	normalizeFaultOutcome
} from '../workers/fault-attribution/classify.js';

function fetchTrace(url, overrides = {}) {
	return {
		scriptName: 'swyxdotio',
		outcome: 'exceededCpu',
		eventTimestamp: Date.parse('2026-08-18T18:23:00Z'),
		wallTime: 31_000,
		event: { request: { url } },
		...overrides
	};
}

test('classifies fetch routes without retaining path or query values', () => {
	const cases = [
		['https://swyx.io/api/presence/private-key?secret=value', 'presence_api'],
		['https://swyx.io/api/reads/batch?key=private-key', 'read_api'],
		['https://swyx.io/tools/podcast/api/uploads/private-id', 'tool_api'],
		['https://swyx.io/tools/api/session', 'tool_api'],
		['https://swyx.io/api/latestPosts.json', 'site_api'],
		['https://swyx.io/og/article/private-slug.png', 'og_image'],
		['https://swyx.io/podcast/private-show/rss.xml', 'syndication'],
		['https://swyx.io/tools/podcast', 'tools_page'],
		['https://swyx.io/', 'home_page'],
		['https://swyx.io/private-article?selection=private', 'content_page']
	];
	for (const [url, expected] of cases) assert.equal(classifyRoute(fetchTrace(url)), expected);

	const bucket = faultBucket(fetchTrace(cases[0][0]));
	assert.deepEqual(Object.keys(bucket).sort(), [
		'bucketStart',
		'count',
		'durationBucket',
		'outcome',
		'routeClass'
	]);
	assert.doesNotMatch(JSON.stringify(bucket), /private|secret|selection/);
});

test('classifies non-fetch triggers and malformed URLs into bounded enums', () => {
	assert.equal(classifyRoute({ event: { queue: 'private-queue' } }), 'queue');
	assert.equal(classifyRoute({ event: { cron: '17 * * * *', scheduledTime: 1 } }), 'scheduled');
	assert.equal(classifyRoute({ event: { scheduledTime: new Date() } }), 'alarm');
	assert.equal(classifyRoute({ event: null }), 'other_trigger');
	assert.equal(classifyRoute(fetchTrace('not a url')), 'content_page');
});

test('bounds outcomes and duration buckets', () => {
	assert.equal(normalizeFaultOutcome('exceededMemory'), 'exceededMemory');
	assert.equal(normalizeFaultOutcome('canceled'), 'other');
	assert.equal(normalizeFaultOutcome('responseStreamDisconnected'), 'other');
	assert.equal(normalizeFaultOutcome('futurePlatformOutcome'), 'other');
	assert.equal(isRuntimeFaultOutcome('ok'), false);
	assert.equal(isRuntimeFaultOutcome('canceled'), false);
	assert.equal(isRuntimeFaultOutcome('responseStreamDisconnected'), false);
	assert.equal(isRuntimeFaultOutcome('futurePlatformOutcome'), true);
	assert.equal(faultBucket(fetchTrace('https://swyx.io/', { outcome: 'canceled' })), null);
	assert.equal(
		faultBucket(fetchTrace('https://swyx.io/', { outcome: 'responseStreamDisconnected' })),
		null
	);
	assert.equal(durationBucket(undefined), 'unknown');
	assert.equal(durationBucket(99), 'lt100ms');
	assert.equal(durationBucket(100), '100ms_1s');
	assert.equal(durationBucket(1_000), '1s_10s');
	assert.equal(durationBucket(10_000), '10s_30s');
	assert.equal(durationBucket(30_000), 'gte30s');
});

test('ignores ok and other-script traces and coalesces identical fault tuples', () => {
	const trace = fetchTrace('https://swyx.io/api/reads/home');
	const buckets = collectFaultBuckets(
		[
			trace,
			{ ...trace },
			{ ...trace, outcome: 'ok' },
			{ ...trace, outcome: 'canceled' },
			{ ...trace, outcome: 'responseStreamDisconnected' },
			{ ...trace, scriptName: 'swyxdotio-presence' }
		],
		'swyxdotio'
	);
	assert.deepEqual(buckets, [
		{
			bucketStart: Date.parse('2026-08-18T18:00:00Z') / 1000,
			routeClass: 'read_api',
			outcome: 'exceededCpu',
			durationBucket: 'gte30s',
			count: 2
		}
	]);
});

test('writes only aggregate enums and counts with one batch', async () => {
	const bindings = [];
	let sql = '';
	let batches = 0;
	const database = {
		prepare(value) {
			sql = value;
			return {
				bind(...values) {
					bindings.push(values);
					return { values };
				}
			};
		},
		async batch(statements) {
			batches += 1;
			assert.equal(statements.length, 1);
		}
	};
	await writeFaultBuckets(database, [
		{
			bucketStart: 1_776_708_000,
			routeClass: 'site_api',
			outcome: 'exception',
			durationBucket: '100ms_1s',
			count: 3
		}
	]);
	assert.equal(batches, 1);
	assert.match(sql, /ON CONFLICT/);
	assert.deepEqual(bindings, [[1_776_708_000, 'site_api', 'exception', '100ms_1s', 3]]);
});

test('tail handler registers aggregate D1 work with waitUntil', async () => {
	const statements = [];
	let pending;
	const env = {
		PRODUCER_SCRIPT_NAME: 'swyxdotio',
		READ_COUNTERS: {
			prepare() {
				return {
					bind(...values) {
						statements.push(values);
						return {};
					}
				};
			},
			async batch() {}
		}
	};
	await tailWorker.tail([fetchTrace('https://swyx.io/api/reads/private-key')], env, {
		waitUntil(promise) {
			pending = promise;
		}
	});
	assert.ok(pending instanceof Promise);
	await pending;
	assert.deepEqual(statements, [
		[Date.parse('2026-08-18T18:00:00Z') / 1000, 'read_api', 'exceededCpu', 'gte30s', 1]
	]);
	assert.doesNotMatch(JSON.stringify(statements), /private-key/);
});
