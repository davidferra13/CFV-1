# Admin Super View

Platform-wide visibility for the admin. See everything happening across all chefs.

## Architecture

Three complementary systems:

### 1. View as Chef (Impersonation Mode)

Admin clicks "View as Chef" on `/admin/users` and the entire app renders as if they ARE that chef. All data queries route through the impersonated chef's tenant context.

**How it works:**

- Cookie `chefflow-admin-impersonate` stores the target chef_id (4hr auto-expiry)
- `requireChef()` in `lib/auth/get-user.ts` checks for the cookie when caller is admin
- Returns modified AuthUser with target chef's entityId and tenantId
- Admin's real auth identity (user.id) is preserved for security
- Amber banner shows at top of page with chef name + exit button

**Security:**

- Only admin emails (ADMIN_EMAILS env var + founder) can set the cookie
- Every start/stop is logged to `admin_audit_log` (immutable, append-only)
- Cookie is httpOnly, sameSite: lax, 4hr max age
- Target chef is verified to exist before impersonation starts

**Files:**

- `lib/auth/admin-impersonation.ts` - cookie reader
- `lib/auth/admin-impersonation-actions.ts` - server actions (start/stop)
- `components/admin/impersonation-banner.tsx` - persistent amber banner
- `components/admin/view-as-chef-button.tsx` - button component
- `lib/auth/get-user.ts` - requireChef() impersonation logic

### 2. View as Client (Impersonation Mode)

Admin clicks "View as Client" on `/admin/clients` and sees the client portal as that specific client would. All client-scoped data queries route through the impersonated client's context.

**How it works:**

- Cookie `chefflow-admin-impersonate-client` stores the target client_id (4hr auto-expiry)
- `requireClient()` in `lib/auth/get-user.ts` checks for the cookie when caller is admin (chef role)
- Returns modified AuthUser with target client's entityId, tenantId, and role='client'
- Admin's real auth identity (user.id) is preserved for security
- Purple banner shows at top of client portal with client name, email, chef name + exit button

**Security:**

- Only admin emails can set the cookie
- Every start/stop is logged to `admin_audit_log` (immutable, append-only)
- Cookie is httpOnly, sameSite: lax, 4hr max age
- Target client is verified to exist before impersonation starts

**Files:**

- `lib/auth/client-impersonation.ts` - cookie reader
- `lib/auth/client-impersonation-actions.ts` - server actions (start/stop)
- `components/admin/client-impersonation-banner.tsx` - persistent purple banner
- `components/admin/view-as-client-button.tsx` - button component
- `lib/auth/get-user.ts` - requireClient() impersonation logic

### 3. Cross-Tenant Admin Data Pages

Dedicated pages that show ALL data across ALL chefs in one view. Filterable, searchable, with "View as Chef" buttons on every row. CSV export on all pages.

**Pages built:**

| Route                         | What it shows                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `/admin/recipes`              | All recipes across all chefs                                                     |
| `/admin/menus`                | All menus across all chefs                                                       |
| `/admin/quotes`               | All quotes/invoices with amounts                                                 |
| `/admin/inquiries`            | All inquiries with GOLDMINE lead scores                                          |
| `/admin/staff`                | All staff members across all chefs                                               |
| `/admin/documents`            | All contracts/documents                                                          |
| `/admin/clients`              | All clients with LTV, events, View as Client + View as Chef buttons              |
| `/admin/calendar-view`        | Unified cross-tenant calendar (30 days back, 90 forward)                         |
| `/admin/loyalty`              | Per-chef loyalty: points issued, redeemed, outstanding                           |
| `/admin/equipment`            | All equipment with purchase/current value                                        |
| `/admin/allergens`            | Cross-platform dietary restrictions and allergies (safety-critical)              |
| `/admin/remy-activity`        | Per-chef Remy usage: actions, errors, top tasks                                  |
| `/admin/gmail-sync`           | Gmail sync health per chef: synced count, errors, staleness                      |
| `/admin/notifications`        | Global notification feed with search/filter/pagination                           |
| `/admin/notifications-audit`  | Notification delivery audit: email/push/SMS status, failures                     |
| `/admin/prospecting-overview` | All prospects across all chefs with stages and scores                            |
| `/admin/activity-feed`        | Unified activity timeline across all chefs                                       |
| `/admin/onboarding-status`    | Per-chef setup completeness (profile, Stripe, recipes, clients, events, Gmail)   |
| `/admin/search`               | Platform-wide search across chefs, clients, events, recipes, inquiries           |
| `/admin/subscriptions`        | Subscription status, tier, trial expiry, Stripe connected, MRR KPIs              |
| `/admin/chef-health`          | Composite health score per chef (events, clients, activity, recency)             |
| `/admin/lifecycle`            | Tenant lifecycle stages (new, onboarding, active, established, dormant, churned) |
| `/admin/errors`               | Aggregated errors from notification delivery, Gmail sync, Remy, automations      |
| `/admin/sla`                  | Inquiry response time tracking with SLA grades (A-F) per chef                    |
| `/admin/jobs`                 | Background automation execution log with success/error rates                     |
| `/admin/data-tools`           | GDPR data inventory per tenant (client, event, recipe, document counts)          |
| `/admin/sessions`             | User login activity, last active dates, engagement metrics                       |
| `/admin/changelog`            | Platform release history and version notes                                       |
| `/admin/benchmarks`           | Cross-tenant comparison (revenue, events, conversion rate, avg event value)      |

**Data queries:** `lib/admin/platform-data.ts` (uses service role to bypass RLS)

**CSV export:** `components/admin/csv-export-button.tsx` (client-side blob download, added to all data pages)

## All Phases Complete

- Phase 1: View as Chef (impersonation) - DONE
- Phase 2: View as Client (impersonation) - DONE
- Phase 3: Cross-tenant data pages (recipes, menus, quotes, inquiries, staff, docs, calendar, loyalty, equipment, allergens) - DONE
- Phase 4: Chef Health & Onboarding (onboarding completeness tracker with tier display) - DONE
- Phase 5: Intelligence & Monitoring (Remy activity, Gmail sync, notifications, prospecting, activity feed) - DONE
- Phase 6: Platform Search & CSV Export (search bar across 5 entity types, CSV on all pages) - DONE
- Phase 7: Industry Gap Closure (subscriptions, chef health, lifecycle, errors, SLA, jobs, GDPR tools, sessions, changelog, benchmarks) - DONE
