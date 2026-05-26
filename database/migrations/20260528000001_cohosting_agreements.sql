-- ============================================
-- COHOSTING AGREEMENT ENGINE
-- ============================================
-- Structured responsibility checklists, compensation mapping,
-- and e-signatures for multi-host Dinner Circle collaboration.
--
-- Three new tables. No existing columns modified or removed.
-- ADDITIVE ONLY.
-- ============================================

-- ─── Agreements ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hub_cohost_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The dinner circle this agreement belongs to
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,

  -- Optional: specific event within the circle (null = circle-level default)
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Template used to seed default checklist items
  template_type TEXT NOT NULL DEFAULT 'chef_farm'
    CHECK (template_type IN (
      'chef_farm', 'chef_private_host', 'chef_chef',
      'chef_restaurant', 'chef_planner', 'custom'
    )),

  -- How compensation is structured
  compensation_model TEXT NOT NULL DEFAULT 'both_sell'
    CHECK (compensation_model IN (
      'venue_sells_all', 'both_sell', 'chef_sells_all', 'fixed_fee'
    )),

  -- Flexible compensation details
  -- { splitType: 'gross'|'net', splits: [{ hostProfileId, label, percentage }],
  --   fixedFees: [{ hostProfileId, label, amountCents }],
  --   paymentMethod: 'venmo'|'check'|'bank_transfer'|'other',
  --   paymentTiming: 'day_of'|'within_48h'|'within_week'|'custom',
  --   paymentNotes: '...',
  --   sharedExpenses: [{ description, amountCents, paidBy }] }
  compensation_details JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Agreement lifecycle
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_signatures', 'active', 'amended', 'voided')),

  -- Version tracking for amendments (starts at 1, incremented on critical changes)
  version INTEGER NOT NULL DEFAULT 1,

  -- Who created this agreement
  created_by UUID NOT NULL,

  -- Inherited from a previous event's agreement (for carry-forward)
  inherited_from_agreement_id UUID REFERENCES hub_cohost_agreements(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hub_cohost_agreements IS
  'Cohosting collaboration agreements with compensation structure and lifecycle tracking.';

CREATE INDEX IF NOT EXISTS idx_hub_cohost_agreements_group
  ON hub_cohost_agreements(group_id);
CREATE INDEX IF NOT EXISTS idx_hub_cohost_agreements_event
  ON hub_cohost_agreements(event_id);
CREATE INDEX IF NOT EXISTS idx_hub_cohost_agreements_status
  ON hub_cohost_agreements(status);

-- ─── Agreement Items (Checklist) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hub_agreement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agreement_id UUID NOT NULL REFERENCES hub_cohost_agreements(id) ON DELETE CASCADE,

  -- Which category this item belongs to
  category TEXT NOT NULL
    CHECK (category IN (
      'tickets_revenue', 'ingredients', 'equipment', 'venue_setup',
      'culinary', 'beverages', 'hospitality', 'marketing',
      'guest_management', 'wrap_up', 'cancellation'
    )),

  title TEXT NOT NULL,

  -- Who is responsible
  assignment TEXT NOT NULL DEFAULT 'unassigned'
    CHECK (assignment IN ('chef', 'venue', 'shared', 'na', 'unassigned')),

  -- Free-text notes from either party
  notes TEXT,

  -- Execution status (tracked during event)
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'done')),

  -- Display order within category
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- true = came from template, false = user-added custom item
  is_default BOOLEAN NOT NULL DEFAULT true,

  -- Whether this item change should void existing signatures
  -- Template items with assignment changes = true; notes-only changes = false
  signature_critical BOOLEAN NOT NULL DEFAULT true,

  -- Items added after agreement was signed
  added_after_signing BOOLEAN NOT NULL DEFAULT false,

  -- Profile IDs that acknowledged post-signing additions (JSONB array of UUIDs)
  acknowledged_by JSONB NOT NULL DEFAULT '[]'::jsonb,

  completed_at TIMESTAMPTZ,
  completed_by UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hub_agreement_items IS
  'Individual checklist items within a cohosting agreement, covering the full event lifecycle.';

CREATE INDEX IF NOT EXISTS idx_hub_agreement_items_agreement
  ON hub_agreement_items(agreement_id);
CREATE INDEX IF NOT EXISTS idx_hub_agreement_items_category
  ON hub_agreement_items(agreement_id, category);

-- ─── Agreement Signatures ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hub_agreement_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agreement_id UUID NOT NULL REFERENCES hub_cohost_agreements(id) ON DELETE CASCADE,

  -- Who signed (hub guest profile, works for both chefs and external partners)
  signer_profile_id UUID NOT NULL,

  -- Display info captured at signing time
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL,

  -- SHA-256 hash of the full agreement state at signing time (tamper-evident)
  content_hash TEXT NOT NULL,

  -- Metadata for audit trail
  ip_address TEXT,
  user_agent TEXT,

  -- Which version of the agreement was signed
  version INTEGER NOT NULL DEFAULT 1,

  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One signature per signer per version
  CONSTRAINT unique_agreement_signer_version
    UNIQUE (agreement_id, signer_profile_id, version)
);

COMMENT ON TABLE hub_agreement_signatures IS
  'E-signatures on cohosting agreements with content hash for tamper evidence.';

CREATE INDEX IF NOT EXISTS idx_hub_agreement_signatures_agreement
  ON hub_agreement_signatures(agreement_id);
