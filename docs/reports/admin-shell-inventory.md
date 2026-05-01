# Admin Shell Inventory Report

- Date: 2026-05-01
- Scope: admin route inventory joined to admin nav ownership
- Owned file: `docs/reports/admin-shell-inventory.md`
- Rule: no code deletion is authorized by this report alone

## Sources

| Source                                      | Evidence used                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `app/(admin)`                               | Current admin page route files and route templates.                                              |
| `components/navigation/admin-nav-config.ts` | Admin primary links, grouped links, and bottom links.                                            |
| `components/navigation/admin-shell.tsx`     | Runtime adapter that renders desktop and mobile admin nav from admin nav config.                 |
| `app/(admin)/layout.tsx`                    | Admin runtime shell attachment through `requireAdmin()` and `data-cf-portal="admin"`.            |
| `lib/interface/route-inventory.ts`          | Route inventory rules that classify `(admin)` route group pages as admin routes.                 |
| `lib/auth/route-policy.ts`                  | Admin route policy uses `/admin` as the admin protected path root.                               |
| `docs/reports/prune-candidate-register.md`  | Current cleanup register requires this inventory before any duplicate admin sidebar prune slice. |

## Module

Admin shell is the canonical Admin Shell Module for `/admin/**`.

The active runtime path is:

`/admin/**` request -> `app/(admin)/layout.tsx` -> `requireAdmin()` -> `AdminSidebarProvider` -> `AdminSidebar`, `AdminMobileNav`, and `AdminMainContent` from `components/navigation/admin-shell.tsx`.

This means admin route ownership currently lives in the admin layout and navigation shell, not in chef navigation. The stale duplicate called out by the prune register remains outside this module until a separate deletion proof is approved.

## Interface

The admin navigation interface is `AdminNavItem` plus `AdminNavGroup` in `components/navigation/admin-nav-config.ts`.

Current admin nav count:

| Bucket                 | Count |
| ---------------------- | ----: |
| Primary admin links    |     3 |
| Grouped admin links    |    30 |
| Admin nav links total  |    33 |
| Bottom non-admin links |     2 |

The route inventory interface classifies page routes through `getStaticPageRoutesForRole('admin')`, `getDynamicPageRouteEntriesForRole('admin')`, and `getRoutePolicyGapsForRole('admin')`. Admin classification is backed by either the `(admin)` route group or the `/admin` policy root.

## Implementation

Admin shell implementation renders the same nav ownership data twice:

| Surface         | Implementation                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Desktop sidebar | `AdminSidebar` maps `adminPrimaryLinks`, `adminNavGroups`, and `adminBottomLinks`.                                            |
| Mobile drawer   | `AdminMobileNav` maps the same primary links, groups, and bottom links.                                                       |
| Main content    | `AdminMainContent` provides the admin content frame and breadcrumb bar.                                                       |
| Active state    | `isAdminNavItemActive()` makes `/admin` exact-only and makes `/admin/system` and `/admin/beta` exact-only for child matching. |

## Inventory Summary

| Measure                                         | Count |
| ----------------------------------------------- | ----: |
| Admin page routes found                         |    42 |
| Static admin page routes                        |    38 |
| Dynamic admin page routes                       |     4 |
| Exact nav-owned routes                          |    33 |
| Child routes under nav-owned parent             |     6 |
| Hidden routes with no exact or parent nav owner |     3 |
| Admin nav links without a page route            |     0 |

## Joined Route Inventory

| Route                                   | Type    | Nav ownership | Nav owner            | File                                                        |
| --------------------------------------- | ------- | ------------- | -------------------- | ----------------------------------------------------------- |
| `/admin`                                | static  | exact         | Overview             | `app/(admin)/admin/page.tsx`                                |
| `/admin/analytics`                      | static  | exact         | Analytics            | `app/(admin)/admin/analytics/page.tsx`                      |
| `/admin/audit`                          | static  | exact         | Audit Log            | `app/(admin)/admin/audit/page.tsx`                          |
| `/admin/beta`                           | static  | exact         | Early Signups        | `app/(admin)/admin/beta/page.tsx`                           |
| `/admin/beta/onboarding`                | static  | child         | Early Signups        | `app/(admin)/admin/beta/onboarding/page.tsx`                |
| `/admin/beta-surveys`                   | static  | exact         | Surveys              | `app/(admin)/admin/beta-surveys/page.tsx`                   |
| `/admin/beta-surveys/[id]`              | dynamic | child         | Surveys              | `app/(admin)/admin/beta-surveys/[id]/page.tsx`              |
| `/admin/cannabis`                       | static  | exact         | Cannabis             | `app/(admin)/admin/cannabis/page.tsx`                       |
| `/admin/clients`                        | static  | exact         | Clients              | `app/(admin)/admin/clients/page.tsx`                        |
| `/admin/command-center`                 | static  | exact         | Command Center       | `app/(admin)/admin/command-center/page.tsx`                 |
| `/admin/communications`                 | static  | exact         | Communications       | `app/(admin)/admin/communications/page.tsx`                 |
| `/admin/conversations`                  | static  | exact         | Conversations        | `app/(admin)/admin/conversations/page.tsx`                  |
| `/admin/conversations/[conversationId]` | dynamic | child         | Conversations        | `app/(admin)/admin/conversations/[conversationId]/page.tsx` |
| `/admin/directory`                      | static  | exact         | Directory            | `app/(admin)/admin/directory/page.tsx`                      |
| `/admin/directory-listings`             | static  | exact         | Directory Listings   | `app/(admin)/admin/directory-listings/page.tsx`             |
| `/admin/events`                         | static  | exact         | All Events           | `app/(admin)/admin/events/page.tsx`                         |
| `/admin/feedback`                       | static  | exact         | Feedback             | `app/(admin)/admin/feedback/page.tsx`                       |
| `/admin/financials`                     | static  | exact         | Financials           | `app/(admin)/admin/financials/page.tsx`                     |
| `/admin/flags`                          | static  | exact         | Feature Flags        | `app/(admin)/admin/flags/page.tsx`                          |
| `/admin/hub`                            | static  | exact         | Dinner Circle Groups | `app/(admin)/admin/hub/page.tsx`                            |
| `/admin/hub/groups/[groupId]`           | dynamic | child         | Dinner Circle Groups | `app/(admin)/admin/hub/groups/[groupId]/page.tsx`           |
| `/admin/inquiries`                      | static  | exact         | All Inquiries        | `app/(admin)/admin/inquiries/page.tsx`                      |
| `/admin/launch-readiness`               | static  | exact         | Launch Readiness     | `app/(admin)/admin/launch-readiness/page.tsx`               |
| `/admin/notifications`                  | static  | exact         | Notifications        | `app/(admin)/admin/notifications/page.tsx`                  |
| `/admin/openclaw`                       | static  | hidden        | none                 | `app/(admin)/admin/openclaw/page.tsx`                       |
| `/admin/openclaw/health`                | static  | exact         | Data Engine Health   | `app/(admin)/admin/openclaw/health/page.tsx`                |
| `/admin/outreach`                       | static  | hidden        | none                 | `app/(admin)/admin/outreach/page.tsx`                       |
| `/admin/presence`                       | static  | exact         | Live Presence        | `app/(admin)/admin/presence/page.tsx`                       |
| `/admin/price-catalog`                  | static  | hidden        | none                 | `app/(admin)/admin/price-catalog/page.tsx`                  |
| `/admin/pulse`                          | static  | exact         | Pulse                | `app/(admin)/admin/pulse/page.tsx`                          |
| `/admin/reconciliation`                 | static  | exact         | Reconciliation       | `app/(admin)/admin/reconciliation/page.tsx`                 |
| `/admin/reconciliation/tickets`         | static  | child         | Reconciliation       | `app/(admin)/admin/reconciliation/tickets/page.tsx`         |
| `/admin/referral-partners`              | static  | exact         | Referral Partners    | `app/(admin)/admin/referral-partners/page.tsx`              |
| `/admin/remy-activity`                  | static  | exact         | Remy Activity        | `app/(admin)/admin/remy-activity/page.tsx`                  |
| `/admin/silent-failures`                | static  | exact         | Silent Failures      | `app/(admin)/admin/silent-failures/page.tsx`                |
| `/admin/social`                         | static  | exact         | Social Feed          | `app/(admin)/admin/social/page.tsx`                         |
| `/admin/supporter-signals`              | static  | exact         | Supporter Signals    | `app/(admin)/admin/supporter-signals/page.tsx`              |
| `/admin/system`                         | static  | exact         | System Health        | `app/(admin)/admin/system/page.tsx`                         |
| `/admin/system/payments`                | static  | exact         | System Payments      | `app/(admin)/admin/system/payments/page.tsx`                |
| `/admin/users`                          | static  | exact         | Chefs                | `app/(admin)/admin/users/page.tsx`                          |
| `/admin/users/[chefId]`                 | dynamic | child         | Chefs                | `app/(admin)/admin/users/[chefId]/page.tsx`                 |
| `/admin/v1-builder`                     | static  | exact         | V1 Builder           | `app/(admin)/admin/v1-builder/page.tsx`                     |

## Seam

| Seam                                 | Finding                                                                                                                                                      | Risk                                                                                                                              | Next action                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Route inventory to nav ownership     | 3 static admin routes are hidden from admin nav: `/admin/openclaw`, `/admin/outreach`, and `/admin/price-catalog`.                                           | Hidden admin routes may be valid deep links, parked recovery surfaces, or stale surfaces. They are not prune proof by themselves. | Classify each hidden route as keep, recover, or prune-candidate in a separate focused slice.                             |
| Parent nav to child active state     | `/admin/beta/onboarding` is a child of the Early Signups nav owner, but `isAdminNavItemActive()` disables child matching for `/admin/beta`.                  | Admins can reach a child route without its parent nav state highlighting.                                                         | Decide whether `/admin/beta/onboarding` needs an exact nav item, a different parent, or intentional hidden-child status. |
| Admin page route to policy           | All listed page routes are under `/admin`, and route policy protects `/admin` as an admin path root.                                                         | No policy gap found in this read-only join.                                                                                       | Keep admin route additions under the `(admin)` group or `/admin` policy root.                                            |
| Duplicate sidebar to canonical shell | The prune register marks `components/admin/admin-sidebar.tsx` as duplicate, but current runtime ownership points to `components/navigation/admin-shell.tsx`. | Deleting the duplicate without a focused diff could still miss references outside this report scope.                              | Use this report as prerequisite evidence only, then run a separate prune proof before deleting code.                     |

## Adapter

The adapter boundary is clean at the admin layout:

`app/(admin)/layout.tsx` adapts authenticated admin identity into the admin shell and passes page content through `AdminMainContent`. `admin-shell.tsx` adapts route state into nav active state. `admin-nav-config.ts` adapts product ownership into explicit admin links.

The only adapter caution is hidden route handling. Hidden admin routes are still protected and render through the admin shell, but they have no explicit nav owner unless a page-level link exists inside the route content.

## Depth

The Admin Shell Module has useful depth:

| Layer         | Current depth                                                                  |
| ------------- | ------------------------------------------------------------------------------ |
| Auth          | Admin layout starts with `requireAdmin()`.                                     |
| Policy        | `/admin` is a protected admin path root.                                       |
| Inventory     | Route inventory can discover static and dynamic admin page entries.            |
| Navigation    | Admin nav config is separated from chef navigation.                            |
| Runtime       | Desktop and mobile admin shell render from the same admin nav config.          |
| Cleanup proof | Prune register points duplicate admin sidebar cleanup at this inventory first. |

## Leverage

This report gives the next cleanup slice leverage because it separates:

1. Hidden route recovery questions from duplicate component deletion.
2. Admin nav ownership from route protection.
3. Exact nav links from child route ownership.
4. Canonical runtime shell evidence from stale duplicate component evidence.

## Locality

No code was changed. Future work should stay local:

| Work type               | Locality rule                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Nav recovery            | Edit only `components/navigation/admin-nav-config.ts` plus route-specific tests or docs needed for the chosen route. |
| Active-state fix        | Edit only `components/navigation/admin-shell.tsx` if the beta child highlight is intentional to fix.                 |
| Duplicate sidebar prune | Delete only the duplicate sidebar file in a separate approved cleanup slice after reference proof.                   |
| Route deletion          | Do not delete hidden admin routes from this report. Each route needs its own keep, recover, or prune proof.          |

## Conclusion

Admin shell ownership is coherent: admin layout, admin shell, admin nav config, route inventory, and route policy all point at `/admin/**` as an admin-owned surface.

The important gaps are discoverability gaps, not deletion permission. `/admin/openclaw`, `/admin/outreach`, and `/admin/price-catalog` are hidden static routes. `/admin/beta/onboarding` has parent ownership through Early Signups but no active parent state because of the shell's special-case matching.

The duplicate admin sidebar listed in the prune register can now be investigated with this inventory as prerequisite evidence, but no file is cleared for deletion by this report alone.
