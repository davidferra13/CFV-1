# Financials

**What:** Track every dollar. Immutable ledger, computed balances, 9 report types, tax center, payroll.

**Routes:** `/financials`, `/finance`, `/expenses`, `/finance/invoices`, `/finance/payments`, `/finance/ledger`, `/finance/payouts`, `/finance/reporting`, `/finance/tax`, `/finance/payroll`, `/finance/goals`
**Key files:** `lib/ledger/append.ts`, `lib/ledger/compute.ts`
**Status:** 92% (tax export needs verification)

## What's Here

- Financial hub with summary cards (revenue, refunds, net, tips)
- Expenses: 7 categories, receipt photos, mobile-first, Ctrl+Shift+E hotkey
- Invoices: 6 status types (draft/sent/paid/overdue/refunded/cancelled)
- Payments: deposits, installments, refunds, failed/pending
- Ledger: immutable, append-only, CSV export, adjustments
- Reporting: 9 types (revenue by month/client/event, profit, expense, tax, YTD, P&L)
- Tax center: quarterly estimates, mileage, depreciation, home office, retirement
- Payroll: employees, Form 941, W-2
- Cash flow forecast (30-day), revenue forecast, revenue goals
- Stripe integration (payments + voluntary supporter contributions)

## Receipt Intelligence Engine (2026-04-18)

Receipts are now structured purchase records with full quantity/unit extraction:

- 3 OCR parsers enhanced: Gemini (unit field), regex (weight-priced/qty patterns), Ollama (already had units)
- Receipt learning: manual corrections create durable mappings for future auto-matching
- Unit normalization: receipt units converted to ingredient's canonical unit before pricing
- Price sanity guard: >50% deviation from average flagged for chef review instead of auto-applying

Key files: `lib/receipts/receipt-learning.ts`, `lib/finance/expense-line-item-actions.ts`

## Open Items

- CPA-ready tax export built but needs Playwright verification
- Price flag review UI (accept/reject flagged ingredient prices)
