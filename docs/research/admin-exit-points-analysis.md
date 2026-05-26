# Every Scenario Where a Platform Admin Still Leaves ChefFlow

> **Purpose:** Map every moment a Platform Admin or Owner operator exits ChefFlow to use another tool.
> These are the boundaries of the admin control plane. Some exits are permanent because ChefFlow should
> never replace infrastructure consoles, payment rails, legal counsel, source control, banks, or native
> communication channels. Others are opportunities to reduce friction or make the round-trip back into
> the admin portal smoother.
>
> **Codebase grounding:** Admin access is stored in `platform_admins` and resolved by
> `lib/auth/admin-access.ts`. `lib/auth/admin.ts` returns Owner/Admin from `requireAdmin()` and
> explicitly excludes VIP from admin panel access. `ADMIN_PATHS = ['/admin']` in
> `lib/auth/route-policy.ts` classifies `/admin` as `admin_console`; middleware allows authenticated
> users through and relies on the runtime `requireAdmin()` gate in `app/(admin)/layout.tsx` and admin
> server actions. The current admin portal covers overview, users, clients, events, analytics,
> financials, reconciliation, communications, flags, audit, presence, pulse, command center, global
> conversations, social, hub groups, notifications, inquiries, directory, web research, pricing,
> OpenClaw health, legal readiness, cannabis access, feedback, hidden issues, services, and system
> health. Admin integrity tests include `04-admin-routes`, `37-admin-panel`, Q45, Q48, Q50, Q52, Q56,
> Q57, Q70, Q81, Q87, and Q131.
>
> **Role boundary:** Owner and Admin can use `/admin`. Owner has founder-only affordances such as admin
> Remy and internal Data Engine access. VIP is not an admin panel role; VIP only matters here when an
> admin grants, revokes, or audits VIP access from a chef account.
>
> **Companion docs:**
>
> - `docs/research/admin-never-leaves-analysis.md` (admin workflows that stay in-app)
> - `docs/specs/platform-role-hierarchy.md` (canonical role hierarchy)
> - `docs/research/chef-exit-points-analysis.md` (chef-side exit scenarios)
> - `docs/research/client-exit-points-analysis.md` (client-side exit scenarios)
>
> **Date:** 2026-05-25

---

## Category 1: AUTHENTICATION, ADMIN ACCESS & ROLE CONTROL

| #   | Scenario                                                | Where They Go                                        | Why They Leave                                                                        | Exit Type      | ChefFlow Could...                                                           |
| --- | ------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------- |
| 1   | Sign in after session expiry                            | Auth provider, email inbox, password manager         | Admin shell redirects to `/auth/signin?redirect=/admin` when `requireAdmin()` fails   | **Permanent**  | Keep redirect context and admin-safe recovery clear                         |
| 2   | Retrieve admin password or MFA code                     | 1Password, iCloud Keychain, authenticator app, email | Credential custody belongs outside ChefFlow                                           | **Permanent**  | Support password-manager-friendly fields and clear failure states           |
| 3   | Bootstrap the first owner/admin row                     | Database console, migration, seed script             | `platform_admins` must exist before `/admin` can admit the operator                   | **Permanent**  | Provide a documented, audited bootstrap script                              |
| 4   | Investigate why an expected admin cannot enter `/admin` | Supabase/Auth dashboard, logs, SQL console           | Need to inspect auth user ID, email, active row, and access level                     | **Reducible**  | Add admin-access diagnostics that never expose self-promotion paths         |
| 5   | Promote a trusted operator to admin                     | SQL console or controlled internal tool              | Current UI exposes VIP/comp controls, not general admin promotion                     | **Bridgeable** | Add owner-only admin grant flow with immutable audit and self-change guards |
| 6   | Remove or demote an admin                               | SQL console or controlled internal tool              | High-risk privilege mutation is not a casual admin-panel action                       | **Bridgeable** | Add owner-only revoke/demote flow with owner immutability checks            |
| 7   | Confirm VIP is not admin                                | Chef detail, role spec, database row                 | VIP lives in `platform_admins` but `getCurrentAdminUser()` excludes it                | **Reducible**  | Show a clearer "VIP has no admin panel" explanation in access management    |
| 8   | Audit an access anomaly                                 | Audit log plus database/auth logs                    | `admin_audit_log` captures actions, but auth/session anomalies may need provider logs | **Bridgeable** | Link auth events to admin audit rows where available                        |

---

## Category 2: INFRASTRUCTURE, DEPLOYMENT & LOCAL SERVICES

| #   | Scenario                                    | Where They Go                                   | Why They Leave                                                                   | Exit Type     | ChefFlow Could...                                                  |
| --- | ------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------ |
| 9   | Restart or inspect the canonical dev server | Terminal, process manager                       | Admin Services can display service state, but process control is outside the app | **Permanent** | Keep Mission Control status accurate and link runbook commands     |
| 10  | Inspect Docker containers                   | Docker Desktop, terminal                        | OpenClaw, database, and local services are infrastructure processes              | **Permanent** | Surface health, ports, and last check results in `/admin/services` |
| 11  | Check hosting deployment status             | Vercel/hosting dashboard, CI logs               | Deployment pipelines live outside ChefFlow                                       | **Permanent** | Store deploy links and current build metadata                      |
| 12  | Inspect server logs during a 500            | Terminal, hosting logs, log drain               | Admin pages show failures but not full stack traces                              | **Permanent** | Add correlation IDs and log links from admin error states          |
| 13  | Check environment variables                 | Hosting dashboard, `.env.local`, secret manager | Secrets must not be editable in the admin UI                                     | **Permanent** | Show redacted configuration health only                            |
| 14  | Restart Ollama or local AI                  | Terminal, Ollama service UI                     | Local AI runtime is an external daemon                                           | **Permanent** | Keep status badges and restart instructions in Mission Control     |
| 15  | Restart OpenClaw worker/container           | Terminal, Docker, worker dashboard              | Data engine orchestration is outside Next.js UI                                  | **Permanent** | Add "last run, next run, failed reason" and safe runbook links     |
| 16  | Verify database connectivity outage         | Supabase dashboard, Postgres logs               | Root-cause evidence lives in database infrastructure                             | **Permanent** | Show row-count and latency checks in System Health                 |

---

## Category 3: DATABASE, MIGRATIONS & CROSS-TENANT DATA REPAIR

| #   | Scenario                                  | Where They Go                              | Why They Leave                                                                     | Exit Type      | ChefFlow Could...                                                 |
| --- | ----------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------- |
| 17  | Apply a migration                         | Terminal, migration tool, database console | Schema changes are source-controlled operations                                    | **Permanent**  | Link migration status and timestamp checks from System Health     |
| 18  | Inspect raw cross-tenant records          | Supabase table editor, SQL console         | Admin lists are curated; raw debugging sometimes needs SQL                         | **Reducible**  | Add safe read-only drilldowns for common support cases            |
| 19  | Repair malformed tenant data              | SQL console, controlled script             | Direct data repair can violate tenant boundaries if done casually                  | **Bridgeable** | Add constrained repair actions with previews and audit logging    |
| 20  | Investigate RLS/service-role behavior     | Supabase policy UI, SQL                    | Admin queries use service role through admin clients; policy diagnosis is external | **Permanent**  | Document which admin surfaces intentionally bypass tenant scoping |
| 21  | Restore from backup                       | Backup provider, database console          | Restore is infrastructure-level disaster recovery                                  | **Permanent**  | Expose backup freshness and last alert status                     |
| 22  | Run one-off data export for legal/support | SQL, script, storage bucket                | Admin UI has selected tables and CSVs, not arbitrary export tooling                | **Bridgeable** | Add scoped export packs with audit reason required                |
| 23  | Debug missing public directory records    | Database, logs, external search            | Directory admin can approve/revoke, but source provenance may be external          | **Reducible**  | Show approval history, source links, and indexing status          |
| 24  | Investigate audit-log write failure       | Server logs, DB console                    | `logAdminAction()` is non-fatal and logs failures to console                       | **Bridgeable** | Add audit-log health alerts in Hidden Issues                      |

---

## Category 4: PAYMENTS, FINANCE & ACCOUNTING

| #   | Scenario                                            | Where They Go                              | Why They Leave                                                                   | Exit Type      | ChefFlow Could...                                             |
| --- | --------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------- |
| 25  | Verify a charge, transfer, or refund in Stripe      | Stripe dashboard                           | ChefFlow shows ledger and payment health, but Stripe is system of record         | **Permanent**  | Deep-link to Stripe objects when IDs exist                    |
| 26  | Cancel or inspect a paid subscription after comping | Stripe dashboard, logs                     | `compChef()` can cancel Stripe subscription, but disputes/history live in Stripe | **Bridgeable** | Show cancellation result and Stripe subscription ID history   |
| 27  | Reconcile platform fees against payouts             | Stripe, bank portal, accounting software   | `/admin/reconciliation` computes platform view, not bank settlement truth        | **Bridgeable** | Add export and variance annotations                           |
| 28  | Confirm bank deposits                               | Bank app, accounting software              | Bank balances are outside ChefFlow                                               | **Permanent**  | Store settlement status and reconciliation notes              |
| 29  | Handle chargebacks or disputes                      | Stripe dispute center, bank, email         | Dispute rails are controlled by payment processors                               | **Permanent**  | Capture dispute status and evidence checklist                 |
| 30  | Prepare taxes or monthly books                      | QuickBooks, accountant portal, spreadsheet | Accounting system is external                                                    | **Permanent**  | Export clean ledger, fee, and payout reports                  |
| 31  | Investigate Stripe key mode mismatch                | Hosting secrets, Stripe dashboard          | Admin Payment Health detects mismatch but cannot reveal or edit secrets          | **Permanent**  | Provide redacted mode diagnostics and remediation runbook     |
| 32  | Issue non-ChefFlow refund or goodwill payment       | Stripe, bank, Venmo, Zelle                 | External payment rails own money movement                                        | **Bridgeable** | Let admin record external adjustment reference on chef ledger |

---

## Category 5: COMMUNICATION, SUPPORT & USER RELATIONSHIPS

| #   | Scenario                                   | Where They Go                                 | Why They Leave                                                                   | Exit Type      | ChefFlow Could...                                              |
| --- | ------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------- |
| 33  | Read replies to admin emails               | Gmail, Outlook, support inbox                 | Admin direct/broadcast email sends through provider, but replies land externally | **Bridgeable** | Sync replies or link support-thread IDs                        |
| 34  | Resolve sensitive support issue by phone   | Phone, video call                             | Some disputes, privacy issues, and trust calls need human conversation           | **Permanent**  | Add call-note capture tied to chef/client/admin audit          |
| 35  | Help a chef through account recovery       | Email, auth provider, password reset flow     | Authentication recovery is partly outside admin panel                            | **Reducible**  | Add safe "send recovery instructions" with audit               |
| 36  | Handle urgent outage communications        | Status page, email provider, social channels  | Users may not be in ChefFlow during outage                                       | **Permanent**  | Coordinate banner, email, and status links from Communications |
| 37  | Coordinate with a trusted admin/operator   | Slack, SMS, email                             | Internal team operations may not happen in ChefFlow                              | **Bridgeable** | Add internal incident notes and owner handoff fields           |
| 38  | Verify email delivery failure              | Resend/provider dashboard, logs               | Provider-level bounces and reputation data are external                          | **Reducible**  | Pull provider delivery events into `/admin/communications`     |
| 39  | Answer support ticket from outside channel | Help desk, email, social DM                   | Users may contact support where they already are                                 | **Bridgeable** | Add ticket link fields to user detail and issue reports        |
| 40  | Send legal/privacy response                | Email, counsel-approved template, data portal | Formal notices may require external review and delivery                          | **Permanent**  | Track request status and attach response evidence              |

---

## Category 6: WEB RESEARCH, DIRECTORY & OUTREACH

| #   | Scenario                                               | Where They Go                                  | Why They Leave                                                            | Exit Type      | ChefFlow Could...                                       |
| --- | ------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------- | -------------- | ------------------------------------------------------- |
| 41  | Verify a web research candidate                        | Candidate website, Google, social profiles     | `/admin/web-research` queues candidates but truth lives on the public web | **Permanent**  | Keep source URLs, citations, and review trail visible   |
| 42  | Search for new directory leads                         | Google, Maps, Instagram, industry lists        | Discovery starts outside ChefFlow                                         | **Permanent**  | Capture found candidates into the review queue          |
| 43  | Validate a chef's public identity                      | Instagram, LinkedIn, personal site             | Trust proof is external                                                   | **Permanent**  | Store verified links and last-reviewed timestamp        |
| 44  | Review external directory listing quality              | Google Business, Yelp, marketplace profiles    | Public reputation surfaces are owned externally                           | **Permanent**  | Add outbound proof links and notes                      |
| 45  | Send outreach campaign beyond current preview commands | Email provider, CLI/script                     | Outreach page documents commands; batching may run outside UI             | **Bridgeable** | Add safe preview/send controls with opt-out enforcement |
| 46  | Verify opt-out or unsubscribe behavior                 | Email provider, public unsubscribe route, logs | Deliverability compliance spans systems                                   | **Bridgeable** | Show opt-out history and provider events in outreach    |
| 47  | Check search indexing or SEO state                     | Google Search Console, browser search          | Search engines own indexing                                               | **Permanent**  | Store search-console links and crawl notes              |
| 48  | Update external listing or social profile              | Third-party CMS/profile tool                   | ChefFlow does not own third-party profiles                                | **Permanent**  | Track requested update and source freshness             |

---

## Category 7: PRICING, OPENCLAW & MARKET DATA

| #   | Scenario                                    | Where They Go                               | Why They Leave                                                             | Exit Type      | ChefFlow Could...                                               |
| --- | ------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------- |
| 49  | Verify a quarantined price                  | Store site, receipt, Google, vendor catalog | Admin health page can approve/reject/correct, but source truth is external | **Permanent**  | Preserve source URL, raw context, and correction reason         |
| 50  | Investigate OpenClaw sync failure           | Worker logs, DB schema, external source     | Admin health summarizes sync and quarantine, not every worker detail       | **Reducible**  | Add run IDs, source errors, and log references                  |
| 51  | Import vendor pricing from external file    | Vendor portal, CSV, spreadsheet             | Vendor data originates outside ChefFlow                                    | **Bridgeable** | Improve upload validation and import previews                   |
| 52  | Resolve price coverage gaps                 | Store sites, retail APIs, scraper config    | Long-tail ingredient coverage depends on external supply data              | **Bridgeable** | Add coverage frontier actions from `/admin/pricing-coverage`    |
| 53  | Export catalog for offline review           | CSV, spreadsheet                            | CSV export exists because some analysis belongs outside the UI             | **Bridgeable** | Keep export filtered, sanitized, and re-importable where useful |
| 54  | Tune scraper/API credentials                | Secret manager, external APIs               | Credential and vendor API management is external                           | **Permanent**  | Show redacted provider diagnostics only                         |
| 55  | Check regional store availability           | Retailer sites, Maps, vendor catalogs       | Availability changes faster than internal catalog                          | **Permanent**  | Store confidence, timestamp, and fallback source                |
| 56  | Compare ChefFlow price against real receipt | Receipt image, email, store app             | Receipt evidence is external                                               | **Bridgeable** | Add receipt/proof attachment to price corrections               |

---

## Category 8: LEGAL, POLICY, PRIVACY & REGULATED FLOWS

| #   | Scenario                                      | Where They Go                               | Why They Leave                                          | Exit Type      | ChefFlow Could...                                        |
| --- | --------------------------------------------- | ------------------------------------------- | ------------------------------------------------------- | -------------- | -------------------------------------------------------- |
| 57  | Review terms or policies with counsel         | Lawyer, Google Docs, PDF editor             | Legal drafting and approval are outside product runtime | **Permanent**  | Track policy versions and readiness status               |
| 58  | Publish or revise legal documents             | Repo/CMS, legal archive                     | Static legal pages are source-controlled content        | **Bridgeable** | Show current version and last accepted policy data       |
| 59  | Process privacy/data request                  | Email, data export tools, counsel           | Data rights workflows may require manual review         | **Bridgeable** | Add admin data-request checklist and export log          |
| 60  | Verify cannabis compliance                    | State sites, legal counsel, ID/age evidence | Regulated access cannot rely only on app data           | **Permanent**  | Store approvals, rejections, blocks, and evidence status |
| 61  | Review cannabis invite or age edge case       | Email, legal notes, external documentation  | Complex cases need human/legal context                  | **Bridgeable** | Add structured reason fields and expiration reminders    |
| 62  | Respond to DMCA or acceptable-use issue       | Email, counsel, hosting provider            | Takedown flows cross legal and infrastructure systems   | **Permanent**  | Track incident, source URL, and final action in audit    |
| 63  | Document security incident                    | Incident doc, ticket tracker, logs          | Security response spans systems                         | **Permanent**  | Add incident references to Hidden Issues and audit log   |
| 64  | Verify professional licensing or certificates | Government sites, PDFs, email               | External authorities own license truth                  | **Permanent**  | Store verified document links and review timestamps      |

---

## Category 9: QA, SECURITY & SYSTEM INTEGRITY

| #   | Scenario                                       | Where They Go                               | Why They Leave                                                   | Exit Type      | ChefFlow Could...                                        |
| --- | ---------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------- | -------------- | -------------------------------------------------------- |
| 65  | Run admin route coverage tests                 | Terminal, Playwright report                 | `04-admin-routes` and `37-admin-panel` are external test runners | **Permanent**  | Link latest proof packs from admin System Check          |
| 66  | Run security integrity tests                   | Terminal, CI                                | Q45/Q48/Q50/Q52/Q56/Q57/Q70/Q81/Q87/Q131 live in test suite      | **Permanent**  | Surface last pass/fail and failing question IDs          |
| 67  | Debug client-side JS error                     | Browser devtools, console, Playwright trace | Runtime debugging needs browser tooling                          | **Permanent**  | Capture admin page errors into Hidden Issues             |
| 68  | Inspect network failures                       | Browser devtools, server logs               | Network waterfall is external to the app UI                      | **Permanent**  | Add request IDs and admin-facing retry state             |
| 69  | Compare admin nav against route inventory      | Repo, tests, route audit output             | Source-of-truth parity is code/test-level                        | **Bridgeable** | Render admin route/nav inventory inside System Check     |
| 70  | Validate API route auth inventory              | Terminal, test output                       | Auth inventory builder is a code-level audit                     | **Permanent**  | Show summarized inventory counts in System Health        |
| 71  | Investigate Remy/admin boundary                | Tests, code, prompt logs                    | Remy must not import admin actions; proof is structural          | **Permanent**  | Keep admin Remy founder-only and log attempts clearly    |
| 72  | Prepare a handoff or queue item for admin gaps | Docs, build queue, issue tracker            | Product planning happens in repo/queue artifacts                 | **Bridgeable** | Link admin gaps directly to build-queue intake templates |

---

## THE PATTERN: Three Types of Admin Exits

### 1. PERMANENT EXITS (ChefFlow should never try to replace these)

External systems that are the source of truth or the safer control plane.

- Auth credentials, password managers, MFA, and provider recovery (1-3)
- Infrastructure, deployment, logs, Docker, local services, and secrets (9-16)
- Migrations, backup restore, raw RLS/policy diagnosis, and disaster recovery (17, 20-21)
- Stripe, banks, accounting, taxes, chargebacks, and payment credentials (25, 28-31)
- Native support channels and formal legal delivery (34, 36, 40)
- Open web, search, social, and third-party reputation systems (41-44, 47-49, 55)
- Legal counsel, regulatory authorities, licensing, DMCA, and incident response (57, 60, 62-64)
- Terminal/CI/browser tooling for tests, traces, and structural security proof (65-68, 70-71)

**Strategy:** Do not absorb these systems. Provide context, redacted health, deep links, evidence capture, and a clear return path into ChefFlow.

### 2. REDUCIBLE EXITS (ChefFlow could eliminate or reduce these)

Admin leaves because a safe admin workflow is missing or underexplained.

- Admin access diagnostics and VIP/admin distinction (4, 7)
- Common read-only support drilldowns (18)
- Directory approval provenance and indexing status (23)
- Account recovery support from chef detail (35)
- Provider delivery visibility in Communications (38)
- OpenClaw run diagnostics and source error visibility (50)

**Strategy:** Add constrained, audited admin controls for repeated operator work. Avoid broad arbitrary mutation surfaces.

### 3. BRIDGEABLE EXITS (Admin will still go external, but ChefFlow can smooth the round-trip)

The external system remains necessary, but ChefFlow can own the status trail.

- Admin grant/revoke, bootstrap runbooks, and access anomaly notes (5-6, 8)
- Audit-log, backup, export, and data-repair evidence (22, 24)
- Financial reconciliation exports and external adjustment references (26-27, 32)
- Support tickets, call notes, incident notes, and email reply sync (37, 39)
- Outreach, unsubscribe, and web-research candidate capture (45-46, 48)
- OpenClaw import, coverage, receipt proof, and price correction loops (51-54, 56)
- Legal readiness, data requests, cannabis edge cases, and policy version tracking (58-61)
- Admin route/nav inventory and build-queue handoff (69, 72)

**Strategy:** Make external truth easy to bring back into the admin audit trail without weakening security boundaries.

---

## PRIORITY RANKING (By Admin Operator Pain)

**Leaves most often for:**

1. Terminal/logs for dev server, service, and runtime failures
2. Supabase/SQL for access bootstrapping, raw data inspection, and repair
3. Stripe/bank/accounting for money truth
4. Email/support inbox for replies and sensitive user help
5. Google/social/websites for directory and web-research validation
6. OpenClaw/source sites for price proof and coverage gaps
7. CI/Playwright/browser devtools for admin route and integrity proof
8. Legal counsel/government sites for regulated and policy decisions
9. Secret managers/hosting dashboards for configuration fixes
10. Build queue/docs for admin-product gaps

**Highest-impact improvements:**

1. **Admin access diagnostics** = reduces auth/role confusion without exposing promotion paths
2. **Provider delivery/event sync** = bridges admin email sends with actual replies and bounces
3. **Admin evidence links** = lets every support, price, legal, or finance decision preserve source proof
4. **Read-only data drilldowns** = reduces unsafe SQL trips for repeated support questions
5. **Reconciliation export + variance notes** = bridges Stripe/bank/accounting without replacing them
6. **OpenClaw run IDs and receipt proof** = makes price corrections auditable
7. **System integrity status panel** = surfaces latest route/security proof inside admin
8. **Owner-only access management** = safer than SQL for admin grants/revokes if fully audited
9. **Directory source provenance** = improves external candidate review quality
10. **Incident/runbook links** = keeps infrastructure exits intentional and recoverable

---

_72 admin exit scenarios. 42 permanent. 7 reducible. 23 bridgeable._
_The admin portal should become the operator cockpit and audit trail, not a replacement for infrastructure consoles, legal systems, payment processors, banks, source control, or the open web._
