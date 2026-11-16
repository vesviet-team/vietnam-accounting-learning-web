-- P2 bookmark persistence: track saved lesson days alongside completed_days.
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS saved_days integer[] NOT NULL DEFAULT '{}';
