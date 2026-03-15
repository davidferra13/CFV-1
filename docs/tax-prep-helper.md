# Tax Preparation Helper

## What This Does

Adds a Schedule C expense categorization system and tax preparation dashboard to ChefFlow. Gives private chefs a clear view of their tax situation: revenue, deductions by IRS line item, quarterly estimated payments, and 1099-NEC contractor tracking.

## Components

### Migration: `20260401000010_expense_tax_categories.sql`

New `expense_tax_categories` table that maps expenses to IRS Schedule C lines. Supplements the existing `expenses` table (which has its own category enum) by providing explicit IRS line mapping. Existing tables used without modification:

- `tax_quarterly_estimates` (from `20260312000001_financial_infrastructure.sql`)
- `mileage_logs` (from `20260303000009_tax_workflow.sql`)
- `expenses` (from Layer 3)
- `contractor_payments` (from `20260312000001_financial_infrastructure.sql`)

### Server Actions: `lib/finance/tax-prep-actions.ts`

Five actions:

1. **`getScheduleCBreakdown(year)`** - Aggregates expenses from three sources: manual categorizations (expense_tax_categories), auto-mapped expenses (expenses table mapped via EXPENSE_CATEGORY_TO_LINE), and mileage deductions (mileage_logs). Returns per-line totals with deductible amounts.

2. **`categorizeExpense(data)`** - Manually add an expense to a specific Schedule C line.

3. **`getQuarterlyEstimates(year)`** - Fetches quarterly estimate records, auto-creates missing quarters.

4. **`updateQuarterlyPayment(estimateId, paidCents, paidAt)`** - Records a quarterly tax payment.

5. **`getTaxPrepSummary(year)`** - Full dashboard data: revenue from ledger_entries (payments + deposits), tips, Schedule C breakdown, estimated taxable income, quarterly estimate status, and 1099-NEC contractor counts.

### UI Component: `components/finance/tax-prep-dashboard.tsx`

Client component with:

- Year selector
- Revenue summary cards (gross revenue, tips, total deductions, estimated taxable income)
- Schedule C breakdown table with line items, amounts, deductible amounts, and item counts
- Add expense form (manual categorization into any Schedule C line)
- Quarterly estimated payment tracker with status badges and payment recording
- 1099-NEC contractor summary (count, total paid, count needing 1099 filings)

## Schedule C Line Mapping

| Line     | Category           | Auto-mapped From                                               |
| -------- | ------------------ | -------------------------------------------------------------- |
| Line 8   | Advertising        | marketing expenses                                             |
| Line 9   | Car/Truck          | mileage_logs + gas_mileage + vehicle expenses                  |
| Line 13  | Depreciation       | equipment expenses                                             |
| Line 15  | Insurance          | insurance_licenses expenses                                    |
| Line 17  | Legal/Professional | professional_services expenses                                 |
| Line 18  | Office Expense     | (manual only)                                                  |
| Line 22  | Supplies           | supplies expenses                                              |
| Line 24a | Travel             | (manual only)                                                  |
| Line 24b | Meals              | (manual only, 50% deductible)                                  |
| Line 25  | Utilities          | utilities expenses                                             |
| Line 27a | Other              | education, uniforms, subscriptions, venue_rental, labor, other |
| COGS     | Cost of Goods Sold | groceries, alcohol, specialty_items                            |

## How It Connects

- Revenue comes from `ledger_entries` (append-only, immutable)
- Expenses auto-map from the existing `expenses` table categories
- Mileage from existing `mileage_logs` with computed `deduction_cents`
- Contractor data from existing `contractor_payments`
- Quarterly estimates from existing `tax_quarterly_estimates`
- Only new table is `expense_tax_categories` for manual Schedule C categorization

## No AI Used

This is pure aggregation. Formula > AI per project rules.
