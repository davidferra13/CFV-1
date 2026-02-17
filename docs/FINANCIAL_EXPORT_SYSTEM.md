# Financial Export System

**Date:** 2026-02-17
**Scope:** 3 CSV exports, reusable download component, UI buttons on 3 pages

## What Changed

Added comprehensive CSV export capability so chefs can pull all financial data for taxes, accountants, or personal records. Every dinner now has exportable numbers — both incoming (revenue/payments) and outgoing (expenses by category).

## The 3 Exports

### 1. Per-Event Financial Statement

**Where:** Event detail page → "Export Financials" button in the Financial Summary card
**File:** `event-{name}-{date}.csv`

Contains three sections:
- **Event header** — name, date, client, guests, status, quoted price
- **Revenue** — all ledger entries (deposits, payments, tips, refunds) with dates and amounts
- **Expenses** — all expenses with category, vendor, amount, business/personal flag
- **Summary** — total revenue, total expenses, profit, margin %, food cost %

### 2. All Expenses (Sortable)

**Where:** Expenses page → "Export CSV" button in the header
**File:** `expenses-{date}.csv`

One row per expense with full detail: date, event name, client, category, vendor, amount, description, payment method, card used, business/personal, reimbursable, notes.

Respects active filters — if filtering by category or date range, only those expenses export. Includes total and business-total rows at the bottom.

### 3. All Events Master (Tax Export)

**Where:** Financials page → "Export All Events" button
**File:** `chefflow-financials-{year}.csv`

One row per event for the entire year with:
- Event info: date, name, client, guests, status
- Revenue: quoted price, paid, tips, refunds, net revenue
- Expenses: total + breakdown by all 17 categories
- Bottom line: profit, margin %

Includes a "General Business Expenses" row for overhead not tied to events (Wix subscription, insurance, etc.) and a totals row at the bottom.

## Architecture

### Server Actions (`lib/exports/actions.ts`)

- `exportEventCSV(eventId)` — queries event, ledger entries, and expenses; computes profit; returns CSV string + filename
- `exportExpensesCSV(filters)` — reuses `getExpenses()` with current filters; returns CSV string + filename
- `exportAllEventsCSV(year)` — queries all events, financial summaries, and expenses for the year; builds per-category breakdown; returns CSV string + filename

All actions are `'use server'` and require chef authentication via `requireChef()`.

### Reusable Download Component (`components/exports/csv-download-button.tsx`)

Generic client component that accepts any `() => Promise<{ csv, filename }>` action. Handles loading state, Blob creation, and browser download trigger. Used by the event and expenses export buttons.

### Page-Specific Wrappers

- `components/exports/event-export-button.tsx` — binds eventId to `exportEventCSV`
- `components/exports/expenses-export-button.tsx` — binds current filters to `exportExpensesCSV`
- Financials page handles its own export inline (already a client component)

## Files Created

| File | Purpose |
|------|---------|
| `lib/exports/actions.ts` | 3 export server actions |
| `components/exports/csv-download-button.tsx` | Reusable download button |
| `components/exports/event-export-button.tsx` | Event detail page wrapper |
| `components/exports/expenses-export-button.tsx` | Expenses page wrapper |

## Files Modified

| File | Change |
|------|--------|
| `app/(chef)/events/[id]/page.tsx` | Added EventExportButton to Financial Summary card |
| `app/(chef)/expenses/page.tsx` | Added ExpensesExportButton to header |
| `app/(chef)/financials/financials-client.tsx` | Added "Export All Events" button and handler |

## Design Decisions

- **CSV format** — universally importable (Excel, Google Sheets, Numbers, accounting tools). No extra npm dependencies.
- **Amounts in dollars** — `$1,234.56` not `123456` cents. Human-readable for accountants and tax filing.
- **Per-event export combines revenue + expenses** — one file tells the complete story of a dinner.
- **All-events export has per-category columns** — all 17 expense categories get their own column for granular tax categorization.
- **Filter-aware expenses export** — exports what you're looking at, not always everything.
- **Unlinked expenses tracked separately** — general business overhead (subscriptions, insurance) appears as its own row in the all-events master export.
