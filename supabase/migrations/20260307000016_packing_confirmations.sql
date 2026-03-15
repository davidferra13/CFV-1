-- Phase 4.4: Packing Confirmation Persistence
-- Persists per-item packing confirmations to the DB.
-- The packing-list-client.tsx uses localStorage for instant feedback but also
-- syncs confirmed items to this table in the background.
-- This enables: cross-device sync, progress reporting on the event detail page,
-- and analytics on which items get forgotten most often.

CREATE TABLE IF NOT EXISTS packing_confirmations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL,
  item_key     TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, item_key)
);

-- Chefs manage their own confirmations
ALTER TABLE packing_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs manage own packing confirmations" ON packing_confirmations;
CREATE POLICY "Chefs manage own packing confirmations"
  ON packing_confirmations
  FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_packing_confirmations_event
  ON packing_confirmations(event_id);

COMMENT ON TABLE packing_confirmations IS
  'Per-item packing confirmations synced from the interactive packing checklist. Source of truth for pack progress reporting.';
