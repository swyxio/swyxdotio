import assert from 'node:assert/strict';
import test from 'node:test';

import {
	canonicalReadPath,
	incrementReadCount,
	isAutomatedRead,
	isObviousBot,
	isReadRateAllowed,
	isSameOriginRead,
	normalizeReadCount,
	publicPageKeyForPath,
	readAnalyticsTitle,
	READ_SAMPLE_RATE,
	READ_SAMPLE_WEIGHT,
	resolveReadCounterKey,
	shouldSampleRead
} from '../src/lib/read-counter.js';
import {
	buildGa4ReadPayload,
	hasAnalyticsOptOut,
	normalizeReadAnalyticsContext,
	sendGa4Read
} from '../src/lib/read-analytics.js';
import {
	displayedReadCount,
	historicalReadEstimate,
	HISTORICAL_READ_ESTIMATES,
	HISTORICAL_READ_ESTIMATE_VERSION
} from '../src/lib/server/historical-read-estimates.js';

const manifest = {
	generatedAt: new Date(),
	blogposts: [
		{ slug: 'learn-in-public', title: 'Learn in Public', date: new Date('2018-06-19') },
		{ slug: 'secret-note', title: 'Secret', date: new Date(), isPrivate: true }
	]
};

test('maps only registered public page paths', () => {
	assert.equal(publicPageKeyForPath('/'), 'home');
	assert.equal(publicPageKeyForPath('/about/'), 'about');
	assert.equal(publicPageKeyForPath('/tools'), null);
	assert.equal(publicPageKeyForPath('/api/reads'), null);
});

test('resolves finite page keys and persisted public articles', () => {
	assert.equal(resolveReadCounterKey(manifest, 'home'), 'page:home');
	assert.equal(resolveReadCounterKey(manifest, 'learn-in-public'), 'article:learn-in-public');
	assert.equal(resolveReadCounterKey(manifest, 'secret-note'), null);
	assert.equal(resolveReadCounterKey(manifest, 'unknown-note'), null);
	assert.equal(resolveReadCounterKey(manifest, '../escape'), null);
});

test('builds canonical public paths without accepting arbitrary input', () => {
	assert.equal(canonicalReadPath('home'), '/');
	assert.equal(canonicalReadPath('learn-in-public'), '/learn-in-public');
	assert.equal(canonicalReadPath('../escape'), null);
	assert.equal(readAnalyticsTitle(manifest, 'home'), 'Shawn @swyx Wang');
	assert.equal(readAnalyticsTitle(manifest, 'learn-in-public'), 'Learn in Public');
});

test('rejects bot-like and missing user agents', () => {
	assert.equal(isObviousBot('Mozilla/5.0 Chrome/126 Safari/537.36'), false);
	assert.equal(isObviousBot('Twitterbot/1.0'), true);
	assert.equal(isObviousBot(null), true);
});

test('rejects prefetches and Cloudflare-verified bots before counting', () => {
	assert.equal(
		isAutomatedRead(
			new Request('https://swyx.io/api/reads/home', {
				headers: { 'user-agent': 'Mozilla/5.0', purpose: 'prefetch' }
			})
		),
		true
	);
	const verifiedBotRequest = new Request('https://swyx.io/api/reads/home', {
		headers: { 'user-agent': 'Mozilla/5.0' }
	});
	verifiedBotRequest.cf = { botManagement: { verifiedBot: true } };
	assert.equal(isAutomatedRead(verifiedBotRequest), true);
	assert.equal(
		isAutomatedRead(
			new Request('https://swyx.io/api/reads/home', {
				headers: { 'user-agent': 'Mozilla/5.0 Chrome/126 Safari/537.36' }
			})
		),
		false
	);
});

test('caps bursts by edge IP and analytics session without persisting identifiers', async () => {
	const seen = [];
	const limiter = {
		async limit({ key }) {
			seen.push(key);
			return { success: true };
		}
	};
	assert.equal(
		await isReadRateAllowed(
			{ READ_IP_RATE_LIMITER: limiter, READ_SESSION_RATE_LIMITER: limiter },
			'203.0.113.4',
			1784330000
		),
		true
	);
	assert.deepEqual(seen, ['ip:203.0.113.4', 'session:1784330000']);
	assert.equal(
		await isReadRateAllowed(
			{
				READ_IP_RATE_LIMITER: {
					async limit() {
						return { success: false };
					}
				}
			},
			'203.0.113.4',
			undefined
		),
		false
	);
	assert.equal(await isReadRateAllowed({}, 'unknown', undefined), true);
});

test('accepts only matching browser origins', () => {
	assert.equal(
		isSameOriginRead(
			new Request('https://www.swyx.io/api/reads/home', {
				headers: { origin: 'https://www.swyx.io', 'sec-fetch-site': 'same-origin' }
			})
		),
		true
	);
	assert.equal(
		isSameOriginRead(
			new Request('https://www.swyx.io/api/reads/home', {
				headers: { origin: 'https://example.com', 'sec-fetch-site': 'cross-site' }
			})
		),
		false
	);
});

test('normalizes invalid database counts safely', () => {
	assert.equal(normalizeReadCount(12), 12);
	assert.equal(normalizeReadCount('12'), 12);
	assert.equal(normalizeReadCount(-1), 0);
	assert.equal(normalizeReadCount('nope'), 0);
});

test('adds static editorial and cohort historical estimates', () => {
	assert.equal(HISTORICAL_READ_ESTIMATE_VERSION, 'historical_estimate_v2');
	assert.equal(historicalReadEstimate('learn-in-public'), 10_000_000);
	assert.equal(historicalReadEstimate('gatsby-static-dynamic'), 50_000);
	assert.equal(historicalReadEstimate('firebase-analytics-in-30-seconds-6pp'), 25_000);
	assert.equal(historicalReadEstimate('2025-advice'), 3_000);
	assert.equal(displayedReadCount('learn-in-public', 1_200), 10_001_200);
	assert.equal(displayedReadCount('unknown-note', 1_200), 1_200);
	assert.equal(displayedReadCount('learn-in-public', -1), 10_000_000);
	assert.equal(Object.keys(HISTORICAL_READ_ESTIMATES).length, 426);
	assert.equal(
		Object.values(HISTORICAL_READ_ESTIMATES).reduce((total, count) => total + count, 0),
		25_921_500
	);
});

test('uses a server-controlled half-percent sampling policy', () => {
	assert.equal(READ_SAMPLE_RATE, 0.005);
	assert.equal(READ_SAMPLE_WEIGHT, 200);
	assert.equal(shouldSampleRead(0), true);
	assert.equal(shouldSampleRead(0.004999), true);
	assert.equal(shouldSampleRead(0.005), false);
	assert.equal(shouldSampleRead(1), false);
});

test('persists only the server-owned sample weight and policy', async () => {
	let bindings = [];
	const database = {
		prepare(query) {
			assert.match(query, /sample_count = sample_count \+ 1/);
			return {
				bind(...values) {
					bindings = values;
					return this;
				},
				async first() {
					return { read_count: 400 };
				}
			};
		}
	};
	assert.equal(await incrementReadCount(database, 'article:learn-in-public'), 400);
	assert.deepEqual(bindings, ['article:learn-in-public', 200, 'v1-p005']);
});

test('validates a minimal pseudonymous GA4 context', () => {
	const context = normalizeReadAnalyticsContext({
		clientId: '192837465.1784330000',
		sessionId: '1784330000',
		engagementTimeMs: 8_100
	});
	assert.deepEqual(context, {
		clientId: '192837465.1784330000',
		sessionId: 1784330000,
		engagementTimeMs: 8_100
	});
	assert.equal(normalizeReadAnalyticsContext({ clientId: 'shared', sessionId: 1 }), null);
});

test('honors browser privacy opt-out headers', () => {
	assert.equal(
		hasAnalyticsOptOut(new Request('https://www.swyx.io', { headers: { dnt: '1' } })),
		true
	);
	assert.equal(
		hasAnalyticsOptOut(new Request('https://www.swyx.io', { headers: { 'sec-gpc': '1' } })),
		true
	);
	assert.equal(
		hasAnalyticsOptOut(new Request('https://www.swyx.io', { headers: { dnt: 'yes' } })),
		true
	);
	assert.equal(hasAnalyticsOptOut(new Request('https://www.swyx.io')), false);
});

test('builds a non-advertising engaged-read event', () => {
	const payload = buildGa4ReadPayload(
		{
			clientId: '192837465.1784330000',
			sessionId: 1784330000,
			engagementTimeMs: 8_000
		},
		'/learn-in-public',
		'Learn in Public'
	);
	assert.equal(payload.events[0].name, 'engaged_read');
	assert.equal(payload.events[0].params.page_location, 'https://swyx.io/learn-in-public');
	assert.equal(payload.events[0].params.page_title, 'Learn in Public');
	assert.equal(payload.events[0].params.session_engaged, 1);
	assert.equal(payload.events[0].params.read_weight, 200);
	assert.deepEqual(payload.consent, { ad_user_data: 'DENIED', ad_personalization: 'DENIED' });
});

test('GA4 delivery is optional and never throws into the counter request', async () => {
	const context = {
		clientId: '192837465.1784330000',
		sessionId: 1784330000,
		engagementTimeMs: 8_000
	};
	assert.equal(await sendGa4Read({ context, canonicalPath: '/', pageTitle: 'Home' }), false);
	assert.equal(
		await sendGa4Read({
			measurementId: 'G-TW6GTQ9Q4N',
			apiSecret: 'test-secret',
			context,
			canonicalPath: '/',
			pageTitle: 'Home',
			fetcher: async () => {
				throw new Error('offline');
			}
		}),
		false
	);
});
