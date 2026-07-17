CREATE TABLE IF NOT EXISTS read_calibration_reports (
	captured_at INTEGER PRIMARY KEY,
	period_start TEXT,
	period_end TEXT,
	d1_read_total INTEGER NOT NULL CHECK (d1_read_total >= 0),
	d1_sample_total INTEGER NOT NULL CHECK (d1_sample_total >= 0),
	d1_read_delta INTEGER,
	d1_sample_delta INTEGER,
	ga_engaged_events INTEGER,
	ga_sessions INTEGER,
	ga_total_users INTEGER,
	ga_page_views INTEGER,
	delivery_ratio REAL,
	correction_factor REAL,
	status TEXT NOT NULL,
	report_markdown TEXT NOT NULL
) WITHOUT ROWID;
