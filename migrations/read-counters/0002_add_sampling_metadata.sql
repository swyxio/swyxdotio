ALTER TABLE page_reads ADD COLUMN sample_count INTEGER NOT NULL DEFAULT 0 CHECK (sample_count >= 0);
ALTER TABLE page_reads ADD COLUMN sampling_policy_version TEXT;
