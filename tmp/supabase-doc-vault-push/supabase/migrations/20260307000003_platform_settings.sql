-- Platform Settings — key-value store for platform-wide admin configuration
-- Used for: announcement banner, global flags, future platform controls
--
-- FULLY ADDITIVE: no drops, no column modifications.

CREATE TABLE IF NOT EXISTS platform_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT        -- admin email who last touched this setting
);
COMMENT ON TABLE platform_settings IS 'Key-value store for platform-wide settings. Service role only.';
-- Seed defaults
INSERT INTO platform_settings (key, value, updated_by)
VALUES
  ('announcement',       '',      'system'),
  ('announcement_type',  'info',  'system')   -- info | warning | critical
ON CONFLICT (key) DO NOTHING;
-- RLS: no policies = service role (admin client) only
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
