# Gap 7: Payroll Tax (W-2 Employees)

## What Was Missing

No support for W-2 employee payroll: no employee roster, no pay period recording, no Form 941 quarterly summaries, no W-2 annual summaries.

## What Was Built

### Migration: `20260320000010_payroll_system.sql`

Four new tables:

**`employees`**:

- Identity: name, ssn_last4 (display-only, never store full SSN), email, phone, address
- W-4 info: filing_status, allowances, additional_withholding_cents
- Employment: hire_date, termination_date, status (active/terminated/on_leave)
- Pay: pay_type (hourly/salary), hourly_rate_cents, annual_salary_cents

**`payroll_records`** (one per pay period per employee):

- Pay period dates, pay date
- Hours: regular_hours, overtime_hours (NUMERIC for fractions)
- Pay amounts: regular/overtime/gross pay in cents
- Employee withholdings: federal income tax, SS (6.2%), Medicare (1.45%), state
- Employer costs: SS match (6.2%), Medicare match (1.45%), FUTA (0.6% of first $7,000)
- net_pay_cents = gross - all employee withholdings

**`payroll_941_summaries`** (UNIQUE on chef_id + tax_year + quarter):

- Aggregated quarterly totals for Form 941
- filed boolean, filed_at, confirmation_number

**`payroll_w2_summaries`** (UNIQUE on chef_id + employee_id + tax_year):

- Boxes 1–6 and Box 17 (state tax)
- generated_at timestamp (re-generatable from payroll records)

All tables: RLS (4-policy chef-only), update triggers, indexes.

### Lib Files

**`lib/finance/payroll-constants.ts`** (not `'use server'`):

- `SS_TAX_RATE = 0.062`, `MEDICARE_TAX_RATE = 0.0145`
- `SS_WAGE_BASE_2025_CENTS = 17610000` ($176,100)
- `FUTA_RATE = 0.006`, `FUTA_WAGE_BASE_CENTS = 700000` ($7,000)
- `computePayrollTaxes(grossPayCents, ytdWagesCents)` — computes all 5 tax amounts respecting wage bases

**`lib/finance/payroll-actions.ts`** (`'use server'`):

- Employee CRUD: `createEmployee()`, `updateEmployee()`, `terminateEmployee()`, `listEmployees()`
- Payroll: `recordPayroll(input)` — computes taxes via `computePayrollTaxes()`, stores all amounts
- `getPayrollRecords(filters?)` — joins employee name
- 941: `compute941Summary(year, quarter)` — aggregates from payroll_records; `save941Summary()` — upserts; `mark941Filed(input)` — records confirmation; `get941Summaries(year)`
- W-2: `generateW2Summaries(year)` — aggregates from payroll_records per employee, upserts; `getW2Summaries(year)`; `exportW2ToCSV(year)` — returns CSV string

### Components (`components/finance/payroll/`)

**`employee-form.tsx`**:

- Create/edit W-4 info, pay rates, address
- SSN field limited to 4 digits with warning note

**`payroll-entry-form.tsx`**:

- Employee selector, pay period dates, hours, rate
- Live pay breakdown: regular + OT pay → gross → each withholding → net
- Employer cost section shown separately (not deducted from employee)
- YTD wages input for accurate SS/FUTA wage base limits

**`form-941-panel.tsx`**:

- Per-quarter cards (Q1-Q4) with due dates
- "Compute Now" and "Recompute" buttons aggregate from payroll_records
- "Mark as Filed" inline with optional confirmation number
- Prominent "reference only" disclaimer

**`w2-panel.tsx`**:

- Annual W-2 values per employee (Boxes 1/2/3/4/5/6/17)
- "Regenerate" recomputes from payroll records
- Export CSV with disclaimer header
- Totals row

### Pages

- `/finance/payroll` — overview with YTD stats (gross wages, net pay, employer tax cost), quick links to sub-pages, recent pay runs
- `/finance/payroll/employees` — employee roster with add/edit/terminate; toggle to show terminated
- `/finance/payroll/run` — payroll entry form + recent records table
- `/finance/payroll/941?year=YYYY` — Form 941 quarterly panel with year selector
- `/finance/payroll/w2?year=YYYY` — W-2 panel with year selector

## Employer Taxes as Business Deductions

The employer share of SS + Medicare + FUTA is a deductible business expense (Schedule C, Line 26 wages + employer payroll taxes). The `payroll_records` table stores `employer_ss_tax_cents`, `employer_medicare_tax_cents`, `employer_futa_cents` separately so these can be summed for the accountant export.

## Design Decisions

- **SSN policy**: Store last 4 digits only. UI enforces `maxLength={4}` and shows a warning not to enter full SSN.
- **YTD wages input**: The payroll entry form asks for YTD wages before this period. This is necessary for correct SS ($176,100 cap) and FUTA ($7,000 cap) computations. A future improvement would auto-sum previous `payroll_records`.
- **Federal withholding**: Manual input (from IRS Publication 15 tables or W-4 worksheet). ChefFlow does not implement the full withholding calculation algorithm.
- **All outputs are reference only**: 941 must be filed via IRS e-file or mailed; W-2s must be submitted to SSA via approved software by January 31.
