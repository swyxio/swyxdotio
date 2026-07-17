import { analyzeCalibration, calibrationWindow, renderCalibrationReport } from './calibration.js';

export default {
	async scheduled(_event, env, ctx) {
		ctx.waitUntil(runCalibration(env, new Date()));
	}
};

/** @param {Record<string, any>} env @param {Date} now */
export async function runCalibration(env, now) {
	const totals = await readTotals(env.READ_COUNTERS);
	const previous = await readPreviousReport(env.READ_COUNTERS);
	const capturedAt = Math.floor(now.valueOf() / 1000);
	const window = calibrationWindow(now, previous?.captured_at ?? null);

	if (!window) {
		const report =
			'# Read-counter calibration baseline\n\nInitial D1 totals captured; comparison begins next month.';
		await writeReport(env.READ_COUNTERS, {
			capturedAt,
			totals,
			window: null,
			analysis: null,
			status: 'baseline',
			report
		});
		console.log(JSON.stringify({ event: 'read_calibration', status: 'baseline', ...totals }));
		return { status: 'baseline', report };
	}

	const ga = await readGa4Report(env, window);
	const analysis = analyzeCalibration({
		d1ReadDelta: Math.max(0, totals.readCount - previous.d1_read_total),
		d1SampleDelta: Math.max(0, totals.sampleCount - previous.d1_sample_total),
		gaEngagedEvents: ga.engagedEvents,
		gaSessions: ga.sessions,
		gaTotalUsers: ga.totalUsers,
		gaPageViews: ga.pageViews,
		previousD1SampleDelta: previous.d1_sample_delta
	});
	const report = renderCalibrationReport(window, analysis);
	await writeReport(env.READ_COUNTERS, {
		capturedAt,
		totals,
		window,
		analysis,
		status: analysis.status,
		report
	});
	console.log(
		JSON.stringify({
			event: 'read_calibration',
			status: analysis.status,
			periodStart: window.startDate,
			periodEnd: window.endDate,
			deliveryRatio: analysis.deliveryRatio,
			correctionFactor: analysis.correctionFactor
		})
	);
	if (analysis.shouldAlert && env.CALIBRATION_ALERT_WEBHOOK_URL) {
		await fetch(env.CALIBRATION_ALERT_WEBHOOK_URL, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: report }),
			signal: AbortSignal.timeout(3_000)
		}).catch(() => undefined);
	}
	return { status: analysis.status, report };
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
async function readPreviousReport(database) {
	return database
		.prepare('SELECT * FROM read_calibration_reports ORDER BY captured_at DESC LIMIT 1')
		.first();
}

/** @param {Record<string, any>} env @param {{ startDate: string; endDate: string }} window */
async function readGa4Report(env, window) {
	if (!env.GOOGLE_SERVICE_ACCOUNT_JSON || !env.GA4_PROPERTY_ID) {
		throw new Error('GA4 calibration credentials are unavailable');
	}
	const accessToken = await googleAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
	const [engagedPayload, sitePayload] = await Promise.all([
		runGa4Report(env.GA4_PROPERTY_ID, accessToken, {
			dateRanges: [window],
			metrics: [{ name: 'eventCount' }, { name: 'sessions' }, { name: 'totalUsers' }],
			dimensionFilter: {
				filter: {
					fieldName: 'eventName',
					stringFilter: { value: 'engaged_read', matchType: 'EXACT' }
				}
			}
		}),
		runGa4Report(env.GA4_PROPERTY_ID, accessToken, {
			dateRanges: [window],
			metrics: [{ name: 'screenPageViews' }]
		})
	]);
	const values =
		engagedPayload.rows?.[0]?.metricValues?.map((item) => Number(item.value || 0)) ?? [];
	return {
		engagedEvents: values[0] ?? 0,
		sessions: values[1] ?? 0,
		totalUsers: values[2] ?? 0,
		pageViews: Number(sitePayload.rows?.[0]?.metricValues?.[0]?.value ?? 0)
	};
}

/** @param {string} propertyId @param {string} accessToken @param {Record<string, unknown>} body */
async function runGa4Report(propertyId, accessToken, body) {
	const response = await fetch(
		`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
		{
			method: 'POST',
			headers: {
				authorization: `Bearer ${accessToken}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(8_000)
		}
	);
	if (!response.ok) throw new Error(`GA4 report failed (${response.status})`);
	return response.json();
}

/** @param {string} serviceAccountJson */
async function googleAccessToken(serviceAccountJson) {
	const credentials = JSON.parse(serviceAccountJson);
	const now = Math.floor(Date.now() / 1000);
	const header = base64UrlJson({ alg: 'RS256', typ: 'JWT', kid: credentials.private_key_id });
	const claims = base64UrlJson({
		iss: credentials.client_email,
		scope: 'https://www.googleapis.com/auth/analytics.readonly',
		aud: 'https://oauth2.googleapis.com/token',
		iat: now,
		exp: now + 3600
	});
	const unsigned = `${header}.${claims}`;
	const privateKey = await crypto.subtle.importKey(
		'pkcs8',
		pemBytes(credentials.private_key),
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign(
		'RSASSA-PKCS1-v1_5',
		privateKey,
		new TextEncoder().encode(unsigned)
	);
	const assertion = `${unsigned}.${base64UrlBytes(new Uint8Array(signature))}`;
	const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion
		}),
		signal: AbortSignal.timeout(8_000)
	});
	if (!tokenResponse.ok) throw new Error(`Google OAuth failed (${tokenResponse.status})`);
	const token = await tokenResponse.json();
	return token.access_token;
}

/** @param {D1Database} database @param {Record<string, any>} entry */
async function writeReport(database, entry) {
	await database
		.prepare(
			`INSERT INTO read_calibration_reports (
			   captured_at, period_start, period_end, d1_read_total, d1_sample_total,
			   d1_read_delta, d1_sample_delta, ga_engaged_events, ga_sessions,
			   ga_total_users, ga_page_views, delivery_ratio, correction_factor,
			   status, report_markdown
			 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
			 RETURNING captured_at`
		)
		.bind(
			entry.capturedAt,
			entry.window?.startDate ?? null,
			entry.window?.endDate ?? null,
			entry.totals.readCount,
			entry.totals.sampleCount,
			entry.analysis?.d1ReadDelta ?? null,
			entry.analysis?.d1SampleDelta ?? null,
			entry.analysis?.gaEngagedEvents ?? null,
			entry.analysis?.gaSessions ?? null,
			entry.analysis?.gaTotalUsers ?? null,
			entry.analysis?.gaPageViews ?? null,
			entry.analysis?.deliveryRatio ?? null,
			entry.analysis?.correctionFactor ?? null,
			entry.status,
			entry.report
		)
		.first();
}

/** @param {Record<string, unknown>} value */
function base64UrlJson(value) {
	return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

/** @param {Uint8Array} bytes */
function base64UrlBytes(bytes) {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** @param {string} pem */
function pemBytes(pem) {
	const base64 = pem.replace(/-----[^-]+-----|\s/g, '');
	const binary = atob(base64);
	return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
