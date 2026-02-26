# Quote Versioning & Annual Tax Package

**Date:** 2026-02-20
**Branch:** feature/scheduling-improvements

---

## 1. Quote Versioning

### What Changed

Added a full quote revision/versioning system so chefs can create updated quotes for the same event without losing the original.

**Migration:** `supabase/migrations/20260312000012_quote_versioning.sql`

- Adds `version INTEGER DEFAULT 1` to `quotes`
- Adds `previous_version_id UUID REFERENCES quotes(id)` — FK linking each quote to its predecessor
- Adds `is_superseded BOOLEAN DEFAULT FALSE` — marks quotes replaced by a newer revision
- Index on `previous_version_id` for chain traversal

**Server actions added to `lib/quotes/actions.ts`:**

- `reviseQuote(quoteId)` — creates a draft copy at version+1, marks the original as `is_superseded = true`, returns `{ success: true, newQuoteId }`
- `getQuoteVersionHistory(quoteId)` — walks the `previous_version_id` chain to find the root, then traverses forward to collect all related quotes; returns `QuoteVersionSummary[]`
- Fixed bug: `previous_version_id` was missing from the select in the fetch-all query, preventing forward chain traversal from working

**New component:** `components/quotes/quote-version-history.tsx`

- For single-version quotes: renders compact "v1" badge + "Create revision" link
- For multi-version quotes: renders a full timeline card with version number, amount, status badge, date, and view links
- Client-side; calls `reviseQuote` via `useTransition`, then redirects to the new quote's edit page

**Wired into:** `app/(chef)/quotes/[id]/page.tsx`

- Imports `getQuoteVersionHistory` (parallelised with `getQuoteById` via `Promise.all`)
- `QuoteVersionHistory` rendered between the frozen-snapshot notice and the main content grid

### Why

Quotes often go through multiple rounds of negotiation. Without versioning, chefs either mutated the original (losing history) or created ad-hoc duplicates with no linkage. Now every revision is tracked in a chain with full audit trail.

### How It Fits the System

The quote lifecycle is: draft → sent → accepted/rejected/expired. When a sent quote is rejected or needs changes, `reviseQuote` creates a new draft at v2, preserving v1 as a read-only historical record. This is additive and never touches ledger entries or event state.

---

## 2. Annual Tax Package

### What Changed

The existing year-end tax page already had revenue, expenses by IRS category, and quarterly estimates. Three gaps were filled:

1. **Mileage deduction was missing** from both the data model and the UI — even though `getYearlyMileageSummary()` existed in `lib/tax/actions.ts`.
2. **Year was hardcoded** to `currentYear - 1` with no way to view other years.
3. **Export was `.txt`** — accountants prefer CSV for spreadsheet import.

**`lib/finance/tax-package.ts`:**

- Added `MileageSummary` interface and `mileage` field to `TaxPackage`
- `getYearEndTaxPackage(taxYear)` now includes `getYearlyMileageSummary(taxYear)` in the `Promise.all` call
- `totalDeductibleExpensesCents` now sums both category expenses **and** mileage deduction (previously omitted)
- The 2025 IRS standard mileage rate is stored as `irsRateCentsPerMile: 70` ($0.70/mile)

**`app/(chef)/finance/tax/year-end/page.tsx`:**

- Accepts `searchParams.year` to show any year (defaults to `currentYear - 1`)
- Year pill selector (2026 / 2025 / 2024 / 2023) with active highlight
- New mileage card: total miles, IRS rate, total deduction — with a link to the Tax Center if no mileage is logged
- Mileage deduction shown as a line item inside the Schedule C expense breakdown
- Net income now correctly subtracts mileage deduction

**`components/finance/tax-package-export.tsx`:**

- Export upgraded from `.txt` to `.csv` (proper quote-escaping, CRLF line endings)
- Download filename changed to `chefflow-tax-package-{year}.csv`
- Four sections in the CSV: Revenue, Deductible Expenses (including mileage line), Mileage Detail, Quarterly Estimates
- All monetary values use `formatCurrency()` for human readability

### Why

A chef preparing for tax season should be able to open one page, see everything their accountant needs, and download it in a format the accountant can open in Excel. The mileage deduction alone can be $500–$2,000/year for an active chef — it was invisibly excluded from the total before this fix.

### How It Fits the System

- Reads only — no ledger writes, no event state changes
- All data comes from existing tables: `events`, `expenses`, `ledger_entries`, `mileage_logs`
- Fully compliant with AI Policy: chef sees numbers, downloads file, takes to their own accountant. No automated tax filings.

---

## Files Modified / Created

| File                                                      | Change                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `supabase/migrations/20260312000012_quote_versioning.sql` | New migration — quote version columns                                                  |
| `lib/quotes/actions.ts`                                   | `reviseQuote`, `getQuoteVersionHistory`, `QuoteVersionSummary` type; bug fix in select |
| `components/quotes/quote-version-history.tsx`             | New component                                                                          |
| `app/(chef)/quotes/[id]/page.tsx`                         | Import + `Promise.all` + JSX                                                           |
| `lib/finance/tax-package.ts`                              | `MileageSummary` type, mileage in `TaxPackage`, fetch + include mileage in compute     |
| `app/(chef)/finance/tax/year-end/page.tsx`                | Year selector, mileage card, correct net income                                        |
| `components/finance/tax-package-export.tsx`               | CSV export with mileage, year selector                                                 |
