-- Smart Proposal Flow: Combined Quote + Contract + Payment
-- Enables HoneyBook-style "one link" experience for clients.
-- Additive only.

-- ============================================
-- TABLE 1: PROPOSAL TOKENS
-- Per-proposal shareable links (separate from per-client portal tokens).
-- Token is the credential for unauthenticated access.
-- ============================================

CREATE TABLE IF NOT EXISTS proposal_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT UNIQUE NOT NULL,
  quote_id        UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  contract_id     UUID REFERENCES event_contracts(id) ON DELETE SET NULL,
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  expires_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at  TIMESTAMPTZ,
  view_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_proposal_tokens_token ON proposal_tokens(token);
CREATE INDEX idx_proposal_tokens_quote ON proposal_tokens(quote_id);
CREATE INDEX idx_proposal_tokens_tenant ON proposal_tokens(tenant_id);
-- ============================================
-- TABLE 2: QUOTE ADD-ONS
-- Links a chef's addon library items to a specific quote,
-- with optional per-quote price overrides.
-- ============================================

CREATE TABLE IF NOT EXISTS quote_addons (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id              UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  addon_id              UUID NOT NULL REFERENCES proposal_addons(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  label                 TEXT NOT NULL,
  description           TEXT,
  price_cents           INTEGER NOT NULL,
  is_per_person         BOOLEAN NOT NULL DEFAULT true,
  is_default_selected   BOOLEAN NOT NULL DEFAULT false,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quote_id, addon_id)
);
CREATE INDEX idx_quote_addons_quote ON quote_addons(quote_id);
-- ============================================
-- TABLE 3: PROPOSAL ADDON SELECTIONS
-- What the client actually selected, frozen at acceptance.
-- Immutable audit trail of the client's choices.
-- ============================================

CREATE TABLE IF NOT EXISTS proposal_addon_selections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_token_id   UUID NOT NULL REFERENCES proposal_tokens(id) ON DELETE CASCADE,
  quote_addon_id      UUID NOT NULL REFERENCES quote_addons(id) ON DELETE CASCADE,
  quantity            INTEGER NOT NULL DEFAULT 1,
  unit_price_cents    INTEGER NOT NULL,
  guest_count         INTEGER,
  line_total_cents    INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pas_token ON proposal_addon_selections(proposal_token_id);
-- ============================================
-- ADDITIVE COLUMNS
-- ============================================

-- Track effective total (base + selected addons) on quotes
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS addon_total_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS effective_total_cents INTEGER;
-- Link contracts to the Smart File flow
ALTER TABLE event_contracts
  ADD COLUMN IF NOT EXISTS proposal_token_id UUID REFERENCES proposal_tokens(id) ON DELETE SET NULL;
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE proposal_tokens             ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_addons                ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_addon_selections   ENABLE ROW LEVEL SECURITY;
-- proposal_tokens: chef can manage, public can read by token (via admin client)
DROP POLICY IF EXISTS pt_chef_all ON proposal_tokens;
CREATE POLICY pt_chef_all ON proposal_tokens
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
-- quote_addons: chef manages
DROP POLICY IF EXISTS qa_chef_all ON quote_addons;
CREATE POLICY qa_chef_all ON quote_addons
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
-- proposal_addon_selections: read-only for chef (via parent join), inserts via admin client
DROP POLICY IF EXISTS pas_chef_select ON proposal_addon_selections;
CREATE POLICY pas_chef_select ON proposal_addon_selections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposal_tokens pt
      WHERE pt.id = proposal_token_id
        AND pt.tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
    )
  );
-- Allow inserts via admin client only (public proposal flow)
DROP POLICY IF EXISTS pas_service_insert ON proposal_addon_selections;
CREATE POLICY pas_service_insert ON proposal_addon_selections
  FOR INSERT TO service_role
  WITH CHECK (true);
-- proposal_tokens: allow service_role full access (for public proposal page)
DROP POLICY IF EXISTS pt_service_all ON proposal_tokens;
CREATE POLICY pt_service_all ON proposal_tokens
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS qa_service_select ON quote_addons;
CREATE POLICY qa_service_select ON quote_addons
  FOR SELECT TO service_role
  USING (true);
-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE proposal_tokens IS
  'Per-proposal shareable links for the combined quote+contract+payment flow.';
COMMENT ON COLUMN proposal_tokens.token IS
  '32-byte hex token used as URL credential for unauthenticated access.';
COMMENT ON TABLE quote_addons IS
  'Links chef addon library items to a specific quote with optional price overrides.';
COMMENT ON TABLE proposal_addon_selections IS
  'Immutable record of which add-ons the client selected at acceptance time.';
COMMENT ON COLUMN quotes.effective_total_cents IS
  'Base quote total + selected addon total, set at acceptance time.';
