-- Circle Approval Flow
-- ADDITIVE ONLY: new table + new column on hub_groups

-- 1. Join requests table
CREATE TABLE IF NOT EXISTS circle_join_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id     uuid NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  guest_name    text NOT NULL,
  guest_email   text NOT NULL,
  guest_phone   text,
  message       text,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   uuid REFERENCES chefs(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  rejection_reason text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circle_join_requests_circle
  ON circle_join_requests USING btree (circle_id);

CREATE INDEX IF NOT EXISTS idx_circle_join_requests_status
  ON circle_join_requests USING btree (circle_id, status);

CREATE INDEX IF NOT EXISTS idx_circle_join_requests_email
  ON circle_join_requests USING btree (lower(guest_email));

-- 2. Add approval_mode column to hub_groups (default 'auto' = instant join)
ALTER TABLE hub_groups
  ADD COLUMN IF NOT EXISTS approval_mode text NOT NULL DEFAULT 'auto';

ALTER TABLE hub_groups
  ADD CONSTRAINT hub_groups_approval_mode_check
  CHECK (approval_mode IN ('auto', 'manual'));
