-- Migration: Add portion sizing fields to components
-- Additive only: two new nullable columns
-- Inherits existing components RLS policies automatically
--
-- portion_quantity + portion_unit define how much of this component goes on each plate.
-- Combined with guest_count from the event, this calculates total quantity needed.
-- E.g. portion_quantity=120, portion_unit='g' → 120g per plate × 12 guests = 1440g total.

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS portion_quantity DECIMAL(8,3);
ALTER TABLE components
  ADD COLUMN IF NOT EXISTS portion_unit TEXT;
-- If portion_quantity is set, it must be positive
ALTER TABLE components
  ADD CONSTRAINT components_portion_quantity_positive
  CHECK (portion_quantity IS NULL OR portion_quantity > 0);
COMMENT ON COLUMN components.portion_quantity IS
  'Amount of this component per plate/guest. E.g. 120 (grams) or 4 (oz).';
COMMENT ON COLUMN components.portion_unit IS
  'Unit for portion_quantity. E.g. "g", "oz", "ml", "pieces". Free text.';
