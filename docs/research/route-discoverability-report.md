# Research: Route Discoverability Report

> **Date:** 2026-04-01
> **Question:** Which user-facing `page.tsx` routes exist, and how is each one currently reachable?
> **Status:** complete

---

## Methodology

1. All `app/**/page.tsx` files were listed via filesystem scan.
2. Route paths were extracted by stripping the `app/` prefix and `/page.tsx` suffix.
3. Route group prefixes (e.g., `(chef)`, `(admin)`, `(public)`) were retained for classification but do not affect the URL.
4. Each route was checked against:
   - `components/navigation/nav-config.tsx` (primary chef nav, including `adminOnly` items)
   - `components/navigation/client-nav.tsx` (client portal nav)
   - `components/navigation/partner-nav.tsx` (partner portal nav)
   - `components/staff/staff-nav.tsx` (staff portal nav)
   - Inbound `Link`, `href`, `router.push`, or `redirect` references in `app/` and `components/`
5. Classification key:
   - `discoverable`: appears in a nav config or has an in-product link from a reachable page
   - `token_only`: accessed via a URL-embedded secure token or external invite; not navigable from UI
   - `admin_only`: accessible only to admin-role users via admin nav
   - `hidden`: has `hidden: true` in nav config, or no nav entry and no evident in-product link
   - `redirect_target`: reached only via `redirect()` calls from auth or middleware, not user-facing navigation
   - `external_entry`: a public-facing entry point accessed from outside the app (direct URL, embed, share link, etc.)

---

## Navigation Summary

| Nav Component           | File                                    | Serves                                                   |
| ----------------------- | --------------------------------------- | -------------------------------------------------------- |
| Chef nav (main sidebar) | `components/navigation/nav-config.tsx`  | Chef role, all `/` routes                                |
| Client nav              | `components/navigation/client-nav.tsx`  | Client portal (`/my-*`, `/book-now`, `/my-events`, etc.) |
| Partner nav             | `components/navigation/partner-nav.tsx` | Partner portal (`/partner/*`)                            |
| Staff nav               | `components/staff/staff-nav.tsx`        | Staff portal (`/staff-dashboard`, `/staff-tasks`, etc.)  |
| Admin items in chef nav | `nav-config.tsx` with `adminOnly: true` | Admin section (`/admin/*`)                               |

---

## Route Inventory

### Admin Routes (all `admin_only`)

All admin routes require `requireAdmin()` and redirect to `/unauthorized` on failure.

| Route                                   | Discoverable Via                                   |
| --------------------------------------- | -------------------------------------------------- |
| `/admin`                                | Admin nav (Overview)                               |
| `/admin/analytics`                      | Admin nav                                          |
| `/admin/audit`                          | Admin nav                                          |
| `/admin/beta`                           | Admin nav (Early Signups)                          |
| `/admin/beta-surveys`                   | Admin nav                                          |
| `/admin/beta-surveys/[id]`              | In-page link from `/admin/beta-surveys`            |
| `/admin/beta/onboarding`                | In-page link from `/admin/beta`                    |
| `/admin/cannabis`                       | Admin nav (commented as hidden, but still present) |
| `/admin/clients`                        | Admin nav                                          |
| `/admin/command-center`                 | Admin nav                                          |
| `/admin/communications`                 | Admin nav                                          |
| `/admin/conversations`                  | Admin nav                                          |
| `/admin/conversations/[conversationId]` | In-page from `/admin/conversations`                |
| `/admin/directory`                      | Admin nav                                          |
| `/admin/directory-listings`             | Admin nav                                          |
| `/admin/events`                         | Admin nav                                          |
| `/admin/feedback`                       | Admin nav                                          |
| `/admin/financials`                     | Admin nav                                          |
| `/admin/flags`                          | Admin nav                                          |
| `/admin/hub`                            | Admin nav                                          |
| `/admin/hub/groups/[groupId]`           | In-page from `/admin/hub`                          |
| `/admin/inquiries`                      | Admin nav                                          |
| `/admin/notifications`                  | Admin nav                                          |
| `/admin/outreach`                       | `hidden` (not found in nav-config.tsx nav items)   |
| `/admin/presence`                       | Admin nav                                          |
| `/admin/price-catalog`                  | Admin nav                                          |
| `/admin/pulse`                          | Admin nav                                          |
| `/admin/reconciliation`                 | Admin nav                                          |
| `/admin/referral-partners`              | Admin nav                                          |
| `/admin/silent-failures`                | Admin nav                                          |
| `/admin/social`                         | Admin nav                                          |
| `/admin/system`                         | Admin nav (System Health)                          |
| `/admin/system/payments`                | Admin nav                                          |
| `/admin/users`                          | Admin nav                                          |
| `/admin/users/[chefId]`                 | In-page from `/admin/users`                        |

**Note:** `/admin/outreach` was not found in nav-config.tsx nav items. It exists as a page but may only be reachable by typing the URL directly. Classification: `hidden` (admin context).

---

### Chef Routes

These are accessible to authenticated chef users via the main sidebar.

| Route                                         | Classification | Discoverable Via                              |
| --------------------------------------------- | -------------- | --------------------------------------------- |
| `/aar`                                        | `discoverable` | Nav config sub-item                           |
| `/activity`                                   | `discoverable` | Nav config                                    |
| `/analytics`                                  | `discoverable` | Nav config                                    |
| `/analytics/benchmarks`                       | `discoverable` | Nav config sub-item                           |
| `/analytics/client-ltv`                       | `discoverable` | Nav config sub-item                           |
| `/analytics/daily-report`                     | `discoverable` | Nav config sub-item                           |
| `/analytics/demand`                           | `discoverable` | Nav config sub-item                           |
| `/analytics/funnel`                           | `discoverable` | Nav config sub-item                           |
| `/analytics/pipeline`                         | `discoverable` | Nav config sub-item                           |
| `/analytics/referral-sources`                 | `discoverable` | Nav config sub-item                           |
| `/analytics/reports`                          | `discoverable` | Nav config sub-item                           |
| `/availability`                               | `discoverable` | Nav config                                    |
| `/briefing`                                   | `discoverable` | Nav config                                    |
| `/calendar`                                   | `discoverable` | Nav config                                    |
| `/calendar/day`                               | `discoverable` | Nav config sub-item                           |
| `/calendar/share`                             | `discoverable` | Nav config sub-item                           |
| `/calendar/week`                              | `discoverable` | Nav config sub-item                           |
| `/calendar/year`                              | `discoverable` | Nav config sub-item                           |
| `/calls`                                      | `discoverable` | Nav config                                    |
| `/calls/[id]`                                 | `discoverable` | In-page from `/calls`                         |
| `/calls/[id]/edit`                            | `discoverable` | In-page from `/calls/[id]`                    |
| `/calls/new`                                  | `discoverable` | Nav config sub-item                           |
| `/cannabis`                                   | `discoverable` | Nav config                                    |
| `/cannabis/about`                             | `discoverable` | Nav config sub-item                           |
| `/cannabis/agreement`                         | `discoverable` | Nav config sub-item                           |
| `/cannabis/compliance`                        | `discoverable` | Nav config sub-item                           |
| `/cannabis/control-packet/template`           | `discoverable` | Nav config sub-item                           |
| `/cannabis/events`                            | `discoverable` | Nav config sub-item                           |
| `/cannabis/events/[id]/control-packet`        | `discoverable` | In-page from `/cannabis/events/[id]`          |
| `/cannabis/handbook`                          | `discoverable` | Nav config sub-item                           |
| `/cannabis/hub`                               | `discoverable` | Nav config sub-item                           |
| `/cannabis/invite`                            | `discoverable` | Nav config sub-item                           |
| `/cannabis/ledger`                            | `discoverable` | Nav config sub-item                           |
| `/cannabis/rsvps`                             | `discoverable` | Nav config sub-item                           |
| `/cannabis/unlock`                            | `discoverable` | Nav config sub-item                           |
| `/charity`                                    | `discoverable` | Nav config                                    |
| `/charity/hours`                              | `discoverable` | Nav config sub-item                           |
| `/chat`                                       | `discoverable` | Nav config                                    |
| `/chat/[id]`                                  | `discoverable` | In-page from `/chat`                          |
| `/circles`                                    | `discoverable` | Nav config                                    |
| `/clients`                                    | `discoverable` | Nav config                                    |
| `/clients/[id]`                               | `discoverable` | In-page from `/clients`                       |
| `/clients/[id]/preferences`                   | `discoverable` | In-page from client detail                    |
| `/clients/[id]/recurring`                     | `discoverable` | In-page from client detail                    |
| `/clients/active`                             | `discoverable` | Nav config sub-item                           |
| `/clients/communication`                      | `discoverable` | Nav config                                    |
| `/clients/communication/follow-ups`           | `discoverable` | Nav config sub-item                           |
| `/clients/communication/notes`                | `discoverable` | Nav config sub-item                           |
| `/clients/communication/upcoming-touchpoints` | `discoverable` | Nav config sub-item                           |
| `/clients/duplicates`                         | `discoverable` | Nav config sub-item                           |
| `/clients/gift-cards`                         | `discoverable` | Nav config sub-item                           |
| `/clients/history`                            | `discoverable` | Nav config                                    |
| `/clients/history/event-history`              | `discoverable` | Nav config sub-item                           |
| `/clients/history/past-menus`                 | `discoverable` | Nav config sub-item                           |
| `/clients/history/spending-history`           | `discoverable` | Nav config sub-item                           |
| `/clients/inactive`                           | `discoverable` | Nav config sub-item                           |
| `/clients/insights`                           | `discoverable` | Nav config                                    |
| `/clients/insights/at-risk`                   | `discoverable` | Nav config sub-item                           |
| `/clients/insights/most-frequent`             | `discoverable` | Nav config sub-item                           |
| `/clients/insights/top-clients`               | `discoverable` | Nav config sub-item                           |
| `/clients/intake`                             | `discoverable` | Nav config sub-item                           |
| `/clients/loyalty`                            | `discoverable` | Nav config sub-item                           |
| `/clients/loyalty/points`                     | `discoverable` | Nav config sub-item                           |
| `/clients/loyalty/referrals`                  | `discoverable` | Nav config sub-item                           |
| `/clients/loyalty/rewards`                    | `discoverable` | Nav config sub-item                           |
| `/clients/new`                                | `discoverable` | Nav config sub-item                           |
| `/clients/preferences`                        | `discoverable` | Nav config sub-item                           |
| `/clients/preferences/allergies`              | `discoverable` | Nav config sub-item                           |
| `/clients/preferences/dietary-restrictions`   | `discoverable` | Nav config sub-item                           |
| `/clients/preferences/dislikes`               | `discoverable` | Nav config sub-item                           |
| `/clients/preferences/favorite-dishes`        | `discoverable` | Nav config sub-item                           |
| `/clients/presence`                           | `discoverable` | Nav config sub-item                           |
| `/clients/recurring`                          | `discoverable` | Nav config sub-item                           |
| `/clients/segments`                           | `discoverable` | Nav config sub-item                           |
| `/clients/vip`                                | `discoverable` | Nav config sub-item                           |
| `/commands`                                   | `discoverable` | Nav config                                    |
| `/commerce`                                   | `discoverable` | Nav config                                    |
| `/commerce/observability`                     | `discoverable` | Nav config sub-item                           |
| `/commerce/orders`                            | `discoverable` | Nav config sub-item                           |
| `/commerce/parity`                            | `discoverable` | Nav config sub-item                           |
| `/commerce/products`                          | `discoverable` | Nav config sub-item                           |
| `/commerce/products/[id]`                     | `discoverable` | In-page from products list                    |
| `/commerce/products/new`                      | `discoverable` | Nav config sub-item                           |
| `/commerce/promotions`                        | `discoverable` | Nav config sub-item                           |
| `/commerce/reconciliation`                    | `discoverable` | Nav config sub-item                           |
| `/commerce/reconciliation/[id]`               | `discoverable` | In-page from reconciliation list              |
| `/commerce/register`                          | `discoverable` | Nav config sub-item                           |
| `/commerce/reports`                           | `discoverable` | Nav config sub-item                           |
| `/commerce/reports/shifts`                    | `discoverable` | Nav config sub-item                           |
| `/commerce/sales`                             | `discoverable` | Nav config sub-item                           |
| `/commerce/sales/[id]`                        | `discoverable` | In-page from sales list                       |
| `/commerce/schedules`                         | `discoverable` | Nav config sub-item                           |
| `/commerce/settlements`                       | `discoverable` | Nav config sub-item                           |
| `/commerce/settlements/[id]`                  | `discoverable` | In-page from settlements                      |
| `/commerce/table-service`                     | `discoverable` | Nav config sub-item                           |
| `/commerce/virtual-terminal`                  | `discoverable` | Nav config sub-item                           |
| `/community/templates`                        | `discoverable` | Nav config sub-item                           |
| `/consulting`                                 | `discoverable` | Nav config sub-item (found in nav-config.tsx) |
| `/content`                                    | `discoverable` | Nav config                                    |
| `/contracts`                                  | `discoverable` | Nav config                                    |
| `/contracts/[id]/history`                     | `discoverable` | In-page from contract detail                  |
| `/culinary`                                   | `discoverable` | Nav config                                    |
| `/culinary-board`                             | `discoverable` | Nav config sub-item                           |
| `/culinary/components`                        | `discoverable` | Nav config sub-item                           |
| `/culinary/components/ferments`               | `discoverable` | Nav config sub-item                           |
| `/culinary/components/garnishes`              | `discoverable` | Nav config sub-item                           |
| `/culinary/components/sauces`                 | `discoverable` | Nav config sub-item                           |
| `/culinary/components/shared-elements`        | `discoverable` | Nav config sub-item                           |
| `/culinary/components/stocks`                 | `discoverable` | Nav config sub-item                           |
| `/culinary/costing`                           | `discoverable` | Nav config sub-item                           |
| `/culinary/costing/food-cost`                 | `discoverable` | Nav config sub-item                           |
| `/culinary/costing/menu`                      | `discoverable` | Nav config sub-item                           |
| `/culinary/costing/pricing`                   | `discoverable` | Nav config sub-item                           |
| `/culinary/library`                           | `discoverable` | Nav config sub-item                           |
| `/culinary/prep`                              | `discoverable` | Nav config sub-item                           |
| `/culinary/prep/active`                       | `discoverable` | Nav config sub-item                           |
| `/culinary/prep/scheduled`                    | `discoverable` | Nav config sub-item                           |
| `/culinary/price-catalog`                     | `discoverable` | Nav config sub-item                           |
| `/culinary/recipes`                           | `discoverable` | Nav config sub-item                           |
| `/dashboard`                                  | `discoverable` | Nav config (top-level)                        |
| `/devices`                                    | `discoverable` | Nav config                                    |
| `/events`                                     | `discoverable` | Nav config                                    |
| `/events/[id]`                                | `discoverable` | In-page from events list                      |
| `/events/[id]/edit`                           | `discoverable` | In-page from event detail                     |
| `/events/new`                                 | `discoverable` | Nav config sub-item                           |
| `/expenses`                                   | `discoverable` | Nav config sub-item                           |
| `/expenses/[id]`                              | `discoverable` | In-page from expenses list                    |
| `/expenses/new`                               | `discoverable` | In-page from expenses                         |
| `/finance`                                    | `discoverable` | Nav config (Finance hub)                      |
| `/finance/invoices`                           | `discoverable` | Nav config sub-item                           |
| `/finance/invoices/[id]`                      | `discoverable` | In-page from invoices                         |
| `/finance/payments`                           | `discoverable` | Nav config sub-item                           |
| `/finance/reporting`                          | `discoverable` | Nav config sub-item                           |
| `/finance/reporting/profit-loss`              | `discoverable` | Nav config sub-item                           |
| `/finance/year-end`                           | `discoverable` | Nav config sub-item                           |
| `/financials`                                 | `discoverable` | Nav config (Finance top link)                 |
| `/inbox`                                      | `discoverable` | Nav config (top-level)                        |
| `/inquiries`                                  | `discoverable` | Nav config sub-item                           |
| `/inquiries/[id]`                             | `discoverable` | In-page from inquiries                        |
| `/inquiries/new`                              | `discoverable` | Nav config sub-item                           |
| `/inventory`                                  | `discoverable` | Nav config                                    |
| `/inventory/audits`                           | `discoverable` | Nav config sub-item                           |
| `/inventory/audits/new`                       | `discoverable` | Nav config sub-item                           |
| `/inventory/counts`                           | `discoverable` | Nav config sub-item                           |
| `/inventory/demand`                           | `discoverable` | Nav config sub-item                           |
| `/inventory/expiry`                           | `discoverable` | Nav config sub-item                           |
| `/inventory/food-cost`                        | `discoverable` | Nav config sub-item                           |
| `/inventory/locations`                        | `discoverable` | Nav config sub-item                           |
| `/inventory/procurement`                      | `discoverable` | Nav config sub-item                           |
| `/inventory/purchase-orders`                  | `discoverable` | Nav config sub-item                           |
| `/inventory/purchase-orders/new`              | `discoverable` | Nav config sub-item                           |
| `/inventory/staff-meals`                      | `discoverable` | Nav config sub-item                           |
| `/inventory/transactions`                     | `discoverable` | Nav config sub-item                           |
| `/inventory/vendor-invoices`                  | `discoverable` | Nav config sub-item                           |
| `/inventory/waste`                            | `discoverable` | Nav config sub-item                           |
| `/kitchen`                                    | `discoverable` | Nav config sub-item                           |
| `/leads`                                      | `discoverable` | Nav config                                    |
| `/leads/archived`                             | `discoverable` | Nav config sub-item                           |
| `/leads/contacted`                            | `discoverable` | Nav config sub-item                           |
| `/leads/converted`                            | `discoverable` | Nav config sub-item                           |
| `/leads/new`                                  | `discoverable` | Nav config sub-item                           |
| `/leads/qualified`                            | `discoverable` | Nav config sub-item                           |
| `/loyalty`                                    | `discoverable` | Nav config                                    |
| `/loyalty/learn`                              | `discoverable` | Nav config sub-item                           |
| `/loyalty/raffle`                             | `discoverable` | Nav config sub-item                           |
| `/loyalty/rewards/new`                        | `discoverable` | Nav config sub-item                           |
| `/loyalty/settings`                           | `discoverable` | Nav config sub-item                           |
| `/marketing`                                  | `discoverable` | Nav config                                    |
| `/marketing/content-pipeline`                 | `discoverable` | Nav config sub-item                           |
| `/marketing/push-dinners`                     | `discoverable` | Nav config sub-item                           |
| `/marketing/push-dinners/new`                 | `discoverable` | Nav config sub-item                           |
| `/marketing/sequences`                        | `discoverable` | Nav config sub-item                           |
| `/marketing/templates`                        | `discoverable` | Nav config sub-item                           |
| `/marketplace`                                | `discoverable` | Nav config                                    |
| `/marketplace/capture`                        | `discoverable` | Nav config sub-item                           |
| `/meal-prep`                                  | `discoverable` | Nav config                                    |
| `/menus`                                      | `discoverable` | Nav config sub-item                           |
| `/menus/dishes`                               | `discoverable` | Nav config sub-item                           |
| `/menus/estimate`                             | `discoverable` | Nav config sub-item                           |
| `/menus/new`                                  | `discoverable` | Nav config sub-item                           |
| `/menus/tasting`                              | `discoverable` | Nav config sub-item                           |
| `/menus/upload`                               | `discoverable` | Nav config sub-item                           |
| `/network`                                    | `discoverable` | Nav config                                    |
| `/network/collabs`                            | `discoverable` | Nav config sub-item                           |
| `/network/notifications`                      | `discoverable` | Nav config sub-item                           |
| `/network/saved`                              | `discoverable` | Nav config sub-item                           |
| `/notifications`                              | `discoverable` | Nav config                                    |
| `/operations`                                 | `discoverable` | Nav config                                    |
| `/operations/equipment`                       | `discoverable` | Nav config sub-item                           |
| `/operations/kitchen-rentals`                 | `discoverable` | Nav config sub-item                           |
| `/partners`                                   | `discoverable` | Nav config                                    |
| `/partners/active`                            | `discoverable` | Nav config sub-item                           |
| `/partners/events-generated`                  | `discoverable` | Nav config sub-item                           |
| `/partners/inactive`                          | `discoverable` | Nav config sub-item                           |
| `/partners/new`                               | `discoverable` | Nav config sub-item                           |
| `/partners/referral-performance`              | `discoverable` | Nav config sub-item                           |
| `/payments/splitting`                         | `discoverable` | Nav config sub-item                           |
| `/portfolio`                                  | `discoverable` | Nav config sub-item                           |
| `/prices`                                     | `discoverable` | Nav config sub-item                           |
| `/production`                                 | `discoverable` | Nav config sub-item                           |
| `/proposals`                                  | `discoverable` | Nav config                                    |
| `/proposals/addons`                           | `discoverable` | Nav config sub-item                           |
| `/proposals/builder`                          | `discoverable` | Nav config sub-item                           |
| `/proposals/templates`                        | `discoverable` | Nav config sub-item                           |
| `/prospecting`                                | `discoverable` | Nav config (adminOnly)                        |
| `/prospecting/clusters`                       | `discoverable` | Nav config sub-item (adminOnly)               |
| `/prospecting/import`                         | `discoverable` | Nav config sub-item (adminOnly)               |
| `/prospecting/pipeline`                       | `discoverable` | Nav config sub-item (adminOnly)               |
| `/prospecting/queue`                          | `discoverable` | Nav config sub-item (adminOnly)               |
| `/prospecting/scripts`                        | `discoverable` | Nav config sub-item (adminOnly)               |
| `/prospecting/scrub`                          | `discoverable` | Nav config sub-item (adminOnly)               |
| `/queue`                                      | `discoverable` | Nav config                                    |
| `/quotes`                                     | `discoverable` | Nav config sub-item                           |
| `/quotes/accepted`                            | `discoverable` | Nav config sub-item                           |
| `/quotes/draft`                               | `discoverable` | Nav config sub-item                           |
| `/quotes/expired`                             | `discoverable` | Nav config sub-item                           |
| `/quotes/new`                                 | `discoverable` | Nav config sub-item                           |
| `/quotes/rejected`                            | `discoverable` | Nav config sub-item                           |
| `/quotes/sent`                                | `discoverable` | Nav config sub-item                           |
| `/quotes/viewed`                              | `discoverable` | Nav config sub-item                           |
| `/rate-card`                                  | `discoverable` | Nav config sub-item                           |
| `/receipts`                                   | `discoverable` | Nav config sub-item                           |
| `/recipes`                                    | `discoverable` | Nav config sub-item                           |
| `/recipes/dump`                               | `discoverable` | Nav config sub-item                           |
| `/recipes/import`                             | `discoverable` | Nav config sub-item                           |
| `/recipes/ingredients`                        | `discoverable` | Nav config sub-item                           |
| `/recipes/new`                                | `discoverable` | Nav config sub-item                           |
| `/recipes/photos`                             | `discoverable` | Nav config sub-item                           |
| `/recipes/production-log`                     | `discoverable` | Nav config sub-item                           |
| `/recipes/sprint`                             | `discoverable` | Nav config sub-item                           |
| `/remy`                                       | `discoverable` | Nav config                                    |
| `/reports`                                    | `discoverable` | Nav config sub-item                           |
| `/reputation/mentions`                        | `discoverable` | Nav config sub-item                           |
| `/reviews`                                    | `discoverable` | Nav config sub-item                           |
| `/safety/backup-chef`                         | `discoverable` | Nav config sub-item                           |
| `/safety/claims`                              | `discoverable` | Nav config sub-item                           |
| `/safety/claims/documents`                    | `discoverable` | Nav config sub-item                           |
| `/safety/claims/new`                          | `hidden`       | In nav but `hidden: true`                     |
| `/safety/incidents`                           | `discoverable` | Nav config sub-item                           |
| `/safety/incidents/new`                       | `discoverable` | Nav config sub-item                           |
| `/schedule`                                   | `discoverable` | Nav config sub-item (also standalone bottom)  |
| `/scheduling`                                 | `discoverable` | Nav config sub-item                           |
| `/settings`                                   | `discoverable` | Nav config                                    |
| `/settings/*` (all sub-pages)                 | `discoverable` | Settings nav links in nav-config.tsx          |
| `/social`                                     | `discoverable` | Nav config                                    |
| `/social/calendar`                            | `discoverable` | Nav config sub-item                           |
| `/social/compose/[eventId]`                   | `hidden`       | Nav item `hidden: true`                       |
| `/social/connections`                         | `discoverable` | Nav config sub-item                           |
| `/social/hub-overview`                        | `discoverable` | Nav config sub-item                           |
| `/social/planner`                             | `discoverable` | Nav config sub-item                           |
| `/social/planner/[month]`                     | `discoverable` | In-page from planner                          |
| `/social/posts/[id]`                          | `discoverable` | In-page from posts list                       |
| `/social/settings`                            | `discoverable` | Nav config sub-item                           |
| `/social/templates`                           | `discoverable` | Nav config sub-item                           |
| `/social/vault`                               | `discoverable` | Nav config sub-item                           |
| `/staff`                                      | `discoverable` | Nav config                                    |
| `/staff/[id]`                                 | `discoverable` | In-page from staff list                       |
| `/staff/availability`                         | `discoverable` | Nav config sub-item                           |
| `/staff/clock`                                | `discoverable` | Nav config sub-item                           |
| `/staff/labor`                                | `discoverable` | Nav config sub-item                           |
| `/staff/live`                                 | `discoverable` | Nav config sub-item                           |
| `/staff/performance`                          | `discoverable` | Nav config sub-item                           |
| `/staff/schedule`                             | `discoverable` | Nav config sub-item                           |
| `/stations`                                   | `discoverable` | Nav config                                    |
| `/stations/[id]`                              | `discoverable` | In-page from stations list                    |
| `/stations/[id]/clipboard`                    | `discoverable` | In-page from station detail                   |
| `/stations/[id]/clipboard/print`              | `discoverable` | In-page from clipboard                        |
| `/stations/daily-ops`                         | `discoverable` | Nav config sub-item                           |
| `/stations/ops-log`                           | `discoverable` | Nav config sub-item                           |
| `/stations/orders`                            | `discoverable` | Nav config sub-item                           |
| `/stations/orders/print`                      | `discoverable` | In-page from orders                           |
| `/stations/waste`                             | `discoverable` | Nav config sub-item                           |
| `/surveys`                                    | `discoverable` | Nav config sub-item                           |
| `/tasks`                                      | `discoverable` | Nav config                                    |
| `/tasks/gantt`                                | `discoverable` | Nav config sub-item                           |
| `/tasks/templates`                            | `discoverable` | Nav config sub-item                           |
| `/tasks/va`                                   | `discoverable` | Nav config sub-item                           |
| `/team`                                       | `discoverable` | Nav config                                    |
| `/testimonials`                               | `discoverable` | Nav config sub-item                           |
| `/travel`                                     | `discoverable` | Nav config sub-item                           |
| `/vendors`                                    | `discoverable` | Nav config                                    |
| `/vendors/[id]`                               | `discoverable` | In-page from vendors list                     |
| `/vendors/invoices`                           | `discoverable` | Nav config sub-item                           |
| `/vendors/price-comparison`                   | `discoverable` | Nav config sub-item                           |
| `/waitlist`                                   | `discoverable` | Nav config sub-item                           |
| `/wix-submissions`                            | `discoverable` | Nav config sub-item                           |
| `/wix-submissions/[id]`                       | `discoverable` | In-page from wix submissions                  |

**Chef-layout routes with no nav entry found:**

| Route                     | Classification | Notes                                                                                                  |
| ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| `/chef/cannabis/handbook` | `hidden`       | Duplicate of `/cannabis/handbook`? Both exist as separate page.tsx files under different route groups. |
| `/chef/cannabis/rsvps`    | `hidden`       | Duplicate of `/cannabis/rsvps`? Same concern as above.                                                 |

---

### Client Portal Routes

| Route                                   | Classification | Discoverable Via                                         |
| --------------------------------------- | -------------- | -------------------------------------------------------- |
| `/book-now`                             | `discoverable` | Client nav (BOOK_NOW_HREF constant)                      |
| `/my-bookings`                          | `discoverable` | Client nav                                               |
| `/my-cannabis`                          | `discoverable` | Client nav (if cannabis feature enabled)                 |
| `/my-chat`                              | `discoverable` | Client nav                                               |
| `/my-chat/[id]`                         | `discoverable` | In-page from `/my-chat`                                  |
| `/my-events`                            | `discoverable` | Client nav, in-page links                                |
| `/my-events/[id]`                       | `discoverable` | In-page from `/my-events`                                |
| `/my-events/[id]/approve-menu`          | `discoverable` | In-page from event detail                                |
| `/my-events/[id]/choose-menu`           | `discoverable` | In-page from event detail                                |
| `/my-events/[id]/contract`              | `discoverable` | In-page from event detail                                |
| `/my-events/[id]/countdown`             | `discoverable` | In-page from event detail                                |
| `/my-events/[id]/event-summary`         | `discoverable` | In-page from event detail                                |
| `/my-events/[id]/invoice`               | `discoverable` | In-page from event detail                                |
| `/my-events/[id]/pay`                   | `discoverable` | In-page from event detail                                |
| `/my-events/[id]/payment-plan`          | `discoverable` | In-page from event detail                                |
| `/my-events/[id]/pre-event-checklist`   | `discoverable` | In-page from event detail                                |
| `/my-events/[id]/proposal`              | `discoverable` | In-page from event detail                                |
| `/my-events/history`                    | `discoverable` | In-page from `/my-events`                                |
| `/my-events/settings/dashboard`         | `hidden`       | No nav link found; may be accessible via direct URL only |
| `/my-hub`                               | `discoverable` | Client nav                                               |
| `/my-hub/create`                        | `discoverable` | In-page from `/my-hub`                                   |
| `/my-hub/friends`                       | `discoverable` | In-page from `/my-hub`                                   |
| `/my-hub/friends/invite/[profileToken]` | `token_only`   | Reached via invite link with token                       |
| `/my-hub/g/[groupToken]`                | `token_only`   | Reached via group share link                             |
| `/my-hub/notifications`                 | `discoverable` | In-page from `/my-hub`                                   |
| `/my-hub/share-chef`                    | `discoverable` | In-page from `/my-hub`                                   |
| `/my-inquiries`                         | `discoverable` | Client nav or in-page links                              |
| `/my-inquiries/[id]`                    | `discoverable` | In-page from `/my-inquiries`                             |
| `/my-profile`                           | `discoverable` | Client nav                                               |
| `/my-quotes`                            | `discoverable` | Client nav                                               |
| `/my-quotes/[id]`                       | `discoverable` | In-page from `/my-quotes`                                |
| `/my-rewards`                           | `discoverable` | Client nav                                               |
| `/my-rewards/about`                     | `discoverable` | In-page from `/my-rewards`                               |
| `/my-spending`                          | `discoverable` | Client nav                                               |
| `/onboarding/[token]`                   | `token_only`   | Token-based invite email link                            |
| `/survey/[token]`                       | `token_only`   | Token-based survey link                                  |

---

### Partner Portal Routes

| Route                     | Classification | Discoverable Via                  |
| ------------------------- | -------------- | --------------------------------- |
| `/partner/dashboard`      | `discoverable` | Partner nav                       |
| `/partner/events`         | `discoverable` | Partner nav                       |
| `/partner/locations`      | `discoverable` | Partner nav                       |
| `/partner/locations/[id]` | `discoverable` | In-page from `/partner/locations` |
| `/partner/preview`        | `discoverable` | Partner nav                       |
| `/partner/profile`        | `discoverable` | Partner nav                       |

---

### Staff Portal Routes

Accessed via `/staff-login`. Navigation provided by `components/staff/staff-nav.tsx`.

| Route              | Classification | Discoverable Via |
| ------------------ | -------------- | ---------------- |
| `/staff-dashboard` | `discoverable` | Staff nav        |
| `/staff-recipes`   | `discoverable` | Staff nav        |
| `/staff-schedule`  | `discoverable` | Staff nav        |
| `/staff-station`   | `discoverable` | Staff nav        |
| `/staff-tasks`     | `discoverable` | Staff nav        |
| `/staff-time`      | `discoverable` | Staff nav        |

Note: The route paths in the filesystem are under `/(staff)/staff-dashboard` etc., while the nav links point to `/staff-dashboard`. This is correct Next.js route group behavior.

---

### Public Routes

Accessible without authentication. Most are external-entry or token-only.

| Route                                  | Classification    | Discoverable Via                                 |
| -------------------------------------- | ----------------- | ------------------------------------------------ |
| `/` (public index)                     | `external_entry`  | Root URL                                         |
| `/about`                               | `external_entry`  | Footer, marketing site                           |
| `/availability/[token]`                | `token_only`      | Booking availability check link                  |
| `/beta`                                | `external_entry`  | Marketing, direct URL                            |
| `/beta/thank-you`                      | `redirect_target` | Redirect after beta signup                       |
| `/book`                                | `external_entry`  | Public booking landing                           |
| `/cannabis-invite/[token]`             | `token_only`      | Cannabis event invite via token                  |
| `/cannabis/public`                     | `external_entry`  | Public cannabis information page                 |
| `/chef/[slug]`                         | `external_entry`  | Chef public profile, linked from directory       |
| `/chef/[slug]/gift-cards`              | `external_entry`  | Linked from chef public profile                  |
| `/chef/[slug]/gift-cards/success`      | `redirect_target` | Post-purchase redirect                           |
| `/chef/[slug]/inquire`                 | `external_entry`  | Inquiry form linked from chef profile            |
| `/chef/[slug]/partner-signup`          | `external_entry`  | Partner signup via chef link                     |
| `/chefs`                               | `external_entry`  | Chef directory                                   |
| `/compare`                             | `external_entry`  | Marketing comparison page                        |
| `/compare/[slug]`                      | `external_entry`  | In-page from `/compare`                          |
| `/contact`                             | `external_entry`  | Marketing site footer                            |
| `/customers`                           | `external_entry`  | Marketing site, customer stories                 |
| `/customers/[slug]`                    | `external_entry`  | In-page from `/customers`                        |
| `/discover`                            | `external_entry`  | Marketing / directory                            |
| `/discover/[slug]`                     | `external_entry`  | In-page from `/discover`                         |
| `/discover/[slug]/enhance`             | `hidden`          | No obvious public link; possibly an admin action |
| `/discover/submit`                     | `external_entry`  | Submit listing form                              |
| `/discover/unsubscribe`                | `token_only`      | Unsubscribe link in emails                       |
| `/event/[eventId]/guest/[secureToken]` | `token_only`      | Guest-facing event page, token in email          |
| `/faq`                                 | `external_entry`  | Marketing site footer                            |
| `/feedback/[token]`                    | `token_only`      | Post-event feedback link in email                |
| `/for-operators`                       | `external_entry`  | Marketing page                                   |
| `/g/[code]`                            | `token_only`      | Referral / group link                            |
| `/guest-feedback/[token]`              | `token_only`      | Guest feedback via emailed link                  |
| `/hub/g/[groupToken]`                  | `token_only`      | Hub group link                                   |
| `/hub/join/[groupToken]`               | `token_only`      | Hub group invite link                            |
| `/hub/me/[profileToken]`               | `token_only`      | Hub profile link                                 |
| `/marketplace-chefs`                   | `external_entry`  | Marketing / directory                            |
| `/partner-report/[token]`              | `token_only`      | Partner report via token                         |
| `/partner-signup`                      | `external_entry`  | Partner signup landing                           |
| `/privacy`                             | `external_entry`  | Footer link                                      |
| `/privacy-policy`                      | `external_entry`  | Footer link                                      |
| `/proposal/[token]`                    | `token_only`      | Proposal link in email                           |
| `/reactivate-account`                  | `redirect_target` | Reached after account deactivation               |
| `/review/[token]`                      | `token_only`      | Review request via emailed link                  |
| `/share/[token]`                       | `token_only`      | Chef share link                                  |
| `/share/[token]/recap`                 | `token_only`      | Event recap via share link                       |
| `/staff-portal/[id]`                   | `token_only`      | Staff portal link                                |
| `/terms`                               | `external_entry`  | Footer link                                      |
| `/tip/[token]`                         | `token_only`      | Tip page via emailed link                        |
| `/trust`                               | `external_entry`  | Marketing page                                   |
| `/unsubscribe`                         | `token_only`      | Email unsubscribe link                           |
| `/view/[token]`                        | `token_only`      | Generic view-by-token route                      |
| `/worksheet/[token]`                   | `token_only`      | Worksheet link in email or doc                   |

---

### Auth Routes

| Route                   | Classification    | Discoverable Via                       |
| ----------------------- | ----------------- | -------------------------------------- |
| `/auth/signin`          | `discoverable`    | Unauthenticated redirect               |
| `/auth/signup`          | `discoverable`    | Sign-in page link                      |
| `/auth/forgot-password` | `discoverable`    | Sign-in page link                      |
| `/auth/reset-password`  | `token_only`      | Password reset email link              |
| `/auth/verify-email`    | `token_only`      | Email verification link                |
| `/auth/client-signup`   | `external_entry`  | Client invitation flow                 |
| `/auth/partner-signup`  | `external_entry`  | Partner signup flow                    |
| `/auth/role-selection`  | `redirect_target` | Post-signup redirect                   |
| `/unauthorized`         | `redirect_target` | Auth failure redirect from admin pages |

---

### Special Routes

| Route                        | Classification    | Notes                                                                                                                        |
| ---------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/beta-survey`               | `external_entry`  | Admin sends invites with URLs like `{appUrl}/beta-survey/{token}`; the root `/beta-survey` may be an entry page              |
| `/beta-survey/[token]`       | `token_only`      | Token-based survey link sent by admin                                                                                        |
| `/book/[chefSlug]`           | `external_entry`  | Public booking page linked from chef profile, SEO-indexed                                                                    |
| `/book/[chefSlug]/thank-you` | `redirect_target` | Post-booking confirmation                                                                                                    |
| `/book/campaign/[token]`     | `token_only`      | Campaign-specific booking link                                                                                               |
| `/client/[token]`            | `token_only`      | Client portal entry via token                                                                                                |
| `/embed/inquiry/[chefId]`    | `external_entry`  | Embed widget iframe target; accessed from embedded widget on external sites                                                  |
| `/intake/[token]`            | `token_only`      | Intake form via token link                                                                                                   |
| `/kiosk`                     | `external_entry`  | Kiosk device entry point; reached via physical device URL. Linked from `components/devices/pairing-display.tsx` for QR code. |
| `/kiosk/disabled`            | `redirect_target` | Kiosk disabled state                                                                                                         |
| `/kiosk/pair`                | `external_entry`  | Kiosk pairing entry                                                                                                          |
| `/print/menu/[id]`           | `hidden`          | Print-optimized page; no nav link found but accessible by URL                                                                |
| `/staff-login`               | `external_entry`  | Staff portal login; linked from `staff-nav.tsx` signout and `/(staff)/layout.tsx` redirect                                   |
| `/discover/join`             | `hidden`          | Under `/(bare)/` route group; no nav link found                                                                              |

---

## Hidden But Valid Feature Candidates

These routes exist as fully built pages with no obvious navigation link. They may represent intentional deep-link-only features, forgotten wiring, or features under active development that simply need a nav entry.

| Route                                                | Why It Matters                                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin/outreach`                                    | Appears to be an admin outreach management page with no nav link. The admin section has 30+ other nav items, suggesting this may have been removed from nav but left in place. |
| `/my-events/settings/dashboard`                      | A settings page within the client portal that has no link in the client nav. May be reachable via in-page button not found in the nav scan.                                    |
| `/discover/[slug]/enhance`                           | A public-accessible route under the discover section with no public link found. May be an admin or operator action accessible via direct URL.                                  |
| `/discover/join`                                     | Under the `/(bare)/` route group, meaning it renders with minimal chrome. No link found. May be a stub or an orphaned landing page.                                            |
| `/print/menu/[id]`                                   | A print-optimized menu view. Accessible by constructing the URL, but no nav link was found. Likely triggered programmatically from a print button somewhere in the app.        |
| `/chef/cannabis/handbook` and `/chef/cannabis/rsvps` | Appear to be duplicates of `/cannabis/handbook` and `/cannabis/rsvps` under a different route group path. If both exist, one may be dead.                                      |

---

## Hidden Nav Items (Explicitly Marked)

These items exist in nav-config.tsx with `hidden: true`:

| Route                | Notes                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/social/compose`    | Hidden nav item; the route `/social/compose/[eventId]` exists. Composing is triggered from an event context, not a standalone nav entry. |
| `/safety/claims/new` | Hidden nav item; accessible in-page from `/safety/claims`.                                                                               |
