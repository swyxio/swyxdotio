import assert from 'node:assert/strict';
import test from 'node:test';

import {
	analyzeMonitor,
	calibrationWindowSampleCount,
	completedPresenceBucketWindow,
	monitorConfig,
	monitorSmokeUrls,
	renderMonitorReport
} from '../workers/read-presence-monitor/monitor.js';
import {
	postMonitorAlert,
	readPresenceCounts,
	runSmokeChecks
} from '../workers/read-presence-monitor/index.js';

test('monitor smoke URL preserves every required public read key', () => {
	const { readsUrl, presenceUrl } = monitorSmokeUrls('https://swyx.io');
	assert.deepEqual(readsUrl.searchParams.getAll('key'), ['home', 'learn-in-public']);
	assert.equal(readsUrl.pathname, '/api/reads/batch');
	assert.equal(presenceUrl.href, 'https://swyx.io/api/presence/home');
});

test('presence monitoring reads completed non-overlapping hourly buckets', () => {
	const capturedAt = Date.parse('2026-07-21T21:17:40Z') / 1000;
	assert.deepEqual(completedPresenceBucketWindow(capturedAt, 60), {
		start: Date.parse('2026-07-21T20:00:00Z') / 1000,
		end: Date.parse('2026-07-21T21:00:00Z') / 1000
	});
	assert.deepEqual(completedPresenceBucketWindow(capturedAt, 61), {
		start: Date.parse('2026-07-21T19:00:00Z') / 1000,
		end: Date.parse('2026-07-21T21:00:00Z') / 1000
	});
});

test('presence count query binds the completed bucket window', async () => {
	const capturedAt = Date.parse('2026-07-21T21:17:40Z') / 1000;
	let sql = '';
	let bindings = [];
	const database = {
		prepare(value) {
			sql = value;
			return {
				bind(...values) {
					bindings = values;
					return {
						async all() {
							return { results: [{ kind: 'rateLimited', count: 4 }] };
						}
					};
				}
			};
		}
	};
	assert.deepEqual(await readPresenceCounts(database, capturedAt, 60), {
		roomFull: 0,
		malformed: 0,
		rateLimited: 4
	});
	assert.match(sql, /bucket_start >= \?1 AND bucket_start < \?2/);
	assert.deepEqual(bindings, [
		Date.parse('2026-07-21T20:00:00Z') / 1000,
		Date.parse('2026-07-21T21:00:00Z') / 1000
	]);
});

test('monitor smoke check validates both public read keys and presence gating', async () => {
	const smoke = await runSmokeChecks('https://swyx.io', async (input) => {
		const url = new URL(String(input));
		if (url.pathname === '/api/reads/batch') {
			assert.deepEqual(url.searchParams.getAll('key'), ['home', 'learn-in-public']);
			return Response.json({ reads: { home: 201, 'learn-in-public': 10000201 } });
		}
		return new Response(null, { status: 403 });
	});
	assert.deepEqual(smoke, {
		readBatchOk: true,
		presenceHttpOk: true,
		publicReads: { home: 201, 'learn-in-public': 10000201 }
	});
});

test('calibration activity counts samples since the latest captured total', () => {
	assert.equal(calibrationWindowSampleCount(18, 1), 17);
	assert.equal(calibrationWindowSampleCount(18, null), 18);
	assert.equal(calibrationWindowSampleCount(10, 12), 0);
});

test('monitor alert delivery rejects non-success responses', async () => {
	await postMonitorAlert('https://alerts.example.test', 'report', async (_url, init) => {
		assert.deepEqual(JSON.parse(String(init?.body)), { text: 'report' });
		return new Response(null, { status: 204 });
	});
	await assert.rejects(
		postMonitorAlert(
			'https://alerts.example.test',
			'report',
			async () => new Response(null, { status: 503 })
		),
		/Monitor alert webhook failed \(503\)/
	);
});

test('monitor flags insufficient samples and elevated exceededResources', () => {
	const config = monitorConfig({
		MONITOR_LOOKBACK_MINUTES: '60',
		MONITOR_MIN_SAMPLE_COUNT: '20',
		MONITOR_EXCEEDED_RESOURCES_MIN_COUNT: '5',
		MONITOR_EXCEEDED_RESOURCES_MAX_RATE: '0.005'
	});
	const analysis = analyzeMonitor({
		calibrationSampleCount: 7,
		readBatchOk: true,
		presenceHttpOk: true,
		calibrationStatus: 'baseline',
		workerRequests: 500,
		workerExceededResources: 6,
		workerErrors: 6,
		presenceCounts: { roomFull: 0, malformed: 0, rateLimited: 0 },
		config
	});
	assert.equal(analysis.status, 'alert');
	assert.match(analysis.alerts.join('\n'), /Calibration remains statistically inactive/);
	assert.match(analysis.alerts.join('\n'), /exceededResources is elevated/);
});

test('monitor flags presence anomalies and smoke failures', () => {
	const config = monitorConfig({});
	const analysis = analyzeMonitor({
		calibrationSampleCount: 30,
		readBatchOk: false,
		presenceHttpOk: false,
		calibrationStatus: 'delivery_anomaly',
		workerRequests: null,
		workerExceededResources: null,
		workerErrors: null,
		presenceCounts: { roomFull: 2, malformed: 1, rateLimited: 4 },
		config
	});
	assert.equal(analysis.status, 'alert');
	assert.equal(analysis.alerts.length, 6);
});

test('rendered monitor report includes public read checks and alerts', () => {
	const config = monitorConfig({});
	const analysis = analyzeMonitor({
		calibrationSampleCount: 7,
		readBatchOk: true,
		presenceHttpOk: true,
		calibrationStatus: 'baseline',
		workerRequests: null,
		workerExceededResources: null,
		workerErrors: null,
		presenceCounts: { roomFull: 0, malformed: 0, rateLimited: 0 },
		config
	});
	const report = renderMonitorReport({
		capturedAt: Date.parse('2026-07-19T16:00:00Z') / 1000,
		config,
		totals: { readCount: 1404, sampleCount: 7 },
		calibration: {
			captured_at: Date.parse('2026-07-17T22:35:21Z') / 1000,
			d1_sample_total: 1,
			status: 'baseline'
		},
		calibrationSampleCount: 7,
		smoke: {
			readBatchOk: true,
			presenceHttpOk: true,
			publicReads: { home: 1, 'learn-in-public': 10000201 }
		},
		worker: { requests: null, errors: null, exceededResources: null, clientDisconnected: null },
		presence: { roomFull: 0, malformed: 0, rateLimited: 0 },
		analysis
	});
	assert.match(report, /home=1, learn-in-public=10000201/);
	assert.match(report, /Current calibration window: 7\/20 samples/);
	assert.match(report, /Calibration remains statistically inactive/);
});
