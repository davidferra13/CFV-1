-- Integrated ticket payment failure tracking and retry capacity release.
-- Extends event_tickets instead of adding a parallel payment-attempt table so
-- each guest row remains the source of truth for its payment state.

ALTER TABLE event_tickets
  DROP CONSTRAINT IF EXISTS event_tickets_payment_status_check;

ALTER TABLE event_tickets
  ADD CONSTRAINT event_tickets_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));

ALTER TABLE event_tickets
  ADD COLUMN IF NOT EXISTS payment_failure_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_error TEXT,
  ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_available_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS capacity_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_tickets_retry
  ON event_tickets(event_id, retry_available_at)
  WHERE payment_status IN ('failed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_event_tickets_active_capacity
  ON event_tickets(ticket_type_id, payment_status)
  WHERE capacity_released_at IS NULL;

CREATE OR REPLACE FUNCTION enforce_event_ticket_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  event_capacity integer;
  reserved_seats integer;
BEGIN
  IF NEW.payment_status IN ('cancelled', 'failed', 'refunded')
     OR NEW.capacity_released_at IS NOT NULL
     OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(guest_count, 0)
    INTO event_capacity
    FROM events
    WHERE id = NEW.event_id;

  IF event_capacity <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(quantity), 0)
    INTO reserved_seats
    FROM event_tickets
    WHERE event_id = NEW.event_id
      AND id IS DISTINCT FROM NEW.id
      AND payment_status NOT IN ('cancelled', 'failed', 'refunded')
      AND capacity_released_at IS NULL
      AND deleted_at IS NULL;

  reserved_seats := reserved_seats + COALESCE(NEW.quantity, 0);

  IF reserved_seats > event_capacity THEN
    RAISE EXCEPTION 'Event capacity exceeded: % spot(s) remaining',
      GREATEST(event_capacity - (reserved_seats - COALESCE(NEW.quantity, 0)), 0)
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS event_tickets_capacity_guard ON event_tickets;

CREATE TRIGGER event_tickets_capacity_guard
  BEFORE INSERT OR UPDATE OF event_id, quantity, payment_status, capacity_released_at, deleted_at
  ON event_tickets
  FOR EACH ROW
  EXECUTE FUNCTION enforce_event_ticket_capacity();

ALTER TABLE waitlist_entries
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS source_event_id UUID REFERENCES events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_waitlist_entries_source_event
  ON waitlist_entries(source_event_id, status)
  WHERE source_event_id IS NOT NULL;
