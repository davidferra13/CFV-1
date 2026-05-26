# Everything a Platform Admin Never Needs to Leave ChefFlow For

> **Purpose:** The inverse of `admin-exit-points-analysis.md`. Every workflow a Platform Admin
> or Owner operator can complete inside ChefFlow from start to finish, no outside tool required.
>
> **Codebase grounding:** The admin portal is the `app/(admin)/admin` route tree behind
> `app/(admin)/layout.tsx`, which calls `requireAdmin()` and renders the admin-owned shell,
> sidebar, mobile nav, notification providers, presence beacon, admin rail, and page info. Admin
> nav is defined in `components/navigation/admin-nav-config.ts` with Platform, Operations,
> Finance & Compliance, and System groups. Cross-tenant data and mutations live mostly under
> `lib/admin/*`, with server actions gated by `requireAdmin()`. `lib/auth/admin.ts` admits Owner
> and Admin only; VIP is excluded from admin panel access. Owner-only behavior is separately gated
> by `isFounderEmail()` for founder-only tools such as admin Remy and internal Data Engine access.
>
> **Proof surfaces:** `tests/coverage/04-admin-routes.spec.ts` and
> `tests/interactions/37-admin-panel.spec.ts` cover admin route loading and core interactions.
> System integrity tests enforce admin runtime gates, admin action guards, self-promotion prevention,
> admin nav parity, Remy/admin separation, public API auth inventory, and server-action auth
> completeness.
>
> **Companion docs:**
>
> - `docs/research/admin-exit-points-analysis.md` (admin-side exit scenarios)
> - `docs/specs/platform-role-hierarchy.md` (owner/admin/VIP/pro/comped/free distinctions)
> - `docs/research/chef-never-leaves-analysis.md` (chef-side in-app workflows)
> - `docs/research/client-never-leaves-analysis.md` (client-side in-app workflows)
>
> **Date:** 2026-05-25

---

## Category 1: AUTHENTICATION, SHELL & ADMIN CONTEXT

| #   | What Admins Do Entirely In-App                                                                   |
| --- | ------------------------------------------------------------------------------------------------ |
| 1   | Enter the admin console at `/admin` after authentication                                         |
| 2   | Stay inside an admin-only route tree guarded by `requireAdmin()`                                 |
| 3   | Get redirected away from admin pages when not present as active Owner/Admin in `platform_admins` |
| 4   | Use a shell that is separate from chef navigation                                                |
| 5   | Use desktop admin sidebar navigation                                                             |
| 6   | Use mobile admin navigation                                                                      |
| 7   | Collapse and expand the admin sidebar                                                            |
| 8   | See admin portal context through the Admin label and shell styling                               |
| 9   | See notification bell state inside the admin shell                                               |
| 10  | Keep admin presence active through `PresenceBeacon`                                              |
| 11  | See page help through `PageInfoButton`                                                           |
| 12  | Sign out from the admin shell                                                                    |

---

## Category 2: PLATFORM OVERVIEW & COMMAND ENTRY

| #   | What Admins Do Entirely In-App                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13  | View the Platform Overview dashboard                                                                                                                                      |
| 14  | See total chefs                                                                                                                                                           |
| 15  | See total clients                                                                                                                                                         |
| 16  | See total events                                                                                                                                                          |
| 17  | See platform GMV                                                                                                                                                          |
| 18  | See monthly chef, client, event, and GMV growth                                                                                                                           |
| 19  | See average events per chef                                                                                                                                               |
| 20  | See average GMV per chef                                                                                                                                                  |
| 21  | Open Platform Pulse from quick access                                                                                                                                     |
| 22  | Open All Inquiries from quick access                                                                                                                                      |
| 23  | Open Command Center from quick access                                                                                                                                     |
| 24  | Open Conversations, Social Feed, Hub Groups, Notifications, Users, Clients, Analytics, Financials, Events, System Health, Communications, and Directory from quick access |

---

## Category 3: ADMIN NAVIGATION & ROUTE COVERAGE

| #   | What Admins Do Entirely In-App                                                    |
| --- | --------------------------------------------------------------------------------- |
| 25  | Navigate primary admin links: Overview, Pulse, and All Inquiries                  |
| 26  | Navigate Platform group pages                                                     |
| 27  | Navigate Operations group pages                                                   |
| 28  | Navigate Finance & Compliance group pages                                         |
| 29  | Navigate System group pages                                                       |
| 30  | Jump from admin back to Chef Portal                                               |
| 31  | Jump from admin to Settings                                                       |
| 32  | Keep active route highlighting while moving through admin pages                   |
| 33  | Use breadcrumbs inside the admin shell                                            |
| 34  | Load every covered admin route without a blank page when admin auth is configured |

---

## Category 4: CHEF ACCOUNT OPERATIONS

| #   | What Admins Do Entirely In-App                                                  |
| --- | ------------------------------------------------------------------------------- |
| 35  | View all chef accounts in `/admin/users`                                        |
| 36  | Search chefs by name or email                                                   |
| 37  | Page through chef results                                                       |
| 38  | Open a chef detail page                                                         |
| 39  | View chef email, phone, created date, account status, and subscription status   |
| 40  | View chef health badge/state                                                    |
| 41  | View recent events for a chef                                                   |
| 42  | View clients attached to a chef                                                 |
| 43  | View recent ledger entries for a chef                                           |
| 44  | Audit that an admin viewed a chef detail page                                   |
| 45  | Suspend a chef account                                                          |
| 46  | Reactivate a suspended chef account                                             |
| 47  | Grant comped Pro-level access with a reason                                     |
| 48  | Revoke comped access                                                            |
| 49  | Grant VIP access to a chef                                                      |
| 50  | Revoke VIP access from a chef                                                   |
| 51  | See that Owner/Admin access cannot be changed to VIP from the chef access panel |
| 52  | Issue an immutable admin credit or debit adjustment                             |

---

## Category 5: CLIENT, EVENT & INQUIRY OVERSIGHT

| #   | What Admins Do Entirely In-App                            |
| --- | --------------------------------------------------------- |
| 53  | View all clients across tenants in `/admin/clients`       |
| 54  | Search or scan client records with tenant context         |
| 55  | View all events across tenants in `/admin/events`         |
| 56  | Inspect event date, status, tenant, and client context    |
| 57  | View cross-tenant inquiries in `/admin/inquiries`         |
| 58  | Filter and page platform inquiry lists                    |
| 59  | Claim an inquiry for founder/operator follow-up           |
| 60  | See inquiry status without entering a chef tenant account |
| 61  | Use Platform Pulse to inspect recent platform activity    |
| 62  | Filter Platform Pulse by activity type                    |
| 63  | Toggle local-only activity view where supported           |
| 64  | Page through platform activity                            |

---

## Category 6: FINANCE, LEDGER & PAYMENT HEALTH

| #   | What Admins Do Entirely In-App                                                         |
| --- | -------------------------------------------------------------------------------------- |
| 65  | View `/admin/financials` platform financial overview                                   |
| 66  | View GMV, payment, and ledger summaries                                                |
| 67  | View recent platform ledger entries                                                    |
| 68  | View `/admin/reconciliation` cross-tenant reconciliation                               |
| 69  | Compare gross amount, platform fee, net transfer, and deferred amounts by chef         |
| 70  | See Stripe account ID/onboarding completeness where present                            |
| 71  | View total platform fees                                                               |
| 72  | Open `/admin/system/payments` payment health                                           |
| 73  | See Stripe key mode diagnostics                                                        |
| 74  | See Stripe mode mismatch warning state                                                 |
| 75  | See ledger/payment activity for a recent timeframe                                     |
| 76  | Use admin credit/debit adjustments from chef detail when a ledger correction is needed |

---

## Category 7: COMMUNICATIONS & PLATFORM ANNOUNCEMENTS

| #   | What Admins Do Entirely In-App                      |
| --- | --------------------------------------------------- |
| 77  | Open `/admin/communications`                        |
| 78  | Set a platform announcement banner                  |
| 79  | Choose info, warning, or critical announcement type |
| 80  | Preview the announcement before saving              |
| 81  | Clear the platform announcement                     |
| 82  | Send a direct operational email to one recipient    |
| 83  | Send a broadcast email to all chefs                 |
| 84  | Send a broadcast email to inactive chefs            |
| 85  | Require subject and body before sending admin email |
| 86  | Log admin direct-email action                       |
| 87  | Log admin broadcast-email action                    |
| 88  | Use reply-to as the admin's email for sent messages |

---

## Category 8: FLAGS, ACCESS TIERS & FEATURE CONTROL

| #   | What Admins Do Entirely In-App                                  |
| --- | --------------------------------------------------------------- |
| 89  | Open `/admin/flags`                                             |
| 90  | View known feature flags                                        |
| 91  | View per-chef flag states                                       |
| 92  | Toggle a single chef feature flag                               |
| 93  | Optimistically update flag UI and roll back on failure          |
| 94  | Bulk set flags for a chef through server action support         |
| 95  | Log feature flag mutations                                      |
| 96  | Distinguish billing tier controls from platform access controls |
| 97  | Grant VIP without granting admin panel access                   |
| 98  | Preserve Owner/Admin rows from accidental VIP downgrade         |

---

## Category 9: AUDIT, PRESENCE & OBSERVABILITY

| #   | What Admins Do Entirely In-App                                               |
| --- | ---------------------------------------------------------------------------- |
| 99  | Open `/admin/audit`                                                          |
| 100 | View immutable sensitive platform actions                                    |
| 101 | See actor email, action type, target, details, and timestamp where available |
| 102 | Open `/admin/presence`                                                       |
| 103 | View live presence data                                                      |
| 104 | Open `/admin/command-center`                                                 |
| 105 | View owner observability dashboard                                           |
| 106 | View global conversation summaries                                           |
| 107 | Open a global conversation transcript                                        |
| 108 | Page through conversation transcript history                                 |
| 109 | View global notifications                                                    |
| 110 | Page through global notification feed                                        |

---

## Category 10: MODERATION, SOCIAL & DINNER CIRCLES

| #   | What Admins Do Entirely In-App                                          |
| --- | ----------------------------------------------------------------------- |
| 111 | Open `/admin/social` global social feed                                 |
| 112 | Filter and page global social activity                                  |
| 113 | Hide a social post with a reason                                        |
| 114 | Open `/admin/hub` global hub groups                                     |
| 115 | View Dinner Circle group status and context                             |
| 116 | Open a hub group transcript                                             |
| 117 | Page through hub group transcript messages                              |
| 118 | Soft-delete a chat message with a reason                                |
| 119 | Deactivate a hub group with a reason                                    |
| 120 | Backfill guest-visible Dinner Circle state through admin action support |

---

## Category 11: DIRECTORY, WEB RESEARCH & OUTREACH

| #   | What Admins Do Entirely In-App                                       |
| --- | -------------------------------------------------------------------- |
| 121 | Open `/admin/directory`                                              |
| 122 | View directory candidates                                            |
| 123 | Approve a chef for the public directory                              |
| 124 | Revoke a chef from the public directory                              |
| 125 | Open `/admin/directory-listings`                                     |
| 126 | Manage external directory listing review state                       |
| 127 | Open `/admin/web-research` Trusted Web Research                      |
| 128 | View provider diagnostics                                            |
| 129 | Create a web-research review candidate                               |
| 130 | Review candidate queue entries                                       |
| 131 | Approve a candidate into the directory workflow                      |
| 132 | Reject a candidate with a reason                                     |
| 133 | View recent web-research audit activity                              |
| 134 | Open `/admin/outreach` directory outreach stats and command guidance |

---

## Category 12: PRICING, PIE & OPENCLAW DATA OPERATIONS

| #   | What Admins Do Entirely In-App                   |
| --- | ------------------------------------------------ |
| 135 | Open `/admin/price-catalog` Food Catalog         |
| 136 | View OpenClaw stats                              |
| 137 | Browse OpenClaw prices                           |
| 138 | View OpenClaw sources                            |
| 139 | View recent OpenClaw price changes               |
| 140 | Filter catalog rows                              |
| 141 | Export filtered catalog results as sanitized CSV |
| 142 | Open `/admin/pricing-health`                     |
| 143 | Open `/admin/pricing-coverage`                   |
| 144 | Trigger pricing coverage checks where supported  |
| 145 | Open `/admin/pie-compliance`                     |
| 146 | Open `/admin/openclaw/health` Data Engine Health |
| 147 | View quarantined price counts and sync health    |
| 148 | Approve, reject, or correct a quarantined price  |
| 149 | Bulk review quarantined prices                   |
| 150 | View OpenClaw sync audit log                     |

---

## Category 13: LEGAL, CANNABIS & REGULATED ACCESS

| #   | What Admins Do Entirely In-App                          |
| --- | ------------------------------------------------------- |
| 151 | Open `/admin/legal-readiness`                           |
| 152 | View global legal readiness items                       |
| 153 | View policy versions                                    |
| 154 | View consent and case coverage                          |
| 155 | See items needing professional review                   |
| 156 | Open `/admin/cannabis`                                  |
| 157 | View all cannabis users                                 |
| 158 | View pending cannabis invites                           |
| 159 | Grant cannabis tier                                     |
| 160 | Revoke cannabis tier                                    |
| 161 | Approve, reject, revoke, or regenerate cannabis invites |
| 162 | Grant cannabis tier by email                            |
| 163 | Open `/admin/cannabis/access`                           |
| 164 | Approve age permission                                  |
| 165 | Reject age permission                                   |
| 166 | Block age permission                                    |
| 167 | Revoke cannabis tier with a reason                      |
| 168 | View cannabis access overview                           |

---

## Category 14: SYSTEM HEALTH, FEEDBACK & QUALITY CONTROL

| #   | What Admins Do Entirely In-App                                                 |
| --- | ------------------------------------------------------------------------------ |
| 169 | Open `/admin/system` System Health                                             |
| 170 | View database row counts                                                       |
| 171 | View QOL metrics summary                                                       |
| 172 | View drafts restored                                                           |
| 173 | View save failures                                                             |
| 174 | View conflicts detected                                                        |
| 175 | Open `/admin/services` Mission Control                                         |
| 176 | View service status for prod, dev, Ollama, OpenClaw, AnythingLLM, and Postgres |
| 177 | Open `/admin/silent-failures` Hidden Issues                                    |
| 178 | View hidden failures by source                                                 |
| 179 | Open `/admin/feedback`                                                         |
| 180 | View feedback and issue reports                                                |
| 181 | Open an issue report detail                                                    |
| 182 | Resolve quality alerts through quality-console actions                         |

---

## THE PATTERN: What the Admin Portal Already Owns

### 1. CONTROL PLANE WORKFLOWS

Admin can manage cross-tenant visibility, chef access, comp/VIP status, flags, announcements, direct email, broadcast email, directory approval, moderation, cannabis access, and price quarantine review without leaving ChefFlow.

### 2. OBSERVABILITY WORKFLOWS

Admin can inspect platform KPIs, chef/client/event lists, activity feed, audit log, presence, command center, global conversations, global notifications, social feed, hub groups, payment health, system health, hidden issues, service status, pricing health, and OpenClaw sync state in one admin shell.

### 3. GOVERNED MUTATIONS

Admin mutations generally run through `requireAdmin()` server actions and leave an audit trail where sensitive. The important product pattern is not "admin can do anything"; it is "admin can do repeated operator actions through constrained, auditable flows."

### 4. ROLE BOUNDARY CLARITY

Owner/Admin can enter `/admin`. Owner has founder-only tools. VIP can receive all chef-facing features and focus-mode bypass, but VIP cannot enter the admin panel, cannot see admin-only nav, and cannot manage platform users.

---

## PRIORITY RANKING (Strongest In-App Admin Coverage)

**Most complete today:**

1. Admin route shell and runtime gate
2. Platform overview and quick access
3. Chef list/detail account operations
4. Comp/VIP controls and per-chef feature flags
5. Cross-tenant financial overview and reconciliation
6. Admin communications and announcement banner
7. Audit log, presence, pulse, and command center
8. Global conversations, notifications, social, and hub moderation
9. Directory approval and web-research review queue
10. Pricing catalog, OpenClaw health, and quarantine review
11. Cannabis access and invite administration
12. System health, hidden issues, services, and feedback

**Highest-value in-app deepening opportunities:**

1. Add owner-only admin grant/revoke controls with immutable audit
2. Add admin access diagnostics for auth-row mismatches
3. Pull email delivery/reply status into Communications
4. Add read-only support drilldowns before operators reach for SQL
5. Add Stripe/object deep links and reconciliation variance notes
6. Add OpenClaw run IDs, source evidence, and receipt attachments
7. Surface latest admin integrity test status inside System Health
8. Add source provenance and last-reviewed timestamps to directory/web research
9. Add incident and support-call notes tied to audit targets
10. Add scoped export packs for privacy, support, finance, and legal requests

---

_182 admin workflows that stay in-app._
_The admin portal is already a broad operator cockpit: access-gated, cross-tenant, route-tested, and action-oriented. Its next gains are less about adding raw power and more about making external truth return cleanly into the audit trail._
