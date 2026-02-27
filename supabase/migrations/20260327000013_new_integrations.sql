-- New integrations: QuickBooks, DocuSign, Zapier, Yelp, iCal feed, Apple/Google Pay toggle
-- Additive only — no drops, no deletes.

-- pgcrypto needed for gen_random_bytes() in webhook secret generation
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- 1. Extend integration_provider enum with new providers
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'quickbooks' AND enumtypid = 'integration_provider'::regtype) THEN
    ALTER TYPE integration_provider ADD VALUE 'quickbooks';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'docusign' AND enumtypid = 'integration_provider'::regtype) THEN
    ALTER TYPE integration_provider ADD VALUE 'docusign';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'zapier' AND enumtypid = 'integration_provider'::regtype) THEN
    ALTER TYPE integration_provider ADD VALUE 'zapier';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'yelp' AND enumtypid = 'integration_provider'::regtype) THEN
    ALTER TYPE integration_provider ADD VALUE 'yelp';
  END IF;
END$$;

-- ============================================================
-- 2. iCal feed support — public calendar feed per chef
-- ============================================================
ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS ical_feed_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS ical_feed_enabled BOOLEAN DEFAULT false;

-- Index for fast token-based lookups (public feed endpoint)
CREATE INDEX IF NOT EXISTS idx_chefs_ical_feed_token
  ON chefs (ical_feed_token)
  WHERE ical_feed_enabled = true;

-- ============================================================
-- 3. Apple Pay / Google Pay toggle (per-chef payment preferences)
-- ============================================================
ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS apple_pay_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS google_pay_enabled BOOLEAN DEFAULT true;

-- ============================================================
-- 4. Zapier webhook subscriptions — track outbound webhook delivery
-- ============================================================
CREATE TABLE IF NOT EXISTS zapier_webhook_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  target_url      TEXT NOT NULL,
  event_types     TEXT[] NOT NULL DEFAULT '{}',
  secret          TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE zapier_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs manage own zapier subscriptions"
  ON zapier_webhook_subscriptions
  FOR ALL
  USING (tenant_id IN (SELECT id FROM chefs WHERE id = tenant_id))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE id = tenant_id));

CREATE INDEX IF NOT EXISTS idx_zapier_subs_tenant
  ON zapier_webhook_subscriptions (tenant_id)
  WHERE is_active = true;

-- Delivery log for debugging failed deliveries
CREATE TABLE IF NOT EXISTS zapier_webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES zapier_webhook_subscriptions(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  response_status SMALLINT,
  response_body   TEXT,
  delivered_at    TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE zapier_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs view own zapier deliveries"
  ON zapier_webhook_deliveries
  FOR SELECT
  USING (tenant_id IN (SELECT id FROM chefs WHERE id = tenant_id));

CREATE INDEX IF NOT EXISTS idx_zapier_deliveries_sub
  ON zapier_webhook_deliveries (subscription_id, created_at DESC);

-- ============================================================
-- 5. QuickBooks sync tracking columns on existing tables
-- ============================================================
ALTER TABLE ledger_entries
  ADD COLUMN IF NOT EXISTS qb_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qb_entity_id TEXT;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS qb_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qb_entity_id TEXT;

-- ============================================================
-- 6. DocuSign envelope tracking on contracts table
-- ============================================================
-- contracts table may not exist yet — skip if absent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN
    ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS docusign_envelope_id TEXT,
      ADD COLUMN IF NOT EXISTS docusign_status TEXT,
      ADD COLUMN IF NOT EXISTS docusign_sent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS docusign_signed_at TIMESTAMPTZ;
  END IF;
END $$;
