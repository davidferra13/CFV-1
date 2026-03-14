-- Remy Privacy Architecture: anonymous usage metrics + voluntary support sharing.
--
-- This migration supports ChefFlow's Level 3 privacy architecture:
-- 1. Remy conversations are stored ONLY in the browser (IndexedDB), never on servers
-- 2. Anonymous usage metrics (counts only, no content) help us improve Remy
-- 3. Support shares are chef-initiated only — we never pull conversation content
--
-- NOTE: Existing remy_conversations / remy_messages tables are NOT dropped.
-- They will be deprecated in code (new conversations go to IndexedDB).
-- A future migration can archive/remove them once the transition is complete.

-- ─── Anonymous Remy Usage Metrics ──────────────────────────────────
-- Counts only. Never content. Never PII.
CREATE TABLE IF NOT EXISTS remy_usage_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  metric_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  conversation_count  INTEGER NOT NULL DEFAULT 0,
  message_count       INTEGER NOT NULL DEFAULT 0,
  feature_category    TEXT CHECK (feature_category IN (
    'recipe', 'event', 'client', 'menu', 'finance', 'general'
  )),
  avg_response_time_ms INTEGER,
  error_count         INTEGER NOT NULL DEFAULT 0,
  model_version       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One row per tenant per date per category (for upsert)
CREATE UNIQUE INDEX idx_remy_metrics_tenant_date_cat
  ON remy_usage_metrics(tenant_id, metric_date, feature_category);
-- RLS: chefs can see their own metrics
ALTER TABLE remy_usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY remy_usage_metrics_select ON remy_usage_metrics
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY remy_usage_metrics_insert ON remy_usage_metrics
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY remy_usage_metrics_update ON remy_usage_metrics
  FOR UPDATE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- ─── Support-Shared Conversations ──────────────────────────────────
-- Only created when a chef explicitly taps "Send to Support" inside a conversation.
-- This is a one-time share, not a persistent setting.
CREATE TABLE IF NOT EXISTS remy_support_shares (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  conversation_json JSONB NOT NULL,     -- the shared conversation (messages array)
  support_note      TEXT,               -- optional note from the chef
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_remy_support_shares_tenant
  ON remy_support_shares(tenant_id, created_at DESC);
CREATE INDEX idx_remy_support_shares_status
  ON remy_support_shares(status)
  WHERE status IN ('open', 'in_review');
-- RLS: chefs can see and create their own support shares
ALTER TABLE remy_support_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY remy_support_shares_select ON remy_support_shares
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY remy_support_shares_insert ON remy_support_shares
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- Chefs can update their own support shares (e.g. add notes)
CREATE POLICY remy_support_shares_update ON remy_support_shares
  FOR UPDATE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
