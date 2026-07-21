CREATE TABLE IF NOT EXISTS presence_monitor_hourly (
	bucket_start INTEGER NOT NULL,
	kind TEXT NOT NULL,
	count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
	PRIMARY KEY (bucket_start, kind)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS ops_monitor_snapshots (
	captured_at INTEGER PRIMARY KEY,
	lookback_minutes INTEGER NOT NULL CHECK (lookback_minutes > 0),
	read_count_total INTEGER NOT NULL CHECK (read_count_total >= 0),
	sample_count_total INTEGER NOT NULL CHECK (sample_count_total >= 0),
	calibration_status TEXT,
	calibration_captured_at INTEGER,
	read_batch_ok INTEGER NOT NULL CHECK (read_batch_ok IN (0, 1)),
	presence_http_ok INTEGER NOT NULL CHECK (presence_http_ok IN (0, 1)),
	worker_request_count INTEGER,
	worker_error_count INTEGER,
	worker_exceeded_resources_count INTEGER,
	worker_client_disconnected_count INTEGER,
	presence_room_full_count INTEGER NOT NULL DEFAULT 0 CHECK (presence_room_full_count >= 0),
	presence_malformed_count INTEGER NOT NULL DEFAULT 0 CHECK (presence_malformed_count >= 0),
	presence_rate_limited_count INTEGER NOT NULL DEFAULT 0 CHECK (presence_rate_limited_count >= 0),
	alert_count INTEGER NOT NULL DEFAULT 0 CHECK (alert_count >= 0),
	alert_summary TEXT NOT NULL,
	report_markdown TEXT NOT NULL
) WITHOUT ROWID;
