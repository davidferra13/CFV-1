-- Migration: Per-Chef Gratuity Mode Configuration
-- Adds configurable gratuity model to the chefs table.
-- Survey data: gratuity varies significantly by archetype —
--   solo/boutique = discretionary, high-volume catering = 20% service fee,
--   corporate = none, luxury = included in flat rate.

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS gratuity_mode             TEXT NOT NULL DEFAULT 'discretionary',
  ADD COLUMN IF NOT EXISTS gratuity_service_fee_pct  NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS gratuity_display_label    TEXT;

-- gratuity_mode values:
--   'discretionary'    — client tips at their discretion (default)
--   'auto_service_fee' — automatic % added to invoice (use gratuity_service_fee_pct)
--   'included_in_rate' — baked into the flat rate, no separate line item
--   'none'             — no gratuity (corporate/subscription models)

COMMENT ON COLUMN chefs.gratuity_mode IS 'How gratuity is handled: discretionary | auto_service_fee | included_in_rate | none';
COMMENT ON COLUMN chefs.gratuity_service_fee_pct IS 'Percentage for auto_service_fee mode, e.g. 20.00 for 20%';
COMMENT ON COLUMN chefs.gratuity_display_label IS 'Label shown on proposals/invoices, e.g. "20% service charge"';
