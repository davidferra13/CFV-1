# Phase 11: Expense & Receipt Tracking — Implementation Reflection

## What Changed

Phase 11 builds the other side of the financial equation. ChefFlow already tracked **revenue** through the immutable ledger (payments, deposits, tips). This phase adds **expense tracking**, receipt photo upload with AI-powered extraction, business vs personal tagging, budget guardrails, and per-event profit visibility.

## Files Created

### Backend (Server Actions)

| File                             | Purpose                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `lib/expenses/actions.ts`        | 9 server actions for expense CRUD, profit summaries, budget guardrails, and monthly financials |
| `lib/expenses/receipt-upload.ts` | Supabase Storage upload/download/delete for receipt photos                                     |
| `lib/ai/parse-receipt.ts`        | Claude vision-powered receipt extraction (line items, categories, totals)                      |

### UI Pages

| File                                      | Purpose                                                               |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `app/(chef)/expenses/page.tsx`            | Expense overview — summary cards, category breakdown, filterable list |
| `app/(chef)/expenses/new/page.tsx`        | Add expense — server component wrapper, loads events dropdown         |
| `app/(chef)/expenses/[id]/page.tsx`       | Expense detail — full details, receipt dual view, delete action       |
| `components/expenses/expense-form.tsx`    | Two-mode form: manual entry + receipt upload with AI extraction       |
| `components/expenses/expense-actions.tsx` | Delete button with confirmation dialog                                |

### Modified Files

| File                                          | Change                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `app/(chef)/events/[id]/page.tsx`             | Added budget guardrail, expense list, profit summary sections                      |
| `app/(chef)/financials/page.tsx`              | Added monthly financial summary data fetching                                      |
| `app/(chef)/financials/financials-client.tsx` | Added monthly overview with revenue target progress bar, per-event breakdown table |
| `components/navigation/chef-nav.tsx`          | Added "Expenses" link between Menus and Financials                                 |

## Architecture Decisions

### 1. Server Actions, Not API Routes

All expense operations follow the established pattern: `'use server'` functions with `requireChef()` as the first line, `tenant_id` scoping on every query, Zod validation for mutations, `revalidatePath()` for cache invalidation. No new architectural patterns introduced.

### 2. Database View for Profit Calculations

The `event_financial_summary` database view already computes `total_expenses_cents`, `profit_cents`, `profit_margin`, and `food_cost_percentage` by joining expenses against events and ledger entries. The `getEventProfitSummary()` action enriches this with category-level breakdowns from the expenses table.

### 3. Business vs Personal Separation

Every expense has an `is_business` boolean. When receipts are extracted with mixed items, the form creates **two separate expense records** — one for business items (counts toward food cost) and one for personal items (tracked but excluded from profit calculations). This directly solves the mixed-shopping-trip problem.

### 4. Budget Guardrail Design

The guardrail is shown **before** the chef shops (when an event has pricing but no expenses), not after. It calculates: `maxGrocerySpend = quotedPrice × (1 - targetMargin)`. Default target margin is 60%. The guardrail transitions from informational (blue) to warning (yellow at 80% of budget) to alert (red when over budget). It's a ceiling, not a mandate — the chef decides whether to exceed it.

### 5. Receipt AI Extraction

Uses Claude's vision capabilities (same `claude-sonnet-4-20250514` model as Smart Import). The system prompt instructs the AI to:

- Expand abbreviations ("BNLS CHKN BRST" → "Boneless Chicken Breast")
- Categorize each line item (protein, produce, dairy, pantry, alcohol, supplies, personal)
- Flag low-confidence extractions
- Report all amounts in cents

The chef always reviews and approves before data becomes canonical — same human-in-the-loop principle as the Smart Import.

### 6. Dual View Principle

Receipt detail shows both versions side by side: the original photo (legal proof) and the extracted data (readable document). Both are stored permanently.

### 7. Monthly Financial Overview

The financials page now includes:

- Monthly summary: revenue, expenses, profit, avg food cost, event count
- Revenue progress bar toward $10K target
- Per-event breakdown table: event, date, client, revenue, expenses, profit, margin

## How It Connects to the System

### Event Lifecycle

Expenses slot into the post-acceptance phase. Once an event has pricing (quoted price set), the budget guardrail appears. As expenses are logged, profit calculations become visible on the event detail page.

### Financial Model

The ledger remains the source of truth for **revenue**. The expenses table is the source of truth for **costs**. Profit = revenue - business expenses. The `event_financial_summary` view joins both sources into a single computed projection.

### Existing Views

The `event_financial_summary` database view already includes expense aggregation columns (`total_expenses_cents`, `profit_cents`, `profit_margin`, `food_cost_percentage`). This phase builds the UI and server actions that populate the expenses table, which the view then reads.

## Supabase Storage Setup Required

The `receipts` bucket must be created in the Supabase dashboard:

1. Go to Storage → Create New Bucket
2. Name: `receipts`, Private (not public)
3. Add RLS policy: authenticated users can INSERT/SELECT where path starts with their tenant_id
4. Max file size: 10MB
5. Allowed MIME types: image/jpeg, image/png, image/heic, image/heif, image/webp

## What's NOT in This Phase

- **Leftover tracking across events** — carry-forward inventory is a future enhancement
- **Ingredient price history linking** — receipt line items could update ingredient `last_price_cents`, but that's deferred
- **Configurable target margin** — hardcoded to 60%, could later be stored on chef profile (`chef_preferences.target_margin_percent`)
- **Receipt OCR fallback** — if the AI can't read a receipt, the chef falls back to manual entry
- **Expense editing UI** — the detail page shows data and allows deletion; inline editing of existing expenses is a future enhancement

## Type Safety

Zero new type errors introduced. All 33 pre-existing type errors are in `lib/chef/actions.ts` (references `chef_preferences` table not in generated types), `lib/recipes/actions.ts`, and `lib/scheduling/actions.ts` — all unrelated to this phase. The build ESLint failure is also pre-existing (unescaped quotes in recipes edit page).
