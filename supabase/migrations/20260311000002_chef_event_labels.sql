-- Migration: 20260311000002_chef_event_labels
-- Feature 7.2: Custom Event Types / Status Labels
-- Lets each chef rename or extend occasion types (Wedding, Birthday, …)
-- and rename FSM status labels to their preferred terminology.
--
-- Table:
--   chef_event_type_labels — one row per custom label override per chef

-- ─── ENUM ────────────────────────────────────────────────────────────────────

CREATE TYPE chef_event_label_type AS ENUM ('occasion_type', 'status_label');

-- ─── chef_event_type_labels ──────────────────────────────────────────────────

CREATE TABLE chef_event_type_labels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  -- The system-defined name (e.g. "Wedding", "draft", "completed")
  default_label   TEXT NOT NULL,
  -- Chef's custom replacement (e.g. "Intimate Dinner", "Inquiry")
  custom_label    TEXT NOT NULL,
  label_type      chef_event_label_type NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One override per (tenant, default_label, label_type) combination
  UNIQUE (tenant_id, default_label, label_type)
);

ALTER TABLE chef_event_type_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON chef_event_type_labels;
CREATE POLICY "tenant_isolation" ON chef_event_type_labels
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid()
        AND role = 'chef'
    )
  );

CREATE INDEX idx_chef_event_type_labels_tenant
  ON chef_event_type_labels (tenant_id, label_type);
