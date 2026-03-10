# Four Features: Budget Variance, Equipment Rentals, Cert Alerts, Pre-Call Brief

Date: 2026-03-09
Branch: feature/risk-gap-closure

## What Changed

### 1. Budget Variance Reporting

- **Migration:** `20260331000003_budget_and_equipment_rentals.sql` adds `chef_budgets` table
- **Server actions:** `lib/finance/budget-variance-actions.ts` with setBudget, getBudgets, getBudgetVariance, getYearlyBudgetSummary
- **Page:** `app/(chef)/finance/budget/page.tsx` with month navigation, inline budget editing, variance table with bar chart comparison
- **Component:** `components/finance/budget-variance-client.tsx` (client-side interactive table)
- Budget categories map to expense categories for automatic actuals calculation
- Color coding: green (under), amber (within 10%), red (over budget)

### 2. Equipment Rental Sourcing Workflow

- **Migration:** Same file adds `event_equipment_rentals` table
- **Server actions:** `lib/events/equipment-rental-actions.ts` with full CRUD + status transitions (needed, confirmed, picked_up, returned, cancelled)
- **Component:** `components/events/equipment-rental-panel.tsx` with status badges, inline add form, confirm/return/delete actions
- Tracks cost per rental and shows total rental cost for event
- `getUpcomingRentals()` returns all active rentals in the next 30 days

### 3. Certification Expiration Alerts

- **Server actions:** `lib/protection/cert-alert-actions.ts` with getCertExpiryAlerts and checkCertificationExpiry
- **Component:** `components/protection/cert-expiry-banner.tsx` with severity-based styling (red <30d, amber 30-60d, blue 60-90d)
- **Dashboard integration:** Added to `app/(chef)/dashboard/_sections/alerts-cards.tsx` as a banner in the alerts tab
- Uses existing `getExpiringCertifications()` from certification-actions.ts
- Notifications dispatched as non-blocking side effects
- Dismissible per-alert

### 4. Pre-Call Intelligence Brief

- **Server actions:** `lib/calls/pre-call-brief-actions.ts` with generatePreCallBrief
- **Component:** `components/calls/pre-call-brief.tsx` with collapsible sections
- **Integration:** Added to `app/(chef)/calls/[id]/page.tsx` call detail page
- 100% deterministic (Formula > AI): gathers client profile, event history, financial summary, health score, open items, last communication
- Copy to clipboard for key details
- Graceful fallback when no client is linked to the call

## Architecture Notes

- All actions use `requireChef()` for auth and tenant scoping
- All optimistic updates have try/catch with rollback
- Cert notifications are non-blocking (wrapped in try/catch, logged on failure)
- No AI/Ollama dependency in any feature
- Budget categories map to expense categories via BUDGET_TO_EXPENSE_MAP for automatic variance calculation
