-- Default new AI privacy preference rows to a finite retention period.
-- Existing NULL rows remain unchanged so prior "keep until deleted" choices are preserved.

ALTER TABLE ai_preferences
  ALTER COLUMN data_retention_days SET DEFAULT 90;
