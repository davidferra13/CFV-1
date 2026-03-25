-- Analytics: Inquiry Decline Tracking + Quote Negotiation Tracking
-- Adds columns needed to compute ghost rate, decline reasons, and price negotiation stats.
-- Purely additive — existing rows keep NULL for new columns.

-- ============================================================
-- 1. INQUIRIES: decline reason + ghost timestamp
-- ============================================================

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS decline_reason TEXT
    CHECK (decline_reason IN (
      'too_expensive', 'wrong_date', 'found_another_chef',
      'no_response', 'location_too_far', 'menu_mismatch', 'other'
    )),
  ADD COLUMN IF NOT EXISTS ghost_at TIMESTAMPTZ;  -- auto-set when status transitions to expired

COMMENT ON COLUMN inquiries.decline_reason IS
  'Why the inquiry did not convert. Set when status = declined or expired. Used for decline reason breakdown analytics.';

COMMENT ON COLUMN inquiries.ghost_at IS
  'Timestamp when this inquiry went cold (status = expired). Distinct from declined — ghost means client stopped responding.';

-- Index for decline analytics queries
CREATE INDEX IF NOT EXISTS inquiries_decline_reason_idx
  ON inquiries (tenant_id, decline_reason)
  WHERE decline_reason IS NOT NULL;

-- ============================================================
-- 2. QUOTES: negotiation tracking
-- ============================================================

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS negotiation_occurred   BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_quoted_cents  INTEGER  CHECK (original_quoted_cents > 0);

COMMENT ON COLUMN quotes.negotiation_occurred IS
  'True if the quoted price was revised downward after the initial quote. Set manually when chef adjusts price on client request.';

COMMENT ON COLUMN quotes.original_quoted_cents IS
  'The original quoted price before any negotiation. Populated when negotiation_occurred = true. Used to compute average discount %.';

-- Index for negotiation analytics
CREATE INDEX IF NOT EXISTS quotes_negotiation_idx
  ON quotes (tenant_id, negotiation_occurred)
  WHERE negotiation_occurred = true;
