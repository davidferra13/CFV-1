# Loyalty System Generalization

**Date:** 2026-02-27
**Branch:** `feature/risk-gap-closure`

## What Changed

The loyalty system was originally built for a single chef. This update makes it universal for all chefs on the platform by adding **program modes** and **earn modes**.

### Program Modes

| Mode               | What It Does                                                                      |
| ------------------ | --------------------------------------------------------------------------------- |
| **Full** (default) | Points + tiers + redeemable rewards. The complete experience.                     |
| **Lite**           | Tier badges based on visit count. No points or rewards catalog. Recognition only. |
| **Off**            | Disabled. Hidden from clients.                                                    |

### Earn Modes (Full mode only)

| Mode                    | How Points Are Calculated                   | Example                    |
| ----------------------- | ------------------------------------------- | -------------------------- |
| **Per Guest** (default) | `guest_count x points_per_guest`            | 8 guests x 10 pts = 80 pts |
| **Per Dollar**          | `event_total x points_per_dollar`           | $2,000 x 1.0 = 2,000 pts   |
| **Per Event**           | flat `points_per_event` per completed event | 100 pts per event          |

### Manual Chef Control

Chefs always have full manual control regardless of mode:

- **Award bonus points** to any client at any time (`awardBonusPoints()`)
- **Adjust tier thresholds** and all config at any time via settings
- **Create/edit rewards** in the catalog
- **Switch modes** at any time — existing data is preserved
- **Toggle the program** on/off without losing any client data

## Database Migration

**File:** `supabase/migrations/20260328000010_loyalty_program_modes.sql`

Added 4 columns to `loyalty_config`:

- `program_mode` (text, default 'full') — full/lite/off
- `earn_mode` (text, default 'per_guest') — per_guest/per_dollar/per_event
- `points_per_dollar` (numeric, default 1.0)
- `points_per_event` (integer, default 100)

**Fully additive. Zero data loss. All defaults match current behavior.**

## Files Modified

| File                                                           | Change                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `supabase/migrations/20260328000010_loyalty_program_modes.sql` | New migration                                                                         |
| `lib/loyalty/actions.ts`                                       | Types, schemas, earn mode branching, `awardLiteVisit()`, `getLoyaltyConfigByTenant()` |
| `lib/events/transitions.ts`                                    | `completeEvent()` branches on program_mode                                            |
| `app/(chef)/loyalty/settings/loyalty-settings-form.tsx`        | Mode/earn selectors, conditional fields                                               |
| `app/(chef)/loyalty/page.tsx`                                  | Dashboard gates content by mode                                                       |
| `app/(client)/my-rewards/page.tsx`                             | Client page gates by program_mode                                                     |
| `components/loyalty/how-to-earn-panel.tsx`                     | Earn description adapts to earn_mode                                                  |

## Key Functions Added

- `getLoyaltyConfigByTenant(tenantId)` — Get config without `requireChef()` (for internal use by transitions)
- `awardLiteVisit(eventId)` — Lite mode: increment visit count + update tier, no points

## Backwards Compatibility

- Every existing chef defaults to `program_mode = 'full'` + `earn_mode = 'per_guest'`
- All existing client data (points, tiers, transactions) is preserved exactly
- The ledger, reward catalog, and redemption flow are untouched
- `is_active` toggle still works (program_mode = 'off' is equivalent)

## Future Work (TODO)

- **Hardwire loyalty to the rest of the website** — Ensure loyalty status/tiers surface in: client profiles, event detail pages, notifications, Remy AI context, invoice generation, email templates. Goal: maximum automation, minimum manual work.
- **Points expiration cron** — Optional scheduled job to expire old points
- **Setup wizard** — Guided onboarding for new chefs choosing their loyalty mode
