# Loyalty Phase 2: Auto Referral Points and Guest Milestones

> **Date:** 2026-03-29
> **Spec:** `docs/specs/loyalty-phase2-auto-referral-guest-milestones.md`

## What Changed

### 2A. Automatic Referral Points

**Files:**

- `lib/loyalty/award-internal.ts` (new)
- `lib/clients/referral-actions.ts` (modified)
- `lib/loyalty/actions.ts` (modified)

When a chef marks a referral as "completed" in the referral panel, the referrer now automatically receives the configured referral bonus points. Previously this was manual only; the `reward_points_awarded` and `reward_awarded_at` columns existed but were never populated.

The auto-award logic:

- Checks idempotency (skips if points were already awarded)
- Looks up the loyalty config to get the referral point value
- Only awards if the loyalty program is active (not 'off')
- Uses a CAS guard (`WHERE reward_points_awarded = 0`) as a second layer of protection
- Is fully non-blocking: wrapped in try/catch so a failed award never blocks the status update

A new internal helper (`lib/loyalty/award-internal.ts`) was created to handle point awarding without requiring `requireChef()` auth. This file is NOT a `'use server'` module, preventing direct client invocation. The public `awardBonusPoints` in `actions.ts` now delegates to this helper.

### 2B. Guest-Count Milestones

**Files:**

- `database/migrations/20260401000124_loyalty_guest_milestones.sql` (new)
- `lib/loyalty/actions.ts` (modified: type, schema, `awardEventPoints`, `getLoyaltyConfig`, `getMyLoyaltyStatus`, backfill)
- `app/(chef)/loyalty/settings/loyalty-settings-form.tsx` (modified: guest milestone editor)
- `components/loyalty/how-to-earn-panel.tsx` (modified: guest milestone rows)
- `app/(client)/my-rewards/page.tsx` (modified: config query + panel props)

Chefs can now set cumulative guest-count milestones (e.g., "at 50 total guests served, earn 200 bonus pts"). This is parallel to the existing event-count milestones but uses a range check instead of exact match, since a single event can add many guests at once.

Key design decisions:

- **Range check, not exact match.** Event milestones use `===` (one event at a time). Guest milestones use `oldTotal < threshold && newTotal >= threshold` so that a client who jumps from 8 to 22 guests in one event correctly triggers both the 10-guest and 20-guest milestones.
- **Backfill support included.** The `backfillLoyaltyForHistoricalImports` function now also checks guest milestones, so existing clients get properly credited when the chef enables this feature.
- **Settings UI is parallel to event milestones.** Same add/remove pattern, same section structure.

### 2C. How-to-Earn Panel Updates

The client-facing "How to Earn Points" panel now:

- Shows the actual referral point value instead of "varies" and describes it as automatic
- Displays guest milestone rows alongside event milestones

## Migration Required

Run migration `20260401000124_loyalty_guest_milestones.sql` to add the `guest_milestones` column to `loyalty_config`. Purely additive (one JSONB column, defaults to `[]`).

Both Phase 1 (`20260401000123`) and Phase 2 (`20260401000124`) migrations need to be applied.

## Files Summary

| File                                                              | Change                                                                                                                                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `database/migrations/20260401000124_loyalty_guest_milestones.sql` | New: adds `guest_milestones` JSONB column                                                                                                                                                         |
| `lib/loyalty/award-internal.ts`                                   | New: internal helper for awarding bonus points without auth                                                                                                                                       |
| `lib/loyalty/actions.ts`                                          | Modified: type, schema, awardEventPoints (guest milestones), backfill (guest milestones), getLoyaltyConfig + getMyLoyaltyStatus (return guest_milestones), awardBonusPoints (delegates to helper) |
| `lib/clients/referral-actions.ts`                                 | Modified: auto-award referral points in updateReferralStatus                                                                                                                                      |
| `app/(chef)/loyalty/settings/loyalty-settings-form.tsx`           | Modified: guest milestone editor section + referral hint text                                                                                                                                     |
| `components/loyalty/how-to-earn-panel.tsx`                        | Modified: guest milestone rows + automatic referral text                                                                                                                                          |
| `app/(client)/my-rewards/page.tsx`                                | Modified: config query includes guest_milestones + referral_points, passed to HowToEarnPanel                                                                                                      |

## Next Steps

- **Apply migrations** (`20260401000123` and `20260401000124`)
- **Visual verification** of both Phase 1 and Phase 2 changes
- **Phase 3** (not yet specced): RSVP points, Dinner Circle integration, Featured Offers, post-event engagement
