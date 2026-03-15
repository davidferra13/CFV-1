# Cancellation Policy Enforcement

## What Changed

Added a tiered cancellation fee system that lets chefs define how much of a client's payment is refunded based on how far in advance they cancel.

## Components

### Database: `cancellation_policies` table

- Per-chef policy with customizable tiers stored as JSONB
- Default tiers: 30+ days (100% refund), 14-29 days (50% refund), <14 days (0% refund)
- Grace period: 48 hours after booking = full refund regardless of tier
- Unique index ensures only one default policy per chef
- Full RLS (chef-scoped CRUD)

### Server Actions: `lib/events/cancellation-actions.ts`

- `getCancellationPolicy(policyId?)` - fetches default or specific policy, auto-creates default if none exists
- `updateCancellationPolicy(policyId, data)` - validates and saves tier changes
- `calculateCancellationFee(eventId)` - computes refund/fee from ledger data + policy tiers
- `getEventCancellationPreview(eventId)` - full preview for the confirmation dialog
- `getCancellationHistory()` - all cancelled events with fee breakdown

Fee calculation reads `totalPaidCents` from the `event_financial_summary` ledger view (no stored balances). Grace period check compares hours since `events.created_at` against `grace_period_hours`.

### UI: `components/events/cancellation-dialog.tsx`

- Confirmation dialog shown before cancelling an event
- Displays: days until event, applicable tier, refund amount, fee retained
- Requires "I understand" checkbox before proceeding
- Props: `eventId`, `open`, `onClose`, `onConfirm`

### UI: `components/settings/cancellation-policy-editor.tsx`

- Edit policy name, tiers (add/remove/modify), grace period, notes
- Plain English preview showing how the policy reads to clients
- Validates before save (at least one tier, refund 0-100%, grace period 0-720h)

## Integration Points

- The cancellation dialog should be triggered from the event detail page when a chef initiates cancellation (wherever `transitionEvent` is called with `toStatus: 'cancelled'`)
- The policy editor should be added to the settings page
- Future work: automatically create refund ledger entries when cancellation is confirmed

## Architecture Notes

- Uses `chef_id` (not `tenant_id`) per the convention for feature tables
- Financial data derived from ledger (never stored), per project rules
- All server actions use `requireChef()` for auth, `user.tenantId!` for scoping
- All amounts in cents (integers)
