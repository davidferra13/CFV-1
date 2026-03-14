-- Dual Booking Model Migration
-- Adds per-chef booking model configuration (inquiry_first vs instant_book).
-- Adds booking_source tracking on events.
-- All changes are additive — no existing data is modified.

-- 1. New columns on chefs for booking model configuration
ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS booking_model TEXT DEFAULT 'inquiry_first'
    CHECK (booking_model IN ('inquiry_first', 'instant_book')),
  ADD COLUMN IF NOT EXISTS booking_base_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS booking_pricing_type TEXT DEFAULT 'flat_rate'
    CHECK (booking_pricing_type IN ('flat_rate', 'per_person')),
  ADD COLUMN IF NOT EXISTS booking_deposit_type TEXT DEFAULT 'percent'
    CHECK (booking_deposit_type IN ('percent', 'fixed')),
  ADD COLUMN IF NOT EXISTS booking_deposit_fixed_cents INTEGER DEFAULT 0;

-- Note: booking_deposit_percent already exists from migration 20260307000012.

-- 2. New column on events to track how the event was created
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS booking_source TEXT
    CHECK (booking_source IN ('inquiry', 'instant_book'));

COMMENT ON COLUMN chefs.booking_model IS 'inquiry_first: client submits request; instant_book: client pays deposit and auto-books';
COMMENT ON COLUMN chefs.booking_base_price_cents IS 'Base event price for instant-book (required when model=instant_book)';
COMMENT ON COLUMN chefs.booking_pricing_type IS 'flat_rate: fixed price regardless of guests; per_person: price multiplied by guest count';
COMMENT ON COLUMN chefs.booking_deposit_type IS 'percent: deposit is % of total; fixed: deposit is a fixed amount in cents';
COMMENT ON COLUMN chefs.booking_deposit_fixed_cents IS 'Fixed deposit amount in cents (used when deposit_type=fixed)';
COMMENT ON COLUMN events.booking_source IS 'How the event was created: inquiry (standard flow) or instant_book (client paid deposit upfront)';
