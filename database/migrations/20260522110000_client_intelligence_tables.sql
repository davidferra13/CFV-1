-- Client Intelligence Ledger: interaction capture + revenue attribution tables
-- ADDITIVE ONLY. No drops, no deletes.

-- Table: client portal interaction log
-- Captures when clients view pages, click links, or take actions in the client portal.
CREATE TABLE IF NOT EXISTS client_portal_interactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  -- e.g. 'page_view', 'quote_opened', 'invoice_viewed', 'menu_approved', 'message_sent'
  entity_type    text,         -- 'event', 'quote', 'invoice', 'menu', 'message', etc.
  entity_id      uuid,         -- FK to the specific entity (nullable, polymorphic)
  session_id     text,         -- client portal session identifier (not PII, opaque)
  source         text NOT NULL DEFAULT 'client_portal',
  -- Risk scoring signal fields
  duration_seconds integer,    -- time spent on page/action
  metadata       jsonb NOT NULL DEFAULT '{}',
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_client_portal_interactions_type CHECK (
    interaction_type IN (
      'page_view', 'quote_opened', 'quote_accepted', 'quote_declined',
      'invoice_viewed', 'invoice_paid', 'menu_approved', 'menu_requested_change',
      'message_sent', 'document_downloaded', 'event_confirmed', 'event_cancelled',
      'portal_login', 'portal_logout', 'feedback_submitted', 'link_clicked'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_client_portal_interactions_tenant_client
  ON client_portal_interactions (tenant_id, client_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_portal_interactions_type
  ON client_portal_interactions (tenant_id, interaction_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_portal_interactions_entity
  ON client_portal_interactions (entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

-- Table: client revenue attributions
-- Durable link from events to client revenue, used for lifetime value and attribution.
CREATE TABLE IF NOT EXISTS client_revenue_attributions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id             uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id              uuid REFERENCES events(id) ON DELETE SET NULL,
  attribution_type      text NOT NULL DEFAULT 'direct',
  -- 'direct': client paid for this event
  -- 'referral': client referred another booking
  -- 'recurring': part of a recurring relationship
  amount_cents          bigint NOT NULL DEFAULT 0,
  currency              text NOT NULL DEFAULT 'usd',
  recognized_at         timestamptz NOT NULL DEFAULT now(),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_client_revenue_attributions_type CHECK (
    attribution_type IN ('direct', 'referral', 'recurring', 'upgrade', 'tip')
  ),
  CONSTRAINT chk_client_revenue_attributions_amount CHECK (amount_cents >= 0)
);

CREATE INDEX IF NOT EXISTS idx_client_revenue_attributions_client
  ON client_revenue_attributions (tenant_id, client_id, recognized_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_revenue_attributions_event
  ON client_revenue_attributions (event_id)
  WHERE event_id IS NOT NULL;

-- Trigger: keep updated_at fresh on clients when intelligence columns change
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'clients_intelligence_updated_at'
  ) THEN
    -- updated_at trigger is expected to exist on clients already; skip if present.
    NULL;
  END IF;
END;
$$;
