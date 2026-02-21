# Feature 5: Retainer/Subscription Module

## Summary

Implements a full retainer billing system for private chefs to manage recurring client agreements. Chefs can create retainer contracts with weekly, bi-weekly, or monthly billing cycles, track billing periods, record payments through the ledger, and link events to retainer agreements.

## What Changed

### New Files

| File                                                   | Purpose                                                                                                                                            |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/retainers/constants.ts`                           | Status labels, billing cycle labels, badge variant mappings. No `'use server'` directive so constants can be shared across client and server code. |
| `lib/retainers/actions.ts`                             | 12 server actions: CRUD, status transitions (activate/pause/resume/cancel/complete), queries, payment recording, and event linking.                |
| `components/retainers/retainer-status-badge.tsx`       | Badge components mapping retainer/period status to UI badge variants.                                                                              |
| `components/retainers/retainer-form.tsx`               | Client component form for creating and editing retainers. Handles currency conversion (display dollars, store cents).                              |
| `components/retainers/retainer-billing-timeline.tsx`   | Client component showing billing periods with inline payment recording.                                                                            |
| `app/(chef)/finance/retainers/page.tsx`                | List page with summary stats (active count, MRR, total) and sortable table.                                                                        |
| `app/(chef)/finance/retainers/new/page.tsx`            | Create page with client dropdown and form.                                                                                                         |
| `app/(chef)/finance/retainers/[id]/page.tsx`           | Detail page with agreement info, action buttons, billing timeline, and linked events.                                                              |
| `app/(chef)/finance/retainers/[id]/detail-actions.tsx` | Client component with status transition buttons (activate, pause, resume, cancel, complete).                                                       |

### Modified Files

| File                                   | Change                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `components/navigation/nav-config.tsx` | Added `/finance/retainers` entry in the Finance section (visibility: advanced). |
| `app/(chef)/finance/page.tsx`          | Added Retainers card to the SECTIONS array on the finance hub page.             |

## Architecture Decisions

### Retainer Lifecycle (5-state FSM)

```
draft --> active --> paused --> active (resume)
                 --> completed (terminal)
  *   --> cancelled (terminal, from any non-terminal state)
```

- **draft**: Created but not yet billing. Editable.
- **active**: Billing periods are generated. Events can be linked.
- **paused**: Billing suspended. Resume recalculates next_billing_date from today.
- **completed**: Active retainer marked done. Terminal.
- **cancelled**: All pending periods voided. Terminal.

### Ledger Integration

Retainer payments flow through the existing immutable ledger via `entry_type: 'retainer'` (enum value added by migration `20260322000028`). The `recordRetainerPayment` action:

1. Verifies the period is pending/overdue
2. Inserts a ledger entry using admin client (same pattern as offline-payment-actions)
3. Updates the period to `paid` with `paid_at` timestamp and `ledger_entry_id` reference
4. Logs chef activity (non-blocking)

### Event Linking

Events can be linked to retainers via `linkEventToRetainer` / `unlinkEventFromRetainer`. When linked:

- `events.retainer_id` points to the retainer
- `events.retainer_period_id` points to the current active period
- `retainer_periods.events_used` is incremented/decremented

### Tenant Scoping

All queries are scoped by `tenant_id = user.tenantId!` (derived from session, never from request body). RLS policies on both `retainers` and `retainer_periods` tables enforce this at the database level.

### Pattern Compliance

- All monetary amounts stored in cents (integer)
- `requireChef()` at the top of every server action
- Non-blocking side effects (activity logging) wrapped in try/catch
- Button variants: primary, secondary, danger, ghost only
- Badge variants: default, success, warning, error, info only
- `(supabase as any)` for tables not yet in generated types
- `'retainer' as any` for the new ledger entry type not yet in generated types

## Database Schema (from migration 20260322000028)

### retainers table

- Stores the agreement terms: name, client, billing cycle, amount, inclusions, date range
- Status CHECK constraint: draft, active, paused, cancelled, completed
- FK to chefs (tenant_id) and clients (client_id)

### retainer_periods table

- Individual billing periods within a retainer
- Status CHECK constraint: pending, paid, overdue, void
- Tracks events_used, hours_used, payment info
- FK to retainers and chefs

### events table additions

- `retainer_id` (nullable FK to retainers)
- `retainer_period_id` (nullable FK to retainer_periods)

### clients table addition

- `stripe_customer_id` (nullable text, for future Stripe subscription integration)

## Navigation

- Finance section in nav-config: `/finance/retainers` (advanced visibility)
- Finance hub page: Retainers card with description

## Future Considerations

- Automatic period generation via cron job when `next_billing_date` is reached
- Stripe subscription integration using `stripe_subscription_id` and `stripe_price_id` columns
- Overdue period detection and notification system
- Edit page at `/finance/retainers/[id]/edit` (edit button exists in detail-actions but page not yet created)
- Client portal view of retainer agreements and billing history
