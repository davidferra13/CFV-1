# Wiring Audit Report

> Generated: 2026-05-10
> Method: Automated route extraction + agent classification swarm
> Scope: All 886 Next.js page routes

## Summary

| Category         | Count  | Meaning                                                         |
| ---------------- | ------ | --------------------------------------------------------------- |
| Wired            | 807    | 2+ inbound references, reachable                                |
| Weak (OK)        | 24     | 1 ref, but appropriately linked (parent-child, auth flow, etc.) |
| **Needs Wiring** | **26** | Real features with no/insufficient navigation path              |
| Redirect Stubs   | 13     | Legacy URL aliases (harmless, backward compat)                  |
| WIP              | 1      | Intentionally hidden                                            |
| Skipped          | 3      | Root/dynamic too short to scan                                  |

---

## NEEDS WIRING (26 routes)

### Chef-Side (15 routes)

| Route                     | What It Does                                       | Wire From                         |
| ------------------------- | -------------------------------------------------- | --------------------------------- |
| `/admin/beta/onboarding`  | Beta tester onboarding progress dashboard          | Admin nav "Platform" group        |
| `/admin/pricing-coverage` | PIE geographic/ingredient coverage map             | Admin nav "System" group          |
| `/admin/pricing-health`   | PIE engine health dashboard (founder-only)         | Admin nav "System" group          |
| `/analytics/forecast`     | 6-month revenue forecast with confidence scores    | Analytics hub page                |
| `/analytics/vendors`      | Vendor price comparison and savings report         | Analytics hub page                |
| `/analytics/weekly`       | Weekly ops summary (events, revenue, expenses)     | Analytics hub page or dashboard   |
| `/calendar/travel`        | Travel route optimization (clusters nearby events) | Calendar page                     |
| `/contracts/new`          | New contract creation form                         | `/contracts` page ("New" button)  |
| `/menus/seasonal`         | Seasonal menu builder (in-season ingredients)      | Menus page                        |
| `/remy/signals`           | CIL intelligence signals feed by domain            | Remy area or dashboard            |
| `/meal-prep/batch`        | Weekly batch aggregation across clients            | `/meal-prep` page                 |
| `/meal-prep/retro`        | Weekly retrospective (performance, containers)     | `/meal-prep` page                 |
| `/prep/consolidation`     | Cross-event prep consolidation opportunities       | Culinary/prep section             |
| `/shopping/bulk`          | Bulk buy optimizer (2-week lookahead)              | Shopping list or culinary section |
| `/staff/optimization`     | Double-booking detection, staff sharing (Pro)      | `/staff` page                     |

### Client-Side (11 routes)

| Route                    | What It Does                                       | Wire From                     |
| ------------------------ | -------------------------------------------------- | ----------------------------- |
| `/browse-dates`          | Interactive calendar for booking available dates   | Near "Book Now" CTA           |
| `/my-calendar`           | Client's upcoming events calendar view             | Client nav sidebar            |
| `/my-dietary`            | Dietary profile hub (allergies, household, guests) | Client nav sidebar            |
| `/my-gift-cards`         | Gift cards and store credit balance                | Client nav (Rewards/Payments) |
| `/my-help`               | Help center (FAQ, policies, how-it-works)          | Client nav footer             |
| `/my-notifications`      | Full notifications page with mark-all-read         | NotificationBell "View All"   |
| `/my-receipts/[eventId]` | Printable event receipt/invoice detail             | Event pages, `/my-spending`   |
| `/my-recipes`            | Dish history (everything chef has made for client) | Client nav sidebar            |
| `/my-recurring`          | Recurring meal programs and service arrangements   | Client nav sidebar            |
| `/my-referrals`          | Referral program (invite friends, earn rewards)    | Client nav (near Rewards)     |
| `/my-timeline`           | Complete event history timeline with stats         | Client nav or `/my-bookings`  |

### Weak Routes Needing Additional Wiring (from agent 4)

| Route                    | What It Does                            | Wire From                         |
| ------------------------ | --------------------------------------- | --------------------------------- |
| `/finance/tax-prep`      | Tax preparation dashboard               | Finance section nav               |
| `/prospecting/openclaw`  | OpenClaw lead import browser            | Prospecting or admin nav          |
| `/settings/data-quality` | Data quality/merge interface            | Add to `settings-nav.ts` (System) |
| `/settings/schedule`     | Schedule settings (possibly stale path) | Verify vs `/settings/scheduling`  |
| `/social/planner`        | Social content planner index            | Chef nav social section           |
| `/my-documents`          | Client documents page                   | Client nav sidebar                |
| `/my-meals`              | Client meal history                     | Client nav sidebar                |
| `/my-passport`           | Client culinary passport                | Client nav or profile             |
| `/my-receipts`           | Receipt list page (parent of detail)    | Client nav (Payments)             |
| `/my-reviews`            | Client review history                   | Client nav or post-event          |
| `/hub/open-tables`       | Public open table discovery             | Public hub navigation             |

---

## REDIRECT STUBS (13 routes, no action needed)

These are harmless backward-compatibility redirects. Keep for old bookmarks.

| Route                      | Redirects To                            |
| -------------------------- | --------------------------------------- |
| `/chef/cannabis/handbook`  | `/cannabis/handbook`                    |
| `/chef/cannabis/rsvps`     | `/cannabis/rsvps`                       |
| `/consulting`              | `/quotes/calculator`                    |
| `/culinary/supplier-calls` | `/culinary/call-sheet`                  |
| `/guest-analytics`         | `/clients/insights`                     |
| `/safety/claims`           | `/settings/compliance/claims`           |
| `/safety/claims/documents` | `/settings/compliance/claims/documents` |
| `/safety/claims/new`       | `/settings/compliance/claims/new`       |
| `/safety/incidents/new`    | `/settings/compliance/incidents/new`    |
| `/settings/support`        | `/settings/billing`                     |
| `/social/calendar`         | `/marketing/social`                     |
| `/social/hub-overview`     | `/circles/admin`                        |
| `/social/vault`            | `/content/vault`                        |

---

## WIP (1 route)

| Route             | Reason                                                               |
| ----------------- | -------------------------------------------------------------------- |
| `/admin/outreach` | Directory/outreach feature intentionally hidden per product decision |

---

## Missing Prerequisites

- **`/my-receipts` list page** does not exist. The detail page (`/my-receipts/[eventId]`) links back to it, creating a dead back-link. Needs creation.

---

## Recommended Wiring Priority

### P0 - Client Navigation Gap (Critical)

The client nav has only 6 items but 11+ real features are built. Client experience is severely under-wired.

**Action:** Update `components/navigation/client-nav.tsx` to add: calendar, dietary, recipes, help, notifications, timeline, documents, meals, referrals, gift-cards, recurring.

### P1 - Chef Feature Discovery

9 fully-built chef features (analytics forecast/vendors/weekly, seasonal menus, travel optimizer, meal-prep batch/retro, prep consolidation, staff optimization) are invisible.

**Action:** Add links from their natural parent pages (analytics hub, menus page, calendar, meal-prep dashboard, staff page).

### P2 - Admin & Settings

5 admin/settings pages need nav entries.

**Action:** Update `admin-nav-config.ts` and `settings-nav.ts`.

### P3 - Print & Stations

1 print page needs a "Print" button on its parent.

**Action:** Add print button to `/stations/orders`.

---

## Methodology

1. Script extracted 886 routes from `app/` directory
2. Script scanned 6,183 source files for inbound references to each route
3. Routes with 0 refs = ORPHAN candidates, 1 ref = WEAK candidates
4. 4 parallel classification agents read each page, determined if real/stub/redirect
5. Results consolidated into this report
