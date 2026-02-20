# AI Insights Implementation

**Date:** 2026-02-20
**Type:** New feature — read-only insight surfaces
**No migrations required** — all data from existing schema

---

## What Was Built

Four data-driven insight/suggestion features surfaced throughout the chef UI. All are read-only. Per the AI Policy, they suggest — the chef decides. No canonical state is ever mutated by these features.

---

## Feature 1: Quote Acceptance Insights

**What it shows:** Acceptance rate %, average time-to-decision, average accepted vs. rejected quote value, expiring-soon alerts, and a breakdown by pricing model.

**Data source:** `quotes` table — last 90 days, statuses: sent/accepted/rejected/expired.

**Files created:**
- `lib/analytics/quote-insights.ts` — `getQuoteAcceptanceInsights()`
- `components/analytics/quote-acceptance-insights.tsx` — `QuoteAcceptanceInsightsPanel`

**Surfaces in:**
- `/quotes` — above the status tab row
- `/dashboard` — as a full-width card below the Business Snapshot grid

**Graceful degradation:** Shows "not enough data" message if fewer than 3 decided quotes exist. Expiring-soon list still shows regardless.

---

## Feature 2: Pricing Suggestion Panel

**What it shows:** Low / Median / High price range from accepted quotes with similar guest count (±20%) and pricing model. Also shows average food cost % from `event_financial_summary` view for linked events.

**Data source:** `quotes` (accepted, matching model + guest range) + `event_financial_summary` view.

**Files created:**
- `lib/analytics/pricing-suggestions.ts` — `getPricingSuggestion()`
- `components/analytics/pricing-suggestion-panel.tsx` — `PricingSuggestionPanel` (client component, collapsible)

**Files modified:**
- `components/quotes/quote-form.tsx` — added `pricingSuggestion?: PricingSuggestion | null` prop; renders panel between pricing history and price calculator
- `app/(chef)/quotes/new/page.tsx` — fetches suggestion server-side via `getPricingSuggestion()` when guest count is known; passes to `QuoteForm`

**Graceful degradation:** Panel collapses by default; shows "need 3+ accepted quotes" message if insufficient data. If guest count is unknown at page load, suggestion is null and panel is hidden.

---

## Feature 3: Menu Recommendation Hints

**What it shows:** Recipes from the chef's Recipe Bible grouped by category, ranked by popularity (times_cooked ≥ 3) and recency (cooked within 30 days). Recipes conflicting with event allergens are hard-filtered out.

**Data source:** `recipes` table + `recipe_ingredients.allergen_flags` for non-optional ingredients.

**Files created:**
- `lib/analytics/menu-recommendations.ts` — `getMenuRecommendations()`
- `components/analytics/menu-recommendation-hints.tsx` — `MenuRecommendationHints` (server component)

**Files modified:**
- `app/(chef)/menus/[id]/page.tsx` — added `getMenuRecommendations()` to parallel fetch; renders `MenuRecommendationHints` below the menu editor. Event's `dietary_restrictions` and `allergies` are passed if a linked event exists.

**Reason badges:** `proven` (success) = popular + recent, `popular` (info) = cooked 3+ times, `recent` (default) = cooked within 30 days.

**Graceful degradation:** Shows "Add recipes to your Recipe Bible" message if no recipes exist. Allergen exclusion count is displayed when active.

---

## Feature 4: Capacity/Booking Score

**What it shows:** A 0–100 score on each open inquiry based on estimated profitability, client reliability, and date conflicts. Rendered as a colored badge with a hover breakdown tooltip.

**Scoring algorithm:**
| Component | Points |
|---|---|
| Profitability: budget/guest vs. tenant avg per-guest | 0–40 |
| Client reliability: completed/(completed+cancelled) | 0–30 |
| New client bonus | +10 |
| Date conflict (confirmed/paid/in_progress event same day) | −50 |

**Level mapping:** `conflict` (red, any conflict), `high` (green, ≥65), `medium` (amber, 40–64), `low` (gray, <40).

**Data source:** `inquiries`, `quotes` (accepted, for tenant avg), `client_financial_summary` view, `events` (date conflict check).

**Files created:**
- `lib/analytics/booking-score.ts` — `getBookingScoreForInquiry()` + `getBookingScoresForOpenInquiries()`
- `components/analytics/booking-score-badge.tsx` — `BookingScoreBadge` (client component, hover tooltip)

**Files modified:**
- `app/(chef)/inquiries/page.tsx` — `InquiryList` now fetches all open inquiry scores in parallel; renders `BookingScoreBadge` next to status badge on each open inquiry
- `app/(chef)/inquiries/[id]/page.tsx` — added `getBookingScoreForInquiry()` to the page's `Promise.all()`; renders badge next to `EngagementBadge` in header

**Graceful degradation:** All fetch calls wrapped in `.catch(() => null)` or `.catch(() => [])` — score badge simply doesn't render if the fetch fails.

---

## Architectural Notes

- All server actions follow the standard pattern: `'use server'`, `requireChef()`, `createServerClient()` (no await), `.eq('tenant_id', user.tenantId!)` on every query
- No `@ts-nocheck` — all new files are fully typed
- No new database migrations — every table/view used already existed
- All actions return `{ status: 'ok' | 'insufficient_data' }` for clean graceful degradation
- `BookingScoreBadge` and `PricingSuggestionPanel` are client components (for hover/toggle interactivity); all others are server components
- The existing `safe()` wrapper in `dashboard/page.tsx` handles the `quoteInsights` fetch — it will not crash the dashboard if the insights query fails

---

## Connection to System

These features are the first step toward a data feedback loop in ChefFlow:

1. Chef sends quotes → system learns acceptance patterns (Feature 1)
2. Chef creates new quote → system suggests price range from history (Feature 2)
3. Chef designs menu → system suggests proven recipes (Feature 3)
4. New inquiry arrives → system scores booking priority (Feature 4)

None of these mutate state. All are framed as "here's what the data suggests" — the chef's judgment is always the final word, consistent with `docs/AI_POLICY.md`.
