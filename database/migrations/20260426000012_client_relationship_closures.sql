-- Client relationship closure: append-only table for closing, transitioning, blocking,
-- or placing a legal hold on a client relationship without deleting any history.

CREATE TABLE IF NOT EXISTS client_relationship_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  closure_mode TEXT NOT NULL CHECK (
    closure_mode IN ('transitioning', 'closed', 'do_not_book', 'legal_hold')
  ),
  reason_category TEXT NOT NULL CHECK (
    reason_category IN (
      'moving_away',
      'chef_capacity',
      'client_requested',
      'relationship_soured',
      'payment_risk',
      'safety_risk',
      'legal_dispute',
      'other'
    )
  ),
  internal_notes TEXT,
  client_message TEXT,
  block_new_events BOOLEAN NOT NULL DEFAULT true,
  block_public_booking BOOLEAN NOT NULL DEFAULT true,
  block_automated_outreach BOOLEAN NOT NULL DEFAULT true,
  revoke_portal_access BOOLEAN NOT NULL DEFAULT false,
  allow_active_event_messages_until TIMESTAMPTZ,
  active_event_policy TEXT NOT NULL DEFAULT 'review_each_event' CHECK (
    active_event_policy IN ('continue_active_events', 'cancel_active_events', 'review_each_event')
  ),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reopened_by UUID,
  reopened_at TIMESTAMPTZ,
  reopen_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_client_relationship_closures_tenant_client_active
  ON client_relationship_closures(tenant_id, client_id)
  WHERE reopened_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_relationship_closures_tenant_mode
  ON client_relationship_closures(tenant_id, closure_mode)
  WHERE reopened_at IS NULL;
