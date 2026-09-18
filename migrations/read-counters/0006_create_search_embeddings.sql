CREATE TABLE IF NOT EXISTS search_embedding_budget (
 month TEXT PRIMARY KEY,
 reserved_micros INTEGER NOT NULL CHECK (reserved_micros >= 0 AND reserved_micros <= 10000000)
);
CREATE TABLE IF NOT EXISTS search_embeddings (
 key TEXT PRIMARY KEY,
 model TEXT NOT NULL,
 vector TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS search_embeddings_model ON search_embeddings(model);
