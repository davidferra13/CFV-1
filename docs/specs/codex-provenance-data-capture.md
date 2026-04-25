---
title: Ingredient Provenance Data Capture
status: ready
agent: codex
scope: narrow
risk: low
---

# Ingredient Provenance Data Capture

## Purpose

Add three nullable TEXT columns to `inventory_transactions` so each sourcing event (type `receive`) can record WHERE an ingredient came from: the source name (farm, market, shop), the producer/grower, and the geographic region.

This is a foundation for provenance-driven menu showcasing. No UI changes. No application code changes. Just the migration file.

## Background

The `inventory_transactions` table (defined in `database/migrations/20260325000001_inventory_ledger_foundation.sql`) already tracks:

- `ingredient_id`, `ingredient_name`, `quantity`, `unit`, `cost_cents`
- `photo_url`, `notes`
- `event_id`, `vendor_invoice_id`, `batch_id`

It does NOT track the human-readable source provenance (farm name, producer name, region). These three columns fill that gap.

## Files to Create

### 1. `database/migrations/20260426000002_ingredient_provenance_fields.sql`

**IMPORTANT:** Before writing this file, glob `database/migrations/*.sql` and confirm `20260426000002` is strictly higher than the highest existing timestamp. If it is not, pick the next available number (increment by 1).

Write this exact content:

```sql
-- Ingredient provenance tracking on inventory transactions
-- Captures source, producer, and region at the point of purchase/receipt
-- All columns nullable. Additive-only. Safe migration.

ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS source_name TEXT;

ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS source_producer TEXT;

ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS source_region TEXT;

COMMENT ON COLUMN inventory_transactions.source_name
  IS 'Source location name (farm, market, fishmonger, specialty shop)';

COMMENT ON COLUMN inventory_transactions.source_producer
  IS 'Producer, grower, or maker name';

COMMENT ON COLUMN inventory_transactions.source_region
  IS 'Geographic region or address of source';
```

## Files to Modify

NONE. This spec only creates one new migration file.

## DO NOT

- Do NOT modify `types/database.ts` (it is auto-generated)
- Do NOT modify any application code (no .ts or .tsx files)
- Do NOT modify any existing migration files
- Do NOT run `drizzle-kit push` or apply the migration
- Do NOT update the `event_ingredient_lifecycle` view (that is a separate task)
- Do NOT add indexes (these columns are for display, not querying)
- Do NOT add NOT NULL constraints (all three columns must be nullable)

## Verification

After writing the migration file:

1. Confirm the file exists at the correct path
2. Confirm the timestamp is higher than all other migration files
3. Run `npx tsc --noEmit --skipLibCheck` to confirm no TypeScript errors were introduced (should be a no-op since no TS files changed)

## Commit

```
feat(provenance): add source_name, source_producer, source_region to inventory_transactions

Additive migration. Three nullable TEXT columns for capturing
ingredient provenance at point of sourcing.
```
