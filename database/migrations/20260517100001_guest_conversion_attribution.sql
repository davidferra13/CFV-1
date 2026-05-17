-- Guest Conversion Attribution
-- Adds source tracking columns to inquiries so we can trace which inquiries
-- originated from guest feedback, referral emails, or other post-event flows.
-- Additive only: two nullable columns, no data changes.

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- Partial index for quick lookup of guest-feedback-sourced inquiries
CREATE INDEX IF NOT EXISTS idx_inquiries_source_type
  ON inquiries (tenant_id, source_type)
  WHERE source_type IS NOT NULL;

COMMENT ON COLUMN inquiries.source_type IS 'Origin of this inquiry: guest_feedback, referral_email, etc.';
COMMENT ON COLUMN inquiries.source_event_id IS 'The event that triggered this inquiry (e.g. guest attended this dinner and later inquired).';
