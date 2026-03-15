# Zero Hallucination Audit — February 2026

## Overview

A full-app audit identified 25+ places where ChefFlow displayed fabricated, stale, or unverified information to users as if it were real. This document tracks what was found and what was fixed.

## Root Cause

The app was built **feature-forward, not truth-forward**. Three systemic patterns created hallucinations:

1. **Happy path built, failure path skipped** — optimistic UI updates with no error handling or rollback
2. **Scaffolding left live** — stub buttons, "coming soon" routes, and no-op handlers shipped as functional UI
3. **Backend knows truth, frontend doesn't ask** — data flags (`is_demo`), error states, and placeholder markers existed in the data layer but were never consumed by the UI

## Fixes Applied (this session)

### Tier 1: Silent Lies — UI showed false information

| Fix                            | File(s)                                              | What Changed                                                                                                                        |
| ------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard error visibility     | `app/(chef)/dashboard/page.tsx`                      | `safe()` now tracks failed fetches; amber warning banner shown when any data source fails instead of silently showing zeros         |
| Receipt line item rollback     | `components/events/receipt-summary-client.tsx`       | `handleLineItemUpdate` now has try/catch with rollback + toast on failure                                                           |
| Notification settings rollback | `components/settings/notification-settings-form.tsx` | `handleChannelToggle` now has try/catch with toggle revert + toast on failure                                                       |
| Quick notes error handling     | `components/clients/quick-notes.tsx`                 | All 4 handlers (add, update, delete, togglePin) now have try/catch + toast on failure                                               |
| Payment plan error handling    | `components/finance/payment-plan-panel.tsx`          | `handleMarkPaid`, `handleDelete`, `handleAdd` all have try/catch + toast; `handleAdd` uses `finally` to prevent stuck submit button |
| Kanban board stale state       | `components/events/event-kanban-board.tsx`           | Added `useEffect` to re-sync local state when `initialEvents` prop changes from server revalidation                                 |

### Tier 2: Security & Data Contamination

| Fix                | File(s)                                                                                    | What Changed                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Demo API hardening | `app/api/demo/data/route.ts`, `app/api/demo/switch/route.ts`, `app/api/demo/tier/route.ts` | Added `NODE_ENV === 'production'` guard to all three routes — demo endpoints now blocked in production regardless of env var |

### Tier 3: Layout Cache Staleness

| Fix                       | File(s)                                                                        | What Changed                                                                                                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout cache revalidation | `lib/profile/actions.ts`, `lib/chef/profile-actions.ts`, `lib/chef/actions.ts` | Added `revalidateTag('chef-layout-{chefId}')` to `updateChefSlug`, `updateChefTagline`, `updateChefPortalTheme`, `updateChefPortalBackgroundImage`, `updateChefFullProfile`, `updateChefPreferences` — settings changes now reflect instantly instead of waiting 60 seconds |

### CLAUDE.md Update

Added **ZERO HALLUCINATION RULE** section with three enforceable laws:

1. Never show success without confirmation (optimistic updates must have rollback)
2. Never hide failure as zero (show error states, not fake data)
3. Never render non-functional features as functional (gate unfinished features)

## Known Remaining Items (Placeholders, not hallucinations)

These are **not false information** but are incomplete features flagged for the developer's awareness:

| Item                                               | Status                                           | File                                           |
| -------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| Demo data has no UI badge (`is_demo` flag unused)  | Needs UI work                                    | `lib/onboarding/demo-data.ts`                  |
| Event creation wizard ("coming soon" stub)         | Stub, properly gated with visible label          | `components/events/event-creation-wizard.tsx`  |
| Menu picker in push dinner builder ("coming soon") | Stub, properly gated with visible label          | `components/campaigns/push-dinner-builder.tsx` |
| Desktop app download ("coming soon")               | Properly gated with italic note                  | `components/settings/desktop-app-settings.tsx` |
| Recall dismiss (returns fake success)              | Needs migration + implementation                 | `lib/safety/recall-actions.ts`                 |
| Addon toggle (doesn't persist to DB)               | Needs `quote_line_items` implementation          | `lib/proposals/addon-actions.ts`               |
| Menu engineering `salesCount = 1`                  | Placeholder, needs dish appearance data          | `lib/analytics/menu-engineering.ts`            |
| CAC metric always $0                               | `marketing_spend_log` table doesn't exist        | `lib/analytics/client-analytics.ts`            |
| Multi-night package prices = $0                    | Needs actual prices from chef                    | `lib/pricing/constants.ts`                     |
| Staff labor shows nothing pre-event                | `pay_amount_cents` only set after hours recorded | `components/events/event-staff-panel.tsx`      |
| Remy conversational responses not post-validated   | Inherent LLM risk                                | Remy drawer                                    |
| USDA static pricing data freshness                 | No staleness indicator                           | Grocery pricing                                |

### Resolved Since Last Audit (2026-03-15)

| Item                                          | Resolution                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| $29/month hardcoded on pricing page           | Fixed: extracted to `PRO_PRICE_MONTHLY` constant in `lib/billing/tier.ts`   |
| Grocery cache `hasNoApiData` flag inverted    | Fixed: now derives from null-check on API price columns                     |
| Disconnect Gmail button (no-op)               | Already properly gated: `disabled` + `cursor-not-allowed` + title text      |
| Chefs roster page ("coming soon" empty state) | Not empty: fully functional directory with search, filters, structured data |
