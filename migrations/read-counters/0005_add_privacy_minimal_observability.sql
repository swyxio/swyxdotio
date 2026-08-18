CREATE TABLE IF NOT EXISTS worker_fault_hourly (
	bucket_start INTEGER NOT NULL,
	route_class TEXT NOT NULL CHECK (
		route_class IN (
			'presence_api',
			'read_api',
			'tool_api',
			'site_api',
			'og_image',
			'syndication',
			'tools_page',
			'home_page',
			'content_page',
			'scheduled',
			'queue',
			'alarm',
			'other_trigger'
		)
	),
	outcome TEXT NOT NULL CHECK (
		outcome IN ('exception', 'exceededCpu', 'exceededMemory', 'scriptNotFound', 'other')
	),
	duration_bucket TEXT NOT NULL CHECK (
		duration_bucket IN ('unknown', 'lt100ms', '100ms_1s', '1s_10s', '10s_30s', 'gte30s')
	),
	count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
	PRIMARY KEY (bucket_start, route_class, outcome, duration_bucket)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS read_funnel_hourly (
	bucket_start INTEGER NOT NULL,
	stage TEXT NOT NULL CHECK (
		stage IN ('eligible', 'visible_8s', 'depth_25', 'sample_selected', 'd1_accepted')
	),
	count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
	PRIMARY KEY (bucket_start, stage)
) WITHOUT ROWID;

ALTER TABLE ops_monitor_snapshots
	ADD COLUMN presence_ws_open_ok INTEGER CHECK (
		presence_ws_open_ok IS NULL OR presence_ws_open_ok IN (0, 1)
	);

ALTER TABLE ops_monitor_snapshots
	ADD COLUMN presence_ws_welcome_ok INTEGER CHECK (
		presence_ws_welcome_ok IS NULL OR presence_ws_welcome_ok IN (0, 1)
	);

ALTER TABLE ops_monitor_snapshots
	ADD COLUMN presence_ws_close_ok INTEGER CHECK (
		presence_ws_close_ok IS NULL OR presence_ws_close_ok IN (0, 1)
	);

ALTER TABLE ops_monitor_snapshots
	ADD COLUMN presence_ws_failure_stage TEXT CHECK (
		presence_ws_failure_stage IS NULL OR
		presence_ws_failure_stage IN (
			'upgrade',
			'welcome_timeout',
			'welcome_invalid',
			'close_timeout',
			'close_abnormal',
			'transport_error'
		)
	);

ALTER TABLE ops_monitor_snapshots
	ADD COLUMN presence_ws_close_code INTEGER CHECK (
		presence_ws_close_code IS NULL OR
		presence_ws_close_code BETWEEN 1000 AND 4999
	);

ALTER TABLE ops_monitor_snapshots
	ADD COLUMN presence_ws_duration_ms INTEGER CHECK (
		presence_ws_duration_ms IS NULL OR presence_ws_duration_ms >= 0
	);
