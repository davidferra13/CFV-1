-- Fix: Allow draft -> paid transition for instant-book flows
-- The application code (lib/events/transitions.ts) allows draft -> paid for
-- instant-book scenarios where a Stripe webhook pays for a draft event directly.
-- The database trigger was blocking this valid transition, causing instant-book
-- events to stay stuck in draft status after payment.

CREATE OR REPLACE FUNCTION validate_event_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow same-state (no-op)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Validate allowed transitions
  IF NOT (
    (OLD.status = 'draft' AND NEW.status IN ('proposed', 'paid', 'cancelled')) OR
    (OLD.status = 'proposed' AND NEW.status IN ('accepted', 'cancelled')) OR
    (OLD.status = 'accepted' AND NEW.status IN ('paid', 'cancelled')) OR
    (OLD.status = 'paid' AND NEW.status IN ('confirmed', 'cancelled')) OR
    (OLD.status = 'confirmed' AND NEW.status IN ('in_progress', 'cancelled')) OR
    (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled')) OR
    (OLD.status = 'completed' AND FALSE) OR  -- Terminal state, no transitions
    (OLD.status = 'cancelled' AND FALSE)      -- Terminal state, no transitions
  ) THEN
    RAISE EXCEPTION 'Invalid event transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
