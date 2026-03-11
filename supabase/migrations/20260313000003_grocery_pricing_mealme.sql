-- Migration: add MealMe pricing columns to grocery quote tables
-- Additive only — adds two nullable columns, no data loss.
-- MealMe covers 1M+ stores including Market Basket, Hannaford, Shaw's,
-- Stop & Shop, Whole Foods, Walmart — all real-time local prices.

ALTER TABLE grocery_price_quotes
  ADD COLUMN IF NOT EXISTS mealme_total_cents INT;
ALTER TABLE grocery_price_quote_items
  ADD COLUMN IF NOT EXISTS mealme_price_cents INT;
