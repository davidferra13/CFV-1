-- Day-Of Live Client Status: auto-notify config + notification log
-- ADDITIVE ONLY. No drops, no deletes.

-- Per-event auto-notify configuration (one row per event)
CREATE TABLE IF NOT EXISTS client_status_config (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                 uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id                uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  auto_notify_enabled      boolean NOT NULL DEFAULT false,
  delay_threshold_minutes  integer NOT NULL DEFAULT 15,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_client_status_config_tenant
  ON client_status_config USING btree (tenant_id);

-- Notification log (append-only record of notifications sent to client)
CREATE TABLE IF NOT EXISTS client_status_notifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  notification_type text NOT NULL,  -- 'arrival', 'delay', 'completion'
  stage             text,
  message           text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_status_notifications_event
  ON client_status_notifications USING btree (event_id);

CREATE INDEX IF NOT EXISTS idx_client_status_notifications_tenant
  ON client_status_notifications USING btree (tenant_id);
