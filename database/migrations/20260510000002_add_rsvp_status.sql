-- Add RSVP status to hub_group_members
ALTER TABLE hub_group_members
ADD COLUMN IF NOT EXISTS rsvp_status text DEFAULT 'no_response'
CHECK (rsvp_status IN ('going', 'maybe', 'not_going', 'no_response'));

-- Index for quick RSVP summaries
CREATE INDEX IF NOT EXISTS idx_hub_group_members_rsvp
ON hub_group_members (group_id, rsvp_status)
WHERE rsvp_status != 'no_response';
