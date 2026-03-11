-- ============================================================
-- Migration: Backfill converting_quote_id + attach drift trigger
-- ============================================================

WITH latest_accepted AS (
  SELECT DISTINCT ON (q.event_id)
    q.event_id,
    q.id AS quote_id
  FROM quotes q
  WHERE q.event_id IS NOT NULL
    AND q.status = 'accepted'
    AND q.deleted_at IS NULL
  ORDER BY q.event_id, q.accepted_at DESC NULLS LAST, q.created_at DESC
)
UPDATE events e
SET converting_quote_id = la.quote_id
FROM latest_accepted la
WHERE e.id = la.event_id
  AND e.converting_quote_id IS NULL;
DROP TRIGGER IF EXISTS prevent_event_pricing_drift_from_accepted_quote_trigger ON events;
CREATE TRIGGER prevent_event_pricing_drift_from_accepted_quote_trigger
  BEFORE UPDATE OF quoted_price_cents, deposit_amount_cents, pricing_model ON events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_event_pricing_drift_from_accepted_quote();
