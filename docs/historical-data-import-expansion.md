# Historical Data Import Expansion

**Date:** 2026-03-26
**Purpose:** Remove barriers and add missing tools for importing years of unorganized chef data.

## Problem

A chef with 10+ years of history has recipes in their head, stacks of paper receipts, scattered invoices, and no financial records in the system. The import tools were mostly forward-looking. Three specific gaps blocked a full historical data migration:

1. The `events` table had a CHECK constraint preventing events older than 1 year
2. No bulk expense import (only receipt scanning one batch at a time)
3. No bulk payment/ledger import (manual entry only)

## Changes

### 1. Migration: Drop 1-year event date constraint

**File:** `database/migrations/20260401000103_drop_event_date_constraint.sql`

Drops `events_date_not_too_old` CHECK constraint. This was blocking the existing historical event import from accepting events older than March 2025. Chefs can now import events from any date.

### 2. Bulk Expense CSV Import (new)

| File                                    | Purpose                                                                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/parse-csv-expenses.ts`          | Deterministic CSV parser for expense data. Detects columns: date, description, amount, category, vendor, notes, event, tax_deductible. Maps 60+ category aliases to canonical values. |
| `lib/finance/expense-import-actions.ts` | Server action. Batch inserts into `expenses` table. Auth via `requireChef()`, tenant-scoped, defaults `tax_deductible: true`, tags notes with `[Historical import]`.                  |
| `components/import/expense-import.tsx`  | UI component. Manual row entry or CSV paste. Same phase flow as past-events-import (form, review, saving, done).                                                                      |

### 3. Bulk Payment/Ledger CSV Import (new)

| File                                   | Purpose                                                                                                                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/parse-csv-payments.ts`         | Deterministic CSV parser for payment data. Detects columns: date, client, amount, method, description, type. Normalizes entry types (payment/deposit/tip/refund).           |
| `lib/ledger/payment-import-actions.ts` | Server action. Inserts into `ledger_entries`. Resolves clients by name (finds existing or creates minimal record). Same `resolveClient` pattern as historical event import. |
| `components/import/payment-import.tsx` | UI component. Same phase flow. Client selector (existing or new), payment method, entry type dropdowns.                                                                     |

### 4. Smart Import Hub Integration

Both new modes added to `components/import/smart-import-hub.tsx`:

- `past-expenses` tab with `ExpenseImport` component
- `past-payments` tab with `PaymentImport` component

Also added to the IMPORT_MODES array in `app/(chef)/import/page.tsx`.

## Recommended Data Import Order

1. **Clients first** (CSV import at `/import?mode=csv`)
2. **Past events** (CSV at `/import?mode=past-events`, now supports any date)
3. **Past payments** (CSV at `/import?mode=past-payments`, creates ledger entries linked to clients)
4. **Past expenses** (CSV at `/import?mode=past-expenses`, years of spending data)
5. **Recipes** (Photo batch at `/recipes/import`, brain dump at `/recipes/dump`, sprint at `/recipes/sprint`)
6. **Receipts** (Batch upload at `/receipts`, 20 photos at a time with OCR)
7. **Recipe families** (Group variations after import)

## What Already Existed (no changes needed)

- Recipe Import Hub (photo batch, URL batch, text, brain dump, sprint)
- Recipe Families/Variations
- Receipt batch upload with OCR
- CSV client import
- CSV historical event import
- CSV inquiry import
- Menu upload pipeline (PDF, image, DOCX)
- Document management and search
