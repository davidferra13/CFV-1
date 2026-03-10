# Profit & Loss Statement (Feature U9)

## Overview

Full P&L statement generation from existing ledger data and expense records. Supports monthly, quarterly, and annual periods with year-over-year comparison, transaction drill-down, CSV export, and print support.

## Architecture

The P&L is 100% deterministic (Formula > AI). All data comes from:

1. **`ledger_entries`** table (revenue, refunds, tips)
2. **`expenses`** table (COGS and operating expenses, categorized by `expense_category` enum)
3. **`purchase_orders`** table (received/partially received POs counted as COGS)
4. **`staff_clock_entries`** via `getPayrollReportForPeriod()` (labor costs)

No AI, no Ollama, no cloud LLMs. Pure math.

## Category Mapping

### Revenue (from ledger_entries)

- Event Revenue: all non-refund, non-tip ledger entries (payment, deposit, installment, final_payment, add_on, credit)
- Refunds: deducted from revenue
- Tips: shown separately

### Cost of Goods Sold (COGS)

DB categories mapped to COGS:

- `groceries` -> Food & Groceries
- `alcohol` -> Alcohol / Beverages
- `specialty_items` -> Specialty Items
- `supplies` -> Supplies & Packaging
- Purchase Orders (from `purchase_orders` table, received status)

### Operating Expenses

All other expense categories:

- `labor` -> Labor (includes payroll clock entries)
- `venue_rental` -> Rent / Venue Rental
- `utilities` -> Utilities
- `insurance_licenses` -> Insurance & Licenses
- `marketing` -> Marketing
- `equipment` -> Equipment
- `vehicle` -> Vehicle
- `gas_mileage` -> Gas / Mileage
- `subscriptions` -> Software / Subscriptions
- `professional_services` -> Professional Services
- `education` -> Education / Training
- `uniforms` -> Uniforms
- `other` -> Other Expenses

## P&L Layout

```
REVENUE
  Event Revenue          $XX,XXX   XX.X%
  Refunds               ($X,XXX)   X.X%
  Tips                   $X,XXX    X.X%
Total Revenue            $XX,XXX   100%

COST OF GOODS SOLD
  Food & Groceries       $XX,XXX   XX.X%
  Supplies & Packaging   $X,XXX    X.X%
  Purchase Orders        $X,XXX    X.X%
Total COGS               $XX,XXX   XX.X%

GROSS PROFIT             $XX,XXX   XX.X%

OPERATING EXPENSES
  Labor                  $XX,XXX   XX.X%
  Rent / Venue Rental    $X,XXX    X.X%
  ...
Total Operating Expenses $XX,XXX   XX.X%

NET INCOME               $XX,XXX   XX.X%
```

## Files

| File                                        | Purpose                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `lib/finance/pnl-actions.ts`                | Server actions: generatePnL, getPnLComparison, getPnLTrend, getExpenseBreakdown, getCategoryDetails, exportPnLCSV |
| `components/finance/pnl-statement.tsx`      | Full P&L UI with period selector, comparison, drill-down, trend chart                                             |
| `components/finance/pnl-summary-widget.tsx` | Compact dashboard widget with MoM change                                                                          |
| `app/(chef)/finance/pnl/page.tsx`           | Page route at /finance/pnl                                                                                        |

## Server Actions

### `generatePnL(period, year, month?, quarter?)`

Core P&L generator. Queries ledger, expenses, POs, and payroll for the given period. Returns structured `PnLStatement` with all line items, totals, and margin percentages.

### `getPnLComparison(period, year, compareYear, month?, quarter?)`

Runs two P&L statements and computes deltas (absolute and percentage) for revenue, COGS, gross profit, opex, and net income.

### `getPnLTrend(months?)`

Returns monthly net income trend for the last N months (default 12). Used for the bar chart.

### `getExpenseBreakdown(period, year, month?, quarter?)`

Flattens COGS + opex into a single ranked list with % of revenue and % of total expenses.

### `getCategoryDetails(categoryLabel, period, year, month?, quarter?)`

Drill-down into individual transactions for a specific category. Maps display labels back to DB categories. Special handling for Purchase Orders.

### `exportPnLCSV(period, year, month?, quarter?)`

Generates a formatted CSV string for download. Includes all sections, line items, and percentages.

## UI Features

- **Period selector**: Monthly / Quarterly / Annual with year, month, and quarter pickers
- **Run Report**: Fetches P&L for the selected period
- **Compare YoY**: Side-by-side current vs. previous year with color-coded deltas
- **Drill-down**: Click any COGS or opex line item to see individual transactions
- **Export CSV**: Client-side download of formatted CSV
- **Print**: Opens browser print dialog (print-friendly CSS classes applied)
- **Trend chart**: CSS bar chart showing monthly net income (green = positive, red = negative)
- **Error handling**: All startTransition calls wrapped in try/catch with visible error states

## Dashboard Widget

`PnLSummaryWidget` shows current month's Revenue, COGS, Net Income, and Net Margin with month-over-month change arrows. Loads data on mount, shows loading skeleton while pending, error state on failure.

## Relationship to Existing P&L

The existing P&L at `/finance/reporting/profit-loss` uses `lib/finance/profit-loss-report-actions.ts` with date range inputs. This new P&L at `/finance/pnl` uses period-based selection (monthly/quarterly/annual) and adds comparison, drill-down, trend, and CSV export. Both pull from the same underlying data sources.
