# T2.2 & T3.2 — P&L Report and Year-End Financial Summary

## What Changed

### T2.2: Profit & Loss Statement

**Route:** `/finance/reporting/profit-loss?year=XXXX`

### T3.2: Year-End Financial Summary

**Route:** `/finance/year-end?year=XXXX`

Both features were implemented across 5 files (1 function added, 4 new files created, 1 existing file updated).

---

## Files Created / Modified

| File                                                              | Change                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------- |
| `lib/ledger/compute.ts`                                           | Added `computeProfitAndLoss(year)` function                   |
| `app/(chef)/finance/reporting/profit-loss/page.tsx`               | New Server Component — P&L page                               |
| `app/(chef)/finance/reporting/profit-loss/profit-loss-client.tsx` | New Client Component — year selector + CSV export             |
| `app/(chef)/finance/year-end/page.tsx`                            | New Server Component — Year-End summary                       |
| `app/(chef)/finance/year-end/year-end-client.tsx`                 | New Client Component — year selector + accountant CSV + email |
| `app/(chef)/finance/reporting/page.tsx`                           | Added 2 entries to REPORTS array                              |

---

## `computeProfitAndLoss(year: number)`

Added to `lib/ledger/compute.ts`. This is a server-only function (file has `'use server'` at the top).

**What it queries:**

- `ledger_entries` — filtered by `tenant_id` and `created_at` date range, selects `entry_type`, `amount_cents`, `created_at`, `is_refund`
- `expenses` — filtered by `tenant_id` and `expense_date` range, selects `amount_cents`, `expense_category`, `description`, `expense_date`

**What it computes:**

- `totalRevenueCents` — sum of all non-refund, non-tip ledger entries
- `totalRefundsCents` — sum of all refund entries (uses `is_refund` flag or `entry_type === 'refund'`)
- `totalTipsCents` — sum of all tip entries
- `netRevenueCents` — gross revenue minus refunds
- `totalExpensesCents` — sum of all expense rows
- `netProfitCents` — net revenue minus total expenses
- `profitMarginPercent` — net profit / net revenue, rounded to 1 decimal place
- `expensesByCategory` — `Record<string, number>` keyed on `expense_category`
- `monthlyRevenue` — `Record<string, number>` keyed on `YYYY-MM` strings

**Design note:** Revenue uses `created_at` (when the payment was recorded) while expenses use `expense_date` (when the expense occurred). This matches how the existing `getTenantFinancialSummary` works and reflects actual cash timing.

---

## P&L Report — `/finance/reporting/profit-loss`

**Architecture:** Server Component page (`page.tsx`) + Client Component controls (`profit-loss-client.tsx`).

**Server Component:**

- Reads `?year` from `searchParams`, defaults to current year
- Calls `computeProfitAndLoss(validYear)`
- Renders all UI server-side; passes `pl` data + year options to `ProfitLossClientControls`

**KPI Cards (4-column grid):**

1. Total Revenue (green) — shows net after refunds; footnote shows gross/refunds breakdown when refunds > 0
2. Total Expenses (red) — with count of expense categories
3. Net Profit — green if positive, red if negative
4. Profit Margin % — with tips footnote when applicable

**Monthly Revenue section:**

- Table with all 12 months: Month | Revenue | CSS bar chart
- Bar width is proportional to the highest-revenue month
- Zero-revenue months show a dash

**Expenses by Category section:**

- Table: Category | Amount | % of Revenue
- Sorted by amount descending
- Totals row at bottom

**P&L Summary section:**

- Clean income statement layout (gross → refunds → net revenue → expenses → net profit → margin)

**Client Component (`ProfitLossClientControls`):**

- `<select>` year dropdown — `onChange` calls `router.push('/finance/reporting/profit-loss?year=XXXX')`
- "Download CSV" button — generates CSV client-side and triggers download
- CSV structure: revenue lines, expenses by category, P&L summary, monthly revenue

---

## Year-End Summary — `/finance/year-end`

**Architecture:** Server Component page (`page.tsx`) + Client Component controls (`year-end-client.tsx`).

**Server Component:**

- Reads `?year` from `searchParams`, defaults to current year
- Runs `computeProfitAndLoss(validYear)` and a direct Supabase events query in parallel via `Promise.all`
- Events query: `events` table filtered by `tenant_id` + `event_date` range, returns `id, occasion, event_date, status`

**Business Summary section:**

- 4-column stat grid: Total Events | Completed | Cancelled | Avg Revenue per Completed Event

**Revenue section:**

- Net revenue KPI + tips (if any) + revenue-including-tips
- Monthly bar chart (only months with revenue shown, sorted chronologically)
- Top 3 revenue months callout

**Expenses by Category section:**

- Same pattern as P&L: Category | Amount | % of Revenue table

**Tax Preparation section:**

- Amber left-border card
- Income statement walkthrough: Gross Income → Refunds → Expenses → Estimated Net Income
- Warning note: "consult your accountant" + reference to Schedule C

**Client Component (`YearEndClientControls`):**

- Year selector dropdown — same pattern as P&L
- "Download for Accountant" button — generates a comprehensive accountant-ready CSV with labeled sections
- "Email to Myself" — `<a href="mailto:?...">` with pre-filled subject + body containing key figures; user attaches the CSV file
- CSV includes: Business Overview, Income Statement, Expense Breakdown, Monthly Revenue, and Tax Preparation (Schedule C Reference) sections

---

## Reporting Hub Update

Added 2 entries to the `REPORTS` array in `app/(chef)/finance/reporting/page.tsx`:

```typescript
{ href: '/finance/reporting/profit-loss', label: 'Profit & Loss Statement', icon: '📈', description: 'Full P&L with revenue, expenses, and net profit' },
{ href: '/finance/year-end', label: 'Year-End Summary', icon: '🎯', description: 'Complete annual summary for tax preparation' },
```

Note: The Year-End Summary links to `/finance/year-end` (not inside `/finance/reporting/`) because it is a top-level standalone page.

---

## Data Flow

```
User visits /finance/reporting/profit-loss?year=2026
  └── page.tsx (Server Component)
        ├── requireChef() — auth + tenant guard
        ├── computeProfitAndLoss(2026) — queries ledger_entries + expenses
        └── renders KPIs, monthly table, category table
              └── ProfitLossClientControls (Client Component)
                    ├── year <select> → router.push
                    └── Download CSV button → generates + triggers download

User visits /finance/year-end?year=2026
  └── page.tsx (Server Component)
        ├── requireChef() — auth + tenant guard
        ├── Promise.all([computeProfitAndLoss(2026), events query])
        └── renders Business Summary, Revenue, Expenses, Tax Prep
              └── YearEndClientControls (Client Component)
                    ├── year <select> → router.push
                    ├── Download for Accountant → comprehensive CSV
                    └── Email to Myself → mailto: link
```

---

## Design Decisions

- **No recharts used** — even though recharts is in `package.json`, bar charts are implemented with CSS-only divs/table cells (width set via inline `style` percentage). This avoids Client Component requirements for the bars and keeps the page fully server-rendered except for the controls.
- **Year selector uses `router.push`** — clean URL-based state; no client-side state storage needed.
- **CSV generation is fully client-side** — no API route needed; uses `Blob`, `URL.createObjectURL`, and a transient anchor click.
- **`computeProfitAndLoss` is reused by both pages** — single source of truth for P&L computation.
- **Tenant scoping enforced** — every query includes `.eq('tenant_id', user.tenantId!)`.
- **Amounts stay in cents throughout** — only converted to dollars at display time via `formatCurrency` or at CSV generation via `centsToDollars`.
