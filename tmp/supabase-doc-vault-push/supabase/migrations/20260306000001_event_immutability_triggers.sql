-- ============================================================
-- Migration: Event Immutability Triggers
-- Created:   2026-03-06
-- Purpose:   Add DB-level enforcement of two fields that the
--            schema comments declare immutable but previously
--            had no trigger backing those promises:
--
--            1. Pricing fields (quoted_price_cents,
--               deposit_amount_cents, pricing_model) — must
--               not change once the client accepts the event.
--            2. allergies[] — safety-critical, must not change
--               once the event moves past 'proposed' status.
--
--            App-layer logic already prevents these changes,
--            but the DB must enforce them independently so
--            that direct SQL access, service-role bypasses,
--            and future code paths cannot silently corrupt
--            financial and food-safety data.
-- ============================================================

-- ── 1. Event Pricing Immutability ──────────────────────────────────────────
-- Locks quoted_price_cents, deposit_amount_cents, and pricing_model once
-- the event has been accepted (status NOT IN ('draft', 'proposed')).
-- The Stripe ledger and FSM state transitions depend on these values never
-- changing after acceptance; this trigger is the DB-level guarantee.

CREATE OR REPLACE FUNCTION prevent_event_price_mutation_after_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- Pricing is mutable only during draft and proposed phases.
  -- Once a client accepts, all three fields are locked.
  IF OLD.status NOT IN ('draft', 'proposed') THEN
    IF (
      NEW.quoted_price_cents   IS DISTINCT FROM OLD.quoted_price_cents   OR
      NEW.deposit_amount_cents IS DISTINCT FROM OLD.deposit_amount_cents OR
      NEW.pricing_model        IS DISTINCT FROM OLD.pricing_model
    ) THEN
      RAISE EXCEPTION
        'Event pricing is immutable once accepted. '
        'quoted_price_cents, deposit_amount_cents, and pricing_model '
        'cannot be changed when status is %. '
        'Event ID: %',
        OLD.status, OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION prevent_event_price_mutation_after_acceptance IS
  'Financial integrity guard. '
  'Prevents pricing field modification after client acceptance. '
  'Complementary to the append-only ledger trigger. '
  'Fires on UPDATE OF quoted_price_cents, deposit_amount_cents, pricing_model.';
-- Fire ONLY when one of the three pricing columns is explicitly updated.
-- This avoids overhead on every event UPDATE (status changes, notes, etc.).
CREATE TRIGGER prevent_event_price_mutation_trigger
  BEFORE UPDATE OF quoted_price_cents, deposit_amount_cents, pricing_model ON events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_event_price_mutation_after_acceptance();
-- ── 2. Event Allergies Immutability ────────────────────────────────────────
-- The schema comment on events.allergies reads:
--   'IMMUTABLE after event creation - safety-critical data'
-- This trigger enforces that promise at the DB level.
--
-- Practical threshold: allergies are mutable in 'draft' and 'proposed'
-- (chef is still setting up, client hasn't agreed yet).
-- Once the client accepts ('accepted' → onward), allergies are locked.
-- Any allergy change at that point must go through a support workflow,
-- not a direct field update.

CREATE OR REPLACE FUNCTION prevent_event_allergy_mutation()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow changes only during draft and proposed phases.
  IF OLD.status NOT IN ('draft', 'proposed') THEN
    IF NEW.allergies IS DISTINCT FROM OLD.allergies THEN
      RAISE EXCEPTION
        'Event allergy information is immutable once accepted. '
        'The allergies field is safety-critical and cannot change '
        'when status is %. '
        'Event ID: %',
        OLD.status, OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION prevent_event_allergy_mutation IS
  'Food safety guard. '
  'Prevents allergy field modification after client acceptance. '
  'Enforces the schema comment: IMMUTABLE after event creation (safety-critical). '
  'Fires on UPDATE OF allergies.';
-- Fire ONLY when allergies column is explicitly updated.
CREATE TRIGGER prevent_event_allergy_mutation_trigger
  BEFORE UPDATE OF allergies ON events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_event_allergy_mutation();
