# Loyalty Phase 3: SSE Broadcasts, Hybrid Earn, Setup Presets, Reward Templates, Milestone Progress

> **Date:** 2026-03-29
> **Spec:** `docs/specs/loyalty-phase3-sse-hybrid-presets-progress.md`

## What Changed

### 3A. SSE Real-Time Broadcasts

**Files:**

- `lib/loyalty/actions.ts` (modified: `awardEventPoints`, `redeemReward`)
- `lib/loyalty/award-internal.ts` (modified: `awardBonusPointsInternal`)

Every loyalty mutation now broadcasts via SSE:

- `awardEventPoints` broadcasts `{ type: 'points_awarded', clientId, points, newBalance, newTier, tierChanged }`
- `redeemReward` broadcasts `{ type: 'reward_redeemed', clientId, rewardName, pointsSpent, newBalance }`
- `awardBonusPointsInternal` broadcasts `{ type: 'bonus_awarded', clientId, points, newBalance, newTier }`

All broadcasts are non-blocking (try/catch wrapped, dynamic import). Channel is `loyalty:{tenantId}`.

### 3B. Hybrid Earn Mode (Base Points Per Event)

**Files:**

- `database/migrations/20260401000133_loyalty_base_points_per_event.sql` (new)
- `lib/loyalty/actions.ts` (modified: type, schema, `awardEventPoints`, `getLoyaltyConfig` returns)

New column `base_points_per_event` (integer, default 0) on `loyalty_config`. When > 0, adds a flat bonus to every completed event on top of the selected earn mode. This creates hybrid earning without a new enum value:

- `per_guest` + `base_points_per_event: 50` = 50 base + (guests x points_per_guest)
- `per_dollar` + `base_points_per_event: 25` = 25 base + (dollars x points_per_dollar)
- `per_event` + `base_points_per_event: 0` = flat points_per_event (unchanged)

### 3C. Expanded Reward Templates

**Files:**

- `lib/loyalty/actions.ts` (modified: `DEFAULT_REWARDS` array)

8 new default rewards added (total now 15):

- Complimentary amuse-bouche course (40 pts)
- Recipe card collection (60 pts)
- Priority booking (75 pts)
- Wine pairing upgrade (100 pts)
- Custom menu consultation (125 pts)
- $50 off next dinner (175 pts)
- Behind-the-scenes cooking demo (175 pts)
- 25% off a dinner party (200 pts)

These only seed for new loyalty program activations (existing chefs keep their current catalog).

### 3D. Quick Setup Presets

**Files:**

- `app/(chef)/loyalty/settings/loyalty-settings-form.tsx` (modified)

Three preset buttons at the top of the settings form:

- **Private Dining** - per_guest 15, base 25, high referral bonus, intimate-dinner-friendly thresholds
- **Catering** - per_event 100, no base, high guest milestones (100, 500), higher tier thresholds
- **Balanced** - per_guest 10, base 50, moderate everything

Presets pre-fill all fields but do NOT auto-save. The chef reviews and clicks Save.

### 3E. Client Milestone Progress

**Files:**

- `lib/loyalty/actions.ts` (modified: `getMyLoyaltyStatus` returns `milestoneProgress`)
- `app/(client)/my-rewards/page.tsx` (modified: new "Upcoming Milestones" card)

`getMyLoyaltyStatus` now returns:

```typescript
milestoneProgress: {
  nextEventMilestone: { target, current, remaining, bonus } | null,
  nextGuestMilestone: { target, current, remaining, bonus } | null,
}
```

The My Rewards page shows an "Upcoming Milestones" card between the tier perks and raffle sections. Displays distance to next event and guest milestones with progress counts. Hidden if no upcoming milestones exist.

### 3F. How-to-Earn Panel Updates

**Files:**

- `components/loyalty/how-to-earn-panel.tsx` (modified)

When `base_points_per_event > 0`, shows an additional row: "Base event bonus: +N pts every time you complete a dinner" before the earn mode row.

## Migration Required

Run migration `20260401000133_loyalty_base_points_per_event.sql` to add the `base_points_per_event` column to `loyalty_config`. Purely additive (one integer column, defaults to 0).

All three Phase migrations need to be applied in order:

1. `20260401000123_loyalty_tier_perks.sql` (Phase 1)
2. `20260401000124_loyalty_guest_milestones.sql` (Phase 2)
3. `20260401000133_loyalty_base_points_per_event.sql` (Phase 3)

## Bug Fix: JSONB Array Serialization in Compat Layer

**File:** `lib/db/compat.ts` (modified: `serializeValue`)

The compat layer's `serializeValue` method passed all JS arrays through to postgres.js as raw values. postgres.js interprets raw arrays as PostgreSQL array types (`text[]`, `int[]`), which breaks JSONB columns that store arrays of objects (like `milestone_bonuses`, `guest_milestones`). These need `JSON.stringify()`.

**Fix:** Arrays of objects are now JSON-stringified (JSONB), while arrays of primitives pass through for native PostgreSQL array columns.

## Bug Fix: Zod String Coercion for Numeric Fields

**File:** `lib/loyalty/actions.ts` (modified: `UpdateLoyaltyConfigSchema`)

`points_per_dollar` and `points_per_event` arrived as strings from the form (serialized through server action boundary). Changed from `z.number()` to `z.coerce.number()` to handle this correctly. Pre-existing bug, not introduced by Phase 3.

## Files Summary

| File                                                                   | Change                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `database/migrations/20260401000133_loyalty_base_points_per_event.sql` | New: adds `base_points_per_event` integer column                                                                                                                                                                          |
| `lib/loyalty/actions.ts`                                               | Modified: type, schema, DEFAULT_REWARDS (8 new), awardEventPoints (base bonus + SSE), redeemReward (SSE), getLoyaltyConfig (returns new field), getMyLoyaltyStatus (milestone progress + new config fields), z.coerce fix |
| `lib/loyalty/award-internal.ts`                                        | Modified: SSE broadcast after bonus award                                                                                                                                                                                 |
| `lib/db/compat.ts`                                                     | Modified: serializeValue now JSON-stringifies arrays of objects for JSONB columns                                                                                                                                         |
| `app/(chef)/loyalty/settings/loyalty-settings-form.tsx`                | Modified: quick setup presets, base_points_per_event field, all state/save wiring                                                                                                                                         |
| `components/loyalty/how-to-earn-panel.tsx`                             | Modified: base event bonus row, new prop                                                                                                                                                                                  |
| `app/(client)/my-rewards/page.tsx`                                     | Modified: milestone progress section, config query includes base_points_per_event                                                                                                                                         |
