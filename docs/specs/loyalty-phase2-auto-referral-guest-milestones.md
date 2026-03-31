# Spec: Loyalty Phase 2 - Auto Referral Points and Guest Milestones

> **Status:** verified
> **Priority:** P2 (queued)
> **Depends on:** loyalty-phase1-visibility-and-perks.md
> **Estimated complexity:** medium (3-8 files)
> **Created:** 2026-03-29
> **Built by:** 2026-03-29 session (needs migration applied + visual verification)

---

## What This Does (Plain English)

Two high-impact domino triggers that make the loyalty system self-reinforcing:

1. **Automatic referral points** - When a referred client completes their first event, the referrer automatically earns the configured referral bonus (default 100 pts). Currently this is manual only. The database tables (`client_referrals.reward_points_awarded`, `client_referrals.reward_awarded_at`) already exist but are never populated.

2. **Guest-count milestones** - In addition to event-count milestones (e.g., "5th dinner = 50 bonus pts"), chefs can set cumulative guest milestones (e.g., "every 10 guests served = 200 bonus pts"). `clients.total_guests_served` already exists and is updated on every event completion. This creates the "one more dinner and I hit my milestone" domino the developer described.

---

## Why It Matters

Referrals are the highest-value client action (a new client is worth 10x a repeat visit). Making referral rewards automatic removes friction and turns every happy client into a recruiter. Guest milestones create anticipation: "If we book one more time, we hit 10 guests and get 50% off." This drives bookings.

---

## Current State (Verified)

### Referral System

- `client_referrals` table exists with `referrer_client_id`, `referred_client_id`, `converted_event_id`, `reward_points_awarded` (default 0), `reward_awarded_at` (nullable) - from `database/migrations/20260330000089_client_referral_codes.sql`
- `clients.referred_by_client_id` exists - from `database/migrations/20260330000072_client_referral_tracking.sql`
- `client_referrals.status` workflow (pending/contacted/booked/completed) exists - from `database/migrations/20260401000014_referral_tracking.sql`
- `lib/clients/referral-actions.ts` has `updateReferralStatus(id, status)` at L106 that updates status but **never awards points**
- `loyalty_config.referral_points` (default 100) exists but is labeled "reference value for manual awards"
- `awardBonusPoints(clientId, points, description)` in `lib/loyalty/actions.ts` L870 handles manual bonuses and properly updates balance + tier

### Guest Tracking

- `clients.total_guests_served` exists (updated in `awardEventPoints` at actions.ts L648-670)
- `loyalty_config.milestone_bonuses` is JSONB `[{events, bonus}]` - tracks event-count milestones only
- `awardEventPoints` (actions.ts L604-629) checks event milestones but has no guest milestone logic

---

## Files to Modify

| File                                                    | What to Change                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/loyalty/actions.ts`                                | Create `_awardBonusPointsInternal(tenantId, clientId, points, description, createdBy)` (no auth). Add `guest_milestones` to `LoyaltyConfig` type, `UpdateLoyaltyConfigSchema`, `getLoyaltyConfig`, `getMyLoyaltyStatus`. Add guest milestone logic to `awardEventPoints` after L633. Add guest milestone logic to `backfillLoyaltyForHistoricalImports` after L1719. |
| `lib/clients/referral-actions.ts`                       | In `updateReferralStatus()`: SELECT referral row first for idempotency check (`reward_points_awarded > 0`). When status = 'completed' and not yet awarded: look up loyalty config, call `_awardBonusPointsInternal`, UPDATE `reward_points_awarded` and `reward_awarded_at`. Wrap in try/catch (non-blocking).                                                       |
| `app/(chef)/loyalty/settings/loyalty-settings-form.tsx` | Add guest milestone editor (parallel to existing event milestone editor)                                                                                                                                                                                                                                                                                             |
| `components/loyalty/how-to-earn-panel.tsx`              | Add `guest_milestones` to Props Pick type. Update referral row to show automatic bonus with actual point value. Add guest milestone rows.                                                                                                                                                                                                                            |

---

## Database Changes

### New Columns on Existing Tables

```sql
-- Guest-count milestone configuration (parallel to event-count milestone_bonuses)
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS guest_milestones jsonb DEFAULT '[]';

-- Example value: [{"guests": 10, "bonus": 200}, {"guests": 50, "bonus": 500}]
-- Meaning: at 10 cumulative guests served, earn 200 bonus pts. At 50, earn 500.
```

### Migration Notes

- Filename must be checked against existing files (next after 20260401000123)
- Purely additive: one JSONB column with empty array default
- No guest tracking columns needed: `clients.total_guests_served` already exists

---

## Server Action Changes

### Internal Helper (in `actions.ts`)

Create `_awardBonusPointsInternal(tenantId: string, clientId: string, points: number, description: string, createdBy: string)` that:

- Skips auth (caller is already authenticated)
- Accepts tenantId directly instead of deriving from session
- Inserts `loyalty_transactions` row (type: 'bonus')
- Updates client balance and recalculates tier
- Returns `{ success, newBalance, newTier }`
- NOT exported (internal only, prefixed with underscore)

The public `awardBonusPoints` should be refactored to call this internal helper after its own `requireChef()` check.

### Auto Referral Points (in `referral-actions.ts`)

When `updateReferralStatus(id, 'completed')` is called:

1. **SELECT the referral row first** (`SELECT reward_points_awarded, referrer_client_id FROM client_referrals WHERE id = $1 AND tenant_id = $2`)
2. Check `reward_points_awarded > 0` - if already awarded, skip (idempotency guard)
3. Look up `loyalty_config` for the tenant: `SELECT referral_points, is_active, program_mode FROM loyalty_config WHERE tenant_id = $1`
4. If program is active (not 'off') and `referral_points > 0`, call `_awardBonusPointsInternal(tenantId, referrerClientId, referralPoints, 'Referral bonus: [referred client name] completed their first event', userId)`
5. UPDATE `client_referrals SET reward_points_awarded = referralPoints, reward_awarded_at = now() WHERE id = $1 AND reward_points_awarded = 0` (CAS guard in UPDATE as second layer of idempotency)
6. **Non-blocking**: wrap steps 1-5 in try/catch, log errors, never block the status update

### Guest Milestones (in `awardEventPoints`)

After the existing event milestone logic (actions.ts L624-633):

1. Read `config.guest_milestones` (JSONB array of `{guests: number, bonus: number}`)
2. `oldGuestsServed` = `client.total_guests_served` (already fetched at L602)
3. `newGuestsServed` = `oldGuestsServed + guestCount` (already computed at L654)
4. For each milestone: `if (oldGuestsServed < milestone.guests && newGuestsServed >= milestone.guests)` - award bonus. **Do NOT use `===` like event milestones.** The range check handles clients who jump past multiple milestones in one event.
5. Push bonus transactions to the `transactions` array (same pattern as event milestones at L627-632)

### Guest Milestones in Backfill (in `backfillLoyaltyForHistoricalImports`)

After the event milestone logic (actions.ts L1704-1719):

1. Read `config.guest_milestones`
2. Track `oldGuestsServed` before this event's guests are added
3. Compute `newGuestsServed` = `oldGuestsServed + guestCount`
4. For each milestone: same range check as above
5. Insert bonus transactions with "(historical import)" suffix

---

## Edge Cases and Error Handling

| Scenario                                                                    | Correct Behavior                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------- |
| Same referral marked 'completed' twice                                      | `reward_points_awarded > 0` guard prevents double-award |
| Referrer's loyalty program is off                                           | Skip awarding, still update referral status             |
| Client serves exactly the milestone number                                  | Award triggers (use `<=` comparison)                    |
| Backfill processes historical events                                        | Guest milestones should fire during backfill too        |
| Guest milestone at 10 and 20, client jumps from 8 to 22 guests in one event | Both milestones trigger                                 |

---

## Out of Scope

- RSVP-based points (needs RSVP update function traced, separate spec)
- Dinner Circle / Open Tables integration (needs consent model understood, separate spec)
- Post-event engagement points (needs review/photo features verified, separate spec)
- Featured Offer / Deal of the Month (separate spec)
- Email notifications for approaching milestones (separate spec, can layer on after)

---

## Notes for Builder Agent

- **Do NOT call `awardBonusPoints` directly for auto-referral.** It calls `requireChef()` internally, creating redundant auth. Create `_awardBonusPointsInternal` and have both `awardBonusPoints` and the referral logic use it.
- The `client_referrals` table has its own `reward_points_awarded` and `reward_awarded_at` columns specifically designed for this. Don't create new tracking mechanisms.
- `total_guests_served` is already fetched at L602 (`client.total_guests_served`) and the new value computed at L654. Guest milestone checks go between these two points (after L633, before L636).
- **Do NOT copy the event milestone `===` pattern for guest milestones.** Event milestones use exact match (`currentEventsCompleted === milestone.events` at L625). Guest milestones need range check (`oldGuestsServed < milestone.guests && newGuestsServed >= milestone.guests`) because a single event can add many guests.
- `backfillLoyaltyForHistoricalImports` (L1550-1798) tracks `runningGuestsServed` at L1676. Guest milestone logic goes after the event milestone block at L1719, using the same range-check pattern.
- Add `guest_milestones` to the `how-to-earn-panel.tsx` Props Pick type (L9-16) or TypeScript will error.
