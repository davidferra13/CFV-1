-- Event Ticketing System
-- Adds ticket types and tickets for public event sales.
-- Capacity enforcement via atomic sold_count CAS guard.

-- ─── Ticket Types (per-event pricing tiers) ─────────────────────────

CREATE TABLE IF NOT EXISTS event_ticket_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  price_cents     INT NOT NULL CHECK (price_cents >= 0),
  capacity        INT,  -- NULL = uses event guest_count as limit
  sold_count      INT NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_ticket_types_event ON event_ticket_types(event_id);
CREATE INDEX idx_event_ticket_types_tenant ON event_ticket_types(tenant_id);

-- ─── Tickets (individual purchases) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS event_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ticket_type_id  UUID REFERENCES event_ticket_types(id) ON DELETE SET NULL,
  -- Buyer info (no auth required for public purchases)
  buyer_name      TEXT NOT NULL,
  buyer_email     TEXT NOT NULL,
  buyer_phone     TEXT,
  -- Pricing
  quantity        INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents INT NOT NULL CHECK (unit_price_cents >= 0),
  total_cents     INT NOT NULL CHECK (total_cents >= 0),
  -- Payment
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id   TEXT,
  payment_status  TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled')),
  -- Guest tracking
  guest_token     UUID NOT NULL DEFAULT gen_random_uuid(),
  hub_profile_id  UUID REFERENCES hub_guest_profiles(id) ON DELETE SET NULL,
  event_guest_id  UUID REFERENCES event_guests(id) ON DELETE SET NULL,
  -- Dietary (collected at purchase)
  dietary_restrictions TEXT[] DEFAULT '{}',
  allergies        TEXT[] DEFAULT '{}',
  plus_one_name    TEXT,
  plus_one_dietary TEXT[] DEFAULT '{}',
  plus_one_allergies TEXT[] DEFAULT '{}',
  notes            TEXT,
  -- Source tracking
  source          TEXT NOT NULL DEFAULT 'chefflow'
    CHECK (source IN ('chefflow', 'eventbrite', 'facebook', 'groupon', 'walkin', 'comp')),
  external_order_id TEXT,
  -- Attendance
  attended        BOOLEAN,
  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at    TIMESTAMPTZ
);

CREATE INDEX idx_event_tickets_event ON event_tickets(event_id);
CREATE INDEX idx_event_tickets_tenant ON event_tickets(tenant_id);
CREATE INDEX idx_event_tickets_buyer_email ON event_tickets(buyer_email);
CREATE INDEX idx_event_tickets_guest_token ON event_tickets(guest_token);
CREATE INDEX idx_event_tickets_stripe_session ON event_tickets(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX idx_event_tickets_payment_status ON event_tickets(event_id, payment_status);

-- ─── Distribution Channels (event syndication to external platforms) ──

CREATE TABLE IF NOT EXISTS event_distribution (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL
    CHECK (platform IN ('eventbrite', 'facebook', 'google', 'groupon', 'instagram')),
  external_event_id   TEXT,
  external_url        TEXT,
  sync_status     TEXT NOT NULL DEFAULT 'draft'
    CHECK (sync_status IN ('draft', 'published', 'synced', 'failed', 'archived')),
  last_synced_at  TIMESTAMPTZ,
  sync_error      TEXT,
  link_back_url   TEXT,
  auto_sync       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, platform)
);

CREATE INDEX idx_event_distribution_event ON event_distribution(event_id);
CREATE INDEX idx_event_distribution_tenant ON event_distribution(tenant_id);

-- ─── Enable ticketing on event share settings ───────────────────────

ALTER TABLE event_share_settings
  ADD COLUMN IF NOT EXISTS tickets_enabled BOOLEAN NOT NULL DEFAULT false;

-- ─── Ticket sales summary view ──────────────────────────────────────

CREATE OR REPLACE VIEW event_ticket_summary AS
SELECT
  et.event_id,
  et.tenant_id,
  COUNT(*) FILTER (WHERE et.payment_status = 'paid') AS tickets_sold,
  COUNT(*) FILTER (WHERE et.payment_status = 'pending') AS tickets_pending,
  COUNT(*) FILTER (WHERE et.payment_status = 'refunded') AS tickets_refunded,
  COALESCE(SUM(et.quantity) FILTER (WHERE et.payment_status = 'paid'), 0) AS guests_confirmed,
  COALESCE(SUM(et.total_cents) FILTER (WHERE et.payment_status = 'paid'), 0) AS revenue_cents,
  COALESCE(SUM(et.total_cents) FILTER (WHERE et.payment_status = 'refunded'), 0) AS refunded_cents,
  COUNT(DISTINCT et.source) AS channel_count,
  jsonb_object_agg(
    COALESCE(et.source, 'unknown'),
    sub.cnt
  ) FILTER (WHERE sub.cnt IS NOT NULL) AS sales_by_source
FROM event_tickets et
LEFT JOIN LATERAL (
  SELECT et2.source, COUNT(*) AS cnt
  FROM event_tickets et2
  WHERE et2.event_id = et.event_id AND et2.payment_status = 'paid'
  GROUP BY et2.source
) sub ON sub.source = et.source
WHERE et.payment_status != 'cancelled'
GROUP BY et.event_id, et.tenant_id;
