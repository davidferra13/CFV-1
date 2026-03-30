-- Add discussed_dishes and selected_tier to inquiries
-- These support the email snapshot footer ("at a glance" summary)

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS discussed_dishes JSONB DEFAULT NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS selected_tier TEXT DEFAULT NULL;

COMMENT ON COLUMN inquiries.discussed_dishes IS 'Array of dish names discussed with client, e.g. ["Paneer Tikka", "Gulab Jamun"]';
COMMENT ON COLUMN inquiries.selected_tier IS 'Pricing tier selected or under consideration: 3-course, 4-course, 5-course, tasting, custom';
