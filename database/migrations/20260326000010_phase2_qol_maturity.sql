-- Phase 2 QOL maturity: metrics + notification quiet/digest settings

-- 1) Notification quiet-window + digest controls
ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS notification_quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_quiet_hours_start TIME NULL,
  ADD COLUMN IF NOT EXISTS notification_quiet_hours_end TIME NULL,
  ADD COLUMN IF NOT EXISTS notification_digest_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_digest_interval_minutes INTEGER NOT NULL DEFAULT 15;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chef_preferences_notification_digest_interval_minutes_range'
  ) THEN
    ALTER TABLE chef_preferences
      ADD CONSTRAINT chef_preferences_notification_digest_interval_minutes_range
      CHECK (notification_digest_interval_minutes BETWEEN 5 AND 120);
  END IF;
END $$;

COMMENT ON COLUMN chef_preferences.notification_quiet_hours_enabled IS
  'When true, non-critical in-app toasts are suppressed during configured quiet window.';
COMMENT ON COLUMN chef_preferences.notification_quiet_hours_start IS
  'Quiet window start time in local chef timezone (HH:MM).';
COMMENT ON COLUMN chef_preferences.notification_quiet_hours_end IS
  'Quiet window end time in local chef timezone (HH:MM).';
COMMENT ON COLUMN chef_preferences.notification_digest_enabled IS
  'When true, non-critical in-app notifications are batched into digest toasts.';
COMMENT ON COLUMN chef_preferences.notification_digest_interval_minutes IS
  'Digest flush interval in minutes for non-critical in-app notifications.';

-- 2) QOL observability event stream
CREATE TABLE IF NOT EXISTS qol_metric_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  metric_key TEXT NOT NULL,
  entity_type TEXT NULL,
  entity_id UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'qol_metric_events_metric_key_check'
  ) THEN
    ALTER TABLE qol_metric_events
      ADD CONSTRAINT qol_metric_events_metric_key_check
      CHECK (
        metric_key IN (
          'draft_restored',
          'save_failed',
          'conflict_detected',
          'offline_replay_succeeded',
          'offline_replay_failed',
          'duplicate_create_prevented'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_qol_metric_events_tenant_created
  ON qol_metric_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qol_metric_events_metric_created
  ON qol_metric_events (metric_key, created_at DESC);

ALTER TABLE qol_metric_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qol_metric_events_insert_self ON qol_metric_events;
DROP POLICY IF EXISTS qol_metric_events_select_tenant ON qol_metric_events;

CREATE POLICY qol_metric_events_insert_self ON qol_metric_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid()
      AND (
        (ur.role = 'chef' AND ur.entity_id = tenant_id)
        OR (
          ur.role = 'client'
          AND EXISTS (
            SELECT 1
            FROM clients c
            WHERE c.id = ur.entity_id
            AND c.tenant_id = qol_metric_events.tenant_id
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS qol_metric_events_select_tenant ON qol_metric_events;
CREATE POLICY qol_metric_events_select_tenant ON qol_metric_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid()
      AND (
        (ur.role = 'chef' AND ur.entity_id = tenant_id)
        OR (
          ur.role = 'client'
          AND EXISTS (
            SELECT 1
            FROM clients c
            WHERE c.id = ur.entity_id
            AND c.tenant_id = qol_metric_events.tenant_id
          )
        )
      )
    )
  );

