# Phase 5 — Advanced Analytics Implementation

**Date:** 2026-02-20
**Branch:** fix/grade-improvements
**Status:** Complete

---

## Overview

Phase 5 completes the improvement plan by building the strategic analytics layer — intelligence that no horizontal platform can offer because it requires understanding the full lifecycle of a private chef's business: the clients, the dishes served, the seasonal rhythms, the guest relationships, and the cumulative financial relationship.

This phase adds four capabilities:

| Feature | Files Created | Files Modified |
|---|---|---|
| 5.1 Client LTV Trajectory | `lib/clients/ltv-trajectory.ts`, `components/clients/ltv-chart.tsx` | `app/(chef)/clients/[id]/page.tsx` |
| 5.2 Seasonal Pattern Detection | `lib/analytics/seasonality.ts` | `app/(chef)/dashboard/page.tsx` |
| 5.3 Guest Preference Inheritance | — | `lib/documents/generate-prep-sheet.ts` |
| 5.4 Menu/Culinary History | `lib/clients/menu-history.ts`, `components/clients/menu-history-panel.tsx` | `app/(chef)/clients/[id]/page.tsx` |

---

## Phase 5.1 — Client LTV Trajectory Chart

### What It Does

Shows the cumulative lifetime value (LTV) of a client relationship over time as a bar chart, rendered directly on the client detail page. Each bar represents one completed event, and the height shows cumulative revenue — so the chart naturally slopes upward if the relationship is growing.

### Why It Matters

Most chefs have no single metric that captures "how valuable is this client relationship, and is it growing?" LTV trajectory answers that at a glance. A steep upward slope means a client is booking more expensive events more frequently. A plateau signals the relationship has stalled.

### Files

- **[lib/clients/ltv-trajectory.ts](../lib/clients/ltv-trajectory.ts)** — `getClientLTVTrajectory(clientId)` server action. Queries completed events for the client ordered chronologically, fetches `total_paid_cents` from `event_financial_summary` view, computes cumulative running sum.
- **[components/clients/ltv-chart.tsx](../components/clients/ltv-chart.tsx)** — Pure Tailwind bar chart (no library). `barHeightClass()` maps the max-normalized cumulative ratio to fixed Tailwind height classes. Shows first/last date on x-axis, total LTV, avg per event, and last event revenue as summary stats.

### Connection to System

- Uses the immutable `event_financial_summary` view — no new queries touch ledger directly
- `total_paid_cents` represents confirmed payments, not quotes — consistent with the ledger-first model
- Shown only when `eventCount >= 2` (a single event is trivially just that event's revenue)

---

## Phase 5.2 — Seasonal Pattern Detection

### What It Does

Groups all of a chef's booking history by calendar month (Jan–Dec) to identify peak months (most events) and quiet months (fewest events). Shows this on the dashboard as:

1. A 12-bar sparkline colored by peak (brand color) / quiet (light gray)
2. An upcoming season signal: "Busy season in 2 months (Nov) — book clients now" when a peak month is approaching within 5 months
3. A "Quiet period coming" advisory when a quiet month approaches and no peak is imminent

### Why It Matters

Private chefs have highly seasonal businesses (holiday season, summer events, etc.) but rarely have a systematic way to see these patterns. This feature lets the chef:
- Plan client outreach before peak season fills up
- Use quiet periods to develop new relationships
- Price strategically during peak demand

### Files

- **[lib/analytics/seasonality.ts](../lib/analytics/seasonality.ts)** — `getBookingSeasonality()` server action. Groups accepted/confirmed/paid/in_progress/completed events by month using UTC dates. Identifies top 3 peak months and bottom 3 quiet months (among months with data). Detects upcoming signals by scanning 1–5 months ahead from today.

### Connection to System

- Uses `(supabase as any)` because `amount_paid_cents` on the `events` table is not yet in generated types (pending migration sync)
- The `safe()` wrapper on the dashboard ensures graceful degradation if the action fails
- `hasEnoughData` guard: only shows the card when 3+ months have data and 5+ total events exist — prevents noisy signals from new chefs with limited history

---

## Phase 5.3 — Guest Preference Inheritance in Prep Sheet

### What It Does

Extends the printed Prep Sheet PDF to include a compact "Guest Notes" section immediately after the location header. This section shows:

1. **ALLERGIES: [list]** — client's known allergies in bold (safety-critical)
2. **DIET: [list]** — dietary restrictions
3. **Guests: Name (notes) · Name2 (notes)** — regular guests from the client's profile, with their personal notes

### Why It Matters

The prep sheet is used during home prep and on-site execution. It currently shows allergen flags per dish (from the menu), but doesn't surface the client's master allergy list or which regular guests are attending. A chef relying only on dish-level allergen flags may miss a guest with an allergy that wasn't flagged on a specific component.

### Files

- **[lib/documents/generate-prep-sheet.ts](../lib/documents/generate-prep-sheet.ts)** — Extended in two places:
  1. `fetchPrepSheetData()`: The client select now includes `allergies, dietary_restrictions, dislikes, regular_guests`
  2. `PrepSheetData` type: Added `clientPreferences: ClientPreferences | null` field
  3. `renderPrepSheet()`: New compact section renders between the location line and the AT HOME section header

### Connection to System

- `regular_guests` is a JSONB array on the `clients` table with shape `[{ name, relationship, notes }]`
- The section only renders when there is meaningful data — if the client has no allergies, no dietary restrictions, and no regular guests, the section is omitted entirely (no noise for simple events)
- The PDF must fit ONE page (project constraint) — the section is compact (1-2 lines max) and only appears when data exists

---

## Phase 5.4 — Menu/Culinary History Per Client

### What It Does

New section on the client detail page showing every menu served to this client across all completed events. Features:

1. **Frequently Served** — tag cloud of the most common components (e.g., "Seared Salmon ×3"), helping the chef avoid repeating dishes without realizing it
2. **Cuisines Served** — list of distinct cuisine types used with this client
3. **Per-event breakdown** — collapsible rows showing dishes/components per event, with allergen and dietary tags

### Why It Matters

Without this, a chef must mentally remember what they cooked for each client across every event. After 10+ events, this becomes impossible. This feature answers "have I made this before for them?" in seconds.

It also surfaces the "avoid menu fatigue" insight from the Action Inventory: proposed menu vs actually served must both be recorded, and carry-forward from prior events is a quality signal.

### Files

- **[lib/clients/menu-history.ts](../lib/clients/menu-history.ts)** — `getClientMenuHistory(clientId)` server action. Multi-query approach (4 queries with batch IN clauses) to avoid N+1:
  1. Completed events for client
  2. Menus for those event menu_ids
  3. Dishes for non-simple-mode menu_ids
  4. Components for those dish_ids

  Then assembled in memory. Returns `ClientMenuHistory` with `entries[]`, `topComponents[]`, and `cuisinesServed[]`.

- **[components/clients/menu-history-panel.tsx](../components/clients/menu-history-panel.tsx)** — `'use client'` component with `EventMenuRow` (collapsible per event). Shows a compact preview of the first 4 component names when collapsed, full course/dish breakdown when expanded. Handles simple-mode menus (text content) and structured menus (dishes + components) differently.

### Connection to System

- Queries only `completed` events (not draft, accepted, etc.) so history reflects what was actually executed
- Handles `simple_mode` menus (free text) gracefully — shows `simple_mode_content` when `is_simple_mode = true`
- `topComponents` aggregation helps surface the "Diane Sauce ×4" type of pattern that indicates a signature dish in the chef-client relationship
- Positioned on the client detail page after the LTV Trajectory chart (both are analytics features that build on event history)

---

## Migrations in Phase 5

**None.** All Phase 5 features use existing schema:
- `events` table (with `menu_id`, `client_id`, `status`, `amount_paid_cents`)
- `event_financial_summary` view (for LTV trajectory)
- `menus`, `dishes`, `components` tables (for menu history)
- `clients.regular_guests` JSONB field (for prep sheet guest notes)

---

## TypeScript Notes

- `seasonality.ts`: Uses `(supabase as any)` because `amount_paid_cents` column on `events` is not in generated `types/database.ts` — it was added by an earlier migration but the types file hasn't been synced
- All other Phase 5 files use properly typed schema columns
- Pre-existing errors in `lib/availability/rules-actions.ts` (chef_scheduling_rules table not in types) and `lib/scheduling/calendar-sync.ts` (google_calendar_event_id column not in types) are unrelated to Phase 5 work

---

## Verification Checklist

- [x] `npx tsc --noEmit --skipLibCheck` — zero new errors introduced by Phase 5 code
- [x] All server actions use `requireChef()` auth guard
- [x] All queries use `tenant_id = user.tenantId!` scoping
- [x] No ledger writes, no lifecycle transitions, no AI policy violations
- [x] All new components gracefully handle empty/null data

---

## What Phase 5 Delivers

- **Client intelligence**: LTV trajectory tells the story of every client relationship as a single visual. Culinary history eliminates menu repetition. Together they give the chef institutional memory at scale.
- **Calendar awareness**: Seasonal pattern detection turns booking history into forward-looking calendar intelligence — know when to hustle and when to breathe.
- **Safety on the prep sheet**: Guest preferences on the prep sheet eliminate the gap between "I know this client has allergies" and "are those allergens flagged on this specific dish's components?" — the answer is now always visible before cooking starts.
