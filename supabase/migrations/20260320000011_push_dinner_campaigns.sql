-- Push Dinner Campaigns
-- Extends the existing marketing_campaigns + campaign_recipients tables
-- with fields needed for the push dinner workflow:
--   - Dinner concept (date, time, price, guest count, occasion, menu link)
--   - Per-recipient AI draft + chef approval workflow
--   - Public shareable booking link (token)
--   - Seat capacity tracking
--   - inquiry_channel value for bookings that come via campaign link
--
-- ADDITIVE ONLY — no drops, no renames, no type changes.

-- ============================================================
-- 1. Extend campaign_type enum with 'push_dinner'
-- ============================================================
ALTER TYPE campaign_type ADD VALUE IF NOT EXISTS 'push_dinner';

-- ============================================================
-- 2. Extend marketing_campaigns with push-dinner fields
-- ============================================================
ALTER TABLE marketing_campaigns
  ADD COLUMN IF NOT EXISTS menu_id              UUID REFERENCES menus(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposed_date        DATE,
  ADD COLUMN IF NOT EXISTS proposed_time        TIME,
  ADD COLUMN IF NOT EXISTS price_per_person_cents INT,
  ADD COLUMN IF NOT EXISTS guest_count_min      INT DEFAULT 4,
  ADD COLUMN IF NOT EXISTS guest_count_max      INT DEFAULT 12,
  ADD COLUMN IF NOT EXISTS seats_available      INT,
  ADD COLUMN IF NOT EXISTS seats_booked         INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS occasion             TEXT,
  ADD COLUMN IF NOT EXISTS concept_description  TEXT,
  ADD COLUMN IF NOT EXISTS public_booking_token TEXT UNIQUE,
  -- How the chef wants to share this dinner with clients.
  -- 'email'         = send personalised email (chef approves each draft)
  -- 'portal_banner' = show a banner on the client's ChefFlow portal (no email)
  -- 'link_only'     = shareable link / QR code only — chef distributes manually
  -- Multiple modes can be active simultaneously.
  ADD COLUMN IF NOT EXISTS delivery_modes TEXT[] NOT NULL DEFAULT '{"email"}';

-- ============================================================
-- 3. Extend campaign_recipients with draft/approval workflow
-- ============================================================
ALTER TABLE campaign_recipients
  ADD COLUMN IF NOT EXISTS draft_subject              TEXT,
  ADD COLUMN IF NOT EXISTS draft_body                 TEXT,
  ADD COLUMN IF NOT EXISTS chef_approved              BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS chef_approved_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responded_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_to_inquiry_id    UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chef_notes                 TEXT;

-- ============================================================
-- 4. Add campaign_response to inquiry_channel enum
--    (used when a client books via the public shareable link)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'campaign_response'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'inquiry_channel')
  ) THEN
    ALTER TYPE inquiry_channel ADD VALUE 'campaign_response';
  END IF;
END $$;

-- ============================================================
-- 5. Indexes
-- ============================================================

-- Fast public booking token lookup (used unauthenticated)
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_public_token
  ON marketing_campaigns(public_booking_token)
  WHERE public_booking_token IS NOT NULL;

-- Fast query for "pending drafts" tab on campaign detail page
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_pending_drafts
  ON campaign_recipients(campaign_id, chef_approved)
  WHERE chef_approved = FALSE AND sent_at IS NULL;

-- Fast seat-count update during public bookings
CREATE INDEX IF NOT EXISTS idx_campaigns_seats
  ON marketing_campaigns(id, seats_available, seats_booked)
  WHERE campaign_type = 'push_dinner';
