-- Outreach Campaign Tracking
-- Adds outreach lifecycle columns to directory_listings + batch tracking table.
-- All additive. No existing columns modified or dropped.

-- Track outreach status per listing
ALTER TABLE directory_listings
  ADD COLUMN IF NOT EXISTS outreach_status text DEFAULT 'not_contacted'
    CHECK (outreach_status IN ('not_contacted', 'queued', 'contacted', 'opened', 'replied', 'claimed_via_outreach', 'opted_out', 'bounced')),
  ADD COLUMN IF NOT EXISTS outreach_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS outreach_batch_id uuid;

CREATE INDEX IF NOT EXISTS idx_directory_listings_outreach_status
  ON directory_listings(outreach_status) WHERE outreach_status != 'not_contacted';

-- Track outreach batches for auditing and rate control
CREATE TABLE IF NOT EXISTS outreach_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_date date NOT NULL DEFAULT CURRENT_DATE,
  target_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  bounced_count integer NOT NULL DEFAULT 0,
  opened_count integer NOT NULL DEFAULT 0,
  replied_count integer NOT NULL DEFAULT 0,
  claimed_count integer NOT NULL DEFAULT 0,
  template_version text NOT NULL DEFAULT 'v1',
  filters_used jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
