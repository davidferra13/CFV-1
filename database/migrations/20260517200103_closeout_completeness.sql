CREATE TABLE IF NOT EXISTS closeout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  item_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  skipped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_closeout_items_event_key ON closeout_items(tenant_id, event_id, item_key);

CREATE TABLE IF NOT EXISTS closeout_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  item_key TEXT NOT NULL,
  reminder_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_closeout_reminders_pending ON closeout_reminders(reminder_at) WHERE sent = false;
ALTER TABLE closeout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE closeout_reminders ENABLE ROW LEVEL SECURITY;
