# Tax Workflow System

## What Changed
Added an IRS-compliant mileage log, quarterly estimated tax cards, and an accountant-ready annual export. Closes the gap between financial data in the ledger and tax preparation reality.

## Why
Self-employed chefs pay self-employment tax (15.3%) on top of income tax and must make quarterly estimated payments. Before this change, ChefFlow tracked income and expenses but gave no help with mileage deductions, quarterly planning, or handing data to a CPA. Chefs were exporting to spreadsheets or doing it from memory.

## What Was Built

### Database
**Migration:** `supabase/migrations/20260303000009_tax_workflow.sql`

**`mileage_logs`**
- `from_address`, `to_address`, `miles`, `purpose`, `log_date`
- `irs_rate_cents_per_mile` — stored at log time (preserves historical accuracy when the IRS rate changes annually)
- `deduction_cents` — generated column: `ROUND(miles × irs_rate_cents_per_mile)` — immutable after insert
- Optional `event_id` FK for event-level mileage tracking

**`tax_settings`** (unique per chef+year)
- `filing_status`, `home_office_sqft`, `home_total_sqft`, `quarterly_payments` JSONB

### Server Actions
**File:** `lib/tax/actions.ts`

| Action | What |
|--------|------|
| `logMileage(input)` | Create mileage entry at current IRS rate |
| `deleteMileageLog(id)` | Remove entry |
| `getMileageForPeriod(start, end)` | Aggregate + totals for a date range |
| `getYearlyMileageSummary(year)` | Full year for Schedule C |
| `saveTaxSettings(input)` | Upsert filing status + home office data |
| `getTaxSettings(year)` | Read settings for a year |
| `computeQuarterlyEstimate(year, quarter)` | Rough SE + income tax estimate |
| `generateAccountantExport(year)` | Full structured JSON for CPA |

### Quarterly Estimate Methodology

The estimate uses this chain:
1. Gross income from `ledger_entries` (payments, deposits, etc.)
2. Minus: expenses from `expenses` table
3. Minus: mileage deduction from `mileage_logs`
4. = Net profit
5. SE tax: `net_profit × 0.9235 × 0.153`
6. SE deduction: `se_tax × 0.5`
7. Taxable income: `net_profit - se_deduction`
8. Income tax: `taxable_income × 0.22` (22% bracket approximation)

This is a planning tool only — actual tax depends on deductions, brackets, and credits a CPA knows.

### Accountant Export

`generateAccountantExport(year)` returns a structured object containing:
- Monthly income breakdown
- Expenses by category
- Mileage summary (total miles, deduction, log count)
- Net profit summary

Exported as a JSON file download. A CPA can use this to populate Schedule C in minutes rather than reconstructing from statements.

### UI
- **`app/(chef)/finance/tax/page.tsx`** — Tax center with year switcher
- **`app/(chef)/finance/tax/tax-center-client.tsx`** — Quarterly estimate cards, mileage log with inline form, accountant export button

## IRS Rate Note

The 2025 IRS standard mileage rate is $0.70/mile (70 cents). This is hardcoded in `lib/tax/actions.ts` as `IRS_RATE_CENTS_PER_MILE = 70`. Update this constant each January when the IRS announces the new year's rate. Past logs retain the rate they were recorded at via the `irs_rate_cents_per_mile` column.

## Future Considerations
- Home office deduction calculator (`home_office_sqft / home_total_sqft × home_expenses`)
- Quarterly payment reminder notifications (via automations engine)
- 1099-NEC tracking for contractors (if staff reach $600+ threshold)
- CSV export option alongside JSON
