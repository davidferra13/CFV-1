CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'informational',
  channels JSONB NOT NULL DEFAULT '["in_app"]',
  interruption_level TEXT NOT NULL DEFAULT 'business_hours',
  muted_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_notif_prefs_tenant_cat ON notification_preferences(tenant_id, category);

CREATE TABLE IF NOT EXISTS quiet_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  start_time TEXT NOT NULL DEFAULT '22:00',
  end_time TEXT NOT NULL DEFAULT '07:00',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  allow_critical BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_quiet_hours_tenant ON quiet_hours(tenant_id);
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiet_hours ENABLE ROW LEVEL SECURITY;
