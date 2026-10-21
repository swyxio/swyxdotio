CREATE TABLE batches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  captured_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE items (
  batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  item_json TEXT NOT NULL,
  page_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'followup', 'archived')),
  note TEXT NOT NULL DEFAULT '',
  updated_at TEXT,
  PRIMARY KEY (batch_id, id)
);
