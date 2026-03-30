# Spec: Loyalty Phase 3 - SSE Broadcasts, Hybrid Earn Mode, Setup Presets, Reward Templates, Milestone Progress

> **Status:** built
> **Priority:** P1 (next up)
> **Depends on:** loyalty-phase2-auto-referral-guest-milestones.md
> **Estimated complexity:** medium (7 files)
> **Created:** 2026-03-29
> **Built by:** 2026-03-29 session

---

## What This Does (Plain English)

Five targeted improvements that make the loyalty system feel alive and fair:

1. **SSE real-time broadcasts** - When points are awarded or redeemed, the client and chef get instant live updates via Server-Sent Events (same system used for messaging). No more "refresh to see your points."
2. **Hybrid earn mode** - A new earn mode that combines a flat base per event with a per-guest or per-dollar modifier. Solves the fairness problem where per_guest punishes intimate dinners and per_dollar punishes budget-conscious clients.
3. **Quick setup presets** - Three one-click preset profiles ("Private Dining," "Catering," "Balanced") on the settings form that pre-fill all 15+ config fields. No backend changes, purely UI.
4. **Expanded reward templates** - 8 additional default rewards covering experience-based options (cooking class, wine pairing, priority booking, custom menu consultation) that cost the chef zero money.
5. **Client milestone progress** - On the My Rewards page, clients see how close they are to their next event milestone and guest milestone. "2 more events until your 10th dinner bonus (50 pts)."

---

## Why It Matters

SSE makes points feel instant instead of stale. Hybrid earn mode ensures fairness regardless of party size or budget. Presets reduce setup friction from 10 minutes to 10 seconds. More reward templates give chefs a richer catalog out of the box. Milestone progress creates the "one more dinner" domino effect that drives repeat bookings.

---

## Files to Create

None. All changes are modifications to existing files.

---

## Files to Modify

| File                                                    | What to Change                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/loyalty/actions.ts`                                | Add `broadcastInsert` calls after point award/redemption. Add `'hybrid'` to `EarnMode` type and `UpdateLoyaltyConfigSchema`. Add hybrid earn logic to `awardEventPoints`. Add `base_points_per_event` to `LoyaltyConfig` type. Expand `DEFAULT_REWARDS` array. Add milestone progress data to `getMyLoyaltyStatus` return. |
| `app/(chef)/loyalty/settings/loyalty-settings-form.tsx` | Add hybrid earn mode option. Add `basePointsPerEvent` state for hybrid mode. Add quick setup presets UI (3 buttons at top of form).                                                                                                                                                                                        |
| `components/loyalty/how-to-earn-panel.tsx`              | Add hybrid earn mode display row.                                                                                                                                                                                                                                                                                          |
| `app/(client)/my-rewards/page.tsx`                      | Add milestone progress section showing distance to next event + guest milestones. Query `milestone_bonuses` in config select.                                                                                                                                                                                              |

---

## Database Changes

### New Columns on Existing Tables

```sql
-- Hybrid earn mode: base points per event (used alongside per_guest or per_dollar modifier)
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS base_points_per_event integer DEFAULT 0;
```

### Migration Notes

- Next available timestamp after `20260401000132`: use `20260401000133`
- Purely additive: one integer column with zero default (backward compatible - zero means no base points, which is the current behavior for non-hybrid modes)

---

## Data Model

The hybrid earn mode works by adding two components:

- `base_points_per_event` (new column): flat points awarded per event regardless of size/cost
- Existing `points_per_guest` or `points_per_dollar`: the variable component

When `earn_mode = 'hybrid'`:

- Total = `base_points_per_event` + (`points_per_guest` _ guest_count) OR (`points_per_dollar` _ event_total_cents / 100)
- The chef configures which modifier to pair with the base (per_guest or per_dollar) via a sub-selector

To keep this simple and avoid a second column, the hybrid modifier uses the existing `points_per_guest` field. If a chef wants per_dollar hybrid, they switch earn_mode to `per_dollar` and set `base_points_per_event > 0`. The UI exposes this as "hybrid" but the backend simply checks: if `base_points_per_event > 0`, add it to whatever the earn mode calculates.

**This means no new `earn_mode` value is needed.** The hybrid is controlled purely by `base_points_per_event > 0`. This is the simplest possible design - zero new enum values, zero migration for earn_mode, just one additive integer column.

---

## Server Action Changes

### SSE Broadcasts (in `awardEventPoints`, `awardBonusPoints`, `redeemReward`)

After each successful point mutation, add:

```typescript
import { broadcastInsert, broadcastUpdate } from '@/lib/realtime/broadcast'

// After point award:
broadcastUpdate('loyalty', tenantId, {
  clientId,
  type: 'points_awarded',
  points: totalPoints,
  newBalance,
  newTier,
})

// After redemption:
broadcastUpdate('loyalty', tenantId, {
  clientId,
  type: 'reward_redeemed',
  rewardName: reward.name,
  pointsSpent: reward.points_required,
  newBalance,
})
```

### Base Points Per Event (in `awardEventPoints`)

Before the earn mode switch statement (L560), add:

```typescript
// Base points per event (hybrid mode: adds flat base to any earn mode)
const basePerEvent = config.base_points_per_event || 0
if (basePerEvent > 0) {
  totalPoints += basePerEvent
  transactions.push({
    type: 'earned',
    points: basePerEvent,
    description: `Base event bonus: ${basePerEvent} pts`,
  })
}
```

**Wait - this needs to go AFTER the switch statement, not before.** The `totalPoints` and `transactions` array are initialized inside the switch. Move it after L598 (after base points transaction is pushed).

Actually, looking more carefully at the code: `totalPoints` is initialized at L590 from `basePoints` which is computed in the switch. The base-per-event should be added right after L598:

```typescript
// After line 598 (after base earn transaction is pushed):
const basePerEvent = config.base_points_per_event || 0
if (basePerEvent > 0) {
  totalPoints += basePerEvent
  transactions.push({
    type: 'earned',
    points: basePerEvent,
    description: `Base event bonus: ${basePerEvent} pts`,
  })
}
```

### Milestone Progress (in `getMyLoyaltyStatus`)

Add to the config query select: `milestone_bonuses, tier_silver_min, tier_gold_min, tier_platinum_min, base_points_per_event`

Add to return object:

```typescript
milestoneProgress: {
  nextEventMilestone: /* closest event milestone the client hasn't reached */,
  nextGuestMilestone: /* closest guest milestone the client hasn't reached */,
}
```

### Expanded Default Rewards

Add these to `DEFAULT_REWARDS` array (L199-245):

```typescript
{ name: 'Priority booking for next available date', points_required: 75, reward_type: 'upgrade', description: 'Jump to the front of the booking queue' },
{ name: 'Custom menu consultation', points_required: 125, reward_type: 'upgrade', description: 'One-on-one menu planning session with your chef' },
{ name: 'Wine pairing upgrade', points_required: 100, reward_type: 'upgrade', description: 'Expert wine pairing added to your next dinner' },
{ name: 'Behind-the-scenes cooking demo', points_required: 175, reward_type: 'upgrade', description: 'Watch your chef prepare your meal with live commentary' },
{ name: 'Recipe card collection', points_required: 60, reward_type: 'upgrade', description: 'Printed recipe cards from your favorite dishes' },
{ name: '$50 off your next dinner', points_required: 175, reward_type: 'discount_fixed', reward_value_cents: 5000, description: '$50 discount on your next booking' },
{ name: '25% off a dinner party', points_required: 200, reward_type: 'discount_percent', reward_percent: 25, description: '25% off any dinner party of 6+ guests' },
{ name: 'Complimentary amuse-bouche course', points_required: 40, reward_type: 'free_course', description: 'A surprise bite to start your next dinner' },
```

---

## UI / Component Spec

### Quick Setup Presets (loyalty-settings-form.tsx)

Three buttons at the top of the form, above the program mode selector:

```
Quick Setup: [Private Dining] [Catering] [Balanced]
```

Each button pre-fills all form fields:

**Private Dining** (intimate dinners, 2-8 guests):

- earn_mode: per_guest, points_per_guest: 15, base_points_per_event: 25
- welcome_points: 50, referral_points: 150
- milestones: [{events: 5, bonus: 50}, {events: 10, bonus: 100}, {events: 25, bonus: 300}]
- guest_milestones: [{guests: 25, bonus: 100}, {guests: 50, bonus: 250}]
- tier thresholds: silver 150, gold 400, platinum 800
- large_party_threshold: 8, large_party_points: 25

**Catering** (large events, 20-200 guests):

- earn_mode: per_event, points_per_event: 100, base_points_per_event: 0
- welcome_points: 25, referral_points: 200
- milestones: [{events: 3, bonus: 75}, {events: 10, bonus: 200}]
- guest_milestones: [{guests: 100, bonus: 150}, {guests: 500, bonus: 500}]
- tier thresholds: silver 200, gold 500, platinum 1000
- large_party_threshold: 50, large_party_points: 50

**Balanced** (mix of event types):

- earn_mode: per_guest, points_per_guest: 10, base_points_per_event: 50
- welcome_points: 25, referral_points: 100
- milestones: [{events: 5, bonus: 50}, {events: 10, bonus: 100}]
- guest_milestones: [{guests: 20, bonus: 75}, {guests: 50, bonus: 200}]
- tier thresholds: silver 100, gold 250, platinum 500
- large_party_threshold: 10, large_party_points: 30

Clicking a preset fills all fields but does NOT auto-save. The chef reviews and clicks Save.

### Hybrid Earn Mode Display (how-to-earn-panel.tsx)

When `base_points_per_event > 0` and earn_mode is per_guest or per_dollar, show an additional row:

```
📅 Base event bonus: +{base_points_per_event} pts every time you complete a dinner
```

This appears before the per_guest or per_dollar row.

### Milestone Progress (my-rewards/page.tsx)

New section between the tier progress card and the rewards catalog:

```
Upcoming Milestones
┌─────────────────────────────────────────┐
│ 🏆 3 more events until your 10th       │
│    dinner bonus (+100 pts)              │
│ 👥 8 more guests until your 50-guest   │
│    milestone (+200 pts)                 │
└─────────────────────────────────────────┘
```

Only show milestones the client hasn't reached yet. If no upcoming milestones, hide this section entirely.

---

## Edge Cases and Error Handling

| Scenario                                | Correct Behavior                                                 |
| --------------------------------------- | ---------------------------------------------------------------- |
| base_points_per_event is 0 (default)    | No base event bonus row, behavior identical to current           |
| Chef clicks preset then modifies values | Modified values are used (preset is just a starting point)       |
| Client has passed all milestones        | Milestone progress section hidden entirely                       |
| SSE broadcast fails                     | Non-blocking, wrapped in try/catch, never blocks the point award |
| No loyalty config exists (new tenant)   | Presets create the config on first save (existing behavior)      |
| Client jumps past multiple milestones   | Already handled by Phase 2 range check                           |

---

## Verification Steps

1. Sign in as chef with agent account
2. Navigate to `/loyalty/settings`
3. Verify three preset buttons appear at the top
4. Click "Balanced" preset, verify all fields populate
5. Set `base_points_per_event` to 50, save
6. Navigate to My Rewards as client (or check client-facing page)
7. Verify "Base event bonus" row appears in How to Earn panel
8. Verify milestone progress section shows upcoming milestones
9. Award points to a client via event completion
10. Check browser console or SSE endpoint for broadcast message
11. Screenshot all changes

---

## Out of Scope

- Point expiration (separate spec, needs policy decisions)
- Membership/subscription program (separate spec, needs Stripe recurring)
- Email notifications for approaching milestones (separate spec)
- Dinner Circle / Open Tables integration
- RSVP-based points

---

## Notes for Builder Agent

- **SSE broadcasts are non-blocking.** Wrap in try/catch. Use dynamic import for `broadcastUpdate` to keep the import lightweight.
- **base_points_per_event works with ALL earn modes**, not just a new "hybrid" mode. This is simpler: if the value is >0, it adds points. No new enum value needed.
- **Presets are purely client-side.** They call the same setState functions that manual editing uses. No new server actions.
- **The `DEFAULT_REWARDS` array only seeds on first config creation.** Existing chefs won't get new rewards automatically. The expanded list only benefits new loyalty program activations.
- **Milestone progress in `getMyLoyaltyStatus`** needs both `milestone_bonuses` and `guest_milestones` from the config query. Currently the config query at L1817-1819 only selects `program_mode, earn_mode, tier_perks, guest_milestones, referral_points`. Add `milestone_bonuses, tier_silver_min, tier_gold_min, tier_platinum_min, base_points_per_event` to the select.
- **For the settings form**, add a new `basePointsPerEvent` state variable initialized from `config.base_points_per_event ?? 0`. Add it to the save payload. Show it as a NumberField below the earn mode selector with hint: "Flat bonus added to every completed event (set to 0 to disable)."
