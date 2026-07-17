import assert from 'node:assert/strict';
import test from 'node:test';

import {
	analyzeCalibration,
	calibrationWindow,
	renderCalibrationReport
} from '../workers/read-calibration/calibration.js';

test('calibration window starts at the previous snapshot date and ends yesterday', () => {
	assert.deepEqual(
		calibrationWindow(new Date('2026-08-03T08:15:00.000Z'), Date.parse('2026-07-03') / 1000),
		{ startDate: '2026-07-03', endDate: '2026-08-02' }
	);
	assert.equal(calibrationWindow(new Date(), null), null);
});

test('calibration applies a site-wide correction without mutating historical estimates', () => {
	const analysis = analyzeCalibration({
		d1ReadDelta: 20_000,
		d1SampleDelta: 100,
		gaEngagedEvents: 95,
		gaSessions: 80,
		gaTotalUsers: 75,
		gaPageViews: 0,
		previousD1SampleDelta: 90
	});
	assert.equal(analysis.status, 'ok');
	assert.equal(analysis.shouldAlert, false);
	assert.equal(analysis.deliveryRatio, 100 / 95);
	assert.equal(analysis.correctionFactor, 1.25);
	assert.equal(analysis.correctedGaEstimatedReads, 20_000);
	assert.match(
		renderCalibrationReport({ startDate: '2026-07-03', endDate: '2026-08-02' }, analysis),
		/Site-wide session correction factor \| 1\.25x/
	);
});

test('calibration alerts only on material mismatches after enough samples', () => {
	assert.equal(
		analyzeCalibration({
			d1ReadDelta: 2_000,
			d1SampleDelta: 10,
			gaEngagedEvents: 1,
			gaSessions: 1,
			gaTotalUsers: 1,
			gaPageViews: 0
		}).status,
		'insufficient_data'
	);
	const anomaly = analyzeCalibration({
		d1ReadDelta: 40_000,
		d1SampleDelta: 200,
		gaEngagedEvents: 50,
		gaSessions: 45,
		gaTotalUsers: 40,
		gaPageViews: 0,
		previousD1SampleDelta: 180
	});
	assert.equal(anomaly.status, 'delivery_anomaly');
	assert.equal(anomaly.shouldAlert, true);
});
