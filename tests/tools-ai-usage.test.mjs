import assert from 'node:assert/strict';
import test from 'node:test';
import { TOOLS_AI_POLICY, estimateToolsMediaReservation } from '../src/lib/tools-ai-policy.js';
import { ToolsAiUsage } from '../workers/draw/ai-usage.js';
import drawWorker from '../workers/draw/index.js';
import { createTestAiLedger, ledgerRequest, seedTestJob } from './helpers/tools-ai-ledger.mjs';
import { createToolsSession } from '../src/lib/server/tools-auth.js';
import { reserveToolsAiUsage, toolsAiLedger } from '../src/lib/server/tools-ai-usage.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.parse('2026-08-25T12:00:00Z');
const assistant = (userId = 'alice') => ({
	userId,
	kind: 'assistant',
	model: '@cf/qwen/qwen3.8-27b',
	estimatedReservedUsd: TOOLS_AI_POLICY.assistantReservationUsd
});
const media = (userId = 'alice', estimatedReservedUsd = 0.05) => ({
	userId,
	kind: 'media',
	model: 'flux-2',
	estimatedReservedUsd
});

test('only the configured owner bypasses budgets, remains logged, and cannot exhaust member funding', async () => {
	const ledger = createTestAiLedger();
	const secret = 'owner-exemption-test-secret-at-least-32-characters';
	const eventFor = async (id) => {
		const session = await createToolsSession(
			{ id, email: 'owner@example.com', name: 'Test' },
			secret
		);
		return {
			platform: {
				env: {
					DRAW_PAGES: ledger.namespace,
					TOOLS_SESSION_SECRET: secret,
					TOOLS_OWNER_GOOGLE_SUB: 'owner'
				}
			},
			cookies: { get: () => session }
		};
	};
	const owner = await eventFor('owner');
	for (let index = 0; index < 22; index++) {
		const reservation = await reserveToolsAiUsage(owner, 'owner', 'assistant', 'model', 0.05);
		assert.equal(typeof reservation.id, 'string');
	}
	for (let index = 0; index < 7; index++) {
		const reservation = await reserveToolsAiUsage(owner, 'owner', 'media', 'model', 101);
		assert.equal(typeof reservation.id, 'string');
	}
	const summary = await (await toolsAiLedger(owner, 'summary', { userId: 'owner' })).json();
	assert.equal(summary.unlimited, true);
	assert.equal(summary.policy.assistantTurnsPerHour, null);
	assert.equal(summary.policy.mediaJobsPerHour, null);
	assert.equal(summary.policy.userEstimatedDailyUsd, null);
	assert.equal(summary.policy.siteEstimatedDailyUsd, null);
	assert.equal(summary.usage.assistantTurnsThisHour, 22);
	assert.equal(summary.usage.mediaJobsThisHour, 7);
	assert.equal(summary.usage.estimatedReservedTodayUsd, 708.1);
	assert.equal(summary.logging.retentionDays, 30);
	// Same email and forged role/owner metadata cannot confer the exemption.
	const member = await eventFor('member');
	const memberSummary = await (
		await toolsAiLedger(member, 'summary', {
			userId: 'member',
			ownerUserId: 'member',
			isOwner: true
		})
	).json();
	assert.equal(memberSummary.unlimited, false);
	assert.equal(memberSummary.policy.userEstimatedDailyUsd, 2);
	assert.equal((await reserveToolsAiUsage(member, 'owner', 'media', 'model', 1)).status, 409);
	for (let index = 0; index < 10; index++) {
		const userId = `member-${index}`;
		const admitted = await reserveToolsAiUsage(await eventFor(userId), userId, 'media', 'model', 2);
		assert.equal(typeof admitted.id, 'string');
	}
	const capped = await reserveToolsAiUsage(member, 'member', 'assistant', 'model', 0.05);
	assert.equal(capped.status, 429);
	assert.equal((await capped.json()).code, 'site_daily_limit');
	assert.equal(
		typeof (await reserveToolsAiUsage(owner, 'owner', 'media', 'model', 5)).id,
		'string'
	);
	owner.platform.env.TOOLS_OWNER_GOOGLE_SUB = 'new-owner';
	const demoted = await reserveToolsAiUsage(owner, 'owner', 'assistant', 'model', 0.05);
	assert.equal(demoted.status, 429);
	assert.equal(
		ledger.database
			.prepare('SELECT COUNT(*) AS count FROM tools_ai_usage WHERE user_id = ?')
			.get('owner').count,
		30
	);
});

test('concurrent admission atomically enforces exactly 20 assistant turns and 5 media jobs per account/hour', async () => {
	const ledger = createTestAiLedger();
	const turns = await Promise.all(
		Array.from({ length: 25 }, () => ledgerRequest(ledger, 'admit', assistant()))
	);
	assert.equal(turns.filter((response) => response.status === 201).length, 20);
	assert.equal(turns.filter((response) => response.status === 429).length, 5);
	const jobs = await Promise.all(
		Array.from({ length: 9 }, () => ledgerRequest(ledger, 'admit', media()))
	);
	assert.equal(jobs.filter((response) => response.status === 201).length, 5);
	assert.equal(jobs.filter((response) => response.status === 429).length, 4);
	assert.equal((await ledgerRequest(ledger, 'admit', assistant('bob'))).status, 201);
	const rejected = turns.find((response) => response.status === 429);
	assert.equal((await rejected.json()).code, 'account_hourly_limit');
	assert.ok(Number(rejected.headers.get('Retry-After')) > 0);
});

test('estimated daily account and sitewide caps are atomic and failures do not refund reservations', async () => {
	const ledger = new ToolsAiUsage(createTestAiLedger().sql);
	const first = await ledger.handle('/ai/admit', media('alice', 2), NOW).json();
	assert.equal(
		ledger.handle('/ai/finish', { userId: 'alice', id: first.id, status: 'failed' }, NOW).status,
		200
	);
	const capped = ledger.handle('/ai/admit', assistant('alice'), NOW);
	assert.equal(capped.status, 429);
	assert.equal((await capped.json()).code, 'account_daily_limit');
	for (let index = 1; index < 10; index++)
		assert.equal(ledger.handle('/ai/admit', media(`user-${index}`, 2), NOW).status, 201);
	const global = ledger.handle('/ai/admit', assistant('fresh-account'), NOW);
	assert.equal(global.status, 429);
	assert.equal((await global.json()).code, 'site_daily_limit');
	assert.equal(ledger.handle('/ai/admit', assistant('alice'), NOW + DAY).status, 201);
});

test('sliding hourly counters recover after one hour without resetting daily reservations', async () => {
	const ledger = new ToolsAiUsage(createTestAiLedger().sql);
	for (let index = 0; index < 20; index++) ledger.handle('/ai/admit', assistant(), NOW);
	assert.equal(ledger.handle('/ai/admit', assistant(), NOW + HOUR - 1).status, 429);
	assert.equal(ledger.handle('/ai/admit', assistant(), NOW + HOUR).status, 201);
	const summary = await ledger.handle('/ai/summary', { userId: 'alice' }, NOW + HOUR).json();
	assert.equal(summary.usage.assistantTurnsThisHour, 1);
	assert.equal(summary.usage.assistantTurnsToday, 21);
	assert.equal(summary.usage.mediaJobsToday, 0);
	assert.equal(summary.usage.estimatedReservedTodayUsd, 1.05);
});

test('provider request ownership is bound to account and model, cannot be overwritten, and finishes idempotently', async () => {
	const ledger = createTestAiLedger();
	const id = await seedTestJob(ledger, 'alice', 'flux-2', 'private-job');
	assert.equal(
		(
			await ledgerRequest(ledger, 'owned-job', {
				userId: 'alice',
				model: 'flux-2',
				requestId: 'private-job'
			})
		).status,
		200
	);
	for (const body of [
		{ userId: 'bob', model: 'flux-2', requestId: 'private-job' },
		{ userId: 'alice', model: 'another-model', requestId: 'private-job' }
	])
		assert.equal((await ledgerRequest(ledger, 'owned-job', body)).status, 404);
	assert.equal(
		(
			await ledgerRequest(ledger, 'register', {
				userId: 'bob',
				id,
				model: 'flux-2',
				requestId: 'private-job'
			})
		).status,
		404
	);
	const other = await (await ledgerRequest(ledger, 'admit', media('bob'))).json();
	assert.equal(
		(
			await ledgerRequest(ledger, 'register', {
				userId: 'bob',
				id: other.id,
				model: 'flux-2',
				requestId: 'private-job'
			})
		).status,
		409
	);
	await ledgerRequest(ledger, 'finish', { userId: 'alice', id, status: 'succeeded' });
	await ledgerRequest(ledger, 'finish', { userId: 'alice', id, status: 'failed' });
	assert.equal(
		(
			await (
				await ledgerRequest(ledger, 'owned-job', {
					userId: 'alice',
					model: 'flux-2',
					requestId: 'private-job'
				})
			).json()
		).status,
		'succeeded'
	);
	assert.equal(
		(await ledgerRequest(ledger, 'finish', { userId: 'bob', id, status: 'cancelled' })).status,
		404
	);
});

test('ledger retains only allowlisted metadata and own summaries never expose another account', async () => {
	const ledger = createTestAiLedger();
	await ledgerRequest(ledger, 'admit', {
		...assistant(),
		prompt: 'PRIVATE-PROMPT',
		image: 'PRIVATE-IMAGE',
		token: 'PRIVATE-TOKEN',
		providerKey: 'PRIVATE-KEY'
	});
	await ledgerRequest(ledger, 'admit', assistant('bob'));
	const rows = ledger.database.prepare('SELECT * FROM tools_ai_usage').all();
	assert.deepEqual(Object.keys(rows[0]).sort(), [
		'created_at',
		'id',
		'kind',
		'last_polled_at',
		'model',
		'provider_request_id',
		'reserved_micros',
		'status',
		'user_id'
	]);
	assert.doesNotMatch(JSON.stringify(rows), /PRIVATE/);
	const summary = await (await ledgerRequest(ledger, 'summary', { userId: 'alice' })).json();
	assert.equal(summary.usage.assistantTurnsThisHour, 1);
	assert.equal(summary.logging.retentionDays, 30);
	assert.doesNotMatch(JSON.stringify(summary), /alice|bob|private-job/);
	const reserved = await (
		await ledgerRequest(ledger, 'admit', {
			...media(),
			run: { id: 'run', clientJobId: 'client-job', limitUsd: 0.2, prompt: 'PRIVATE-PROMPT' }
		})
	).json();
	await ledgerRequest(ledger, 'register', {
		userId: 'alice',
		id: reserved.id,
		model: 'flux-2',
		requestId: 'provider-job',
		adapter: 'fal',
		prompt: 'PRIVATE-PROMPT',
		outputUrl: 'PRIVATE-OUTPUT'
	});
	const runRows = ledger.database.prepare('SELECT * FROM tools_ai_generation_runs').all();
	const jobRows = ledger.database.prepare('SELECT * FROM tools_ai_generation_jobs').all();
	assert.deepEqual(Object.keys(runRows[0]).sort(), [
		'limit_micros',
		'reserved_micros',
		'run_id',
		'updated_at',
		'user_id'
	]);
	assert.deepEqual(Object.keys(jobRows[0]).sort(), [
		'adapter',
		'client_job_id',
		'run_id',
		'usage_id',
		'user_id'
	]);
	assert.doesNotMatch(JSON.stringify([runRows, jobRows]), /PRIVATE/);
	assert.match(
		summary.logging.fields.join(', '),
		/generation run and client job IDs.*hosting adapter.*authorized run spending limit/
	);
	assert.equal(drawWorker.fetch(new Request('https://drawing.example/ai/summary')).status, 404);
});

test('retention alarm removes 30-day metadata while idle and retains newer reservations across object restart', async (context) => {
	let time = NOW;
	context.mock.method(Date, 'now', () => time);
	const fixture = createTestAiLedger();
	await ledgerRequest(fixture, 'admit', assistant());
	assert.equal(fixture.alarmAt(), NOW + 30 * DAY);
	time += DAY;
	await ledgerRequest(fixture, 'admit', assistant('bob'));
	assert.equal(fixture.alarmAt(), NOW + 30 * DAY);
	fixture.object.aiUsage = undefined; // emulate an evicted instance rebuilding its ledger helper
	time = NOW + 30 * DAY;
	await fixture.object.alarm();
	assert.deepEqual(
		fixture.database
			.prepare('SELECT user_id FROM tools_ai_usage')
			.all()
			.map((row) => row.user_id),
		['bob']
	);
	assert.equal(fixture.alarmAt(), NOW + 31 * DAY);
	time += DAY;
	await fixture.object.alarm();
	assert.equal(
		fixture.database.prepare('SELECT COUNT(*) AS count FROM tools_ai_usage').get().count,
		0
	);
});

test('media reservation estimates add a margin and the durable boundary rejects invalid under-reservations', () => {
	assert.equal(estimateToolsMediaReservation(0.01), 0.05);
	assert.equal(estimateToolsMediaReservation(0.8), 1);
	assert.throws(() => estimateToolsMediaReservation(NaN));
	const ledger = new ToolsAiUsage(createTestAiLedger().sql);
	for (const estimatedReservedUsd of [NaN, -1, 0, 0.01, Infinity])
		assert.equal(
			ledger.handle('/ai/admit', { ...assistant(), estimatedReservedUsd }, NOW).status,
			400
		);
});

test('durable per-job poll throttling stops rapid repeats without blocking cancellation', async () => {
	const fixture = createTestAiLedger();
	const id = await seedTestJob(fixture, 'alice', 'flux-2', 'job-for-poll');
	const ledger = new ToolsAiUsage(fixture.sql);
	const body = { userId: 'alice', model: 'flux-2', requestId: 'job-for-poll', poll: true };
	const now = Date.now();
	assert.equal(ledger.handle('/ai/owned-job', body, now).status, 200);
	assert.equal(ledger.handle('/ai/owned-job', body, now + 1).status, 429);
	assert.equal(ledger.handle('/ai/owned-job', { ...body, poll: false }, now + 1).status, 200);
	assert.equal(ledger.handle('/ai/owned-job', body, now + 500).status, 200);
	assert.equal(
		ledger.handle('/ai/finish', { userId: 'alice', id, status: 'cancelled' }, now + 500).status,
		200
	);
});

test('hourly rejection points to the reset for the limited request kind, not an earlier different-kind reservation', async () => {
	const ledger = new ToolsAiUsage(createTestAiLedger().sql);
	ledger.handle('/ai/admit', assistant(), NOW);
	for (let index = 0; index < 5; index++) ledger.handle('/ai/admit', media(), NOW + 10_000);
	const response = ledger.handle('/ai/admit', media(), NOW + 20_000);
	const body = await response.json();
	assert.equal(response.status, 429);
	assert.equal(body.retryAt, new Date(NOW + 10_000 + HOUR).toISOString());
	assert.ok(body.error.includes(body.retryAt));
});

test('concurrent run reservations atomically enforce their immutable budget in addition to account quotas', async () => {
	const fixture = createTestAiLedger();
	const run = { id: 'comparison', limitUsd: 0.1 };
	const responses = await Promise.all(
		Array.from({ length: 4 }, (_, index) =>
			ledgerRequest(fixture, 'admit', {
				...media(),
				run: { ...run, clientJobId: `job-${index}` }
			})
		)
	);
	assert.equal(responses.filter((response) => response.status === 201).length, 2);
	assert.equal(responses.filter((response) => response.status === 402).length, 2);
	const accepted = await responses[0].json();
	await ledgerRequest(fixture, 'finish', { userId: 'alice', id: accepted.id, status: 'failed' });
	assert.equal(
		(await ledgerRequest(fixture, 'admit', { ...media(), run: { ...run, clientJobId: 'retry' } }))
			.status,
		402
	);
	assert.equal(
		(await ledgerRequest(fixture, 'admit', { ...media(), run: { ...run, clientJobId: 'job-0' } }))
			.status,
		409
	);
	assert.equal(
		(
			await ledgerRequest(fixture, 'admit', {
				...media(),
				run: { ...run, limitUsd: 1, clientJobId: 'new' }
			})
		).status,
		409
	);
	assert.equal(
		(
			await ledgerRequest(fixture, 'admit', {
				...media('bob'),
				run: { ...run, clientJobId: 'job-0' }
			})
		).status,
		201
	);
	assert.equal(
		(
			await ledgerRequest(fixture, 'admit', {
				...media(),
				run: { id: 'fresh', limitUsd: 1, clientJobId: 'fresh' }
			})
		).status,
		201
	);
});

test('a job transport stays bound to its original adapter and run metadata expires through the existing alarm', async (context) => {
	let now = NOW;
	context.mock.method(Date, 'now', () => now);
	const fixture = createTestAiLedger();
	const response = await ledgerRequest(fixture, 'admit', {
		...media(),
		run: { id: 'run', limitUsd: 0.2, clientJobId: 'job' }
	});
	const { id } = await response.json();
	const registration = {
		userId: 'alice',
		id,
		model: 'flux-2',
		requestId: 'external',
		adapter: 'fake'
	};
	assert.equal((await ledgerRequest(fixture, 'register', registration)).status, 200);
	assert.equal(
		(await ledgerRequest(fixture, 'register', { ...registration, adapter: 'fal' })).status,
		409
	);
	assert.equal(
		(await (await ledgerRequest(fixture, 'owned-job', registration)).json()).adapter,
		'fake'
	);
	assert.equal(fixture.alarmAt(), NOW + 30 * DAY);
	fixture.object.aiUsage = undefined;
	assert.equal(
		(
			await ledgerRequest(fixture, 'admit', {
				...media(),
				run: { id: 'run', limitUsd: 0.2, clientJobId: 'job' }
			})
		).status,
		409
	);
	now += 30 * DAY;
	await fixture.object.alarm();
	for (const table of ['tools_ai_usage', 'tools_ai_generation_runs', 'tools_ai_generation_jobs'])
		assert.equal(fixture.database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count, 0);
});

test('daily usage shares the UTC spending boundary, counts failed admissions and isolates accounts', async () => {
	const ledger = new ToolsAiUsage(createTestAiLedger().sql);
	const midnight = Math.floor(NOW / DAY) * DAY;
	ledger.handle('/ai/admit', assistant(), midnight - 1);
	ledger.handle('/ai/admit', assistant(), midnight);
	const failed = await ledger.handle('/ai/admit', media(), NOW - 2 * HOUR).json();
	ledger.handle('/ai/finish', { userId: 'alice', id: failed.id, status: 'failed' }, NOW - HOUR);
	ledger.handle('/ai/admit', media(), NOW);
	ledger.handle('/ai/admit', assistant('bob'), NOW);
	const usage = ledger.summary('alice', NOW);
	assert.equal(usage.assistantTurnsToday, 1);
	assert.equal(usage.mediaJobsToday, 2);
	assert.equal(usage.assistantTurnsThisHour, 0);
	assert.equal(usage.mediaJobsThisHour, 1);
	assert.equal(usage.estimatedReservedTodayUsd, 0.15);
	assert.equal(usage.dayResetsAt, new Date(midnight + DAY).toISOString());
	const nextDay = ledger.summary('alice', midnight + DAY);
	assert.equal(nextDay.assistantTurnsToday, 0);
	assert.equal(nextDay.mediaJobsToday, 0);
	assert.equal(nextDay.estimatedReservedTodayUsd, 0);
});
