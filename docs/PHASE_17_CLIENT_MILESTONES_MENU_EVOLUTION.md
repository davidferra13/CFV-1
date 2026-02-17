# Phase 17 — Client Milestones, Menu Evolution & Operational Refinements

## What Changed

Phase 17 adds six interconnected systems that help chefs build deeper client knowledge and refine their operations over time. Every feature captures data during normal workflow and surfaces insights when they're useful — not as tasks, but as gentle nudges.

## Schema Changes

**Migration:** `supabase/migrations/20260216000002_operational_refinements.sql`

### New Enums
- `modification_type`: substitution | addition | removal | method_change
- `unused_reason`: leftover_reusable | wasted | returned
- `substitution_reason`: unavailable | price | quality | preference | forgot | other

### New Columns on Existing Tables
- **clients**: `preferred_name`, `partner_preferred_name`, `additional_addresses` (JSONB), `family_notes`
- **events**: `time_shopping_minutes`, `time_prep_minutes`, `time_travel_minutes`, `time_service_minutes`, `time_reset_minutes`, `payment_card_used`, `card_cashback_percent`
- **expenses**: `card_cashback_percent`

### New Tables (all tenant-scoped with RLS)
| Table | Purpose |
|---|---|
| `menu_modifications` | Tracks proposed-vs-served differences per event |
| `ingredient_price_history` | Price observations from receipts, auto-computes per-unit pricing |
| `unused_ingredients` | Logs ingredients bought but not served, with disposition |
| `shopping_substitutions` | Records what was planned vs what was bought, and why |

## Server Actions Created

### `lib/clients/milestones.ts`
- `updateClientMilestones()` — Save milestone array to client's JSONB field
- `getUpcomingMilestones()` — Find milestones in the next N days across all clients
- `getMilestoneOutreachSuggestions()` — Generate human-tone outreach suggestions for dashboard
- `updateClientPersonalInfo()` — Save preferred name, partner nickname, family notes

### `lib/menus/modifications.ts`
- `logMenuModification()` / `deleteMenuModification()` — CRUD for menu changes
- `getEventModifications()` — All modifications for an event
- `getModificationStats()` — Cross-event patterns (most common substitutions, frequent removals)

### `lib/expenses/unused.ts`
- `logUnusedIngredient()` / `deleteUnusedIngredient()` — CRUD for unused items
- `getUnusedIngredients()` — All unused items for an event
- `transferUnusedToEvent()` — Move a reusable leftover to another event's cost attribution

### `lib/ingredients/pricing.ts`
- `logIngredientPrice()` — Record a price observation; auto-computes price_per_unit
- `getIngredientPriceHistory()` — All observations for an ingredient
- `getIngredientAveragePrice()` — Weighted average with confidence level
- `getIngredientPriceAlerts()` — Flag ingredients with recent prices >20% above average
- `getStoreComparison()` — Compare average prices across stores

### `lib/shopping/substitutions.ts`
- `logSubstitution()` / `deleteSubstitution()` — CRUD for shopping substitutions
- `getSubstitutions()` — All substitutions for an event
- `getSubstitutionHistory()` — All times a specific ingredient was substituted
- `getCommonSubstitutions()` — Most frequent planned→actual swaps (the "quiet genius" knowledge base)

### Modified: `lib/expenses/actions.ts`
- `getEventProfitSummary()` now computes:
  - `estimatedCashbackCents` — sum of expense amounts * cashback percentages
  - `effectiveHourlyRateCents` — profit divided by total time invested
  - Returns `timeInvested` and `cashback` objects alongside existing financial data

### Modified: `lib/events/actions.ts`
- Added `updateEventTimeAndCard()` — saves time tracking minutes and card info for an event

## UI Components Created

### Client Detail Page
- **`components/clients/milestone-manager.tsx`** — Add/remove milestones (birthday, anniversary, child's birthday, booking anniversary, other). Stored in JSONB for flexibility.
- **`components/clients/address-manager.tsx`** — Manage additional service addresses per client (label + full address).
- **`components/clients/personal-info-editor.tsx`** — Edit preferred names, partner nicknames, and family notes.

### Event Detail Page
- **`components/events/time-tracking.tsx`** — Display/edit mode for 5 time phases (shopping, prep, travel, service, reset). Shows total hours. Only appears for completed/in-progress events.
- **`components/events/menu-modifications.tsx`** — Log menu changes with type selection and quick-fill reason chips. Shows proposed→served diffs.
- **`components/events/unused-ingredients.tsx`** — Log unused items with disposition badges (color-coded: green=reusable, red=wasted, blue=returned) and optional cost.
- **`components/events/shopping-substitutions.tsx`** — Log planned→actual swaps with reason and store. Shown for any non-draft/non-cancelled event.

### Dashboard
- **Outreach Opportunities section** — Shows upcoming milestone-based outreach suggestions with human tone ("Mary's birthday is in 5 days — a quick note would be personal"). Limited to 5 items, links to client detail.

### Expense Form
- **Cashback fields** — When payment method is "card", shows card name and cashback percentage inputs. Values saved alongside the expense.

## Design Principles Applied

1. **Outreach, not tasks** — Milestone suggestions use warm language, not obligation language
2. **Lightweight capture** — All forms use inline add/remove patterns, not modal workflows
3. **Confidence-based display** — Price intelligence reports confidence (low/medium/high) based on observation count
4. **Optional time tracking** — Never required; displayed only when relevant (completed events)
5. **Substitution history as quiet genius** — Cross-event substitution patterns build a knowledge base that gets smarter over time

## Bug Fix (Bonus)

Fixed pre-existing bug in `lib/messages/actions.ts:434` — `getDefaultTemplates()` is async but was called without `await`, causing `.map()` on a Promise. Added the missing `await`.

## Integration Points

- Dashboard fetches milestone outreach via `getMilestoneOutreachSuggestions()` in the existing `Promise.all` block
- Event detail page fetches modifications, unused ingredients, and substitutions in its existing `Promise.all` block
- Profit summary card on event detail now shows effective hourly rate and estimated cashback when data exists
- All new components use the codebase's native `Select` component (HTML select wrapper), not Radix-style Select

## Files Changed Summary

| Category | Files |
|---|---|
| Migration | `supabase/migrations/20260216000002_operational_refinements.sql` |
| Types | `types/database.ts` |
| Server Actions (new) | `lib/clients/milestones.ts`, `lib/menus/modifications.ts`, `lib/expenses/unused.ts`, `lib/ingredients/pricing.ts`, `lib/shopping/substitutions.ts` |
| Server Actions (modified) | `lib/expenses/actions.ts`, `lib/events/actions.ts`, `lib/messages/actions.ts` |
| Components (new) | `components/clients/milestone-manager.tsx`, `components/clients/address-manager.tsx`, `components/clients/personal-info-editor.tsx`, `components/events/time-tracking.tsx`, `components/events/menu-modifications.tsx`, `components/events/unused-ingredients.tsx`, `components/events/shopping-substitutions.tsx` |
| Pages (modified) | `app/(chef)/clients/[id]/page.tsx`, `app/(chef)/events/[id]/page.tsx`, `app/(chef)/dashboard/page.tsx` |
| Components (modified) | `components/expenses/expense-form.tsx` |

## Verification

- TypeScript: `npx tsc --noEmit` — passes (0 Phase 17 errors)
- Build: `npm run build` — compiles successfully
- All new tables have RLS enabled with tenant-scoped policies
- All server actions use `requireChef()` for auth enforcement
