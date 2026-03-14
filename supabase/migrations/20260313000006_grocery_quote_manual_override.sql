-- Migration: Grocery Quote Manual Price Override
-- Adds columns to grocery_price_quote_items so chefs can override API-sourced
-- prices with their own figures from local farms, fish markets, or specialty stores.

ALTER TABLE grocery_price_quote_items
  ADD COLUMN IF NOT EXISTS manual_price_cents  INTEGER,
  ADD COLUMN IF NOT EXISTS is_manual_override  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_label        TEXT;

-- source_label expected values (not enforced, free-text for flexibility):
--   'spoonacular' | 'kroger' | 'mealme' | 'usda'
--   'local_farm' | 'fish_market' | 'specialty_market' | 'custom'
