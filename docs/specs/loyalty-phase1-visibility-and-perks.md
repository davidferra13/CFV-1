# Spec: Loyalty Phase 1 - Visibility and Tier Perks

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (3-8 files)
> **Created:** 2026-03-29
> **Built by:** 2026-03-29 session (needs migration applied + visual verification)

---

## What This Does (Plain English)

Three improvements that make the loyalty program visible and meaningful:

1. **Action Bar shortcut** - "Rewards" appears in the chef's daily-driver sidebar (after Store Prices), so the loyalty program isn't buried in All Features.
2. **Next Reward progress card** - Clients see a prominent card on their My Rewards page showing "You're X points from [reward name]" with a progress bar. Creates anticipation and motivates the next booking. Uses `nextReward` data already returned by `getMyLoyaltyStatus()` (actions.ts L1846).
3. **Tier perks** - Chefs can define what each tier unlocks (e.g., "Gold = complimentary amuse-bouche + priority holiday booking"). Perks display on both the chef dashboard and the client rewards page, so tiers mean something real.

---

## Why It Matters

The loyalty engine is fully built but buried. Chefs forget it exists because it's not in their daily shortcuts. Clients see a tier badge but tiers don't unlock anything tangible. The "next reward" data is computed server-side but never displayed to clients. These three changes create immediate visibility, anticipation, and meaning with minimal risk.

---

## Files to Create

| File                                                        | Purpose                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `components/loyalty/next-reward-card.tsx`                   | Client-facing "You're X points from Y" card with progress bar     |
| `components/loyalty/tier-perks-display.tsx`                 | Displays tier perks list (used on chef dashboard and client page) |
| `database/migrations/20260401000123_loyalty_tier_perks.sql` | Adds `tier_perks` JSONB column to `loyalty_config`                |

---

## Files to Modify

| File                                                    | What to Change                                                                                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `components/navigation/nav-config.tsx`                  | Add `{ href: '/loyalty', label: 'Rewards', icon: Gift }` to `actionBarItems` at L1977                                              |
| `app/(client)/my-rewards/page.tsx`                      | Insert `<NextRewardCard>` after the tier/balance card (after L221)                                                                 |
| `app/(chef)/loyalty/page.tsx`                           | Add tier perks display in the tier breakdown section                                                                               |
| `app/(chef)/loyalty/settings/loyalty-settings-form.tsx` | Add tier perks editor (free-text list per tier)                                                                                    |
| `lib/loyalty/actions.ts`                                | Add `tier_perks` to `getLoyaltyConfig` select (L437) and `getMyLoyaltyStatus` config select (L1820). Add to `updateLoyaltyConfig`. |

---

## Database Changes

### New Columns on Existing Tables

```sql
-- Tier perks: what each tier unlocks (chef-configurable free text)
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS tier_perks jsonb DEFAULT '{}';

-- Example value:
-- {
--   "bronze": [],
--   "silver": ["Complimentary amuse-bouche at every event"],
--   "gold": ["Priority holiday booking", "Complimentary amuse-bouche", "Recipe card for your favorite dish"],
--   "platinum": ["All Gold perks", "Annual tasting menu experience", "Custom menu consultation"]
-- }
```

### Migration Notes

- Filename: `20260401000123_loyalty_tier_perks.sql` (next after `20260401000122`)
- Purely additive: one new JSONB column with empty object default
- No data loss risk

---

## Data Model

`tier_perks` is a JSONB object with keys `bronze`, `silver`, `gold`, `platinum`. Each value is a string array of perk descriptions. Empty array means no special perks for that tier.

The chef enters these as free text. No predefined options (every chef's business is different). The UI provides placeholder examples to guide them.

---

## Server Actions

| Action                           | Auth              | Input                                              | Output                                                  | Side Effects           |
| -------------------------------- | ----------------- | -------------------------------------------------- | ------------------------------------------------------- | ---------------------- |
| `getLoyaltyConfig()` (modify)    | `requireChef()`   | none                                               | Existing return + `tier_perks`                          | none                   |
| `updateLoyaltyConfig()` (modify) | `requireChef()`   | Existing + `tier_perks?: Record<string, string[]>` | `{ success }`                                           | Revalidates `/loyalty` |
| `getMyLoyaltyStatus()` (modify)  | `requireClient()` | none                                               | Existing return + `tierPerks: Record<string, string[]>` | none                   |

No new server actions needed. Three existing ones get a new field.

---

## UI / Component Spec

### 1A. Action Bar Entry

One line added to `actionBarItems` array in `nav-config.tsx`:

```ts
{ href: '/loyalty', label: 'Rewards', icon: Gift },
```

Inserted after the Store Prices entry (L1976). `Gift` icon already imported at L37.

### 1B. NextRewardCard Component

Renders inside the client My Rewards page, after the tier/balance card, before the raffle section. Only shows in `full` program mode when `nextReward` is non-null.

Layout:

```
┌─────────────────────────────────────────────────┐
│  Next Reward                                     │
│                                                  │
│  ★ Complimentary Dessert Course (150 pts)        │
│  ████████████████░░░░░ 80%                       │
│  30 more points to go                            │
│                                                  │
│  Book your next dinner to earn more points.      │
└─────────────────────────────────────────────────┘
```

Props:

- `nextReward: { name: string; pointsRequired: number; pointsNeeded: number } | null`
- `currentPoints: number`

Progress calculation: `((pointsRequired - pointsNeeded) / pointsRequired) * 100`

### 1C. Tier Perks Display

A simple component that takes `tierPerks: Record<string, string[]>` and `currentTier: string` and renders:

- All four tiers with their perks listed
- Current tier highlighted
- Empty tiers show "Standard service" or similar

Used in two places:

- Chef loyalty dashboard (inside the existing Tier Breakdown card)
- Client My Rewards page (new section after the balance card, before rewards catalog)

### 1C Settings. Tier Perks Editor

Added to the existing settings form. For each tier (Silver, Gold, Platinum - Bronze is always "Standard service"), a textarea or tag-input where the chef can type perk descriptions.

Simple approach: one textarea per tier, one perk per line. Parse on save.

### States

- **Loading:** Skeleton cards (same as existing page pattern)
- **Empty (no next reward):** Card hidden entirely (not an error state)
- **Empty (no tier perks configured):** Show default text "No special perks defined yet. Configure perks in Loyalty Settings."
- **Error:** Inherit page-level error handling (already implemented with `Promise.allSettled`)
- **Populated:** Full display as described above

---

## Edge Cases and Error Handling

| Scenario                                                  | Correct Behavior                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Client has enough points for ALL rewards (no next reward) | NextRewardCard hidden. Client sees "All rewards available" in the existing rewards section. |
| No rewards in catalog at all                              | NextRewardCard hidden.                                                                      |
| Chef hasn't configured tier perks                         | Display shows "No special perks defined" with link to settings.                             |
| `tier_perks` column is null (pre-migration)               | Treat as empty object `{}`. All display components default to empty arrays.                 |
| Chef enters very long perk descriptions                   | Truncate display at 120 chars per perk with ellipsis.                                       |

---

## Verification Steps

1. Sign in as chef with agent account
2. Navigate to sidebar - verify "Rewards" appears in Action Bar after Store Prices
3. Click "Rewards" - verify it navigates to `/loyalty`
4. Go to `/loyalty/settings` - verify tier perks editor appears below tier thresholds
5. Enter perks for Silver ("Complimentary amuse-bouche"), Gold ("Priority booking, Recipe card"), Platinum ("Annual tasting experience")
6. Save settings - verify success
7. Go to `/loyalty` dashboard - verify tier perks appear in the tier breakdown section
8. Sign in as client
9. Navigate to `/my-rewards` - verify NextRewardCard appears with progress bar (if program is active and rewards exist)
10. Verify tier perks section shows the perks the chef configured
11. Screenshot both chef and client views

---

## Out of Scope

- Automatic referral points (Phase 2 spec)
- Guest-count milestones (Phase 2 spec)
- RSVP points (Phase 3)
- Dinner Circle integration (Phase 3)
- Featured Offer / Deal of the Month (Phase 3)
- Post-event engagement points (Phase 3)
- Email notifications for approaching milestones (Phase 2/3)

---

## Notes for Builder Agent

- `getMyLoyaltyStatus()` already returns `nextReward` (actions.ts L1846-1862) with `name`, `pointsRequired`, `pointsNeeded`. The data source exists. Just consume it.
- `Gift` icon is confirmed imported at nav-config.tsx L37. No new import needed.
- The existing tier progress bar on the client page (my-rewards L210-219) shows progress to **next tier**. The NextRewardCard shows progress to **next reward**. These are different and both valuable.
- `loyalty_config` is one row per tenant. Adding a JSONB column is zero-risk.
- The settings form uses `useProtectedForm` with draft persistence. Adding `tierPerks` to `defaultData` and `currentData` follows the exact same pattern as existing fields.
- `clients.total_guests_served` already exists (loyalty migration L158). Do NOT create a new column for this.
