-- Circle Reminder Cascade (ADDITIVE ONLY)
-- Automated reminder sequences for circle events

-- ---------------------------------------------------------------------------
-- circle_reminder_configs: per-circle reminder type configuration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS circle_reminder_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id     uuid NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  tenant_id     uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  days_before   integer NOT NULL DEFAULT 1,
  enabled       boolean NOT NULL DEFAULT true,
  channel       text NOT NULL DEFAULT 'email',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT crc_reminder_type_check CHECK (
    reminder_type = ANY (ARRAY[
      'rsvp_deadline', 'dietary_collection', 'event_countdown',
      'payment_reminder', 'day_of_prep'
    ])
  ),
  CONSTRAINT crc_channel_check CHECK (
    channel = ANY (ARRAY['email', 'sms', 'in_app'])
  ),
  CONSTRAINT crc_days_before_positive CHECK (days_before >= 0),
  CONSTRAINT crc_unique_type_per_circle UNIQUE (circle_id, tenant_id, reminder_type)
);

CREATE INDEX idx_crc_circle ON circle_reminder_configs (circle_id);
CREATE INDEX idx_crc_tenant ON circle_reminder_configs (tenant_id);
CREATE INDEX idx_crc_enabled ON circle_reminder_configs (circle_id) WHERE enabled = true;

-- RLS
ALTER TABLE circle_reminder_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY crc_tenant_isolation ON circle_reminder_configs
  FOR ALL TO public
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- ---------------------------------------------------------------------------
-- circle_reminders: individual reminder instances tied to events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS circle_reminders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id       uuid NOT NULL REFERENCES circle_reminder_configs(id) ON DELETE CASCADE,
  circle_id       uuid NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pending',
  scheduled_for   timestamptz NOT NULL,
  sent_at         timestamptz,
  recipient_count integer NOT NULL DEFAULT 0,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cr_status_check CHECK (
    status = ANY (ARRAY['pending', 'sent', 'skipped', 'failed'])
  )
);

CREATE INDEX idx_cr_circle ON circle_reminders (circle_id, scheduled_for);
CREATE INDEX idx_cr_tenant ON circle_reminders (tenant_id);
CREATE INDEX idx_cr_event ON circle_reminders (event_id);
CREATE INDEX idx_cr_pending ON circle_reminders (tenant_id, scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_cr_config ON circle_reminders (config_id);

-- RLS
ALTER TABLE circle_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY cr_tenant_isolation ON circle_reminders
  FOR ALL TO public
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
