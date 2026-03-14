-- Hub Inquiry Link
-- Connects hub_groups to inquiries so a Dinner Circle can be auto-created
-- when a new inquiry arrives. Additive only.

ALTER TABLE hub_groups
  ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hub_groups_inquiry
  ON hub_groups(inquiry_id) WHERE inquiry_id IS NOT NULL;

-- Grant access to the service role (already has full access, but explicit for clarity)
COMMENT ON COLUMN hub_groups.inquiry_id IS 'Links this hub group to an inquiry for the Dinner Circle auto-creation flow';
