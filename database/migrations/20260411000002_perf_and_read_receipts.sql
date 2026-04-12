-- Migration: Performance index + read receipts
-- 2026-04-11
-- 100% additive: new index + new nullable column + new table
-- Safe to apply with zero downtime

-- ─── 1. Directory stats performance index ────────────────────────────────────
-- chef_marketplace_profiles has 329K+ rows; the directory stats page does
-- full-table aggregations. This composite index covers the most common
-- filter patterns (tenant_id lookups and is_active filtering).

CREATE INDEX IF NOT EXISTS idx_chef_marketplace_profiles_active
  ON chef_marketplace_profiles (tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_chef_marketplace_profiles_created
  ON chef_marketplace_profiles (created_at DESC);

-- ─── 2. Read receipts on messages ────────────────────────────────────────────
-- Tracks when a client opened/read a chef outbound message in the portal.
-- NULL = not yet read. Set by the client portal on first view.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS client_read_at TIMESTAMPTZ NULL;

-- Index for the chef's "unread outbound" query
CREATE INDEX IF NOT EXISTS idx_messages_client_read_at
  ON messages (tenant_id, direction, client_read_at)
  WHERE direction = 'outbound' AND client_read_at IS NULL;

-- ─── 3. Marketing spend log ──────────────────────────────────────────────────
-- Records marketing expenditures so CAC (customer acquisition cost) can be
-- computed from real data instead of being hardcoded to 0.

CREATE TABLE IF NOT EXISTS marketing_spend_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  channel     TEXT NOT NULL,           -- 'facebook_ads', 'google_ads', 'instagram_ads', 'flyers', 'referral_bonus', 'event_sponsorship', 'other'
  description TEXT,
  spend_date  DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_spend_chef
  ON marketing_spend_log (chef_id, spend_date DESC);
