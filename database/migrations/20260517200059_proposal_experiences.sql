CREATE TABLE IF NOT EXISTS proposal_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  tenant_id UUID NOT NULL,
  tiers JSONB NOT NULL DEFAULT '[]',
  add_ons JSONB NOT NULL DEFAULT '[]',
  tradeoffs JSONB NOT NULL DEFAULT '[]',
  selected_tier_id TEXT,
  selected_add_on_ids TEXT[] DEFAULT '{}',
  selected_tradeoff_ids TEXT[] DEFAULT '{}',
  total_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proposal_tenant_event ON proposal_experiences(tenant_id, event_id);
