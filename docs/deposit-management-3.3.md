# Feature 3.3: Deposit Management

## What Changed

Added deposit management system: 50% non-refundable deposit standard with balance due before event.

## Files Created

1. **`supabase/migrations/20260401000020_deposit_settings.sql`** - `chef_deposit_settings` table with RLS, constraints, and update trigger
2. **`lib/finance/deposit-actions.ts`** - Server actions: `calculateDeposit`, `recordDeposit`, `recordBalancePayment`, `getDepositSettings`, `updateDepositSettings`, `getOverdueDeposits`
3. **`components/finance/deposit-tracker.tsx`** - Event detail panel with visual progress bar, status badges, payment recording forms, and payment history
4. **`components/finance/deposit-settings-form.tsx`** - Settings component with percentage slider, balance due days, auto-reminder toggle, reminder schedule, and payment terms text
5. **`components/dashboard/overdue-payments-widget.tsx`** - Dashboard widget showing overdue deposits and balances with totals

## Architecture Decisions

- **Ledger-first**: All payments recorded via `appendLedgerEntryForChef` using `deposit` and `final_payment` entry types (already exist in the enum)
- **Formula > AI**: All calculations are deterministic (no Ollama). Deposit amount = percentage of quoted price. Balance due date = event date minus configurable days
- **Existing infrastructure**: Leverages `deposit_amount_cents` column already on `events` table, `event_financial_summary` view for balance tracking, and existing `PaymentMethod` enum
- **Settings table uses `chef_id`**: Follows convention for Layer 5+ feature tables
- **Non-blocking activity logs**: All activity logging wrapped in try/catch per project pattern

## Integration Points

- The `DepositTracker` component can be added to the event detail page
- The `DepositSettingsForm` can be added to the settings page (e.g., under financial settings)
- The `OverduePaymentsWidget` can be added to the chef dashboard
- The `getOverdueDeposits` action can be called from the dashboard page's data loader
