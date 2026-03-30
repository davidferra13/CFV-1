# Loyalty Phase 1: Visibility and Tier Perks

> **Date:** 2026-03-29
> **Spec:** `docs/specs/loyalty-phase1-visibility-and-perks.md`

## What Changed

### 1A. "Rewards" Added to Action Bar

**File:** `components/navigation/nav-config.tsx`

A new entry was added to the `actionBarItems` array (the 14 daily-driver shortcuts in the sidebar). "Rewards" now appears after "Store Prices" and links to `/loyalty`. Uses the existing `Gift` icon.

The chef no longer needs to dig into All Features > Clients to find the loyalty program.

### 1B. Next Reward Progress Card (Client Page)

**Files:**

- `components/loyalty/next-reward-card.tsx` (new)
- `app/(client)/my-rewards/page.tsx` (modified)

When a client visits their rewards page, they now see a prominent card showing:

- The name of the next reward they're working toward
- How many points they need
- A visual progress bar with percentage
- A call-to-action: "Book your next dinner to earn more points."

This card only appears when the program is in "full" mode and there's a reward the client hasn't yet reached. The data source (`nextReward`) was already computed by `getMyLoyaltyStatus()` but never displayed.

### 1C. Tier Perks System

**Files:**

- `database/migrations/20260401000123_loyalty_tier_perks.sql` (new migration)
- `components/loyalty/tier-perks-display.tsx` (new component)
- `lib/loyalty/actions.ts` (modified: `LoyaltyConfig` type, `getLoyaltyConfig`, `updateLoyaltyConfig` schema, `getMyLoyaltyStatus`)
- `app/(chef)/loyalty/settings/loyalty-settings-form.tsx` (modified: tier perks editor)
- `app/(chef)/loyalty/page.tsx` (modified: perks display in tier breakdown)
- `app/(client)/my-rewards/page.tsx` (modified: perks display)

Chefs can now define what each tier unlocks. The settings form has three textareas (Silver, Gold, Platinum) where the chef enters one perk per line. These perks display:

- On the chef's loyalty dashboard (inside the Tier Breakdown card)
- On the client's rewards page (as a "Tier Benefits" section)

Bronze always shows "Standard service." The display highlights the client's current tier.

The `tier_perks` column is a JSONB object on `loyalty_config`: `{ "silver": ["Complimentary amuse-bouche"], "gold": ["Priority booking", "Recipe card"] }`.

## Migration Required

Run migration `20260401000123_loyalty_tier_perks.sql` to add the `tier_perks` column to `loyalty_config`. This is purely additive (one column, defaults to `{}`).

## Next Steps

- **Phase 2 spec** (`docs/specs/loyalty-phase2-auto-referral-guest-milestones.md`): Auto referral points and guest-count milestones. Status: draft.
- **Phase 3** (not yet specced): RSVP points, Dinner Circle integration, Featured Offers, post-event engagement. Needs more research.
- **Full roadmap:** `docs/specs/loyalty-program-perfection.md`
