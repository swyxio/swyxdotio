CREATE TABLE IF NOT EXISTS page_reads (
	page_key TEXT PRIMARY KEY,
	read_count INTEGER NOT NULL DEFAULT 0 CHECK (read_count >= 0),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) WITHOUT ROWID;
