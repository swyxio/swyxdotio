import {
	analyzeMonitor,
	calibrationWindowSampleCount,
	completedPresenceBucketWindow,
	monitorConfig,
	monitorSmokeUrls,
	renderMonitorReport
} from './monitor.js';

export default {
	async scheduled(_event, env, ctx) {
		ctx.waitUntil(runMonitor(env, new Date()));
	}
};

/** @param {Record<string, any>} env @param {Date} now */
export async function runMonitor(env, now) {
	const config = monitorConfig(env);
	const capturedAt = Math.floor(now.valueOf() / 1000);
	const [totals, calibration, smoke, presence] = await Promise.all([
		readTotals(env.READ_COUNTERS),
		readLatestCalibration(env.READ_COUNTERS),
		runSmokeChecks(config.baseUrl),
		readPresenceCounts(env.READ_COUNTERS, capturedAt, config.lookbackMinutes)
	]);
	const worker = await readWorkerStatus(env, now, config).catch((error) => {
		console.error(
			JSON.stringify({
				event: 'read_presence_monitor_worker_status_failed',
				error: error instanceof Error ? error.message : String(error)
			})
		);
		return { requests: null, errors: null, exceededResources: null, clientDisconnected: null };
	});
	const calibrationSampleCount = calibrationWindowSampleCount(
		totals.sampleCount,
		calibration.d1_sample_total
	);
	const analysis = analyzeMonitor({
		calibrationSampleCount,
		readBatchOk: smoke.readBatchOk,
		presenceHttpOk: smoke.presenceHttpOk,
		calibrationStatus: calibration.status,
		workerRequests: worker.requests,
		workerExceededResources: worker.exceededResources,
		workerErrors: worker.errors,
		presenceCounts: presence,
		config
	});
	const report = renderMonitorReport({
		capturedAt,
		config,
		totals,
		calibration,
		calibrationSampleCount,
		smoke,
		worker,
		presence,
		analysis
	});

	await writeSnapshot(env.READ_COUNTERS, {
		capturedAt,
		config,
		totals,
		calibration,
		calibrationSampleCount,
		smoke,
		worker,
		presence,
		analysis,
		report
	});

	const payload = {
		event: 'read_presence_monitor',
		status: analysis.status,
		alertCount: analysis.alerts.length,
		lookbackMinutes: config.lookbackMinutes,
		readCountTotal: totals.readCount,
		sampleCountTotal: totals.sampleCount,
		calibrationSampleCount,
		workerRequests: worker.requests,
		workerExceededResources: worker.exceededResources,
		presenceRoomFull: presence.roomFull,
		presenceMalformed: presence.malformed,
		presenceRateLimited: presence.rateLimited
	};
	console.log(JSON.stringify(payload));

	if (analysis.alerts.length > 0 && env.MONITOR_ALERT_WEBHOOK_URL) {
		await postMonitorAlert(env.MONITOR_ALERT_WEBHOOK_URL, report).catch((error) => {
			console.error(
				JSON.stringify({
					event: 'read_presence_monitor_alert_delivery_failed',
					error: error instanceof Error ? error.message : String(error)
				})
			);
		});
	}

	return { status: analysis.status, alerts: analysis.alerts, report };
}

/** @param {D1Database} database */
async function readTotals(database) {
	const row = await database
		.prepare(
			'SELECT COALESCE(SUM(read_count), 0) AS read_count, COALESCE(SUM(sample_count), 0) AS sample_count FROM page_reads'
		)
		.first();
	return { readCount: Number(row?.read_count ?? 0), sampleCount: Number(row?.sample_count ?? 0) };
}

/** @param {D1Database} database */
async function readLatestCalibration(database) {
	const row = await database
		.prepare(
			'SELECT captured_at, d1_sample_total, status FROM read_calibration_reports ORDER BY captured_at DESC LIMIT 1'
		)
		.first();
	return {
		captured_at: row ? Number(row.captured_at) : null,
		d1_sample_total: row ? Number(row.d1_sample_total) : null,
		status: typeof row?.status === 'string' ? row.status : null
	};
}

/** @param {string} webhookUrl @param {string} report @param {typeof fetch} [fetchImpl] */
export async function postMonitorAlert(webhookUrl, report, fetchImpl = fetch) {
	const response = await fetchImpl(webhookUrl, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ text: report }),
		signal: AbortSignal.timeout(3_000)
	});
	if (!response.ok) throw new Error(`Monitor alert webhook failed (${response.status})`);
}

/** @param {D1Database} database @param {number} capturedAt @param {number} lookbackMinutes */
export async function readPresenceCounts(database, capturedAt, lookbackMinutes) {
	const window = completedPresenceBucketWindow(capturedAt, lookbackMinutes);
	const rows = await database
		.prepare(
			`SELECT kind, COALESCE(SUM(count), 0) AS count
			 FROM presence_monitor_hourly
			 WHERE bucket_start >= ?1 AND bucket_start < ?2
			 GROUP BY kind`
		)
		.bind(window.start, window.end)
		.all();
	const counts = { roomFull: 0, malformed: 0, rateLimited: 0 };
	for (const row of rows.results ?? []) {
		const key = `${row.kind}`;
		if (key === 'roomFull') counts.roomFull = Number(row.count ?? 0);
		if (key === 'malformed') counts.malformed = Number(row.count ?? 0);
		if (key === 'rateLimited') counts.rateLimited = Number(row.count ?? 0);
	}
	return counts;
}

/** @param {string} baseUrl @param {typeof fetch} [fetchImpl] */
export async function runSmokeChecks(baseUrl, fetchImpl = fetch) {
	const { readsUrl, presenceUrl } = monitorSmokeUrls(baseUrl);

	const [readsResponse, presenceResponse] = await Promise.all([
		fetchImpl(readsUrl, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(4_000)
		}).catch(() => null),
		fetchImpl(presenceUrl, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(4_000)
		}).catch(() => null)
	]);

	let publicReads = {};
	let readBatchOk = false;
	if (readsResponse?.ok) {
		const payload = await readsResponse.json().catch(() => null);
		const reads = payload?.reads;
		if (
			reads &&
			Number.isSafeInteger(reads.home) &&
			Number.isSafeInteger(reads['learn-in-public'])
		) {
			publicReads = { home: reads.home, 'learn-in-public': reads['learn-in-public'] };
			readBatchOk = true;
		}
	}

	return {
		readBatchOk,
		presenceHttpOk: presenceResponse?.status === 403,
		publicReads
	};
}

/** @param {Record<string, any>} env @param {Date} now @param {ReturnType<typeof monitorConfig>} config */
async function readWorkerStatus(env, now, config) {
	if (!env.CLOUDFLARE_ANALYTICS_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
		return { requests: null, errors: null, exceededResources: null, clientDisconnected: null };
	}

	const startedAt = new Date(now.valueOf() - config.lookbackMinutes * 60_000).toISOString();
	const endedAt = now.toISOString();
	const rows = await fetchWorkerAnalytics({
		token: env.CLOUDFLARE_ANALYTICS_TOKEN,
		accountId: env.CLOUDFLARE_ACCOUNT_ID,
		scriptName: config.siteScriptName,
		datetimeStart: startedAt,
		datetimeEnd: endedAt
	});

	let requests = 0;
	let errors = 0;
	let exceededResources = 0;
	let clientDisconnected = 0;
	for (const row of rows) {
		const count = Number(row?.sum?.requests ?? 0);
		requests += count;
		errors += Number(row?.sum?.errors ?? 0);
		const status = `${row?.dimensions?.status ?? ''}`;
		if (status === 'exceededResources') exceededResources += count;
		if (status === 'clientDisconnected') clientDisconnected += count;
	}
	return { requests, errors, exceededResources, clientDisconnected };
}

/** @param {{ token: string; accountId: string; scriptName: string; datetimeStart: string; datetimeEnd: string; }} input */
async function fetchWorkerAnalytics(input) {
	const query = `query GetWorkersAnalytics($accountTag: string, $datetimeStart: string, $datetimeEnd: string, $scriptName: string) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      workersInvocationsAdaptive(limit: 10000, filter: {
        scriptName: $scriptName,
        datetime_geq: $datetimeStart,
        datetime_leq: $datetimeEnd
      }) {
        sum { requests errors }
        dimensions { status }
      }
    }
  }
}`;

	const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
		method: 'POST',
		headers: {
			authorization: `Bearer ${input.token}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			query,
			variables: {
				accountTag: input.accountId,
				datetimeStart: input.datetimeStart,
				datetimeEnd: input.datetimeEnd,
				scriptName: input.scriptName
			}
		}),
		signal: AbortSignal.timeout(8_000)
	});
	if (!response.ok) throw new Error(`Cloudflare analytics query failed (${response.status})`);
	const payload = await response.json();
	if (payload.errors?.length) {
		throw new Error(`Cloudflare analytics query error (${payload.errors[0].message})`);
	}
	return payload?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];
}

/** @param {D1Database} database @param {Record<string, any>} snapshot */
async function writeSnapshot(database, snapshot) {
	await database
		.prepare(
			`INSERT INTO ops_monitor_snapshots (
			   captured_at, lookback_minutes, read_count_total, sample_count_total,
			   calibration_status, calibration_captured_at, read_batch_ok, presence_http_ok,
			   worker_request_count, worker_error_count, worker_exceeded_resources_count,
			   worker_client_disconnected_count, presence_room_full_count,
			   presence_malformed_count, presence_rate_limited_count, alert_count,
			   alert_summary, report_markdown
			 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)`
		)
		.bind(
			snapshot.capturedAt,
			snapshot.config.lookbackMinutes,
			snapshot.totals.readCount,
			snapshot.totals.sampleCount,
			snapshot.calibration.status,
			snapshot.calibration.captured_at,
			snapshot.smoke.readBatchOk ? 1 : 0,
			snapshot.smoke.presenceHttpOk ? 1 : 0,
			snapshot.worker.requests,
			snapshot.worker.errors,
			snapshot.worker.exceededResources,
			snapshot.worker.clientDisconnected,
			snapshot.presence.roomFull,
			snapshot.presence.malformed,
			snapshot.presence.rateLimited,
			snapshot.analysis.alerts.length,
			snapshot.analysis.alerts.join(' | '),
			snapshot.report
		)
		.run();
}
