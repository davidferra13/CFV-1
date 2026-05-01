# Route Discoverability Audit

- Date: 2026-05-01
- Scope: Next.js `app` page routes, role classification, chef nav coverage, and static link signals
- Source spec: `docs/specs/p1-code-reachability-and-safe-prune-audit.md`
- Method: `lib/interface/route-inventory.ts`, `npm run verify:chef-nav`, and static `href` / `router.push` / `redirect` extraction

## Summary

The route surface is much larger than the primary navigation. That is expected in a broad operator product, but the audit found real discoverability risk in the chef workspace.

| Role | Static page routes | Dynamic page routes | Manual coverage routes | Static routes without manual coverage |
| --- | ---: | ---: | ---: | ---: |
| public | 62 | 56 | 50 | 36 |
| chef | 507 | 107 | 292 | 257 |
| client | 23 | 18 | 24 | 14 |
| admin | 38 | 4 | 17 | 22 |
| staff | 8 | 0 | 0 | 8 |
| partner | 5 | 1 | 0 | 5 |

Static link extraction found 412 distinct in-app href targets across `app`, `components`, `lib`, and `hooks`.

## Chef Navigation Audit

Command: `npm run verify:chef-nav`

Result: failed. This is discoverability evidence, not a build failure.

Findings:

- Top-level visible count is 23; expected maximum is 16.
- 14 duplicate nav hrefs exist.
- 6 primary nav routes point to placeholder or prototype surfaces.
- 1 secondary nav route points to a placeholder or prototype surface.
- 42 implemented non-placeholder static chef routes are missing from nav.

Duplicate hrefs:

| Href | Duplicate count |
| --- | ---: |
| `/culinary` | 2 |
| `/clients` | 2 |
| `/finance` | 3 |
| `/intelligence` | 2 |
| `/culinary/equipment` | 2 |
| `/operations/equipment` | 2 |
| `/operations/equipment?tab=maintenance` | 2 |
| `/recipes` | 2 |
| `/reviews` | 2 |
| `/import` | 2 |
| `/social/planner` | 2 |
| `/wix-submissions` | 2 |
| `/meal-prep` | 2 |
| `/marketplace` | 2 |

Primary placeholder or prototype routes:

- `/guests`
- `/commerce/table-service`
- `/documents`
- `/scheduling`
- `/prospecting`
- `/vendors`

Secondary placeholder or prototype route:

- `/finance/sales-tax/settings`

## Missing Chef Routes From Nav

The audit found these implemented non-placeholder static routes missing from the chef nav:

`/analytics/marketing/spend`, `/cannabis`, `/cannabis/agreement`, `/cannabis/compliance`, `/cannabis/events`, `/cannabis/handbook`, `/cannabis/hub`, `/cannabis/invite`, `/cannabis/ledger`, `/cannabis/rsvps`, `/cannabis/unlock`, `/chef/cannabis/handbook`, `/chef/cannabis/rsvps`, `/classes`, `/classes/new`, `/clients/strategy-readiness`, `/culinary/dictionary`, `/culinary/recipes`, `/culinary/recipes/new`, `/culinary/supplier-calls`, `/culinary/vendors`, `/daily-checklist`, `/dev/simulate`, `/events/series`, `/finance/ledger/owner-draws`, `/financials`, `/growth`, `/network/opportunities`, `/onboarding`, `/onboarding/clients`, `/onboarding/loyalty`, `/onboarding/recipes`, `/onboarding/staff`, `/pilot`, `/prospecting/openclaw`, `/schedule`, `/stations/menu-board`, `/stations/menu-performance`, `/stations/service-log`, `/stations/waste/patterns`, `/store`, `/welcome`.

## Route Classification

| Class | Meaning | Action |
| --- | --- | --- |
| linked | Direct href, nav, redirect, or router push evidence exists. | Keep unless code-level orphan proof contradicts it. |
| hidden-valid | Route exists and appears real, but is not discoverable from nav. | Recover through canonical navigation, All Features, command palette, or contextual links. |
| placeholder-visible | Route is visible but implementation is placeholder or prototype. | Hide, demote, or finish before presenting as functional. |
| dynamic-token | Route uses dynamic or token path segments. | Keep until token issuance and external path proof is complete. |
| external-entry | API or callback route may be invoked externally. | Keep until webhook, OAuth, cron, and scheduler contracts are reviewed. |

## High-Value Recover Candidates

These are not prune candidates. They are likely real surfaces that need ownership decisions:

1. Cannabis workflow cluster: `/cannabis/*`
2. Staff routes: `/staff-dashboard`, `/staff-notifications`, `/staff-profile`, `/staff-recipes`, `/staff-schedule`, `/staff-station`, `/staff-tasks`, `/staff-time`
3. Partner routes: `/partner/dashboard`, `/partner/events`, `/partner/locations`, `/partner/preview`, `/partner/profile`
4. Client hub routes: `/my-hub/*`, `/my-profile/*`, `/my-rewards/about`, `/my-spending`
5. Event series and station routes: `/events/series`, `/stations/menu-board`, `/stations/menu-performance`, `/stations/service-log`, `/stations/waste/patterns`

## Architecture Candidates

1. Navigation Discoverability Module

Files: `components/navigation/nav-config.tsx`, `lib/interface/route-inventory.ts`, `scripts/audit-chef-nav.ts`

Problem: route existence, nav visibility, placeholder status, and coverage status are split across several shallow interfaces. The audit can find problems, but the product has no single deep module that answers whether a route is correctly discoverable.

Solution: deepen route inventory into a Navigation Discoverability Module that returns one classification per route: linked, hidden-valid, placeholder-visible, dynamic-token, or external-entry.

Benefits: callers get leverage from one route classification interface, and future nav fixes have locality.

2. Role Surface Module

Files: `lib/auth/route-policy.ts`, `lib/interface/route-inventory.ts`, role layouts under `app/(admin)`, `app/(chef)`, `app/(client)`, `app/(staff)`, and `app/(partner)`

Problem: role classification exists, but discoverability and coverage evidence are not joined to the role surface contract.

Solution: make route inventory produce a role-owned surface report that can be tested directly.

Benefits: stronger trust boundaries for admin, chef, client, staff, partner, and public surfaces.

## Stop Conditions

Do not delete routes from this report. Hidden routes may be valuable missing product wiring. Product code cleanup should wait until each route is classified as linked, hidden-valid, placeholder-visible, dynamic-token, or external-entry with evidence.
