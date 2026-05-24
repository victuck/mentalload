-- Add snooze_count to tasks (referenced in the PATCH route and TaskCard but missing from schema)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS snooze_count INTEGER NOT NULL DEFAULT 0;
