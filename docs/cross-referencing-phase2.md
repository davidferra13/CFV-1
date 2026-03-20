# Cross-Referencing Phase 2: Intelligence Surfacing

**Date:** 2026-03-19
**Branch:** feature/external-directory

## Problem

ChefFlow had deep intelligence layers (seasonal data, prep estimation, vendor pricing, event comparison, client preferences) but they were siloed in standalone analytics pages. Chefs had to navigate away from their active workflow to access these insights.

## What Changed

Seven features that surface existing intelligence into the context where chefs actually need it, eliminating context-switching.

### 6. Seasonal Ingredient Warnings

**Where:** MenuContextSidebar
**Action:** `getMenuSeasonalWarnings()` in `lib/menus/menu-intelligence-actions.ts`

Cross-references all menu ingredients against the seasonal produce data (`lib/calendar/seasonal-produce.ts`) for the event's date. Flags ingredients that are out of season with notes about expected cost impact. Uses the existing 6-season, ~200 item produce database.

### 7. Menu Performance History

**Where:** MenuContextSidebar
**Action:** `getMenuPerformance()` in `lib/menus/menu-intelligence-actions.ts`

Shows how many times a menu has been used in completed events, average margin, last usage date, and last client. Pulls from events table and `event_financial_summary` view.

### 8. Client Taste Profile in Menu Context

**Where:** MenuContextSidebar
**Action:** `getMenuClientTaste()` in `lib/menus/menu-intelligence-actions.ts`

Surfaces the linked client's loved/disliked items and cuisine preferences from `client_preferences` table directly in the menu editor sidebar. Also shows past event count for returning clients.

### 9. Prep Time Estimate

**Where:** MenuContextSidebar
**Action:** `getMenuPrepEstimate()` in `lib/menus/menu-intelligence-actions.ts`

Wraps the existing `estimatePrepTime()` from `lib/intelligence/prep-time-estimator.ts` with menu context resolution. Shows estimated total hours, prep/service breakdown, and confidence level based on similar past events.

### 10. Vendor Best-Price Hints

**Where:** MenuCostSidebar (`components/culinary/menu-cost-sidebar.tsx`)
**Action:** `getMenuVendorHints()` in `lib/menus/menu-intelligence-actions.ts`

Compares current ingredient prices against `vendor_price_points` to find cheaper alternatives. Only shows hints where savings exceed 5%. Displays vendor name, current price, best price, and savings percentage.

### 11. Event Profitability in Quote Form

**Where:** Quote form (`components/quotes/quote-form.tsx`)
**Component:** `QuoteEventContext` (`components/intelligence/quote-event-context.tsx`)

When creating/editing a quote linked to an event, shows expected margin from similar events, price comparison vs. average, and strategic insights. Reuses the existing `getEventIntelligenceContext()` from `lib/intelligence/event-context.ts`.

### 12. Conversation Thread Links on Event Detail

**Where:** Event detail overview tab
**Data:** Queries `conversations` table for event-linked chat conversations

Adds an "Open Chat" link in the Communication section of the event detail page when a real-time chat conversation exists for that event. Resolves via `conversations.event_id` FK.

## Files Changed

| File                                                               | Change                                                            |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `lib/menus/menu-intelligence-actions.ts`                           | 5 new server actions (seasonal, performance, taste, prep, vendor) |
| `components/culinary/menu-context-sidebar.tsx`                     | 4 new sections (seasonal, prep, taste, performance)               |
| `components/culinary/menu-cost-sidebar.tsx`                        | Vendor savings section                                            |
| `components/intelligence/quote-event-context.tsx`                  | New component (event profitability in quote form)                 |
| `components/quotes/quote-form.tsx`                                 | Wired QuoteEventContext                                           |
| `app/(chef)/events/[id]/page.tsx`                                  | Chat conversation lookup                                          |
| `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` | Chat link in Communication section                                |

## Architecture Notes

- All features are deterministic (no AI calls), following Formula > AI principle
- All server actions are tenant-scoped via `requireChef()`
- Dynamic imports used for `seasonal-produce` and `prep-time-estimator` to avoid bloating the server action bundle
- All new sidebar data fetches use `.catch()` for failure isolation
- Vendor hints only surface when savings > 5% (avoids noise)
- QuoteEventContext re-fetches when guest count or price changes (reactive)
- Chat conversation lookup is a simple `maybeSingle()` query (no conversation creation)
