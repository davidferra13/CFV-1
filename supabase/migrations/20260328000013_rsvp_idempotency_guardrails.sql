-- RSVP idempotency + dedupe guardrails
-- 1) Normalize RSVP-related emails to lower-case
-- 2) Remove duplicate rows that would violate new uniqueness guarantees
-- 3) Add unique indexes to enforce idempotent writes

-- Normalize RSVP-facing emails
UPDATE event_guests
SET email = lower(trim(email))
WHERE email IS NOT NULL
  AND email <> lower(trim(email));

UPDATE event_join_requests
SET viewer_email = lower(trim(viewer_email))
WHERE viewer_email IS NOT NULL
  AND viewer_email <> lower(trim(viewer_email));

UPDATE event_share_invites
SET invited_email = lower(trim(invited_email))
WHERE invited_email IS NOT NULL
  AND invited_email <> lower(trim(invited_email));

UPDATE guest_leads
SET email = lower(trim(email))
WHERE email IS NOT NULL
  AND email <> lower(trim(email));

-- Keep earliest guest row per share+email (case-insensitive), drop duplicates
WITH ranked_guests AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY event_share_id, lower(email)
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM event_guests
  WHERE email IS NOT NULL
)
DELETE FROM event_guests eg
USING ranked_guests rg
WHERE eg.id = rg.id
  AND rg.rn > 1;

-- Keep newest pending join request per event+email, drop older duplicates
WITH ranked_join_requests AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY event_id, lower(viewer_email)
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM event_join_requests
  WHERE status = 'pending'
)
DELETE FROM event_join_requests ejr
USING ranked_join_requests rjr
WHERE ejr.id = rjr.id
  AND rjr.rn > 1;

-- Enforce unique invite token
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_share_invites_token_unique
  ON event_share_invites(token);

-- Enforce one guest row per share+email
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_guests_share_email_unique
  ON event_guests(event_share_id, lower(email))
  WHERE email IS NOT NULL;

-- Enforce at most one pending join request per event+email
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_join_requests_pending_email_unique
  ON event_join_requests(event_id, lower(viewer_email))
  WHERE status = 'pending';

