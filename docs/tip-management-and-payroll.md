# Tip Management (U13) and Payroll Calculator (U16)

Two related features for managing staff compensation: tip tracking with pooling rules, and payroll calculation from clock entries.

## Tip Management (U13)

### What it does

- Record cash and card tips per staff member per shift date
- Configure tip pooling rules (equal split, hours-based, or points-based)
- Calculate pool distributions based on configured rules
- Preview distributions before saving
- View distribution history

### Database tables

- `tip_entries` - Individual tip records per staff member per shift. Includes cash/card breakdown, hours worked, and pool eligibility flag. `total_tips_cents` is a generated column (cash + card).
- `tip_pool_configs` - Named pool configurations with distribution method and role filters. Multiple pools supported (e.g. "FOH Pool", "BOH Pool").
- `tip_distributions` - Finalized distribution records linking staff to their share amounts.

All three tables use `tenant_id` referencing `chefs(id)` with RLS policies for tenant isolation.

Migration: `supabase/migrations/20260331000024_tip_management.sql`

### Server actions

`lib/finance/staff-tip-actions.ts` (named `staff-tip-actions` to avoid conflict with existing `tip-actions.ts` which handles event-level tips)

Key functions:

- `recordStaffTips()` - Log tips for a staff member on a shift date
- `getStaffTipsForDate()` / `getStaffTipsForPeriod()` - Query tip entries
- `getStaffTipReport()` - Aggregated summary by staff member for a date range
- `createTipPoolConfig()` / `updateTipPoolConfig()` - CRUD for pool rules
- `calculateTipDistribution()` - Compute distribution preview without saving
- `saveTipDistribution()` - Finalize and persist a distribution

### Distribution methods

- **Equal**: Total pool divided evenly, remainder cents distributed one-per-person
- **Hours-based**: Proportional to hours worked. Falls back to equal split if no hours recorded
- **Points-based**: Reserved for future use, currently uses hours-based logic

### UI components

- `components/finance/tip-entry.tsx` - Daily tip entry form with per-staff cash/card/hours inputs
- `components/finance/tip-distribution.tsx` - Distribution calculator with preview and history
- `components/finance/tip-pool-settings.tsx` - Pool configuration CRUD with role selector

### Page

`app/(chef)/finance/tips/page.tsx` - All three sections (entry, distribution, settings) on one page

---

## Payroll Calculator (U16)

### What it does

- Compute gross pay from `staff_clock_entries` for any date range
- Calculate overtime at 1.5x for hours exceeding 40 per ISO week
- Include tip income from `tip_distributions`
- Export payroll summary as CSV
- Drill down into individual staff pay history

### How overtime works

Clock entries are grouped by ISO week (Monday to Sunday). For each week:

- First 40 hours are regular rate
- Hours above 40 are overtime at 1.5x the staff member's `hourly_rate_cents`

This is calculated per-week, not per-period, so a biweekly period correctly handles each week independently.

### Server actions

`lib/finance/payroll-calculator-actions.ts`

Key functions:

- `calculatePayroll(start, end)` - Core calculation: clock hours + OT + tips for all active staff
- `getPayrollCalculationSummary(start, end)` - Quick totals without full line items
- `getStaffPayHistory(staffId, periods?)` - Historical pay data for one person (biweekly periods going back)
- `exportPayrollCSV(start, end)` - CSV export with formula injection protection via `csvRowSafe()`

### Data sources

- **Hours**: `staff_clock_entries` table (status = 'completed', `total_minutes` column)
- **Rates**: `staff_members.hourly_rate_cents`
- **Tips**: `tip_distributions.share_cents` (from the U13 tip management system)

### UI component

`components/finance/payroll-calculator.tsx` - Client component with:

- Period presets (this week, last week, biweekly)
- Custom date range picker
- Full payroll table with OT flagged in amber
- CSV export button
- Click-to-drill-down per staff member showing pay history

### Page

`app/(chef)/finance/payroll/calculator/page.tsx`

Also linked from the payroll hub page (`app/(chef)/finance/payroll/page.tsx`).

---

## Architecture notes

- All monetary values in cents (integers). No floating-point money.
- All math is deterministic. No AI involvement.
- `tenant_id` always derived from `requireChef()` session, never from request body.
- Both features use the same `staff_members` table for staff identity.
- Tip distributions flow into payroll calculations automatically.
- CSV exports use `csvRowSafe()` from `lib/security/csv-sanitize.ts` to prevent formula injection.
- Both features include "reference tool only" disclaimers since they are not official payroll/tax systems.
