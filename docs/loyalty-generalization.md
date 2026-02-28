# Loyalty System Generalization

**Date:** 2026-02-27  
**Branch:** `feature/risk-gap-closure`

## What Changed

The loyalty system was originally built for a single chef. This update makes it universal for all chefs by adding program modes and earn modes.

### Program Modes

| Mode               | What It Does                                                    |
| ------------------ | --------------------------------------------------------------- |
| **Full** (default) | Points + tiers + redeemable rewards.                            |
| **Lite**           | Tier badges based on visit count. No points or rewards catalog. |
| **Off**            | Disabled and hidden from clients.                               |

### Earn Modes (Full mode only)

| Mode                    | How Points Are Calculated                   | Example                    |
| ----------------------- | ------------------------------------------- | -------------------------- |
| **Per Guest** (default) | `guest_count x points_per_guest`            | 8 guests x 10 pts = 80 pts |
| **Per Dollar**          | `event_total x points_per_dollar`           | $2,000 x 1.0 = 2,000 pts   |
| **Per Event**           | Flat `points_per_event` per completed event | 100 pts per event          |

### Manual Chef Control

Chefs always have full manual control regardless of mode:

- Award bonus points to any client at any time (`awardBonusPoints()`).
- Adjust tier thresholds and config at any time.
- Create and edit rewards in the catalog.
- Switch modes at any time with data preserved.
- Toggle program on and off with no data loss.

## Database Migration

**File:** `supabase/migrations/20260328000010_loyalty_program_modes.sql`

Added 4 columns to `loyalty_config`:

- `program_mode` (text, default `full`) for `full | lite | off`
- `earn_mode` (text, default `per_guest`) for `per_guest | per_dollar | per_event`
- `points_per_dollar` (numeric, default `1.0`)
- `points_per_event` (integer, default `100`)

Fully additive, zero data loss, defaults match current behavior.

## Files Modified

| File                                                           | Change                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `supabase/migrations/20260328000010_loyalty_program_modes.sql` | New migration                                                                         |
| `lib/loyalty/actions.ts`                                       | Types, schemas, earn mode branching, `awardLiteVisit()`, `getLoyaltyConfigByTenant()` |
| `lib/events/transitions.ts`                                    | `completeEvent()` branches on `program_mode`                                          |
| `app/(chef)/loyalty/settings/loyalty-settings-form.tsx`        | Mode and earn selectors, conditional fields                                           |
| `app/(chef)/loyalty/page.tsx`                                  | Dashboard gates content by mode                                                       |
| `app/(client)/my-rewards/page.tsx`                             | Client page gates by mode                                                             |
| `components/loyalty/how-to-earn-panel.tsx`                     | Earn description adapts to `earn_mode`                                                |

## Key Functions Added

- `getLoyaltyConfigByTenant(tenantId)` for internal system access without `requireChef()`.
- `awardLiteVisit(eventId)` for lite mode visit increments and tier updates.

## Backwards Compatibility

- Existing chefs default to `program_mode = 'full'` and `earn_mode = 'per_guest'`.
- Existing points, tiers, and transactions are preserved.
- Ledger, reward catalog, and redemption flow are unchanged.
- `is_active = false` and `program_mode = 'off'` both behave as disabled.

## Terminology for Build Docs

Use this vocabulary in product and engineering docs:

- Preferred: first-class, cross-cutting platform capability.
- Preferred: event-driven automation.
- Preferred: system-wide propagation.
- Preferred: contextual surfacing.
- Legacy shorthand: "hardwire loyalty".

Definition: "Hardwire loyalty" means loyalty is no longer an isolated module. It becomes native behavior across core workflows and screens.

## Integration Contract (Hardwire Scope)

### 1. Shared loyalty context (single source of truth)

The following client-level fields are treated as shared context and surfaced consistently:

- `clients.loyalty_tier`
- `clients.loyalty_points` (redeemable balance)
- `clients.total_events_completed` (visit count)
- Derived values from `loyalty_transactions` (lifetime earned, progress to next tier)

### 2. Event-driven triggers

These system events must update loyalty state automatically and idempotently:

- Event completed -> award points or lite visit recognition.
- Reward redeemed -> deduct points and append immutable transaction.
- Tier crossed -> emit tier change notification.
- Bonus or adjustment applied -> append transaction and refresh projections.

### 3. Required surface propagation

Loyalty context should appear in:

- Client profile views (tier, balance, visit count, progress).
- Event detail views (client tier and points impact).
- Invoice and quote generation (eligible reward and tier callout).
- Notification system (points earned, tier changes, redemption milestones).
- Remy context loaders (chef-side and client-side prompts include loyalty summary).
- Email templates (earned points, next-tier progress, reward availability).

### 4. Reliability guardrails

- Idempotency for points awards on event completion (`events.loyalty_points_awarded`).
- Immutable loyalty ledger (`loyalty_transactions`).
- Clear audit trail for manual adjustments and reward redemptions.
- Deterministic tier computation from lifetime earned points.
- Revalidation for all affected chef and client routes after mutations.

### 5. Rollout strategy

- Feature flag rollout per tenant to reduce blast radius.
- Backfill job for historical completed events where loyalty records are missing.
- Observability on mismatches: profile tier vs computed tier, balance drift, duplicate awards.

## Definition of Done for "Hardwired"

Loyalty is considered hardwired when all of the following are true:

1. Loyalty state updates automatically from core lifecycle events without manual lookup.
2. Loyalty status is visible in every operationally relevant workflow.
3. Remy can reference accurate loyalty context for the active client.
4. Invoices, quotes, and client emails can embed loyalty context deterministically.
5. Idempotency, auditability, and route revalidation are verified by tests.

## Next Build Items

- Points expiration cron (optional policy-driven expiry).
- New-chef setup wizard for mode selection and default reward seeding.
