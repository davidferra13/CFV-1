# Feature Flags + Chef Health Score Admin UI

**Date:** 2026-02-20
**Branch:** feature/scheduling-improvements

---

## What Was Already Complete

The feature flags system was production-ready before this task:

- `lib/admin/flag-actions.ts` — `toggleChefFlag()`, `setBulkChefFlags()`, both audit-logged
- `components/admin/flag-toggle-panel.tsx` — per-chef toggle switches with optimistic updates
- `app/(admin)/admin/flags/page.tsx` — flag legend + per-chef control grid
- Five flags: `ai_pricing_suggestions`, `ai_menu_recommendations`, `social_platform`, `advanced_analytics`, `beta_features`

No changes were needed to the feature flags system.

---

## What Was Built: Chef Health Score

### Why

The admin panel had GMV, event counts, and client counts for each chef but no single signal indicating whether a chef is engaged, growing, stalled, or at risk of churning. The Client Health Score system (`lib/clients/health-score.ts`) already provided this for clients — the chef side was missing.

### `lib/chefs/health-score.ts` (new)

Pure computation helper — no DB calls. Takes existing data already available on admin pages and returns a structured score.

**Four dimensions:**
| Dimension | Max | What It Measures |
|-----------|-----|-----------------|
| Activity | 30 | Events in the last 90 days |
| Revenue | 25 | Total GMV level (paid ledger entries) |
| Clients | 25 | Client roster size |
| Setup | 20 | Profile completeness + usage after signup |

**Score → Tier:**
| Score | Tier |
|----------|------------|
| 80–100 | Thriving |
| 60–79 | Active |
| 40–59 | Building |
| 20–39 | Stalled |
| 0–19 | At Risk |

**Design decisions:**

- `recentEventCount` is optional — if not provided, falls back to a capped estimate from total events. This lets the admin list (which doesn't query recent events) still show a useful score.
- Accounts > 30 days old with zero events are capped at "Setup" score of 6 to reflect stalled onboarding.

### `components/admin/chef-health-badge.tsx` (new)

Thin wrapper around `computeChefHealthScore` that renders a colored badge (`Thriving`, `Active`, `Building`, `Stalled`, `At Risk`). Optional `showScore` prop adds the numeric value in parentheses.

### Admin Chef List (`app/(admin)/admin/users/page.tsx`)

- Added `ChefHealthBadge` import
- Added "Health" column after "Status" column
- Each row computes `daysSinceSignup` from `chef.created_at`; passes all required inputs to `ChefHealthBadge`
- Score shown alongside tier label so admins can see fine-grained differences within a tier

### Admin Chef Detail (`app/(admin)/admin/users/[chefId]/page.tsx`)

- Added `computeChefHealthScore`, `CHEF_TIER_LABELS`, `ChefHealthBadge`, `Activity` icon imports
- Computes `recentEventCount` by filtering events with `event_date >= now - 90 days` (from the already-fetched events list)
- `ChefHealthBadge` shown inline in the header next to the chef name
- New **Health Score Breakdown** card between the financial summary grid and the events table:
  - Shows all four dimension scores with their maximums
  - Plain numeric display (no dynamic progress bars — score numbers are self-explanatory)

---

## Files Modified / Created

| File                                        | Change                                         |
| ------------------------------------------- | ---------------------------------------------- |
| `lib/chefs/health-score.ts`                 | New — scoring model, types, tier labels/colors |
| `components/admin/chef-health-badge.tsx`    | New — badge component                          |
| `app/(admin)/admin/users/page.tsx`          | Added Health column + badge                    |
| `app/(admin)/admin/users/[chefId]/page.tsx` | Added badge in header + breakdown card         |
