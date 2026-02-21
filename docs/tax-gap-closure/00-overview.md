# Tax Gap Closure — Overview

## Summary

ChefFlow's tax foundation was strong (immutable ledger, mileage logging, quarterly estimates, P&L, accountant export) but had 7 gaps before a chef or their accountant could pull everything needed at year-end. This document tracks the full closure of those gaps.

## Scope

All business types supported: solo owner, sole proprietor, LLC, S-corp, C-corp. Platform does not connect to bank accounts (manual CSV only — no Plaid).

## Gap Closure Index

| #   | Gap                                        | Migration        | Lib                                     | Status   |
| --- | ------------------------------------------ | ---------------- | --------------------------------------- | -------- |
| Bug | `driven_at` → `log_date` in mileage export | —                | `lib/finance/tax-estimate-actions.ts`   | ✅ Fixed |
| 1   | Home Office Deduction                      | `20260320000007` | `lib/tax/home-office-actions.ts`        | ✅ Done  |
| 2   | Equipment Depreciation                     | `20260320000008` | `lib/equipment/depreciation-actions.ts` | ✅ Done  |
| 3   | Retirement & Health Deductions             | `20260320000006` | `lib/tax/retirement-actions.ts`         | ✅ Done  |
| 4   | W-9 Data on Contractors                    | `20260320000005` | `lib/finance/contractor-actions.ts`     | ✅ Done  |
| 5   | 1099-NEC Report Generation                 | —                | `lib/finance/1099-actions.ts`           | ✅ Done  |
| 6   | Sales Tax Tracking                         | `20260320000009` | `lib/finance/sales-tax-actions.ts`      | ✅ Done  |
| 7   | Payroll Tax (W-2 Employees)                | `20260320000010` | `lib/finance/payroll-actions.ts`        | ✅ Done  |

## Year-End Package Integration

The year-end page (`/finance/tax/year-end`) now includes all of the following sections:

1. **Gross Revenue** — completed events + tips
2. **Deductible Expenses (Schedule C)** — categorized by IRS line code
3. **Mileage Deduction** — Schedule C, Line 9
4. **Equipment Depreciation** — Schedule C, Line 13 (Form 4562)
5. **Home Office Deduction** — Schedule C, Line 30
6. **Above-the-Line Deductions** — Schedule 1 (retirement + health insurance, reduce AGI)
7. **Quarterly Estimates** — 25% effective rate, Q1-Q4 with due dates

## Key Design Principles

- **All amounts in cents** (integer minor units, never floats)
- **Sales tax rates in basis points** (625 bps = 6.25%) to avoid float arithmetic
- **`'use server'` files export only async functions** — constants go in separate non-server files
- **Tenant scoping** on every query via `chef_id`
- **4-policy RLS** (SELECT/INSERT/UPDATE/DELETE) on every new table
- **Reference-only disclaimers** on 1099-NEC, Form 941, and W-2 panels — ChefFlow computes the numbers; filing requires IRS-approved software
- **Above-the-line vs. Schedule C** kept architecturally separate (retirement/health reduce AGI, not just Schedule C profit)
